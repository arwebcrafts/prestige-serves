import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.writeHead(204);
    res.end();
    return;
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { firstName, lastName, company, email, phone, reason, county, state, caseDetails, urgency, consent } = req.body;
    
    const sql = neon(DATABASE_URL);
    await sql`
      INSERT INTO contact_submissions (
        first_name, last_name, company, email, phone,
        reason, county, state, case_details, urgency, consent
      ) VALUES (
        ${firstName}, ${lastName}, ${company}, ${email}, ${phone},
        ${reason}, ${county}, ${state}, ${caseDetails}, ${urgency}, ${consent || false}
      )
    `;
    
    return res.status(201).json({ success: true, message: 'Contact form submitted successfully' });
  } catch (err) {
    console.error('Contact submission error:', err);
    return res.status(500).json({ success: false, message: 'Database error' });
  }
}
