import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const invoiceUtils = require('../../lib/invoice-utils.js');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false });

  return res.status(200).json({
    success: true,
    types: invoiceUtils.INVOICE_SERVICE_TYPES,
    prices: invoiceUtils.INVOICE_DEFAULT_PRICES,
  });
}
