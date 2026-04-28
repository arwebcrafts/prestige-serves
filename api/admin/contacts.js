import { neon } from '@neondatabase/serverless';
import { logger, LOG_CATEGORIES } from '../logger.js';

const DATABASE_URL = process.env.DATABASE_URL;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const sql = neon(DATABASE_URL);
    const result = await sql`SELECT * FROM contact_submissions ORDER BY created_at DESC LIMIT 100`;
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    logger.error(LOG_CATEGORIES.API, 'Admin contacts error', err);
    return res.status(500).json({ success: false, message: 'Database error' });
  }
}
