require('dotenv').config({ path: '.env.local' });
const http = require('http');
const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');
const { put } = require('@vercel/blob');
const { processContactFormToPST, processServiceRequestToPST } = require('./api/pst-integration');
const nodemailer = require('nodemailer');
const { logger, perf, emailLogger, pstLogger, blobLogger, LOG_CATEGORIES } = require('./api/logger');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_P8aH3JElyXBw@ep-gentle-frog-a4yzwn3w-pooler.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';
const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || 'vercel_blob_rw_1qFTdRzk36aoQZsG_uiiyBg0DZ8Sl5zySi6DmqaMnIz9eqV';

// Hostinger SMTP Configuration
const HOSTINGER_SMTP_HOST = process.env.HOSTINGER_SMTP_HOST || 'smtp.hostinger.com';
const HOSTINGER_SMTP_PORT = parseInt(process.env.HOSTINGER_SMTP_PORT) || 465;
const HOSTINGER_SMTP_SECURE = process.env.HOSTINGER_SMTP_SECURE === 'true' || true;
const HOSTINGER_SMTP_USER = process.env.HOSTINGER_SMTP_USER;
const HOSTINGER_SMTP_PASS = process.env.HOSTINGER_SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || 'crm@arwebcrafts.com';
const TO_EMAIL = process.env.TO_EMAIL || 'muhammadwaqarsikandar@gmail.com';

let transporter = null;

function getSMTPTransporter() {
  if (!HOSTINGER_SMTP_USER || !HOSTINGER_SMTP_PASS) {
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: HOSTINGER_SMTP_HOST,
      port: HOSTINGER_SMTP_PORT,
      secure: HOSTINGER_SMTP_SECURE,
      auth: {
        user: HOSTINGER_SMTP_USER,
        pass: HOSTINGER_SMTP_PASS,
      },
    });
  }
  return transporter;
}

async function sendSMTPEmail({ to, subject, html, text }) {
  const timer = perf.startTimer('sendSMTPEmail');
  const transport = getSMTPTransporter();
  if (!transport) {
    logger.warn(LOG_CATEGORIES.EMAIL, 'SMTP transporter not configured');
    return { success: false, reason: 'SMTP transporter not configured' };
  }
  try {
    const info = await transport.sendMail({
      from: `"Prestige Serves" <${FROM_EMAIL}>`,
      to: to,
      subject: subject,
      html: html || '',
      text: text || '',
    });
    timer.end();
    emailLogger.sent(to, subject.substring(0, 50));
    return { success: true, messageId: info.messageId };
  } catch (err) {
    timer.end();
    logger.error(LOG_CATEGORIES.EMAIL, 'SMTP Email error', err);
    return { success: false, error: err.message };
  }
}

// Beautiful Email Templates
function buildContactEmailHtml(data) {
  const { firstName, lastName, company, email, phone, reason, city, state, caseDetails, serviceType, urgency, skipTraceData } = data;
  
  // Build Skip Trace section if present
  let skipTraceSection = '';
  if (skipTraceData && (skipTraceData.firstName || skipTraceData.fullname)) {
    const st = skipTraceData;
    skipTraceSection = `
                      <tr>
                        <td style="padding:25px;background-color:#fef3f2;">
                          <p style="margin:0 0 15px 0;font-size:14px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:1px;">Skip Trace Intake Data</p>
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            ${st.serviceType ? `
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Service Type</td>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;font-weight:600;">${st.serviceType}</td>
                            </tr>` : ''}
                            ${st.firstName || st.fullname ? `
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Subject Name</td>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">${st.firstName || ''} ${st.lastName || ''} ${st.fullname || ''}</td>
                            </tr>` : ''}
                            ${st.middleName ? `
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Middle Name</td>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">${st.middleName}</td>
                            </tr>` : ''}
                            ${st.aliases ? `
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Aliases / Maiden Name</td>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">${st.aliases}</td>
                            </tr>` : ''}
                            ${st.dob ? `
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Date of Birth</td>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">${st.dob}</td>
                            </tr>` : ''}
                            ${st.lastPhone ? `
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Last Known Phone</td>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">${st.lastPhone}</td>
                            </tr>` : ''}
                            ${st.lastAddress ? `
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Last Known Address</td>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">${st.lastAddress}</td>
                            </tr>` : ''}
                            ${st.lastEmail ? `
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Last Known Email</td>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">${st.lastEmail}</td>
                            </tr>` : ''}
                            ${st.social ? `
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Social Media</td>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">${st.social}</td>
                            </tr>` : ''}
                            ${st.ssn ? `
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">SSN (Last 4)</td>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">****${st.ssn}</td>
                            </tr>` : ''}
                            ${st.dl ? `
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Driver's License</td>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">${st.dl}</td>
                            </tr>` : ''}
                            ${st.vehicle ? `
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Vehicle</td>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">${st.vehicle}</td>
                            </tr>` : ''}
                            ${st.employer ? `
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Known Employer</td>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">${st.employer}</td>
                            </tr>` : ''}
                            ${st.purpose ? `
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Purpose</td>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">${st.purpose}</td>
                            </tr>` : ''}
                            ${st.caseNumber ? `
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Case / File Number</td>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">${st.caseNumber}</td>
                            </tr>` : ''}
                            ${st.court ? `
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Court / Jurisdiction</td>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">${st.court}</td>
                            </tr>` : ''}
                            ${st.deadline ? `
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Deadline</td>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">${st.deadline}</td>
                            </tr>` : ''}
                            ${st.rush ? `
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Rush Request</td>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#dc2626;text-align:right;font-weight:600;">${st.rush === 'yes' ? 'Yes — rush fees apply' : 'No'}</td>
                            </tr>` : ''}
                            ${st.priorSearch ? `
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Prior Search Attempted</td>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">${st.priorSearch === 'yes' ? 'Yes' : 'No'}</td>
                            </tr>` : ''}
                            ${st.role ? `
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Role / Relationship</td>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">${st.role}</td>
                            </tr>` : ''}
                            ${st.jurisdiction ? `
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">State of Jurisdiction</td>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">${st.jurisdiction}</td>
                            </tr>` : ''}
                            ${st.notes ? `
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Additional Notes</td>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">${st.notes}</td>
                            </tr>` : ''}
                            ${st.fcraCertified ? `
                            <tr>
                              <td style="padding:8px 0;font-size:12px;color:#94a3b8;text-transform:uppercase;">FCRA Certified</td>
                              <td style="padding:8px 0;font-size:14px;color:#16a34a;text-align:right;font-weight:600;">✓ Yes</td>
                            </tr>` : ''}
                          </table>
                        </td>
                      </tr>`;
  }
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Contact</title>
</head>
<body style="margin:0;padding:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background-color:#f4f4f4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f4;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a3a5c 0%,#2c5282 100%);padding:40px 40px 30px 40px;text-align:center;">
              <h1 style="margin:0;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:1px;">PRESTIGE SERVES</h1>
              <p style="margin:10px 0 0 0;font-size:14px;color:rgba(255,255,255,0.8);letter-spacing:2px;text-transform:uppercase;">Professional Process Serving</p>
            </td>
          </tr>
          <!-- Badge -->
          <tr>
            <td style="padding:30px 40px 20px 40px;text-align:center;">
              <span style="display:inline-block;background-color:#e8f5e9;color:#2e7d32;font-size:12px;font-weight:600;padding:8px 20px;border-radius:20px;text-transform:uppercase;letter-spacing:1px;">📬 New Contact Inquiry</span>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:20px 40px;">
              <h2 style="margin:0 0 20px 0;font-size:24px;font-weight:600;color:#1a3a5c;">Hello,</h2>
              <p style="margin:0 0 25px 0;font-size:16px;line-height:1.6;color:#555555;">You have received a new contact inquiry. Review the details below and respond promptly.</p>
            </td>
          </tr>
          <!-- Details Card -->
          <tr>
            <td style="padding:0 40px 30px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
                <tr>
                  <td style="padding:25px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;">
                          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Contact Name</span>
                          <p style="margin:5px 0 0 0;font-size:16px;color:#1a3a5c;font-weight:600;">${firstName} ${lastName}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;">
                          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Company</span>
                          <p style="margin:5px 0 0 0;font-size:16px;color:#333333;">${company || 'N/A'}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;">
                          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Email Address</span>
                          <p style="margin:5px 0 0 0;font-size:16px;color:#2563eb;"><a href="mailto:${email}" style="color:#2563eb;text-decoration:none;">${email}</a></p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;">
                          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Phone Number</span>
                          <p style="margin:5px 0 0 0;font-size:16px;color:#333333;"><a href="tel:${phone}" style="color:#333333;text-decoration:none;">${phone || 'N/A'}</a></p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;">
                          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Reason for Contact</span>
                          <p style="margin:5px 0 0 0;font-size:16px;color:#2563eb;font-weight:600;">${reason || 'General Inquiry'}</p>
                        </td>
                      </tr>
                      ${serviceType ? `
                      <tr>
                        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;">
                          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Service Type</span>
                          <p style="margin:5px 0 0 0;font-size:16px;color:#2563eb;font-weight:600;">${serviceType}</p>
                        </td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;">
                          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Location</span>
                          <p style="margin:5px 0 0 0;font-size:16px;color:#333333;">${city || ''} ${state || ''}</p>
                        </td>
                      </tr>
                      ${urgency ? `
                      <tr>
                        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;">
                          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Urgency</span>
                          <p style="margin:5px 0 0 0;font-size:16px;color:#dc2626;font-weight:600;">${urgency}</p>
                        </td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding:12px 0;">
                          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Message</span>
                          <p style="margin:5px 0 0 0;font-size:15px;line-height:1.6;color:#555555;">${caseDetails || 'No message provided'}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ${skipTraceSection}
              </table>
            </td>
          </tr>
          <!-- CTA Button -->
          <tr>
            <td style="padding:0 40px 30px 40px;text-align:center;">
              <a href="mailto:${email}" style="display:inline-block;background:linear-gradient(135deg,#1a3a5c 0%,#2c5282 100%);color:#ffffff;font-size:15px;font-weight:600;padding:16px 40px;border-radius:8px;text-decoration:none;letter-spacing:0.5px;">Reply to ${firstName}</a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;padding:30px 40px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:13px;color:#94a3b8;text-align:center;line-height:1.6;">
                Prestige Serves LLC<br>
                1240 S Corning Street, Los Angeles, CA 90035<br>
                Phone: 609-240-5665 | Email: prestigervesllc@gmail.com
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildServiceRequestEmailHtml(data) {
  const { clientName, contactName, email, phone, addressLine1, addressLine2, city, state, zip, defendantName, caseNumber, courtJurisdiction, serviceType, deadlineDate, specialInstructions, defendantsData } = data;
  
  let defendantsHtml = '';
  if (defendantsData && defendantsData.length > 0) {
    const defRows = defendantsData.map((def, i) => `
      <tr>
        <td style="padding:10px 15px;border:1px solid #e2e8f0;font-size:14px;color:#555555;">${i + 2}</td>
        <td style="padding:10px 15px;border:1px solid #e2e8f0;font-size:14px;color:#333333;">${def.firstName} ${def.lastName || ''}</td>
        <td style="padding:10px 15px;border:1px solid #e2e8f0;font-size:14px;color:#555555;">${def.address || 'N/A'}</td>
        <td style="padding:10px 15px;border:1px solid #e2e8f0;font-size:14px;color:#555555;">${def.city || 'N/A'}</td>
      </tr>
    `).join('');
    
    defendantsHtml = `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;">
          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Additional Defendants</span>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:10px;background-color:#f8fafc;border-radius:6px;overflow:hidden;">
            <tr style="background-color:#1a3a5c;">
              <td style="padding:10px 15px;font-size:12px;color:#ffffff;font-weight:600;">#</td>
              <td style="padding:10px 15px;font-size:12px;color:#ffffff;font-weight:600;">Name</td>
              <td style="padding:10px 15px;font-size:12px;color:#ffffff;font-weight:600;">Address</td>
              <td style="padding:10px 15px;font-size:12px;color:#ffffff;font-weight:600;">City</td>
            </tr>
            ${defRows}
          </table>
        </td>
      </tr>
    `;
  }
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Service Request</title>
</head>
<body style="margin:0;padding:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background-color:#f4f4f4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f4;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a3a5c 0%,#2c5282 100%);padding:40px 40px 30px 40px;text-align:center;">
              <h1 style="margin:0;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:1px;">PRESTIGE SERVES</h1>
              <p style="margin:10px 0 0 0;font-size:14px;color:rgba(255,255,255,0.8);letter-spacing:2px;text-transform:uppercase;">Professional Process Serving</p>
            </td>
          </tr>
          <!-- Badge -->
          <tr>
            <td style="padding:30px 40px 20px 40px;text-align:center;">
              <span style="display:inline-block;background-color:#fff3e0;color:#e65100;font-size:12px;font-weight:600;padding:8px 20px;border-radius:20px;text-transform:uppercase;letter-spacing:1px;">📋 New Service Request</span>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:20px 40px;">
              <h2 style="margin:0 0 20px 0;font-size:24px;font-weight:600;color:#1a3a5c;">New Service Request</h2>
              <p style="margin:0 0 25px 0;font-size:16px;line-height:1.6;color:#555555;">A new service request has been submitted. Review the details below and proceed with assignment.</p>
            </td>
          </tr>
          <!-- Client Info Card -->
          <tr>
            <td style="padding:0 40px 20px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
                <tr>
                  <td style="padding:20px 25px;border-bottom:1px solid #e2e8f0;">
                    <span style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">👤 Client Information</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 25px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding:8px 0;">
                          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Client / Firm</span>
                          <p style="margin:4px 0 0 0;font-size:15px;color:#1a3a5c;font-weight:600;">${clientName}</p>
                        </td>
                        <td style="padding:8px 0;">
                          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Contact Person</span>
                          <p style="margin:4px 0 0 0;font-size:15px;color:#333333;">${contactName}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;">
                          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Email</span>
                          <p style="margin:4px 0 0 0;font-size:15px;"><a href="mailto:${email}" style="color:#2563eb;text-decoration:none;">${email}</a></p>
                        </td>
                        <td style="padding:8px 0;">
                          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Phone</span>
                          <p style="margin:4px 0 0 0;font-size:15px;"><a href="tel:${phone}" style="color:#333333;text-decoration:none;">${phone}</a></p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Service Details Card -->
          <tr>
            <td style="padding:0 40px 20px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
                <tr>
                  <td style="padding:20px 25px;border-bottom:1px solid #e2e8f0;">
                    <span style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">📍 Service Details</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 25px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">
                          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Service Address</span>
                          <p style="margin:5px 0 0 0;font-size:15px;line-height:1.5;color:#333333;">${addressLine1}${addressLine2 ? '<br>' + addressLine2 : ''}<br>${city}, ${state} ${zip}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">
                          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Defendant / Recipient</span>
                          <p style="margin:5px 0 0 0;font-size:15px;color:#333333;font-weight:600;">${defendantName}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">
                          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Case Number</span>
                          <p style="margin:5px 0 0 0;font-size:15px;color:#333333;">${caseNumber || 'N/A'}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">
                          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Court / Jurisdiction</span>
                          <p style="margin:5px 0 0 0;font-size:15px;color:#333333;">${courtJurisdiction || 'N/A'}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">
                          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Service Type</span>
                          <p style="margin:5px 0 0 0;font-size:15px;color:#2563eb;font-weight:600;">${serviceType}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;">
                          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Deadline</span>
                          <p style="margin:5px 0 0 0;font-size:15px;color:#dc2626;font-weight:600;">${deadlineDate || 'Not specified'}</p>
                        </td>
                      </tr>
                      ${specialInstructions ? `
                      <tr>
                        <td style="padding:10px 0;">
                          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Special Instructions</span>
                          <p style="margin:5px 0 0 0;font-size:14px;line-height:1.5;color:#555555;">${specialInstructions}</p>
                        </td>
                      </tr>
                      ` : ''}
                      ${defendantsHtml}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;padding:30px 40px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:13px;color:#94a3b8;text-align:center;line-height:1.6;">
                Prestige Serves LLC<br>
                1240 S Corning Street, Los Angeles, CA 90035<br>
                Phone: 609-240-5665 | Email: prestigervesllc@gmail.com
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function getSql() {
  return neon(DATABASE_URL);
}

// Parse JSON body for POST requests
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// Send JSON response
function jsonResponse(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// Parse multipart form data
function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      parseBody(req).then(resolve).catch(reject);
      return;
    }

    const boundary = contentType.split('boundary=')[1];
    if (!boundary) {
      reject(new Error('No boundary found'));
      return;
    }

    let body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', () => {
      try {
        const data = Buffer.concat(body);
        const parts = data.toString('binary').split('--' + boundary);
        const result = { fields: {}, files: [] };
        
        for (const part of parts) {
          if (!part.includes('\r\n\r\n') || part === '--') continue;
          
          const [header, content] = part.split('\r\n\r\n');
          const headerMatch = header.match(/name="([^"]+)"/);
          if (!headerMatch) continue;
          
          const fieldName = headerMatch[1];
          
          if (header.includes('filename')) {
            const filenameMatch = header.match(/filename="([^"]+)"/);
            if (filenameMatch && content && content.length > 2) {
              const filename = filenameMatch[1];
              const binaryContent = content.slice(0, content.length - 2);
              
              result.files.push({
                fieldName: fieldName,
                originalName: filename,
                buffer: Buffer.from(binaryContent, 'binary')
              });
            }
          } else {
            const value = content.replace(/\r\n$/, '');
            result.fields[fieldName] = value;
          }
        }
        
        resolve(result);
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];
  const method = req.method;

  // API routes
  if (url.startsWith('/api/')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Contact form submission
    if (url === '/api/contact' && method === 'POST') {
      const timer = perf.startTimer('contactFormSubmission');
      try {
        const body = await parseBody(req);
        const sql = getSql();
        
        // Ensure email_sent and skip_trace_data columns exist
        await sql`ALTER TABLE contact_submissions ADD COLUMN IF NOT EXISTS email_sent INTEGER DEFAULT -1`;
        await sql`ALTER TABLE contact_submissions ADD COLUMN IF NOT EXISTS skip_trace_data JSONB`;
        
        const skipTraceDataJson = body.skipTraceData ? JSON.stringify(body.skipTraceData) : null;
        await sql`
          INSERT INTO contact_submissions (
            first_name, last_name, company, email, phone,
            reason, county, state, case_details, urgency, consent, email_sent, skip_trace_data
          ) VALUES (
            ${body.firstName}, ${body.lastName}, ${body.company}, ${body.email}, ${body.phone},
            ${body.reason}, ${body.county}, ${body.state}, ${body.caseDetails}, ${body.urgency}, ${body.consent || false}, -1, ${skipTraceDataJson}
          )
        `;
        
        // Process PST before sending response (needs to complete before jsonResponse)
        logger.info(LOG_CATEGORIES.PST_API, 'Starting PST contact form processing', {
          firstName: body.firstName,
          lastName: body.lastName,
          email: body.email
        });
        
        // Start PST processing but don't await - will complete before response is sent
        processContactFormToPST({
          firstName: body.firstName,
          lastName: body.lastName,
          company: body.company,
          email: body.email,
          phone: body.phone,
          city: body.city,
          state: body.state
        }).then(pstResult => {
          logger.info(LOG_CATEGORIES.PST_API, 'PST contact form result received', pstResult);
          if (pstResult.success) {
            logger.info(LOG_CATEGORIES.PST_API, 'Contact SAVED TO PST', { entitySerialNumber: pstResult.entitySerialNumber });
          } else {
            logger.warn(LOG_CATEGORIES.PST_API, 'Contact NOT saved to PST', { message: pstResult.message });
          }
        }).catch(err => {
          logger.error(LOG_CATEGORIES.PST_API, 'Background PST contact error', err);
        });
        
        // Send email notification to owner (异步，不阻塞响应)
        setImmediate(() => {
          const emailTimer = perf.startTimer('contactEmail');
          const emailHtml = buildContactEmailHtml({
            firstName: body.firstName,
            lastName: body.lastName,
            company: body.company,
            email: body.email,
            phone: body.phone,
            reason: body.reason,
            city: body.city,
            state: body.state,
            caseDetails: body.caseDetails,
            serviceType: body.serviceType,
            urgency: body.urgency,
            skipTraceData: body.skipTraceData
          });
          sendSMTPEmail({
            to: TO_EMAIL,
            subject: `New Contact - ${body.reason || 'Inquiry'} from ${body.firstName} ${body.lastName}`,
            html: emailHtml,
            text: `New Contact from ${body.firstName} ${body.lastName}. Company: ${body.company || 'N/A'}. Reason: ${body.reason || 'N/A'}.`,
          }).then(emailResult => {
            emailTimer.end();
            const emailSentStatus = emailResult.success ? 1 : 0;
            // Update email_sent column
            getSql()`UPDATE contact_submissions SET email_sent = ${emailSentStatus} WHERE id = (SELECT id FROM contact_submissions WHERE email = ${body.email} AND email_sent = -1 ORDER BY created_at DESC LIMIT 1)`
              .then(() => logger.info(LOG_CATEGORIES.DB, 'Contact email_sent update completed'))
              .catch(dbErr => logger.error(LOG_CATEGORIES.DB, 'Contact email_sent update error', dbErr));
            if (emailResult.success) {
              logger.info(LOG_CATEGORIES.EMAIL, 'Contact form email sent', { messageId: emailResult.messageId });
            } else {
              logger.error(LOG_CATEGORIES.EMAIL, 'Contact form email failed', new Error(emailResult.error));
            }
          });
        });
        
        // Respond to client immediately (DB insert is fast) - PST processing continues in background
        jsonResponse(res, 201, { success: true, message: 'Contact form submitted successfully' });
      } catch (err) {
        logger.error(LOG_CATEGORIES.FORM, 'Contact submission error', err);
        timer.end();
        jsonResponse(res, 500, { success: false, message: 'Database error' });
      }
      return;
    }

    // Request form submission with file upload
    if (url === '/api/request' && method === 'POST') {
      const timer = perf.startTimer('serviceRequestSubmission');
      try {
        const contentType = req.headers['content-type'] || '';
        const sql = getSql();
        
        if (contentType.includes('multipart/form-data')) {
          const parsed = await parseMultipart(req);
          const f = parsed.fields;
          
          // Upload files to Vercel Blob
          let fileData = null;
          if (parsed.files.length > 0) {
            const uploadedFiles = [];
            for (const file of parsed.files) {
              try {
                const blobTimer = perf.startTimer('blobUpload');
                const blobResult = await put(file.originalName, file.buffer, {
                  access: 'public',
                  token: BLOB_READ_WRITE_TOKEN
                });
                blobTimer.end();
                blobLogger.uploaded(file.originalName, file.buffer.length);
                uploadedFiles.push({
                  name: file.originalName,
                  url: blobResult.url
                });
              } catch (blobErr) {
                logger.error(LOG_CATEGORIES.BLOB, 'Blob upload error', blobErr, { filename: file.originalName });
              }
            }
            if (uploadedFiles.length > 0) {
              fileData = JSON.stringify(uploadedFiles);
            }
          }
          
          await sql`
            INSERT INTO service_requests (
              client_name, contact_name, email, phone,
              address_line1, address_line2, city, state, zip,
              defendant_name, case_number, court_jurisdiction,
              multiple_defendants, service_type, deadline_date,
              special_instructions, defendants_data, uploaded_files, email_sent
            ) VALUES (
              ${f.clientName || ''}, ${f.contactName || ''}, ${f.email || ''}, ${f.phone || ''},
              ${f.addressLine1 || ''}, ${f.addressLine2 || ''}, ${f.city || ''}, ${f.state || ''}, ${f.zip || ''},
              ${f.defendantName || ''}, ${f.caseNumber || ''}, ${f.courtJurisdiction || ''},
              ${f.multiple_defendants === 'true'}, ${f.serviceType || ''}, ${f.deadlineDate || null},
              ${f.specialInstructions || ''}, ${f.defendantsData || null}, ${fileData}, -1
            )
          `;
          
          // Respond to client immediately (DB insert is fast)
          jsonResponse(res, 201, { 
            success: true, 
            message: 'Service request submitted successfully'
          });
          
          // Send email notification to owner (异步，不阻塞响应)
          setImmediate(() => {
            let defendantsData = null;
            if (f.defendantsData) {
              try {
                defendantsData = typeof f.defendantsData === 'string' ? JSON.parse(f.defendantsData) : f.defendantsData;
              } catch (e) { defendantsData = null; }
            }
            const emailHtml = buildServiceRequestEmailHtml({
              clientName: f.clientName,
              contactName: f.contactName,
              email: f.email,
              phone: f.phone,
              addressLine1: f.addressLine1,
              addressLine2: f.addressLine2,
              city: f.city,
              state: f.state,
              zip: f.zip,
              defendantName: f.defendantName,
              caseNumber: f.caseNumber,
              courtJurisdiction: f.courtJurisdiction,
              serviceType: f.serviceType,
              deadlineDate: f.deadlineDate,
              specialInstructions: f.specialInstructions,
              defendantsData: defendantsData
            });
            sendSMTPEmail({
              to: TO_EMAIL,
              subject: `New Service Request - ${f.serviceType} from ${f.clientName}`,
              html: emailHtml,
              text: `New Service Request from ${f.clientName}. Contact: ${f.contactName}, ${f.email}, ${f.phone}. Service type: ${f.serviceType}.`,
            }).then(emailResult => {
              const emailSentStatus = emailResult.success ? 1 : 0;
              logger.debug(LOG_CATEGORIES.EMAIL, 'Updating email_sent', { status: emailSentStatus, email: f.email });
              // Update email_sent column - await the SQL query to catch errors
              getSql()`UPDATE service_requests SET email_sent = ${emailSentStatus} WHERE id = (SELECT id FROM service_requests WHERE email = ${f.email} AND email_sent = -1 ORDER BY created_at DESC LIMIT 1)`
                .then(() => logger.info(LOG_CATEGORIES.DB, 'email_sent update completed'))
                .catch(dbErr => logger.error(LOG_CATEGORIES.DB, 'email_sent update error', dbErr));
              if (emailResult.success) {
                logger.info(LOG_CATEGORIES.EMAIL, 'Service request email sent', { messageId: emailResult.messageId });
              } else {
                logger.error(LOG_CATEGORIES.EMAIL, 'Service request email failed', new Error(emailResult.error));
              }
            });
          });
          
          // Process PST in background (异步，不阻塞响应)
          setImmediate(() => {
            processServiceRequestToPST({
              clientName: f.clientName,
              contactName: f.contactName,
              email: f.email,
              phone: f.phone,
              addressLine1: f.addressLine1,
              city: f.city,
              state: f.state,
              zip: f.zip,
              defendantName: f.defendantName,
              caseNumber: f.caseNumber,
              courtJurisdiction: f.courtJurisdiction,
              serviceType: f.serviceType,
              deadlineDate: f.deadlineDate,
              specialInstructions: f.specialInstructions,
              defendantsData: f.defendantsData
            }).then(pstResult => {
              if (pstResult.success) {
                logger.info(LOG_CATEGORIES.PST_API, 'Service request saved to PST', { jobNumber: pstResult.jobNumber });
              }
            }).catch(err => {
              logger.error(LOG_CATEGORIES.PST_API, 'Background PST request error', err);
            });
          });
        } else {
          const body = await parseBody(req);
          // Ensure email_sent column exists
          await sql`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS email_sent INTEGER DEFAULT -1`;
          
          await sql`
            INSERT INTO service_requests (
              client_name, contact_name, email, phone,
              address_line1, address_line2, city, state, zip,
              defendant_name, case_number, court_jurisdiction,
              multiple_defendants, service_type, deadline_date,
              special_instructions, defendants_data, email_sent
            ) VALUES (
              ${body.clientName}, ${body.contactName}, ${body.email}, ${body.phone},
              ${body.addressLine1}, ${body.addressLine2}, ${body.city}, ${body.state}, ${body.zip},
              ${body.defendantName}, ${body.caseNumber}, ${body.courtJurisdiction},
              ${body.multipleDefendants || false}, ${body.serviceType}, ${body.deadlineDate},
              ${body.specialInstructions}, ${body.defendantsData || null}, -1
            )
          `;
          
          // Respond to client immediately (DB insert is fast)
          jsonResponse(res, 201, { 
            success: true, 
            message: 'Service request submitted successfully'
          });
          
          // Send email notification to owner (异步，不阻塞响应)
          setImmediate(() => {
            let defendantsData = null;
            if (body.defendantsData) {
              try {
                defendantsData = typeof body.defendantsData === 'string' ? JSON.parse(body.defendantsData) : body.defendantsData;
              } catch (e) { defendantsData = null; }
            }
            const emailHtml = buildServiceRequestEmailHtml({
              clientName: body.clientName,
              contactName: body.contactName,
              email: body.email,
              phone: body.phone,
              addressLine1: body.addressLine1,
              addressLine2: body.addressLine2,
              city: body.city,
              state: body.state,
              zip: body.zip,
              defendantName: body.defendantName,
              caseNumber: body.caseNumber,
              courtJurisdiction: body.courtJurisdiction,
              serviceType: body.serviceType,
              deadlineDate: body.deadlineDate,
              specialInstructions: body.specialInstructions,
              defendantsData: defendantsData
            });
            sendSMTPEmail({
              to: TO_EMAIL,
              subject: `New Service Request - ${body.serviceType} from ${body.clientName}`,
              html: emailHtml,
              text: `New Service Request from ${body.clientName}. Contact: ${body.contactName}, ${body.email}, ${body.phone}. Service type: ${body.serviceType}.`,
            }).then(emailResult => {
              const emailSentStatus = emailResult.success ? 1 : 0;
              // Update email_sent column
              getSql()`UPDATE service_requests SET email_sent = ${emailSentStatus} WHERE id = (SELECT id FROM service_requests WHERE email = ${body.email} AND email_sent = -1 ORDER BY created_at DESC LIMIT 1)`
                .then(() => logger.info(LOG_CATEGORIES.DB, 'Service (async) email_sent update completed'))
                .catch(dbErr => logger.error(LOG_CATEGORIES.DB, 'Service (async) email_sent update error', dbErr));
              if (emailResult.success) {
                logger.info(LOG_CATEGORIES.EMAIL, 'Service request email sent', { messageId: emailResult.messageId });
              } else {
                logger.error(LOG_CATEGORIES.EMAIL, 'Service request email failed', new Error(emailResult.error));
              }
            });
          });
          
          // Process PST in background (异步，不阻塞响应)
          setImmediate(() => {
            processServiceRequestToPST(body).then(pstResult => {
              if (pstResult.success) {
                logger.info(LOG_CATEGORIES.PST_API, 'Service request saved to PST', { jobNumber: pstResult.jobNumber });
              }
            }).catch(err => {
              logger.error(LOG_CATEGORIES.PST_API, 'Background PST request error', err);
            });
          });
        }
      } catch (err) {
        logger.error(LOG_CATEGORIES.FORM, 'Request submission error', err);
        jsonResponse(res, 500, { success: false, message: 'Database error: ' + err.message });
      }
      return;
    }

    // Admin API - Get all service requests
    if (url === '/api/admin/requests' && method === 'GET') {
      try {
        const sql = getSql();
        const result = await sql`SELECT * FROM service_requests ORDER BY created_at DESC LIMIT 100`;
        jsonResponse(res, 200, { success: true, data: result });
      } catch (err) {
        logger.error(LOG_CATEGORIES.API, 'Admin requests error', err);
        jsonResponse(res, 500, { success: false, message: 'Database error' });
      }
      return;
    }

    // Admin API - Get all contact submissions
    if (url === '/api/admin/contacts' && method === 'GET') {
      try {
        const sql = getSql();
        const result = await sql`SELECT * FROM contact_submissions ORDER BY created_at DESC LIMIT 100`;
        jsonResponse(res, 200, { success: true, data: result });
      } catch (err) {
        logger.error(LOG_CATEGORIES.API, 'Admin contacts error', err);
        jsonResponse(res, 500, { success: false, message: 'Database error' });
      }
      return;
    }

    // Admin API - Get single service request
    if (url.match(/^\/api\/admin\/request\/\d+$/) && method === 'GET') {
      const id = url.split('/').pop();
      try {
        const sql = getSql();
        const result = await sql`SELECT * FROM service_requests WHERE id = ${id}`;
        if (result.length > 0) {
          jsonResponse(res, 200, { success: true, data: result[0] });
        } else {
          jsonResponse(res, 404, { success: false, message: 'Not found' });
        }
      } catch (err) {
        logger.error(LOG_CATEGORIES.API, 'Admin request detail error', err);
        jsonResponse(res, 500, { success: false, message: 'Database error' });
      }
      return;
    }

    // Admin API - Get single contact submission
    if (url.match(/^\/api\/admin\/contact\/\d+$/) && method === 'GET') {
      const id = url.split('/').pop();
      try {
        const sql = getSql();
        const result = await sql`SELECT * FROM contact_submissions WHERE id = ${id}`;
        if (result.length > 0) {
          jsonResponse(res, 200, { success: true, data: result[0] });
        } else {
          jsonResponse(res, 404, { success: false, message: 'Not found' });
        }
      } catch (err) {
        logger.error(LOG_CATEGORIES.API, 'Admin contact detail error', err);
        jsonResponse(res, 500, { success: false, message: 'Database error' });
      }
      return;
    }

    // Admin API - Delete service request
    if (url.match(/^\/api\/admin\/request\/\d+$/) && method === 'DELETE') {
      const id = url.split('/').pop();
      try {
        const sql = getSql();
        await sql`DELETE FROM service_requests WHERE id = ${id}`;
        jsonResponse(res, 200, { success: true, message: 'Deleted' });
      } catch (err) {
        logger.error(LOG_CATEGORIES.API, 'Admin delete request error', err);
        jsonResponse(res, 500, { success: false, message: 'Database error' });
      }
      return;
    }

    // Admin API - Delete contact submission
    if (url.match(/^\/api\/admin\/contact\/\d+$/) && method === 'DELETE') {
      const id = url.split('/').pop();
      try {
        const sql = getSql();
        await sql`DELETE FROM contact_submissions WHERE id = ${id}`;
        jsonResponse(res, 200, { success: true, message: 'Deleted' });
      } catch (err) {
        logger.error(LOG_CATEGORIES.API, 'Admin delete contact error', err);
        jsonResponse(res, 500, { success: false, message: 'Database error' });
      }
      return;
    }

    // Settings API - Get owner email
    if (url === '/api/admin/settings' && method === 'GET') {
      try {
        const sql = getSql();
        const result = await sql`SELECT value FROM settings WHERE key = 'owner_email' LIMIT 1`;
        const ownerEmail = result.length > 0 ? result[0].value : null;
        jsonResponse(res, 200, { success: true, ownerEmail });
      } catch (err) {
        jsonResponse(res, 200, { success: true, ownerEmail: null });
      }
      return;
    }

    // Settings API - Update owner email
    if (url === '/api/admin/settings' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const ownerEmail = body.ownerEmail || '';
        const sql = getSql();
        
        // Ensure settings table and owner_email column exist
        await sql`CREATE TABLE IF NOT EXISTS settings (key VARCHAR(255) PRIMARY KEY, value TEXT)`;
        await sql`INSERT INTO settings (key, value) VALUES ('owner_email', ${ownerEmail}) ON CONFLICT (key) DO UPDATE SET value = ${ownerEmail}`;
        
        // Update TO_EMAIL global variable if needed
        global.TO_EMAIL = ownerEmail || TO_EMAIL;
        
        jsonResponse(res, 200, { success: true, ownerEmail: global.TO_EMAIL });
      } catch (err) {
        logger.error(LOG_CATEGORIES.API, 'Settings update error', err);
        jsonResponse(res, 500, { success: false, message: 'Database error' });
      }
      return;
    }

    // Email API - Send test email
    if (url === '/api/email' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const { to, subject, html, text } = body;
        
        if (!to || !subject) {
          jsonResponse(res, 400, { success: false, message: 'Missing required fields: to, subject' });
          return;
        }
        
        const emailResult = await sendSMTPEmail({
          to: to,
          subject: subject,
          html: html || '',
          text: text || '',
        });
        
        if (emailResult.success) {
          jsonResponse(res, 200, { success: true, data: emailResult });
        } else {
          jsonResponse(res, 500, { success: false, message: 'Failed to send email', error: emailResult.error });
        }
      } catch (err) {
        logger.error(LOG_CATEGORIES.EMAIL, 'Email API error', err);
        jsonResponse(res, 500, { success: false, message: 'Server error: ' + err.message });
      }
      return;
    }

    jsonResponse(res, 404, { message: 'API endpoint not found' });
    return;
  }

  // Serve static files
  let filePath = path.join(__dirname, url === '/' ? 'index.html' : url);
  
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, 'index.html');
  }
  
  const ext = path.extname(filePath);
  const contentTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.png': 'image/png',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg'
  };
  
  res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
  res.end(fs.readFileSync(filePath));
});

server.listen(3002, () => {
  logger.info(LOG_CATEGORIES.SERVER, 'Server started', { port: 3002 });
});
