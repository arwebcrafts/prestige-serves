import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No IDs provided' });
    }
    
    const sql = neon(DATABASE_URL);
    await sql`DELETE FROM service_requests WHERE id = ${ids}`;
    return res.status(200).json({ success: true, message: 'Requests deleted', deletedCount: ids.length });
  } catch (err) {
    console.error('Admin requests bulk delete error:', err);
    return res.status(500).json({ success: false, message: 'Database error' });
  }
}
