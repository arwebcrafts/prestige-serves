import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      const sql = neon(DATABASE_URL);
      await sql`DELETE FROM contact_submissions WHERE id = ${id}`;
      return res.status(200).json({ success: true, message: 'Contact deleted' });
    } catch (err) {
      console.error('Admin contact delete error:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const sql = neon(DATABASE_URL);
    const result = await sql`SELECT * FROM contact_submissions WHERE id = ${id}`;
    
    if (result.length > 0) {
      return res.status(200).json({ success: true, data: result[0] });
    } else {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
  } catch (err) {
    console.error('Admin contact detail error:', err);
    return res.status(500).json({ success: false, message: 'Database error' });
  }
}
