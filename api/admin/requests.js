import { neon } from '@neondatabase/serverless';
import { logger, LOG_CATEGORIES } from '../logger.js';

const DATABASE_URL = process.env.DATABASE_URL;

async function ensureTablesExist(sql) {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS service_requests (
        id SERIAL PRIMARY KEY,
        client_name VARCHAR(200),
        contact_name VARCHAR(100),
        email VARCHAR(255),
        phone VARCHAR(50),
        address_line1 VARCHAR(255),
        address_line2 VARCHAR(255),
        city VARCHAR(100),
        state VARCHAR(50),
        zip VARCHAR(20),
        defendant_name VARCHAR(200),
        case_number VARCHAR(100),
        court_jurisdiction VARCHAR(200),
        multiple_defendants BOOLEAN DEFAULT false,
        service_type VARCHAR(100),
        deadline_date DATE,
        special_instructions TEXT,
        defendants_data JSONB,
        uploaded_files JSONB,
        skip_trace_data JSONB,
        email_sent INTEGER DEFAULT -1,
        stripe_checkout_session_id TEXT,
        payment_status TEXT DEFAULT 'pending',
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
    const result = await sql`SELECT * FROM service_requests ORDER BY created_at DESC LIMIT 2000`;
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    logger.error(LOG_CATEGORIES.API, 'Admin requests error', err);
    return res.status(500).json({ success: false, message: 'Database error: ' + err.message });
  }
}
