import { neon } from '@neondatabase/serverless';
import { put } from '@vercel/blob';
import formidable from 'formidable';
import fs from 'fs';
import { sendSMTPEmail } from './smtp-email.js';
import { buildServiceRequestEmailHtml } from './email-templates.js';
import { logger, perf, blobLogger, LOG_CATEGORIES } from './logger.js';
import { processServiceRequestToPST } from './pst-integration.js';

const MAX_UPLOAD_FILE_MB = Math.max(1, parseInt(process.env.UPLOAD_MAX_FILE_MB, 10) || 25);
const MAX_UPLOAD_FILE_BYTES = MAX_UPLOAD_FILE_MB * 1024 * 1024;
const MAX_UPLOAD_TOTAL_MB = Math.max(MAX_UPLOAD_FILE_MB, parseInt(process.env.UPLOAD_MAX_TOTAL_MB, 10) || 100);
const MAX_UPLOAD_TOTAL_BYTES = MAX_UPLOAD_TOTAL_MB * 1024 * 1024;

// Hard ceilings for the slow, external steps. The submission is already saved
// before either runs, so exceeding one degrades the response rather than
// killing the invocation and leaving the browser with a dropped connection.
const EMAIL_TIMEOUT_MS = parseInt(process.env.EMAIL_TIMEOUT_MS, 10) || 15000;
const PST_TIMEOUT_MS = parseInt(process.env.PST_TOTAL_BUDGET_MS, 10) || 20000;

const DATABASE_URL = process.env.DATABASE_URL;
const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

export const config = {
  api: {
    bodyParser: false,
  },
  // Well above the worst case (insert + email + PST). Without this the platform
  // default of 10s kills the function mid-flight on any slow upstream.
  maxDuration: 60,
};

// Schema work is idempotent but costs a network round trip to Neon each time.
// Run it once per warm container instead of on every submission.
let schemaReady = null;

async function ensureSchema(sql) {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS settings (key VARCHAR(255) PRIMARY KEY, value TEXT)`;
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
      await sql`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS email_sent INTEGER DEFAULT -1`;
      await sql`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS skip_trace_data JSONB`;
      await sql`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS email_error TEXT`;
      await sql`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS pst_synced INTEGER DEFAULT -1`;
      await sql`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS pst_job_number TEXT`;
      await sql`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS pst_message TEXT`;
    })().catch((err) => {
      // Let the next request retry rather than caching a failure forever.
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

async function getOwnerEmail(sql) {
  try {
    const result = await sql`SELECT value FROM settings WHERE key = 'owner_email' LIMIT 1`;
    return result.length > 0 && result[0].value ? result[0].value : null;
  } catch (e) {
    return null;
  }
}

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function first(value) {
  return Array.isArray(value) ? value[0] : value;
}

function str(value) {
  const v = first(value);
  return v === undefined || v === null ? '' : String(v);
}

function parseJsonField(value) {
  const raw = first(value);
  if (raw === undefined || raw === null || raw === '') return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

// The browser now uploads documents straight to Blob and posts JSON. Multipart
// is still accepted so a client running a cached copy of the old forms.js keeps
// working through a deploy.
async function parseRequestBody(req) {
  const contentType = String(req.headers['content-type'] || '');

  if (contentType.includes('multipart/form-data')) {
    const { fields, files } = await new Promise((resolve, reject) => {
      const form = formidable({
        multiples: true,
        maxFileSize: MAX_UPLOAD_FILE_BYTES,
        maxTotalFileSize: MAX_UPLOAD_TOTAL_BYTES,
      });
      form.parse(req, (err, parsedFields, parsedFiles) => {
        if (err) reject(err);
        else resolve({ fields: parsedFields, files: parsedFiles });
      });
    });
    return { fields, files };
  }

  const raw = await readRawBody(req);
  if (!raw.trim()) return { fields: {}, files: {} };
  return { fields: JSON.parse(raw), files: {} };
}

// Legacy multipart path only: relay any attached files on to Blob storage.
async function uploadLegacyFiles(files) {
  const uploaded = [];
  const fileField = files.files || files.file;
  if (!fileField) return uploaded;

  const fileArray = Array.isArray(fileField) ? fileField : [fileField];
  for (const file of fileArray) {
    if (!file || !file.filepath) continue;
    try {
      const buffer = fs.readFileSync(file.filepath);
      const blobTimer = perf.startTimer('blobUpload');
      const blobResult = await put(file.originalFilename || file.newFilename, buffer, {
        access: 'public',
        addRandomSuffix: true,
        token: BLOB_READ_WRITE_TOKEN,
      });
      blobTimer.end();
      blobLogger.uploaded(file.originalFilename || file.newFilename, buffer.length);
      uploaded.push({ name: file.originalFilename || file.newFilename, url: blobResult.url });
    } catch (blobErr) {
      logger.error(LOG_CATEGORIES.BLOB, 'Blob upload error', blobErr, {
        filename: file.originalFilename || file.newFilename,
      });
    }
  }
  return uploaded;
}

// Only keep entries that actually look like a stored Blob URL — the list comes
// from the browser, so it is not trusted as-is.
function normalizeUploadedFiles(value) {
  const parsed = parseJsonField(value);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((f) => f && typeof f.url === 'string' && /^https:\/\/[\w.-]+\/[^\s]*$/.test(f.url))
    .slice(0, 50)
    .map((f) => ({
      name: String(f.name || 'document').slice(0, 255),
      url: f.url,
      size: Number.isFinite(f.size) ? f.size : undefined,
    }));
}

function buildPstPayload(record, skipTraceData) {
  const payload = {
    clientName: record.clientName,
    contactName: record.contactName,
    email: record.email,
    phone: record.phone,
    addressLine1: record.addressLine1,
    addressLine2: record.addressLine2,
    city: record.city,
    state: record.state,
    zip: record.zip,
    defendantName: record.defendantName,
    caseNumber: record.caseNumber,
    courtJurisdiction: record.courtJurisdiction,
    serviceType: record.serviceType,
    deadlineDate: record.deadlineDate,
    specialInstructions: record.specialInstructions,
    defendantsData: record.defendantsData ? JSON.stringify(record.defendantsData) : null,
  };

  if (!skipTraceData) return payload;

  const subjectName = [skipTraceData.firstName, skipTraceData.middleName, skipTraceData.lastName]
    .filter(Boolean).join(' ').trim();
  if (subjectName) payload.defendantName = subjectName;
  if (skipTraceData.lastAddress) payload.addressLine1 = skipTraceData.lastAddress;
  if (skipTraceData.deadline) payload.deadlineDate = skipTraceData.deadline;
  if (skipTraceData.caseNumber) payload.caseNumber = skipTraceData.caseNumber;
  if (skipTraceData.court) payload.courtJurisdiction = skipTraceData.court;
  if (skipTraceData.jurisdiction && String(skipTraceData.jurisdiction).length === 2) {
    payload.state = String(skipTraceData.jurisdiction).toUpperCase();
  }

  const stBlock = ['--- Skip Trace Intake ---'];
  if (skipTraceData.purpose) stBlock.push('Purpose: ' + skipTraceData.purpose);
  if (skipTraceData.dob) stBlock.push('Subject DOB: ' + skipTraceData.dob);
  if (skipTraceData.notes) stBlock.push(skipTraceData.notes);
  if (stBlock.length > 1) {
    payload.specialInstructions = payload.specialInstructions
      ? payload.specialInstructions + '\n\n' + stBlock.join('\n')
      : stBlock.join('\n');
  }
  return payload;
}

// YYYY-MM-DD or nothing. An unparseable string would otherwise blow up the
// INSERT and lose the whole submission.
function normalizeDeadline(value) {
  const raw = str(value).trim();
  if (!raw) return null;
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 10);
  }
  return raw;
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
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  let submissionId = null;

  try {
    if (!DATABASE_URL) {
      logger.error(LOG_CATEGORIES.DB, 'DATABASE_URL is not configured', null);
      return res.status(500).json({
        success: false,
        message: 'The request system is temporarily unavailable. Please call 424.235.3089.',
      });
    }

    let fields;
    let files;
    try {
      ({ fields, files } = await parseRequestBody(req));
    } catch (parseErr) {
      logger.error(LOG_CATEGORIES.FORM, 'Request body parse error', parseErr);
      if (parseErr.code === 'LIMIT_FILE_SIZE' || String(parseErr.message || '').includes('maxFileSize')) {
        return res.status(413).json({
          success: false,
          message: `One or more files exceed the ${MAX_UPLOAD_FILE_MB} MB per-file upload limit.`,
        });
      }
      return res.status(400).json({
        success: false,
        message: 'We could not read your submission. Please try again or call 424.235.3089.',
      });
    }

    const record = {
      clientName: str(fields.clientName),
      contactName: str(fields.contactName),
      email: str(fields.email).trim(),
      phone: str(fields.phone),
      addressLine1: str(fields.addressLine1),
      addressLine2: str(fields.addressLine2),
      city: str(fields.city),
      state: str(fields.state),
      zip: str(fields.zip),
      defendantName: str(fields.defendantName),
      caseNumber: str(fields.caseNumber),
      courtJurisdiction: str(fields.courtJurisdiction),
      serviceType: str(fields.serviceType),
      specialInstructions: str(fields.specialInstructions),
      deadlineDate: normalizeDeadline(fields.deadlineDate),
      multipleDefendants: str(fields.multiple_defendants) === 'true',
      defendantsData: parseJsonField(fields.defendantsData),
    };

    if (!record.email && !record.contactName && !record.clientName) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in your contact details before submitting.',
      });
    }

    const skipTraceData = parseJsonField(fields.skipTraceData);

    // Files uploaded straight to Blob by the browser, plus anything that came
    // through the legacy multipart path.
    const uploadedFiles = normalizeUploadedFiles(fields.uploadedFiles)
      .concat(await uploadLegacyFiles(files));

    const sql = neon(DATABASE_URL);
    await ensureSchema(sql);

    const [inserted] = await sql`
      INSERT INTO service_requests (
        client_name, contact_name, email, phone,
        address_line1, address_line2, city, state, zip,
        defendant_name, case_number, court_jurisdiction,
        multiple_defendants, service_type, deadline_date,
        special_instructions, defendants_data, uploaded_files, skip_trace_data,
        email_sent, pst_synced
      ) VALUES (
        ${record.clientName}, ${record.contactName}, ${record.email}, ${record.phone},
        ${record.addressLine1}, ${record.addressLine2}, ${record.city}, ${record.state}, ${record.zip},
        ${record.defendantName}, ${record.caseNumber}, ${record.courtJurisdiction},
        ${record.multipleDefendants}, ${record.serviceType}, ${record.deadlineDate},
        ${record.specialInstructions},
        ${record.defendantsData ? JSON.stringify(record.defendantsData) : null},
        ${uploadedFiles.length ? JSON.stringify(uploadedFiles) : null},
        ${skipTraceData ? JSON.stringify(skipTraceData) : null},
        -1, -1
      )
      RETURNING id
    `;
    submissionId = inserted ? inserted.id : null;

    logger.info(LOG_CATEGORIES.FORM, 'Service request saved', {
      submissionId,
      serviceType: record.serviceType,
      fileCount: uploadedFiles.length,
    });

    // From here on the request is durably saved. Email and PST are best-effort:
    // both are bounded, run concurrently, and a failure in either is recorded
    // rather than surfaced to the client as a failed submission.
    const ownerEmail = await getOwnerEmail(sql)
      || process.env.TO_EMAIL
      || 'info@prestigeserves.com';

    const emailTask = withTimeout(
      sendSMTPEmail({
        to: ownerEmail,
        subject: `New Service Request #${submissionId} - ${record.serviceType} from ${record.clientName}`,
        html: buildServiceRequestEmailHtml({
          ...record,
          defendantsData: record.defendantsData,
          uploadedFiles,
        }),
        text: `New Service Request #${submissionId} from ${record.clientName}. Contact: ${record.contactName}, ${record.email}, ${record.phone}. Service type: ${record.serviceType}.`,
      }),
      EMAIL_TIMEOUT_MS,
      'Email send'
    ).catch((err) => ({ success: false, error: err.message }));

    const pstTask = withTimeout(
      processServiceRequestToPST(buildPstPayload(record, skipTraceData), { budgetMs: PST_TIMEOUT_MS }),
      PST_TIMEOUT_MS + 2000,
      'PST sync'
    ).catch((err) => ({ success: false, message: err.message }));

    const [emailResult, pstResult] = await Promise.all([emailTask, pstTask]);

    if (emailResult.success) {
      logger.info(LOG_CATEGORIES.EMAIL, 'Service request email sent', { submissionId });
    } else {
      logger.warn(LOG_CATEGORIES.EMAIL, 'Service request email failed', {
        submissionId,
        error: emailResult.error,
      });
    }

    if (pstResult.success) {
      logger.info(LOG_CATEGORIES.PST_API, 'Service request saved to PST', {
        submissionId,
        jobNumber: pstResult.jobNumber,
      });
    } else {
      logger.warn(LOG_CATEGORIES.PST_API, 'Service request not saved to PST', {
        submissionId,
        message: pstResult.message,
      });
    }

    // Update by primary key. The old query matched "most recent row with this
    // email and email_sent = -1", which marks the wrong row whenever two
    // submissions from the same address overlap.
    if (submissionId) {
      await sql`
        UPDATE service_requests
        SET email_sent = ${emailResult.success ? 1 : 0},
            email_error = ${emailResult.success ? null : String(emailResult.error || '').slice(0, 500)},
            pst_synced = ${pstResult.success ? 1 : 0},
            pst_job_number = ${pstResult.jobNumber ? String(pstResult.jobNumber) : null},
            pst_message = ${pstResult.success ? null : String(pstResult.message || '').slice(0, 500)}
        WHERE id = ${submissionId}
      `.catch((updateErr) => {
        logger.error(LOG_CATEGORIES.DB, 'Failed to record delivery status', updateErr, { submissionId });
      });
    }

    // The submission itself succeeded, so report success. A failed notification
    // or PST sync is an internal problem, visible on the dashboard — it is not
    // the client's to retry, and telling them to resubmit creates duplicates.
    return res.status(201).json({
      success: true,
      message: 'Service request submitted successfully',
      submissionId,
      emailSent: emailResult.success,
      pstSync: pstResult.success,
      pstJobNumber: pstResult.jobNumber || null,
      uploadedFileCount: uploadedFiles.length,
    });
  } catch (err) {
    logger.error(LOG_CATEGORIES.FORM, 'Request submission error', err, { submissionId });

    // The row was written but a later step threw. Do not tell the client to
    // resubmit — that would duplicate the job.
    if (submissionId) {
      return res.status(201).json({
        success: true,
        message: 'Service request submitted successfully',
        submissionId,
        emailSent: false,
        pstSync: false,
        degraded: true,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'We could not save your request. Please try again or call 424.235.3089.',
    });
  }
}
