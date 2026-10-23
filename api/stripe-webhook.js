import { neon } from '@neondatabase/serverless';
import StripeLib from 'stripe';
import { logger, LOG_CATEGORIES } from './logger.js';
import invoiceUtilsRaw from '../lib/invoice-utils.js';

const invoiceUtils = invoiceUtilsRaw.default || invoiceUtilsRaw;
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_P8aH3JElyXBw@ep-gentle-frog-a4yzwn3w-pooler.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';
const stripeClient = process.env.STRIPE_SECRET_KEY
  ? new StripeLib(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' })
  : null;

export const config = {
  api: {
    bodyParser: false,
  },
};

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  if (!stripeClient || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(400).send('Webhook not configured.');
  }

  try {
    const rawBody = await getRawBody(req);
    const sig = req.headers['stripe-signature'];
    let event;
    try {
      event = stripeClient.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (verifyErr) {
      logger.error(LOG_CATEGORIES.API, 'Webhook signature verification failed', verifyErr);
      return res.status(400).send('Webhook Error: ' + verifyErr.message);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const sql = neon(DATABASE_URL);
      const invoiceId = session.metadata && session.metadata.invoice_id;
      if (invoiceId && !isNaN(Number(invoiceId))) {
        await invoiceUtils.ensureInvoicesTable(sql);
        await sql`
          UPDATE invoices
          SET status = 'paid',
              stripe_checkout_session_id = ${session.id},
              paid_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ${parseInt(invoiceId, 10)}
        `;
        logger.info(LOG_CATEGORIES.DB, 'Invoice marked paid via webhook', { invoiceId, sessionId: session.id });
      }

      const subId = (session.metadata && session.metadata.request_submission_id) || session.client_reference_id;
      if (subId && !isNaN(Number(subId)) && !invoiceId) {
        await sql`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT`;
        await sql`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending'`;
        await sql`
          UPDATE service_requests
          SET stripe_checkout_session_id = ${session.id},
              payment_status = 'paid'
          WHERE id = ${parseInt(subId, 10)}
        `;
        logger.info(LOG_CATEGORIES.DB, 'Payment marked paid via webhook', { submissionId: subId, sessionId: session.id });
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    logger.error(LOG_CATEGORIES.API, 'Webhook handler error', err);
    return res.status(500).json({ success: false });
  }
}
