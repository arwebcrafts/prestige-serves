import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;

function csvEscape(val) {
  if (val === null || val === undefined) return '';
  let s = typeof val === 'object' ? JSON.stringify(val) : String(val);
  s = s.replace(/"/g, '""');
  if (/[",\r\n]/.test(s)) return `"${s}"`;
  return s;
}

function rowsToCsv(rows, columns) {
  const header = columns.map(csvEscape).join(',');
  const lines = rows.map((row) => columns.map((col) => csvEscape(row[col])).join(','));
  return [header, ...lines].join('\r\n');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  try {
    const sql = neon(DATABASE_URL);

    if (req.method === 'GET') {
      const result = await sql`SELECT * FROM contact_submissions ORDER BY created_at DESC LIMIT 500`;
      if (req.query.format === 'csv') {
        const cols = [
          'id', 'created_at', 'first_name', 'last_name', 'company', 'email', 'phone',
          'reason', 'county', 'state', 'case_details', 'urgency', 'consent'
        ];
        const csv = '\uFEFF' + rowsToCsv(result, cols);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="contact_submissions.csv"');
        return res.status(200).send(csv);
      }
      return res.status(200).json({ success: true, data: result });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body;
      await sql`
        INSERT INTO contact_submissions (
          first_name, last_name, company, email, phone,
          reason, county, state, case_details, urgency, consent
        ) VALUES (
          ${body.first_name || ''}, ${body.last_name || ''}, ${body.company || ''}, ${body.email || ''}, ${body.phone || ''},
          ${body.reason || ''}, ${body.county || ''}, ${body.state || ''}, ${body.case_details || ''}, ${body.urgency || ''},
          ${body.consent === true || body.consent === 'true'}
        )
      `;
      return res.status(201).json({ success: true, message: 'Contact created' });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err) {
    console.error('Admin contacts error:', err);
    return res.status(500).json({ success: false, message: 'Database error' });
  }
}
