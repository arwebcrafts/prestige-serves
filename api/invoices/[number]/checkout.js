import { neon } from '@neondatabase/serverless';
import { createRequire } from 'module';
import StripeLib from 'stripe';
import { logger, LOG_CATEGORIES } from '../../logger.js';

const require = createRequire(import.meta.url);
const invoiceUtils = require('../../../lib/invoice-utils.js');

const DATABASE_URL = process.env.DATABASE_URL;
const SITE_URL = (process.env.SITE_URL || 'https://www.prestigeserves.com').replace(/\/$/, '');
const stripeClient = process.env.STRIPE_SECRET_KEY
  ? new StripeLib(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' })
  : null;

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  if (!stripeClient) {
    return res.status(503).json({ success: false, message: 'Payment processing not configured.' });
  }

  const number = req.query.number;
  const body = req.body || {};
  const token = body.token || req.query.token;

  if (!number || !token) {
    return res.status(400).json({ success: false, message: 'Invoice number and access code required.' });
  }

  try {
    const sql = neon(DATABASE_URL);
    await invoiceUtils.ensureInvoicesTable(sql);
    const rows = await sql`
      SELECT * FROM invoices
      WHERE LOWER(invoice_number) = LOWER(${String(number).trim()})
        AND access_token = ${String(token).trim()}
      LIMIT 1
    `;
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    const invoice = rows[0];
    if (invoice.status === 'paid') {
      return res.status(400).json({ success: false, message: 'This invoice is already paid.' });
    }

    const session = await invoiceUtils.createInvoiceCheckoutSession(stripeClient, invoice, SITE_URL);
    await sql`
      UPDATE invoices
      SET stripe_checkout_session_id = ${session.id}, status = 'sent', updated_at = CURRENT_TIMESTAMP
      WHERE id = ${invoice.id}
    `;

    logger.info(LOG_CATEGORIES.API, 'Invoice checkout created', { invoiceNumber: invoice.invoice_number, sessionId: session.id });
    return res.status(200).json({ success: true, url: session.url });
  } catch (err) {
    logger.error(LOG_CATEGORIES.API, 'Invoice checkout error', err);
    return res.status(500).json({ success: false, message: err.message || 'Could not start checkout.' });
  }
}
