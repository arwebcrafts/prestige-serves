import { neon } from '@neondatabase/serverless';
import { logger, LOG_CATEGORIES } from './logger.js';

const DATABASE_URL = process.env.DATABASE_URL;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    const sql = neon(DATABASE_URL);
    
    // Ensure settings table exists
    await sql`CREATE TABLE IF NOT EXISTS settings (key VARCHAR(255) PRIMARY KEY, value TEXT)`;
    
    if (req.method === 'GET') {
      // Get owner email
      const result = await sql`SELECT value FROM settings WHERE key = 'owner_email' LIMIT 1`;
      const ownerEmail = result.length > 0 ? result[0].value : null;
      return res.status(200).json({ success: true, ownerEmail });
    }
    
    if (req.method === 'POST') {
      // Update owner email
      const { ownerEmail } = req.body;
      
      if (!ownerEmail) {
        return res.status(400).json({ success: false, message: 'Owner email is required' });
      }
      
      await sql`INSERT INTO settings (key, value) VALUES ('owner_email', ${ownerEmail}) ON CONFLICT (key) DO UPDATE SET value = ${ownerEmail}`;
      
      return res.status(200).json({ success: true, ownerEmail });
    }
    
    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err) {
    logger.error(LOG_CATEGORIES.API, 'Settings API error', err);
    return res.status(500).json({ success: false, message: 'Database error' });
  }
}
