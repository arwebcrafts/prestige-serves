import { neon } from '@neondatabase/serverless';
import { createRequire } from 'module';
import StripeLib from 'stripe';
import { logger, LOG_CATEGORIES } from '../logger.js';

const require = createRequire(import.meta.url);
const invoiceUtils = require('../../lib/invoice-utils.js');

const DATABASE_URL = process.env.DATABASE_URL;
const SITE_URL = (process.env.SITE_URL || 'https://www.prestigeserves.com').replace(/\/$/, '');
const stripeClient = process.env.STRIPE_SECRET_KEY
  ? new StripeLib(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' })
  : null;

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const sql = neon(DATABASE_URL);
    await invoiceUtils.ensureInvoicesTable(sql);

    if (req.method === 'GET') {
      const result = await sql`SELECT id, invoice_number, status, invoice_date, due_date, case_number, client_email, subtotal_cents, total_cents, stripe_fee_enabled, paid_at, created_at FROM invoices ORDER BY created_at DESC LIMIT 500`;
      return res.status(200).json({ success: true, data: result });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const payload = invoiceUtils.sanitizeInvoicePayload(body);
      const invoiceNumber = payload.invoice_number || await invoiceUtils.getNextInvoiceNumber(sql);
      const accessToken = invoiceUtils.generateAccessToken();
      const today = new Date().toISOString().split('T')[0];

      const inserted = await sql`
        INSERT INTO invoices (
          invoice_number, status, invoice_date, due_date, case_number,
          bill_to, service_details, line_items,
          subtotal_cents, tax_pct, tax_cents, discount_cents,
          stripe_fee_enabled, stripe_fee_cents, total_cents,
          notes, client_email, access_token
        ) VALUES (
          ${invoiceNumber},
          ${payload.status || 'unpaid'},
          ${payload.invoice_date || today},
          ${payload.due_date || today},
          ${payload.case_number},
          ${JSON.stringify(payload.bill_to)},
          ${JSON.stringify(payload.service_details)},
          ${JSON.stringify(payload.line_items)},
          ${payload.subtotal_cents},
          ${payload.tax_pct},
          ${payload.tax_cents},
          ${payload.discount_cents},
          ${payload.stripe_fee_enabled},
          ${payload.stripe_fee_cents},
          ${payload.total_cents},
          ${payload.notes},
          ${payload.client_email},
          ${accessToken}
        )
        RETURNING *
      `;

      const inv = inserted[0];
      const payUrl = SITE_URL + '/invoice.html?number=' + encodeURIComponent(inv.invoice_number) + '&token=' + encodeURIComponent(inv.access_token);
      logger.info(LOG_CATEGORIES.API, 'Invoice created', { invoiceNumber: inv.invoice_number });
      return res.status(201).json({ success: true, data: inv, payUrl });
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (err) {
    logger.error(LOG_CATEGORIES.API, 'Admin invoices error', err);
    return res.status(500).json({ success: false, message: err.message || 'Database error' });
  }
}
