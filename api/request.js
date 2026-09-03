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

const DATABASE_URL = process.env.DATABASE_URL;
const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

export const config = {
  api: {
    bodyParser: false,
  },
};

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
    await sql`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS email_sent INTEGER DEFAULT -1`;
  } catch (e) {
    // Column may already exist
  }
}

async function ensureTablesExist(sql) {
  try {
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
  } catch (e) {
    // Table may already exist
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
    const sql = neon(DATABASE_URL);
    await sql`CREATE TABLE IF NOT EXISTS settings (key VARCHAR(255) PRIMARY KEY, value TEXT)`.catch(() => {});
    await ensureTablesExist(sql);
    await ensureEmailSentColumn(sql);
    
    // Get owner email from settings
    const ownerEmail = await getOwnerEmail(sql) || process.env.TO_EMAIL || 'muhammadwaqarsikandar@gmail.com';
    
    let clientName, contactName, email, phone, addressLine1, addressLine2, city, state, zip;
    let defendantName, caseNumber, courtJurisdiction, multipleDefendants, serviceType, deadlineDate;
    let specialInstructions;
    let uploadedFiles = [];

    const data = await new Promise((resolve, reject) => {
      const form = formidable({
        multiples: true,
        maxFileSize: MAX_UPLOAD_FILE_BYTES,
        maxTotalFileSize: MAX_UPLOAD_TOTAL_BYTES,
      });
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const { fields, files } = data;

    clientName = Array.isArray(fields.clientName) ? fields.clientName[0] : fields.clientName || '';
    contactName = Array.isArray(fields.contactName) ? fields.contactName[0] : fields.contactName || '';
    email = Array.isArray(fields.email) ? fields.email[0] : fields.email || '';
    phone = Array.isArray(fields.phone) ? fields.phone[0] : fields.phone || '';
    addressLine1 = Array.isArray(fields.addressLine1) ? fields.addressLine1[0] : fields.addressLine1 || '';
    addressLine2 = Array.isArray(fields.addressLine2) ? fields.addressLine2[0] : fields.addressLine2 || '';
    city = Array.isArray(fields.city) ? fields.city[0] : fields.city || '';
    state = Array.isArray(fields.state) ? fields.state[0] : fields.state || '';
    zip = Array.isArray(fields.zip) ? fields.zip[0] : fields.zip || '';
    defendantName = Array.isArray(fields.defendantName) ? fields.defendantName[0] : fields.defendantName || '';
    caseNumber = Array.isArray(fields.caseNumber) ? fields.caseNumber[0] : fields.caseNumber || '';
    courtJurisdiction = Array.isArray(fields.courtJurisdiction) ? fields.courtJurisdiction[0] : fields.courtJurisdiction || '';
    multipleDefendants = fields.multiple_defendants === 'true';
    serviceType = Array.isArray(fields.serviceType) ? fields.serviceType[0] : fields.serviceType || '';
    
    const rawDeadline = Array.isArray(fields.deadlineDate) ? fields.deadlineDate[0] : fields.deadlineDate;
    deadlineDate = (rawDeadline && String(rawDeadline).trim()) ? String(rawDeadline).trim() : null;

    specialInstructions = Array.isArray(fields.specialInstructions) ? fields.specialInstructions[0] : fields.specialInstructions || '';
    
    let defendantsData = null;
    let defendantsDataJson = null;
    if (fields.defendantsData) {
      try {
        const rawDef = Array.isArray(fields.defendantsData) ? fields.defendantsData[0] : fields.defendantsData;
        if (typeof rawDef === 'string') {
          defendantsDataJson = rawDef.trim() || null;
          defendantsData = JSON.parse(rawDef);
        } else {
          defendantsDataJson = JSON.stringify(rawDef);
          defendantsData = rawDef;
        }
      } catch (e) {
        defendantsData = null;
        defendantsDataJson = null;
      }
    }

    const fileField = files.files || files.file;
    if (fileField) {
      const fileArray = Array.isArray(fileField) ? fileField : [fileField];
      for (const file of fileArray) {
        if (file && file.filepath) {
          try {
            const buffer = fs.readFileSync(file.filepath);
            const blobTimer = perf.startTimer('blobUpload');
            const blobResult = await put(file.originalFilename || file.newFilename, buffer, {
              access: 'public',
              token: BLOB_READ_WRITE_TOKEN,
            });
            blobTimer.end();
            blobLogger.uploaded(file.originalFilename || file.newFilename, buffer.length);
            uploadedFiles.push({ name: file.originalFilename || file.newFilename, url: blobResult.url });
          } catch (blobErr) {
            logger.error(LOG_CATEGORIES.BLOB, 'Blob upload error', blobErr, { filename: file.originalFilename || file.newFilename });
          }
        }
      }
    }

    const uploadedFilesJson = uploadedFiles.length > 0 ? JSON.stringify(uploadedFiles) : null;

  let skipTraceData = null;
    try {
      const rawSkip = fields.skipTraceData;
      const skipStr = Array.isArray(rawSkip) ? rawSkip[0] : rawSkip;
      skipTraceData = skipStr ? JSON.parse(skipStr) : null;
    } catch (e) {
      skipTraceData = null;
    }

    await sql`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS skip_trace_data JSONB`.catch(() => {});

    const [inserted] = await sql`
      INSERT INTO service_requests (
        client_name, contact_name, email, phone,
        address_line1, address_line2, city, state, zip,
        defendant_name, case_number, court_jurisdiction,
        multiple_defendants, service_type, deadline_date,
        special_instructions, defendants_data, uploaded_files, skip_trace_data, email_sent
      ) VALUES (
        ${clientName || ''}, ${contactName || ''}, ${email || ''}, ${phone || ''},
        ${addressLine1 || ''}, ${addressLine2 || ''}, ${city || ''}, ${state || ''}, ${zip || ''},
        ${defendantName || ''}, ${caseNumber || ''}, ${courtJurisdiction || ''},
        ${multipleDefendants || false}, ${serviceType || ''}, ${deadlineDate},
        ${specialInstructions || ''}, ${defendantsDataJson}, ${uploadedFilesJson}, ${skipTraceData ? JSON.stringify(skipTraceData) : null}, -1
      )
      RETURNING id
    `;
    const submissionId = inserted ? inserted.id : null;

    const htmlContent = buildServiceRequestEmailHtml({
      clientName, contactName, email, phone, addressLine1, addressLine2, city, state, zip,
      defendantName, caseNumber, courtJurisdiction, serviceType, deadlineDate, specialInstructions, defendantsData, uploadedFiles
    });

    const emailResult = await sendSMTPEmail({
      to: ownerEmail,
      subject: `New Service Request - ${serviceType} from ${clientName}`,
      html: htmlContent,
      text: `New Service Request from ${clientName}. Contact: ${contactName}, ${email}, ${phone}. Service type: ${serviceType}.`,
    });

    const emailSentStatus = emailResult.success ? 1 : 0;
    await sql`UPDATE service_requests SET email_sent = ${emailSentStatus} WHERE id = (SELECT id FROM service_requests WHERE email = ${email || ''} AND email_sent = -1 ORDER BY created_at DESC LIMIT 1)`;

    // Sync to PST in background — does not block the client response
    const pstPayload = {
      clientName,
      contactName,
      email,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      zip,
      defendantName,
      caseNumber,
      courtJurisdiction,
      serviceType,
      deadlineDate,
      specialInstructions,
      defendantsData: defendantsData ? JSON.stringify(defendantsData) : null
    };
    if (skipTraceData) {
      const subjectName = [skipTraceData.firstName, skipTraceData.middleName, skipTraceData.lastName].filter(Boolean).join(' ').trim();
      if (subjectName) pstPayload.defendantName = subjectName;
      if (skipTraceData.lastAddress) pstPayload.addressLine1 = skipTraceData.lastAddress;
      if (skipTraceData.deadline) pstPayload.deadlineDate = skipTraceData.deadline;
      if (skipTraceData.caseNumber) pstPayload.caseNumber = skipTraceData.caseNumber;
      if (skipTraceData.court) pstPayload.courtJurisdiction = skipTraceData.court;
      if (skipTraceData.jurisdiction && String(skipTraceData.jurisdiction).length === 2) {
        pstPayload.state = String(skipTraceData.jurisdiction).toUpperCase();
      }
      const stBlock = ['--- Skip Trace Intake ---'];
      if (skipTraceData.purpose) stBlock.push('Purpose: ' + skipTraceData.purpose);
      if (skipTraceData.dob) stBlock.push('Subject DOB: ' + skipTraceData.dob);
      if (skipTraceData.notes) stBlock.push(skipTraceData.notes);
      if (stBlock.length > 1) {
        pstPayload.specialInstructions = pstPayload.specialInstructions
          ? (pstPayload.specialInstructions + '\n\n' + stBlock.join('\n'))
          : stBlock.join('\n');
      }
    }
    let pstResult = { success: false, message: 'PST sync skipped' };
    try {
      pstResult = await processServiceRequestToPST(pstPayload);
      if (pstResult.success) {
        logger.info(LOG_CATEGORIES.PST_API, 'Service request saved to PST', { jobNumber: pstResult.jobNumber });
      } else {
        logger.warn(LOG_CATEGORIES.PST_API, 'Service request not saved to PST', { message: pstResult.message });
      }
    } catch (err) {
      logger.error(LOG_CATEGORIES.PST_API, 'PST request error', err);
      pstResult = { success: false, message: err.message };
    }

    return res.status(201).json({
      success: true,
      message: 'Service request submitted successfully',
      emailSent: emailResult.success,
      submissionId,
      pstSync: pstResult.success,
      pstJobNumber: pstResult.jobNumber || null
    });
  } catch (err) {
    logger.error(LOG_CATEGORIES.FORM, 'Request submission error', err);
    if (err.code === 'LIMIT_FILE_SIZE' || (err.message && err.message.includes('maxFileSize'))) {
      return res.status(413).json({
        success: false,
        message: 'One or more files exceed the ' + MAX_UPLOAD_FILE_MB + ' MB per-file upload limit.',
      });
    }
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
}
