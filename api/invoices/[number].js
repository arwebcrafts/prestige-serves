import { neon } from '@neondatabase/serverless';
import { createRequire } from 'module';
import { logger, LOG_CATEGORIES } from '../../logger.js';

const require = createRequire(import.meta.url);
const invoiceUtils = require('../../../lib/invoice-utils.js');

const DATABASE_URL = process.env.DATABASE_URL;

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method not allowed' });

  const number = req.query.number;
  const token = req.query.token;

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
      return res.status(404).json({ success: false, message: 'Invoice not found. Check your number and access code.' });
    }
    return res.status(200).json({
      success: true,
      data: invoiceUtils.publicInvoiceView(rows[0]),
    });
  } catch (err) {
    logger.error(LOG_CATEGORIES.API, 'Public invoice fetch error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
