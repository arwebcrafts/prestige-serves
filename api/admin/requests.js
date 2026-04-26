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
      const result = await sql`SELECT * FROM service_requests ORDER BY created_at DESC LIMIT 500`;
      if (req.query.format === 'csv') {
        const cols = [
          'id', 'created_at', 'client_name', 'contact_name', 'email', 'phone',
          'address_line1', 'address_line2', 'city', 'state', 'zip',
          'defendant_name', 'case_number', 'court_jurisdiction', 'multiple_defendants',
          'service_type', 'deadline_date', 'special_instructions', 'defendants_data', 'uploaded_files'
        ];
        const csv = '\uFEFF' + rowsToCsv(result, cols);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="service_requests.csv"');
        return res.status(200).send(csv);
      }
      return res.status(200).json({ success: true, data: result });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body;
      await sql`
        INSERT INTO service_requests (
          client_name, contact_name, email, phone,
          address_line1, address_line2, city, state, zip,
          defendant_name, case_number, court_jurisdiction,
          multiple_defendants, service_type, deadline_date,
          special_instructions, defendants_data, uploaded_files
        ) VALUES (
          ${body.client_name || ''}, ${body.contact_name || ''}, ${body.email || ''}, ${body.phone || ''},
          ${body.address_line1 || ''}, ${body.address_line2 || ''}, ${body.city || ''}, ${body.state || ''}, ${body.zip || ''},
          ${body.defendant_name || ''}, ${body.case_number || ''}, ${body.court_jurisdiction || ''},
          ${!!body.multiple_defendants}, ${body.service_type || ''}, ${body.deadline_date || null},
          ${body.special_instructions || ''}, ${body.defendants_data || null}, ${body.uploaded_files || null}
        )
      `;
      return res.status(201).json({ success: true, message: 'Request created' });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err) {
    console.error('Admin requests error:', err);
    return res.status(500).json({ success: false, message: 'Database error' });
  }
}
