import { neon } from '@neondatabase/serverless';
import { sendSMTPEmail } from './smtp-email.js';
import { buildContactEmailHtml } from './email-templates.js';
import { logger, LOG_CATEGORIES } from './logger.js';
import { processContactFormToPST } from './pst-integration.js';

const DATABASE_URL = process.env.DATABASE_URL;

const EMAIL_TIMEOUT_MS = parseInt(process.env.EMAIL_TIMEOUT_MS, 10) || 15000;
const PST_TIMEOUT_MS = parseInt(process.env.PST_TOTAL_BUDGET_MS, 10) || 20000;

export const config = {
  // The platform default of 10s kills the function mid-flight whenever SMTP or
  // PST is slow, which the browser reports as a network error.
  maxDuration: 60,
};

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Idempotent but not free — one round trip per statement. Run once per warm
// container instead of on every submission.
let schemaReady = null;

async function getOwnerEmail(sql) {
  try {
    const result = await sql`SELECT value FROM settings WHERE key = 'owner_email' LIMIT 1`;
    return result.length > 0 && result[0].value ? result[0].value : null;
  } catch (e) {
    return null;
  }
}

async function ensureSchema(sql) {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS settings (key VARCHAR(255) PRIMARY KEY, value TEXT)`;
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
      await sql`ALTER TABLE contact_submissions ADD COLUMN IF NOT EXISTS email_sent INTEGER DEFAULT -1`;
      await sql`ALTER TABLE contact_submissions ADD COLUMN IF NOT EXISTS skip_trace_data JSONB`;
      await sql`ALTER TABLE contact_submissions ADD COLUMN IF NOT EXISTS email_error TEXT`;
      await sql`ALTER TABLE contact_submissions ADD COLUMN IF NOT EXISTS service_type VARCHAR(120)`;
      await sql`ALTER TABLE contact_submissions ADD COLUMN IF NOT EXISTS pst_synced INTEGER DEFAULT -1`;
      await sql`ALTER TABLE contact_submissions ADD COLUMN IF NOT EXISTS pst_message TEXT`;
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (e) { return {}; }
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try { return JSON.parse(raw); } catch (e) { return {}; }
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

  let submissionId = null;

  try {
    if (!DATABASE_URL) {
      logger.error(LOG_CATEGORIES.DB, 'DATABASE_URL is not configured', null);
      return res.status(500).json({
        success: false,
        message: 'The contact system is temporarily unavailable. Please call 424.235.3089.',
      });
    }

    const body = await readJsonBody(req);
    const {
      firstName, lastName, company, email, phone, reason, county, state, city,
      serviceType, caseDetails, urgency, consent, skipTraceData, defendantsData,
    } = body;

    if (!email && !firstName && !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in your contact details before submitting.',
      });
    }

    const sql = neon(DATABASE_URL);
    await ensureSchema(sql);

    let finalSkipTraceData = skipTraceData;
    if (defendantsData && defendantsData.length) {
      finalSkipTraceData = Object.assign({}, skipTraceData || {}, { defendants: defendantsData });
    }
    const skipTraceDataJson = finalSkipTraceData ? JSON.stringify(finalSkipTraceData) : null;

    const [inserted] = await sql`
      INSERT INTO contact_submissions (
        first_name, last_name, company, email, phone,
        reason, county, state, case_details, urgency, consent,
        email_sent, skip_trace_data, service_type, pst_synced
      ) VALUES (
        ${firstName || ''}, ${lastName || ''}, ${company || ''}, ${email || ''}, ${phone || ''},
        ${reason || ''}, ${city || county || ''}, ${state || ''}, ${caseDetails || ''}, ${urgency || ''},
        ${consent || false}, -1, ${skipTraceDataJson}, ${serviceType || ''}, -1
      )
      RETURNING id
    `;
    submissionId = inserted ? inserted.id : null;

    logger.info(LOG_CATEGORIES.FORM, 'Contact submission saved', { submissionId, reason });

    // Saved. Notification and PST sync are best-effort and time-bounded so a
    // slow upstream can never kill the invocation mid-response.
    const ownerEmail = await getOwnerEmail(sql)
      || process.env.TO_EMAIL
      || 'info@prestigeserves.com';

    const emailTask = withTimeout(
      sendSMTPEmail({
        to: ownerEmail,
        subject: `New Contact #${submissionId} - ${reason || 'Inquiry'} from ${firstName || ''} ${lastName || ''}`.trim(),
        html: buildContactEmailHtml({
          firstName, lastName, company, email, phone, reason, county: city || county,
          state, caseDetails, serviceType, urgency, skipTraceData: finalSkipTraceData,
        }),
        text: `New Contact #${submissionId} from ${firstName || ''} ${lastName || ''}. Company: ${company || 'N/A'}. Reason: ${reason || 'N/A'}. Urgency: ${urgency || 'N/A'}.`,
      }),
      EMAIL_TIMEOUT_MS,
      'Email send'
    ).catch((err) => ({ success: false, error: err.message }));

    const pstTask = withTimeout(
      processContactFormToPST({
        firstName, lastName, company, email, phone,
        city: city || county || '',
        state: state || '',
      }, { budgetMs: PST_TIMEOUT_MS }),
      PST_TIMEOUT_MS + 2000,
      'PST sync'
    ).catch((err) => ({ success: false, message: err.message }));

    const [emailResult, pstResult] = await Promise.all([emailTask, pstTask]);

    if (!emailResult.success) {
      logger.warn(LOG_CATEGORIES.EMAIL, 'Contact email failed', { submissionId, error: emailResult.error });
    }
    if (!pstResult.success) {
      logger.warn(LOG_CATEGORIES.PST_API, 'Contact not saved to PST', { submissionId, message: pstResult.message });
    }

    // By primary key. Matching on "newest row with this email and
    // email_sent = -1" marks the wrong row when submissions overlap.
    if (submissionId) {
      await sql`
        UPDATE contact_submissions
        SET email_sent = ${emailResult.success ? 1 : 0},
            email_error = ${emailResult.success ? null : String(emailResult.error || '').slice(0, 500)},
            pst_synced = ${pstResult.success ? 1 : 0},
            pst_message = ${pstResult.success ? null : String(pstResult.message || '').slice(0, 500)}
        WHERE id = ${submissionId}
      `.catch((updateErr) => {
        logger.error(LOG_CATEGORIES.DB, 'Failed to record contact delivery status', updateErr, { submissionId });
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Contact form submitted successfully',
      submissionId,
      emailSent: emailResult.success,
      pstSync: pstResult.success,
      pstEntitySerialNumber: pstResult.entitySerialNumber || null,
    });
  } catch (err) {
    logger.error(LOG_CATEGORIES.FORM, 'Contact submission error', err, { submissionId });

    // Saved, but a later step threw. Telling the client to resubmit would
    // just duplicate the lead.
    if (submissionId) {
      return res.status(201).json({
        success: true,
        message: 'Contact form submitted successfully',
        submissionId,
        emailSent: false,
        pstSync: false,
        degraded: true,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'We could not save your message. Please try again or call 424.235.3089.',
    });
  }
}
