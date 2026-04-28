import { neon } from '@neondatabase/serverless';
import { sendSMTPEmail, TO_EMAIL } from './smtp-email.js';

const DATABASE_URL = process.env.DATABASE_URL;

async function ensureEmailSentColumn(sql) {
  try {
    await sql`ALTER TABLE contact_submissions ADD COLUMN IF NOT EXISTS email_sent INTEGER DEFAULT -1`;
  } catch (e) {
    // Column may already exist
  }
}

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
    await ensureEmailSentColumn(sql);
    
    await sql`
      INSERT INTO contact_submissions (
        first_name, last_name, company, email, phone,
        reason, county, state, case_details, urgency, consent, email_sent
      ) VALUES (
        ${firstName}, ${lastName}, ${company}, ${email}, ${phone},
        ${reason}, ${county}, ${state}, ${caseDetails}, ${urgency}, ${consent || false}, -1
      )
    `;

    const htmlContent = `
      <h2>New Contact Submission</h2>
      <p><strong>Name:</strong> ${firstName} ${lastName}</p>
      <p><strong>Company:</strong> ${company || 'N/A'}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p><strong>County/City:</strong> ${county || 'N/A'}</p>
      <p><strong>State:</strong> ${state || 'N/A'}</p>
      <p><strong>Urgency:</strong> ${urgency}</p>
      <p><strong>Case Details:</strong> ${caseDetails || 'None provided'}</p>
    `;

    const emailResult = await sendSMTPEmail({
      to: TO_EMAIL,
      subject: `New Contact - ${reason} from ${firstName} ${lastName}`,
      html: htmlContent,
      text: `New Contact from ${firstName} ${lastName}. Company: ${company || 'N/A'}. Reason: ${reason}. Urgency: ${urgency}.`,
    });

    const emailSentStatus = emailResult.success ? 1 : 0;
    await sql`UPDATE contact_submissions SET email_sent = ${emailSentStatus} WHERE id = (SELECT id FROM contact_submissions WHERE email = ${email || ''} AND email_sent = -1 ORDER BY created_at DESC LIMIT 1)`;
    
    return res.status(201).json({ success: true, message: 'Contact form submitted successfully', emailSent: emailResult.success });
  } catch (err) {
    console.error('Contact submission error:', err);
    return res.status(500).json({ success: false, message: 'Database error' });
  }
}
