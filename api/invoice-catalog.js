import invoiceUtils from '../lib/invoice-utils.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false });

  const utils = invoiceUtils.default || invoiceUtils;
  return res.status(200).json({
    success: true,
    types: utils.INVOICE_SERVICE_TYPES,
    prices: utils.INVOICE_DEFAULT_PRICES,
  });
}
