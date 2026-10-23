import { neon } from '@neondatabase/serverless';
import StripeLib from 'stripe';
import { logger, LOG_CATEGORIES } from '../logger.js';
import invoiceUtilsRaw from '../../lib/invoice-utils.js';

const invoiceUtils = invoiceUtilsRaw.default || invoiceUtilsRaw;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_P8aH3JElyXBw@ep-gentle-frog-a4yzwn3w-pooler.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';
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
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) { body = {}; }
      } else {
        body = body || {};
      }
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
          notes, client_email, access_token, stripe_pay_url
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
          ${accessToken},
          ${payload.stripe_pay_url}
        )
        RETURNING *
      `;

      const inv = inserted[0];
      let stripeCheckoutUrl = null;
      if (stripeClient && inv.total_cents > 0) {
        try {
          const session = await invoiceUtils.createInvoiceCheckoutSession(stripeClient, inv, SITE_URL);
          stripeCheckoutUrl = session.url;
          await sql`
            UPDATE invoices SET stripe_checkout_session_id = ${session.id}, status = 'sent', updated_at = CURRENT_TIMESTAMP
            WHERE id = ${inv.id}
          `;
        } catch (sErr) {
          logger.warn(LOG_CATEGORIES.API, 'Direct Stripe checkout creation skipped', { error: sErr.message });
        }
      }

      const payUrl = SITE_URL + '/invoice.html?number=' + encodeURIComponent(inv.invoice_number) + '&token=' + encodeURIComponent(inv.access_token);
      logger.info(LOG_CATEGORIES.API, 'Invoice created', { invoiceNumber: inv.invoice_number });
      return res.status(201).json({ success: true, data: inv, payUrl, stripeCheckoutUrl });
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (err) {
    logger.error(LOG_CATEGORIES.API, 'Admin invoices error', err);
    return res.status(500).json({ success: false, message: err.message || 'Database error' });
  }
}
