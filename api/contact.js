import { neon } from '@neondatabase/serverless';
import { sendSMTPEmail } from './smtp-email.js';
import { buildContactEmailHtml } from './email-templates.js';
import { logger, perf, emailLogger, LOG_CATEGORIES } from './logger.js';

const DATABASE_URL = process.env.DATABASE_URL;

async function getOwnerEmail(sql) {
  try {
    const result = await sql`SELECT value FROM settings WHERE key = 'owner_email' LIMIT 1`;
    return result.length > 0 && result[0].value ? result[0].value : null;
  } catch (e) {
    return null;
  }
}

async function ensureEmailSentColumn(sql) {
  try {
    await sql`ALTER TABLE contact_submissions ADD COLUMN IF NOT EXISTS email_sent INTEGER DEFAULT -1`;
  } catch (e) {
    // Column may already exist
  }
}

async function ensureSkipTraceDataColumn(sql) {
  try {
    await sql`ALTER TABLE contact_submissions ADD COLUMN IF NOT EXISTS skip_trace_data JSONB`;
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
    const { firstName, lastName, company, email, phone, reason, county, state, caseDetails, urgency, consent, skipTraceData } = req.body;
    
    const sql = neon(DATABASE_URL);
    await sql`CREATE TABLE IF NOT EXISTS settings (key VARCHAR(255) PRIMARY KEY, value TEXT)`.catch(() => {});
    await ensureEmailSentColumn(sql);
    await ensureSkipTraceDataColumn(sql);
    
    // Get owner email from settings
    const ownerEmail = await getOwnerEmail(sql) || process.env.TO_EMAIL || 'muhammadwaqarsikandar@gmail.com';
    
    // Debug: log what we're about to insert
    console.log('[DEBUG API contact] skipTraceData being inserted:', skipTraceData);
    console.log('[DEBUG API contact] JSON.stringify(skipTraceData):', skipTraceData ? JSON.stringify(skipTraceData) : null);
    
    const skipTraceDataJson = skipTraceData ? JSON.stringify(skipTraceData) : null;
    
    await sql`
      INSERT INTO contact_submissions (
        first_name, last_name, company, email, phone,
        reason, county, state, case_details, urgency, consent, email_sent, skip_trace_data
      ) VALUES (
        ${firstName}, ${lastName}, ${company}, ${email}, ${phone},
        ${reason}, ${county}, ${state}, ${caseDetails}, ${urgency}, ${consent || false}, -1, ${skipTraceDataJson}
      )
    `;
    
    console.log('[DEBUG API contact] Insert completed');

    const htmlContent = buildContactEmailHtml({
      firstName, lastName, company, email, phone, reason, county, state, caseDetails, urgency
    });

    const emailResult = await sendSMTPEmail({
      to: ownerEmail,
      subject: `New Contact - ${reason} from ${firstName} ${lastName}`,
      html: htmlContent,
      text: `New Contact from ${firstName} ${lastName}. Company: ${company || 'N/A'}. Reason: ${reason}. Urgency: ${urgency}.`,
    });

    const emailSentStatus = emailResult.success ? 1 : 0;
    logger.info(LOG_CATEGORIES.EMAIL, 'Contact email result', { success: emailResult.success, status: emailSentStatus });
    await sql`UPDATE contact_submissions SET email_sent = ${emailSentStatus} WHERE id = (SELECT id FROM contact_submissions WHERE email = ${email || ''} AND email_sent = -1 ORDER BY created_at DESC LIMIT 1)`;
    logger.info(LOG_CATEGORIES.DB, 'Contact email_sent update completed');
    
    return res.status(201).json({ success: true, message: 'Contact form submitted successfully', emailSent: emailResult.success });
  } catch (err) {
    logger.error(LOG_CATEGORIES.FORM, 'Contact submission error', err);
    return res.status(500).json({ success: false, message: 'Database error' });
  }
}
