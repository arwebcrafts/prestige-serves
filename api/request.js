import { neon } from '@neondatabase/serverless';
import { put } from '@vercel/blob';
import formidable from 'formidable';
import fs from 'fs';
import { sendSMTPEmail } from './smtp-email.js';
import { buildServiceRequestEmailHtml } from './email-templates.js';
import { logger, perf, blobLogger, LOG_CATEGORIES } from './logger.js';

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
    await ensureEmailSentColumn(sql);
    
    // Get owner email from settings
    const ownerEmail = await getOwnerEmail(sql) || process.env.TO_EMAIL || 'muhammadwaqarsikandar@gmail.com';
    
    let clientName, contactName, email, phone, addressLine1, addressLine2, city, state, zip;
    let defendantName, caseNumber, courtJurisdiction, multipleDefendants, serviceType, deadlineDate;
    let specialInstructions;
    let uploadedFiles = [];

    const data = await new Promise((resolve, reject) => {
      const form = formidable({ multiples: true, maxFileSize: 10 * 1024 * 1024 });
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
    deadlineDate = Array.isArray(fields.deadlineDate) ? fields.deadlineDate[0] : fields.deadlineDate || null;
    specialInstructions = Array.isArray(fields.specialInstructions) ? fields.specialInstructions[0] : fields.specialInstructions || '';
    let defendantsData = null;
    try {
      defendantsData = fields.defendantsData ? JSON.parse(fields.defendantsData[0] || fields.defendantsData) : null;
    } catch (e) {
      defendantsData = null;
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

    await sql`
      INSERT INTO service_requests (
        client_name, contact_name, email, phone,
        address_line1, address_line2, city, state, zip,
        defendant_name, case_number, court_jurisdiction,
        multiple_defendants, service_type, deadline_date,
        special_instructions, defendants_data, uploaded_files, email_sent
      ) VALUES (
        ${clientName || ''}, ${contactName || ''}, ${email || ''}, ${phone || ''},
        ${addressLine1 || ''}, ${addressLine2 || ''}, ${city || ''}, ${state || ''}, ${zip || ''},
        ${defendantName || ''}, ${caseNumber || ''}, ${courtJurisdiction || ''},
        ${multipleDefendants || false}, ${serviceType || ''}, ${deadlineDate},
        ${specialInstructions || ''}, ${defendantsData}, ${uploadedFilesJson}, -1
      )
    `;

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

    return res.status(201).json({ success: true, message: 'Service request submitted successfully', emailSent: emailResult.success });
  } catch (err) {
    logger.error(LOG_CATEGORIES.FORM, 'Request submission error', err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
}
