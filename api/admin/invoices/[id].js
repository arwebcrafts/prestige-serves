import { neon } from '@neondatabase/serverless';
import { createRequire } from 'module';
import { logger, LOG_CATEGORIES } from '../../logger.js';

const require = createRequire(import.meta.url);
const invoiceUtils = require('../../../lib/invoice-utils.js');

const DATABASE_URL = process.env.DATABASE_URL;

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const id = req.query.id;
  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ success: false, message: 'Invalid invoice ID' });
  }

  try {
    const sql = neon(DATABASE_URL);
    await invoiceUtils.ensureInvoicesTable(sql);

    if (req.method === 'GET') {
      const rows = await sql`SELECT * FROM invoices WHERE id = ${parseInt(id, 10)}`;
      if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });
      return res.status(200).json({ success: true, data: rows[0] });
    }

    if (req.method === 'PUT') {
      const body = req.body || {};
      const payload = invoiceUtils.sanitizeInvoicePayload(body);
      const updated = await sql`
        UPDATE invoices SET
          status = ${body.status || 'unpaid'},
          invoice_date = ${payload.invoice_date},
          due_date = ${payload.due_date},
          case_number = ${payload.case_number},
          bill_to = ${JSON.stringify(payload.bill_to)},
          service_details = ${JSON.stringify(payload.service_details)},
          line_items = ${JSON.stringify(payload.line_items)},
          subtotal_cents = ${payload.subtotal_cents},
          tax_pct = ${payload.tax_pct},
          tax_cents = ${payload.tax_cents},
          discount_cents = ${payload.discount_cents},
          stripe_fee_enabled = ${payload.stripe_fee_enabled},
          stripe_fee_cents = ${payload.stripe_fee_cents},
          total_cents = ${payload.total_cents},
          notes = ${payload.notes},
          client_email = ${payload.client_email},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${parseInt(id, 10)}
        RETURNING *
      `;
      if (!updated.length) return res.status(404).json({ success: false, message: 'Not found' });
      return res.status(200).json({ success: true, data: updated[0] });
    }

    if (req.method === 'DELETE') {
      await sql`DELETE FROM invoices WHERE id = ${parseInt(id, 10)}`;
      return res.status(200).json({ success: true, message: 'Deleted' });
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (err) {
    logger.error(LOG_CATEGORIES.API, 'Admin invoice detail error', err);
    return res.status(500).json({ success: false, message: err.message || 'Database error' });
  }
}
