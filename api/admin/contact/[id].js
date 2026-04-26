import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ success: false, message: 'Missing id' });
  }

  try {
    const sql = neon(DATABASE_URL);

    if (req.method === 'GET') {
      const result = await sql`SELECT * FROM contact_submissions WHERE id = ${id}`;
      if (result.length > 0) {
        return res.status(200).json({ success: true, data: result[0] });
      }
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    if (req.method === 'DELETE') {
      await sql`DELETE FROM contact_submissions WHERE id = ${id}`;
      return res.status(200).json({ success: true, message: 'Deleted' });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err) {
    console.error('Admin contact id error:', err);
    return res.status(500).json({ success: false, message: 'Database error' });
  }
}
