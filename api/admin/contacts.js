import { neon } from '@neondatabase/serverless';
import { logger, LOG_CATEGORIES } from '../logger.js';

const DATABASE_URL = process.env.DATABASE_URL;

async function ensureTablesExist(sql) {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS contact_submissions (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        company VARCHAR(200),
        email VARCHAR(255),
        phone VARCHAR(50),
        reason VARCHAR(100),
        county VARCHAR(100),
        state VARCHAR(50),
        case_details TEXT,
        urgency VARCHAR(50),
        consent BOOLEAN DEFAULT false,
        email_sent INTEGER DEFAULT -1,
        skip_trace_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
  } catch (e) {
    // Table may already exist
  }
}

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
    await ensureTablesExist(sql);
    const result = await sql`SELECT * FROM contact_submissions ORDER BY created_at DESC LIMIT 2000`;
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    logger.error(LOG_CATEGORIES.API, 'Admin contacts error', err);
    return res.status(500).json({ success: false, message: 'Database error: ' + err.message });
  }
}
