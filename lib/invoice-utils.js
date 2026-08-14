'use strict';

const crypto = require('crypto');

/** Service types and default unit prices (USD) for the quote builder */
const INVOICE_SERVICE_TYPES = [
  'Standard Serve',
  'Rush Serve',
  'Priority Serve',
  'Emergency Serve',
  'eFiling',
  'eFiling - Standard',
  'eFiling - Rush',
  'eRecording',
  'Skip Trace',
  'Legal Courier',
  'Nationwide Service',
  'Concierge',
  'Stakeout 2 Hours',
  'Extended Stakeout',
  'Half Day Stakeout',
  'Stakeout Extra Hour',
  'Second Location Surcharge',
  'Document Printing (per page)',
  'POS Preparation',
  'First-Class Mailing',
  'White-Glove POS',
  'Certified Mail w/ Return Receipt',
  'Additional Defendant',
  'Custom / Write-in Item',
  'Custom Service',
  'Other',
];

const INVOICE_DEFAULT_PRICES = {
  'Standard Serve': 97.99,
  'Rush Serve': 119.99,
  'Priority Serve': 149.99,
  'Emergency Serve': 249.99,
  'eFiling': 75,
  'eFiling - Standard': 75,
  'eFiling - Rush': 125,
  'eRecording': 75,
  'Skip Trace': 125,
  'Legal Courier': 85,
  'Nationwide Service': 150,
  'Concierge': 200,
  'Stakeout 2 Hours': 250,
  'Extended Stakeout': 450,
  'Half Day Stakeout': 600,
  'Stakeout Extra Hour': 115,
  'Second Location Surcharge': 75,
  'Document Printing (per page)': 0.35,
  'POS Preparation': 35,
  'First-Class Mailing': 20,
  'White-Glove POS': 85,
  'Certified Mail w/ Return Receipt': 39,
  'Additional Defendant': 45,
  'Custom / Write-in Item': 0,
  'Custom Service': 0,
  'Other': 0,
};

function generateAccessToken() {
  return crypto.randomBytes(24).toString('hex');
}

function dollarsToCents(amount) {
  return Math.round(parseFloat(amount || 0) * 100);
}

function centsToDollars(cents) {
  return (parseInt(cents, 10) || 0) / 100;
}

function formatMoney(cents) {
  return '$' + centsToDollars(cents).toFixed(2);
}

/**
 * Recalculate totals from line items and fee settings.
 * line_items: [{ description, type, qty, unit_price }] — unit_price in dollars
 */
function calculateInvoiceTotals(lineItems, opts) {
  opts = opts || {};
  const taxPct = parseFloat(opts.tax_pct) || 0;
  const discountCents = Math.max(0, parseInt(opts.discount_cents, 10) || 0);
  const stripeFeeEnabled = !!opts.stripe_fee_enabled;

  let subtotalCents = 0;
  const normalized = (Array.isArray(lineItems) ? lineItems : []).map(function (item) {
    const qty = Math.max(0, parseFloat(item.qty) || 0);
    const unitPrice = parseFloat(item.unit_price) || 0;
    const lineCents = Math.round(qty * unitPrice * 100);
    subtotalCents += lineCents;
    return {
      description: String(item.description || item.type || '').trim(),
      type: String(item.type || '').trim(),
      qty: qty,
      unit_price: unitPrice,
      amount_cents: lineCents,
    };
  });

  const taxCents = Math.round(subtotalCents * taxPct / 100);
  const preFeeTotal = subtotalCents + taxCents - discountCents;
  const stripeFeeCents = stripeFeeEnabled ? Math.round(Math.max(0, preFeeTotal) * 0.03) : 0;
  const totalCents = Math.max(0, preFeeTotal + stripeFeeCents);

  return {
    line_items: normalized,
    subtotal_cents: subtotalCents,
    tax_pct: taxPct,
    tax_cents: taxCents,
    discount_cents: discountCents,
    stripe_fee_enabled: stripeFeeEnabled,
    stripe_fee_cents: stripeFeeCents,
    total_cents: totalCents,
  };
}

async function ensureInvoicesTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS invoices (
      id SERIAL PRIMARY KEY,
      invoice_number VARCHAR(20) UNIQUE NOT NULL,
      status VARCHAR(20) DEFAULT 'unpaid',
      invoice_date DATE,
      due_date DATE,
      case_number VARCHAR(100),
      bill_to JSONB DEFAULT '{}',
      service_details JSONB DEFAULT '{}',
      line_items JSONB DEFAULT '[]',
      subtotal_cents INTEGER DEFAULT 0,
      tax_pct NUMERIC(6,2) DEFAULT 0,
      tax_cents INTEGER DEFAULT 0,
      discount_cents INTEGER DEFAULT 0,
      stripe_fee_enabled BOOLEAN DEFAULT false,
      stripe_fee_cents INTEGER DEFAULT 0,
      total_cents INTEGER DEFAULT 0,
      notes TEXT,
      client_email VARCHAR(255),
      access_token VARCHAR(64) NOT NULL,
      stripe_checkout_session_id TEXT,
      paid_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
}

async function getNextInvoiceNumber(sql) {
  await ensureInvoicesTable(sql);
  const rows = await sql`
    SELECT invoice_number FROM invoices
    WHERE invoice_number ~ '^INV-[0-9]+$'
    ORDER BY CAST(SUBSTRING(invoice_number FROM 5) AS INTEGER) DESC
    LIMIT 1
  `;
  let next = 1;
  if (rows.length > 0) {
    const match = String(rows[0].invoice_number).match(/^INV-(\d+)$/);
    if (match) next = parseInt(match[1], 10) + 1;
  }
  return 'INV-' + String(next).padStart(4, '0');
}

function buildLineItemsSummary(lineItems) {
  return (lineItems || [])
    .slice(0, 8)
    .map(function (li) {
      const label = li.description || li.type || 'Service';
      return label + ' x' + (li.qty || 1);
    })
    .join('; ');
}

async function createInvoiceCheckoutSession(stripeClient, invoice, siteUrl) {
  if (!stripeClient) throw new Error('Stripe not configured');
  if (invoice.status === 'paid') throw new Error('Invoice already paid');
  if (!invoice.total_cents || invoice.total_cents <= 0) throw new Error('Invalid invoice total');

  const summary = buildLineItemsSummary(invoice.line_items);
  const sessionParams = {
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'usd',
        unit_amount: invoice.total_cents,
        product_data: {
          name: 'Invoice ' + invoice.invoice_number,
          description: summary || 'Prestige Serves services',
        },
      },
      quantity: 1,
    }],
    success_url: siteUrl + '/invoice.html?paid=1&number=' + encodeURIComponent(invoice.invoice_number) + '&token=' + encodeURIComponent(invoice.access_token),
    cancel_url: siteUrl + '/invoice.html?number=' + encodeURIComponent(invoice.invoice_number) + '&token=' + encodeURIComponent(invoice.access_token),
    client_reference_id: String(invoice.id),
    metadata: {
      invoice_id: String(invoice.id),
      invoice_number: invoice.invoice_number,
    },
  };

  if (invoice.client_email && invoice.client_email.includes('@')) {
    sessionParams.customer_email = invoice.client_email.trim().toLowerCase();
  }

  return stripeClient.checkout.sessions.create(sessionParams);
}

function sanitizeInvoicePayload(body) {
  const billTo = body.bill_to || {};
  const serviceDetails = body.service_details || {};
  const totals = calculateInvoiceTotals(body.line_items, {
    tax_pct: body.tax_pct,
    discount_cents: body.discount_cents != null ? body.discount_cents : dollarsToCents(body.discount_dollars),
    stripe_fee_enabled: body.stripe_fee_enabled,
  });

  return {
    invoice_number: body.invoice_number ? String(body.invoice_number).trim().slice(0, 20) : null,
    status: body.status || 'unpaid',
    invoice_date: body.invoice_date || null,
    due_date: body.due_date || null,
    case_number: body.case_number ? String(body.case_number).trim().slice(0, 100) : null,
    bill_to: {
      firm: String(billTo.firm || '').slice(0, 200),
      contact: String(billTo.contact || '').slice(0, 200),
      street: String(billTo.street || '').slice(0, 255),
      cityStateZip: String(billTo.cityStateZip || '').slice(0, 200),
      phone: String(billTo.phone || '').slice(0, 50),
      email: String(billTo.email || '').slice(0, 255),
    },
    service_details: {
      subject: String(serviceDetails.subject || '').slice(0, 200),
      serviceAddress: String(serviceDetails.serviceAddress || '').slice(0, 255),
      documents: String(serviceDetails.documents || '').slice(0, 255),
      assignedServer: String(serviceDetails.assignedServer || '').slice(0, 200),
    },
    line_items: totals.line_items,
    subtotal_cents: totals.subtotal_cents,
    tax_pct: totals.tax_pct,
    tax_cents: totals.tax_cents,
    discount_cents: totals.discount_cents,
    stripe_fee_enabled: totals.stripe_fee_enabled,
    stripe_fee_cents: totals.stripe_fee_cents,
    total_cents: totals.total_cents,
    notes: body.notes ? String(body.notes).slice(0, 5000) : null,
    client_email: body.client_email ? String(body.client_email).trim().slice(0, 255) : (billTo.email || null),
  };
}

function publicInvoiceView(invoice) {
  return {
    invoice_number: invoice.invoice_number,
    status: invoice.status,
    invoice_date: invoice.invoice_date,
    due_date: invoice.due_date,
    case_number: invoice.case_number,
    bill_to: invoice.bill_to,
    service_details: invoice.service_details,
    line_items: invoice.line_items,
    subtotal_cents: invoice.subtotal_cents,
    tax_pct: invoice.tax_pct,
    tax_cents: invoice.tax_cents,
    discount_cents: invoice.discount_cents,
    stripe_fee_enabled: invoice.stripe_fee_enabled,
    stripe_fee_cents: invoice.stripe_fee_cents,
    total_cents: invoice.total_cents,
    notes: invoice.notes,
    paid_at: invoice.paid_at,
  };
}

module.exports = {
  INVOICE_SERVICE_TYPES,
  INVOICE_DEFAULT_PRICES,
  generateAccessToken,
  dollarsToCents,
  centsToDollars,
  formatMoney,
  calculateInvoiceTotals,
  ensureInvoicesTable,
  getNextInvoiceNumber,
  createInvoiceCheckoutSession,
  sanitizeInvoicePayload,
  publicInvoiceView,
};
