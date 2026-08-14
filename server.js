require('dotenv').config({ path: '.env.local' });
const http = require('http');
const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');
const { put } = require('@vercel/blob');
const { processContactFormToPST, processServiceRequestToPST } = require('./api/pst-integration');
const nodemailer = require('nodemailer');
const { logger, perf, emailLogger, pstLogger, blobLogger, LOG_CATEGORIES } = require('./api/logger');
const StripeLib = require('stripe');
const invoiceUtils = require('./lib/invoice-utils');
const { MAX_UPLOAD_FILE_BYTES, MAX_UPLOAD_FILE_MB } = require('./lib/upload-limits');

// Stripe client — only active when STRIPE_SECRET_KEY is set in .env.local
const stripeClient = process.env.STRIPE_SECRET_KEY
  ? new StripeLib(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' })
  : null;

// Server-side price allowlist — set STRIPE_PRICE_* env vars to your actual price_... IDs
// from the Stripe Dashboard (Products → select product → copy "Price ID").
// The frontend never sees these IDs; the server maps service keys → price IDs.
const PRICE_CATALOG = {
  standard_service:       { priceId: process.env.STRIPE_PRICE_STANDARD_SERVICE   || 'price_REPLACE_standard_service',    label: 'Standard Service',                 amount: 9799  },
  rush_serve:             { priceId: process.env.STRIPE_PRICE_RUSH_SERVE          || 'price_REPLACE_rush_serve',           label: 'Rush Serve',                       amount: 11999 },
  priority_serve:         { priceId: process.env.STRIPE_PRICE_PRIORITY_SERVE      || 'price_REPLACE_priority_serve',       label: 'Priority Serve',                   amount: 14999 },
  emergency_serve:        { priceId: process.env.STRIPE_PRICE_EMERGENCY_SERVE     || 'price_REPLACE_emergency_serve',      label: 'Emergency Serve',                  amount: 24999 },
  skip_trace_standard:    { priceId: process.env.STRIPE_PRICE_SKIP_TRACE_STANDARD || 'price_REPLACE_skip_trace_standard',  label: 'Standard Skip Tracing',            amount: 7500  },
  skip_trace_rush:        { priceId: process.env.STRIPE_PRICE_SKIP_TRACE_RUSH     || 'price_REPLACE_skip_trace_rush',      label: 'Rush Skip Tracing',                amount: 22500 },
  skip_trace_court_ready: { priceId: process.env.STRIPE_PRICE_SKIP_TRACE_COURT    || 'price_REPLACE_skip_trace_court',     label: 'Court Ready Skip Tracing Report',  amount: 25000 },
  skip_trace_enhanced:    { priceId: process.env.STRIPE_PRICE_SKIP_TRACE_ENHANCED || 'price_REPLACE_skip_trace_enhanced',  label: 'Enhanced Trace',                   amount: 15000 },
  skip_trace_business:    { priceId: process.env.STRIPE_PRICE_SKIP_TRACE_BUSINESS || 'price_REPLACE_skip_trace_business',  label: 'Business / Agent Verification',    amount: 22500 },
  addon_defendant:        { priceId: process.env.STRIPE_PRICE_ADDON_DEFENDANT     || 'price_REPLACE_addon_defendant',      label: 'Additional Defendant – Same Case', amount: 4500  },
};

const SITE_URL = (process.env.SITE_URL || 'http://localhost:3002').replace(/\/$/, '');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_P8aH3JElyXBw@ep-gentle-frog-a4yzwn3w-pooler.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';
const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || 'vercel_blob_rw_1qFTdRzk36aoQZsG_uiiyBg0DZ8Sl5zySi6DmqaMnIz9eqV';

// Hostinger SMTP Configuration
const HOSTINGER_SMTP_HOST = process.env.HOSTINGER_SMTP_HOST || 'smtp.hostinger.com';
const HOSTINGER_SMTP_PORT = parseInt(process.env.HOSTINGER_SMTP_PORT) || 465;
const HOSTINGER_SMTP_SECURE = process.env.HOSTINGER_SMTP_SECURE === 'true' || true;
const HOSTINGER_SMTP_USER = process.env.HOSTINGER_SMTP_USER;
const HOSTINGER_SMTP_PASS = process.env.HOSTINGER_SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || 'crm@arwebcrafts.com';
const TO_EMAIL = process.env.TO_EMAIL || 'prestigeservesllc@gmail.com';

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

function buildSkipTraceEmailSectionHtml(skipTraceData) {
  if (!skipTraceData || !(skipTraceData.firstName || skipTraceData.fullname)) return '';
  const st = skipTraceData;
  return `
                      <tr>
                        <td style="padding:25px;background-color:#fef3f2;">
                          <p style="margin:0 0 15px 0;font-size:14px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:1px;">Skip Trace Intake Data</p>
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            ${st.serviceType ? `<tr><td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Service Type</td><td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;font-weight:600;">${st.serviceType}</td></tr>` : ''}
                            ${st.fullname ? `<tr><td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Requester</td><td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">${st.fullname}</td></tr>` : ''}
                            ${st.firstName || st.fullname ? `<tr><td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Subject Name</td><td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">${st.firstName || ''} ${st.lastName || ''}</td></tr>` : ''}
                            ${st.lastAddress ? `<tr><td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Last Known Address</td><td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">${st.lastAddress}</td></tr>` : ''}
                            ${st.purpose ? `<tr><td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Purpose</td><td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">${st.purpose}</td></tr>` : ''}
                            ${st.deadline ? `<tr><td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Deadline</td><td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">${st.deadline}</td></tr>` : ''}
                            ${st.notes ? `<tr><td style="padding:8px 0;font-size:12px;color:#94a3b8;text-transform:uppercase;">Notes</td><td style="padding:8px 0;font-size:14px;color:#333333;text-align:right;">${st.notes}</td></tr>` : ''}
                          </table>
                        </td>
                      </tr>`;
}

// Beautiful Email Templates
function buildContactEmailHtml(data) {
  const { firstName, lastName, company, email, phone, reason, city, state, caseDetails, serviceType, urgency, skipTraceData } = data;
  
  // Build Skip Trace section if present
  let skipTraceSection = '';
  if (skipTraceData && (skipTraceData.firstName || skipTraceData.fullname)) {
    skipTraceSection = buildSkipTraceEmailSectionHtml(skipTraceData);
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
                Phone: 424-235-3089 | Email: prestigervesllc@gmail.com
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
  const { clientName, contactName, email, phone, addressLine1, addressLine2, city, state, zip, defendantName, caseNumber, courtJurisdiction, serviceType, deadlineDate, specialInstructions, defendantsData, skipTraceData } = data;
  
  let defendantsHtml = '';
  if (defendantsData && defendantsData.length > 0) {
    const defRows = defendantsData.map((def, i) => `
      <tr>
        <td style="padding:10px 15px;border:1px solid #e2e8f0;font-size:13px;color:#555555;vertical-align:top;">${i + 2}</td>
        <td style="padding:10px 15px;border:1px solid #e2e8f0;font-size:13px;color:#333333;vertical-align:top;">${[def.firstName, def.middleName, def.lastName].filter(Boolean).join(' ')}</td>
        <td style="padding:10px 15px;border:1px solid #e2e8f0;font-size:13px;color:#555555;vertical-align:top;">${def.address || '—'}${def.addressLine2 ? '<br>' + def.addressLine2 : ''}</td>
        <td style="padding:10px 15px;border:1px solid #e2e8f0;font-size:13px;color:#555555;vertical-align:top;">${[def.city, def.state, def.zip].filter(Boolean).join(', ') || '—'}</td>
        <td style="padding:10px 15px;border:1px solid #e2e8f0;font-size:13px;color:#555555;vertical-align:top;">${def.phone || '—'}${def.dob ? '<br>DOB: ' + def.dob : ''}</td>
        <td style="padding:10px 15px;border:1px solid #e2e8f0;font-size:13px;color:#555555;vertical-align:top;">${def.notes || def.employer || '—'}</td>
      </tr>
    `).join('');
    
    defendantsHtml = `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;">
          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Additional Defendants</span>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:10px;background-color:#f8fafc;border-radius:6px;overflow:hidden;">
            <tr style="background-color:#1a3a5c;">
              <td style="padding:10px 15px;font-size:11px;color:#ffffff;font-weight:600;">#</td>
              <td style="padding:10px 15px;font-size:11px;color:#ffffff;font-weight:600;">Full Name</td>
              <td style="padding:10px 15px;font-size:11px;color:#ffffff;font-weight:600;">Address</td>
              <td style="padding:10px 15px;font-size:11px;color:#ffffff;font-weight:600;">City / State / ZIP</td>
              <td style="padding:10px 15px;font-size:11px;color:#ffffff;font-weight:600;">Phone / DOB</td>
              <td style="padding:10px 15px;font-size:11px;color:#ffffff;font-weight:600;">Notes / Employer</td>
            </tr>
            ${defRows}
          </table>
        </td>
      </tr>
    `;
  }

  const skipTraceHtml = buildSkipTraceEmailSectionHtml(skipTraceData);
  
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
                      ${skipTraceHtml}
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
                Phone: 424-235-3089 | Email: prestigervesllc@gmail.com
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

// Buffer raw bytes — required for Stripe webhook signature verification
function getRawBody(req) {
  return new Promise(function (resolve, reject) {
    var chunks = [];
    req.on('data', function (chunk) { chunks.push(chunk); });
    req.on('end', function () { resolve(Buffer.concat(chunks)); });
    req.on('error', reject);
  });
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

const DEFAULT_GOOGLE_PLACE_QUERY = 'Prestige Serves Los Angeles CA';

function cleanGoogleReview(review) {
  return {
    authorName: review.author_name || 'Google reviewer',
    authorUrl: review.author_url || '',
    profilePhotoUrl: review.profile_photo_url || '',
    rating: Number(review.rating) || 0,
    relativeTimeDescription: review.relative_time_description || '',
    text: review.text || '',
    time: review.time || 0,
  };
}

async function resolveGooglePlaceId(apiKey) {
  if (process.env.GOOGLE_PLACE_ID) {
    return process.env.GOOGLE_PLACE_ID;
  }

  const query = process.env.GOOGLE_PLACE_QUERY || DEFAULT_GOOGLE_PLACE_QUERY;
  const params = new URLSearchParams({
    input: query,
    inputtype: 'textquery',
    fields: 'place_id',
    key: apiKey,
  });
  const response = await fetch(`https://maps.googleapis.com/maps/api/place/findplacefromtext/json?${params.toString()}`);
  const data = await response.json();

  if (data.status !== 'OK' || !data.candidates || !data.candidates[0]) {
    throw new Error(data.error_message || `Unable to resolve Google Place ID (${data.status || 'unknown status'})`);
  }

  return data.candidates[0].place_id;
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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Google reviews proxy keeps the Google API key server-side.
    if (url === '/api/google-reviews' && method === 'GET') {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;

      if (!apiKey) {
        jsonResponse(res, 503, {
          success: false,
          message: 'Google reviews are not configured. Add GOOGLE_MAPS_API_KEY to the server environment.',
        });
        return;
      }

      try {
        const placeId = await resolveGooglePlaceId(apiKey);
        const params = new URLSearchParams({
          place_id: placeId,
          fields: 'name,rating,user_ratings_total,reviews,url',
          reviews_sort: 'newest',
          key: apiKey,
        });
        const response = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`);
        const data = await response.json();

        if (data.status !== 'OK') {
          jsonResponse(res, 502, {
            success: false,
            message: data.error_message || `Google Places returned ${data.status || 'an error'}`,
          });
          return;
        }

        const result = data.result || {};
        jsonResponse(res, 200, {
          success: true,
          place: {
            name: result.name || 'Prestige Serves',
            rating: Number(result.rating) || 0,
            userRatingsTotal: Number(result.user_ratings_total) || 0,
            url: result.url || '',
          },
          reviews: Array.isArray(result.reviews) ? result.reviews.map(cleanGoogleReview) : [],
        });
      } catch (err) {
        jsonResponse(res, 500, {
          success: false,
          message: err.message || 'Unable to load Google reviews',
        });
      }
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
        
        let pstResult = { success: false, message: 'PST sync skipped' };
        try {
          pstResult = await processContactFormToPST({
            firstName: body.firstName,
            lastName: body.lastName,
            company: body.company,
            email: body.email,
            phone: body.phone,
            city: body.city,
            state: body.state
          });
          logger.info(LOG_CATEGORIES.PST_API, 'PST contact form result received', pstResult);
          if (pstResult.success) {
            logger.info(LOG_CATEGORIES.PST_API, 'Contact SAVED TO PST', { entitySerialNumber: pstResult.entitySerialNumber });
          } else {
            logger.warn(LOG_CATEGORIES.PST_API, 'Contact NOT saved to PST', { message: pstResult.message });
          }
        } catch (err) {
          logger.error(LOG_CATEGORIES.PST_API, 'PST contact error', err);
          pstResult = { success: false, message: err.message };
        }
        
        // Send email notification to owner (async, does not block response)
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
        
        jsonResponse(res, 201, {
          success: true,
          message: 'Contact form submitted successfully',
          pstSync: pstResult.success,
          pstEntitySerialNumber: pstResult.entitySerialNumber || null
        });
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
            const oversized = parsed.files.filter(function (file) {
              return file.buffer && file.buffer.length > MAX_UPLOAD_FILE_BYTES;
            });
            if (oversized.length) {
              jsonResponse(res, 413, {
                success: false,
                message: 'One or more files exceed the ' + MAX_UPLOAD_FILE_MB + ' MB per-file upload limit.',
              });
              return;
            }

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
          
          // Ensure payment columns exist
          await sql`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT`;
          await sql`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending'`;
          await sql`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS skip_trace_data JSONB`;

          const [inserted] = await sql`
            INSERT INTO service_requests (
              client_name, contact_name, email, phone,
              address_line1, address_line2, city, state, zip,
              defendant_name, case_number, court_jurisdiction,
              multiple_defendants, service_type, deadline_date,
              special_instructions, defendants_data, uploaded_files, skip_trace_data, email_sent
            ) VALUES (
              ${f.clientName || ''}, ${f.contactName || ''}, ${f.email || ''}, ${f.phone || ''},
              ${f.addressLine1 || ''}, ${f.addressLine2 || ''}, ${f.city || ''}, ${f.state || ''}, ${f.zip || ''},
              ${f.defendantName || ''}, ${f.caseNumber || ''}, ${f.courtJurisdiction || ''},
              ${f.multiple_defendants === 'true'}, ${f.serviceType || ''}, ${f.deadlineDate || null},
              ${f.specialInstructions || ''}, ${f.defendantsData || null}, ${fileData}, ${f.skipTraceData || null}, -1
            ) RETURNING id
          `;
          const submissionId = inserted ? inserted.id : null;

          let pstResult = { success: false, message: 'PST sync skipped' };
          try {
            pstResult = await processServiceRequestToPST({
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
            });
            if (pstResult.success) {
              logger.info(LOG_CATEGORIES.PST_API, 'Service request saved to PST', { jobNumber: pstResult.jobNumber });
            } else {
              logger.warn(LOG_CATEGORIES.PST_API, 'Service request not saved to PST', { message: pstResult.message });
            }
          } catch (err) {
            logger.error(LOG_CATEGORIES.PST_API, 'PST request error', err);
            pstResult = { success: false, message: err.message };
          }

          jsonResponse(res, 201, {
            success: true,
            message: 'Service request submitted successfully',
            submissionId,
            pstSync: pstResult.success,
            pstJobNumber: pstResult.jobNumber || null
          });
          
          // Send email notification to owner (async, does not block response)
          setImmediate(() => {
            let defendantsData = null;
            if (f.defendantsData) {
              try {
                defendantsData = typeof f.defendantsData === 'string' ? JSON.parse(f.defendantsData) : f.defendantsData;
              } catch (e) { defendantsData = null; }
            }
            let skipTraceData = null;
            if (f.skipTraceData) {
              try {
                skipTraceData = typeof f.skipTraceData === 'string' ? JSON.parse(f.skipTraceData) : f.skipTraceData;
              } catch (e) { skipTraceData = null; }
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
              defendantsData: defendantsData,
              skipTraceData: skipTraceData
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
        } else {
          const body = await parseBody(req);
          // Ensure email_sent and payment columns exist
          await sql`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS email_sent INTEGER DEFAULT -1`;
          await sql`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT`;
          await sql`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending'`;
          await sql`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS skip_trace_data JSONB`;

          const [insertedJson] = await sql`
            INSERT INTO service_requests (
              client_name, contact_name, email, phone,
              address_line1, address_line2, city, state, zip,
              defendant_name, case_number, court_jurisdiction,
              multiple_defendants, service_type, deadline_date,
              special_instructions, defendants_data, skip_trace_data, email_sent
            ) VALUES (
              ${body.clientName}, ${body.contactName}, ${body.email}, ${body.phone},
              ${body.addressLine1}, ${body.addressLine2}, ${body.city}, ${body.state}, ${body.zip},
              ${body.defendantName}, ${body.caseNumber}, ${body.courtJurisdiction},
              ${body.multipleDefendants || false}, ${body.serviceType}, ${body.deadlineDate},
              ${body.specialInstructions}, ${body.defendantsData || null}, ${body.skipTraceData ? JSON.stringify(body.skipTraceData) : null}, -1
            ) RETURNING id
          `;
          const submissionIdJson = insertedJson ? insertedJson.id : null;

          let pstResultJson = { success: false, message: 'PST sync skipped' };
          try {
            pstResultJson = await processServiceRequestToPST(body);
            if (pstResultJson.success) {
              logger.info(LOG_CATEGORIES.PST_API, 'Service request saved to PST', { jobNumber: pstResultJson.jobNumber });
            } else {
              logger.warn(LOG_CATEGORIES.PST_API, 'Service request not saved to PST', { message: pstResultJson.message });
            }
          } catch (err) {
            logger.error(LOG_CATEGORIES.PST_API, 'PST request error', err);
            pstResultJson = { success: false, message: err.message };
          }

          jsonResponse(res, 201, {
            success: true,
            message: 'Service request submitted successfully',
            submissionId: submissionIdJson,
            pstSync: pstResultJson.success,
            pstJobNumber: pstResultJson.jobNumber || null
          });
          
          // Send email notification to owner (async, does not block response)
          setImmediate(() => {
            let defendantsData = null;
            if (body.defendantsData) {
              try {
                defendantsData = typeof body.defendantsData === 'string' ? JSON.parse(body.defendantsData) : body.defendantsData;
              } catch (e) { defendantsData = null; }
            }
            let skipTraceDataJson = null;
            if (body.skipTraceData) {
              try {
                skipTraceDataJson = typeof body.skipTraceData === 'string' ? JSON.parse(body.skipTraceData) : body.skipTraceData;
              } catch (e) { skipTraceDataJson = null; }
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
              defendantsData: defendantsData,
              skipTraceData: skipTraceDataJson
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
        const result = await sql`SELECT * FROM service_requests ORDER BY created_at DESC LIMIT 2000`;
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
        const result = await sql`SELECT * FROM contact_submissions ORDER BY created_at DESC LIMIT 2000`;
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

    // POST /api/create-checkout-session — build Stripe Checkout Session from cart items
    if (url === '/api/create-checkout-session' && method === 'POST') {
      try {
        if (!stripeClient) {
          jsonResponse(res, 503, { success: false, message: 'Payment processing not configured. Add STRIPE_SECRET_KEY to .env.local.' });
          return;
        }
        const body = await parseBody(req);
        const { items, submissionId, customerEmail } = body;

        if (!Array.isArray(items) || items.length === 0) {
          jsonResponse(res, 400, { success: false, message: 'No items provided.' });
          return;
        }

        const line_items = [];
        for (const item of items) {
          const entry = PRICE_CATALOG[item.key];
          if (!entry) {
            jsonResponse(res, 400, { success: false, message: `Unknown service key: ${item.key}` });
            return;
          }
          const qty = Math.max(1, Math.min(parseInt(item.qty, 10) || 1, 10));
          // Use pre-configured Stripe price ID when available; otherwise use inline price_data
          if (entry.priceId && !entry.priceId.startsWith('price_REPLACE')) {
            line_items.push({ price: entry.priceId, quantity: qty });
          } else {
            line_items.push({
              price_data: {
                currency: 'usd',
                unit_amount: entry.amount,
                product_data: { name: entry.label },
              },
              quantity: qty,
            });
          }
        }

        // Optional 3% card fee line (enable with ADD_CARD_FEE=true in .env.local)
        if (process.env.ADD_CARD_FEE === 'true') {
          const subtotal = items.reduce(function (sum, item) {
            const entry = PRICE_CATALOG[item.key];
            const qty = Math.max(1, Math.min(parseInt(item.qty, 10) || 1, 10));
            return entry ? sum + entry.amount * qty : sum;
          }, 0);
          const fee = Math.round(subtotal * 0.03);
          if (fee > 0) {
            line_items.push({
              price_data: {
                currency: 'usd',
                unit_amount: fee,
                product_data: { name: 'Card Processing Fee (3%)' },
              },
              quantity: 1,
            });
          }
        }

        const sessionParams = {
          mode: 'payment',
          line_items,
          success_url: SITE_URL + '/success.html?session_id={CHECKOUT_SESSION_ID}',
          cancel_url: SITE_URL + '/payment.html',
        };

        if (customerEmail && typeof customerEmail === 'string' && customerEmail.includes('@')) {
          sessionParams.customer_email = customerEmail.trim().toLowerCase();
        }
        if (submissionId && !isNaN(Number(submissionId))) {
          sessionParams.client_reference_id = String(submissionId);
          sessionParams.metadata = { request_submission_id: String(submissionId) };
        }

        const session = await stripeClient.checkout.sessions.create(sessionParams);
        logger.info(LOG_CATEGORIES.API, 'Checkout session created', { sessionId: session.id, submissionId });
        jsonResponse(res, 200, { url: session.url });
      } catch (err) {
        logger.error(LOG_CATEGORIES.API, 'Create checkout session error', err);
        jsonResponse(res, 500, { success: false, message: 'Could not create checkout session.' });
      }
      return;
    }

    // POST /api/stripe-webhook — receive Stripe events; raw body required for signature check
    if (url === '/api/stripe-webhook' && method === 'POST') {
      try {
        if (!stripeClient || !process.env.STRIPE_WEBHOOK_SECRET) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Webhook not configured.');
          return;
        }
        const rawBody = await getRawBody(req);
        const sig = req.headers['stripe-signature'];
        let event;
        try {
          event = stripeClient.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
        } catch (verifyErr) {
          logger.error(LOG_CATEGORIES.API, 'Webhook signature verification failed', verifyErr);
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Webhook Error: ' + verifyErr.message);
          return;
        }

        if (event.type === 'checkout.session.completed') {
          const session = event.data.object;
          const sql = getSql();
          const invoiceId = session.metadata && session.metadata.invoice_id;
          if (invoiceId && !isNaN(Number(invoiceId))) {
            await invoiceUtils.ensureInvoicesTable(sql);
            await sql`
              UPDATE invoices
              SET status = 'paid',
                  stripe_checkout_session_id = ${session.id},
                  paid_at = CURRENT_TIMESTAMP,
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = ${parseInt(invoiceId, 10)}
            `;
            logger.info(LOG_CATEGORIES.DB, 'Invoice marked paid via webhook', { invoiceId, sessionId: session.id });
          }
          const subId = (session.metadata && session.metadata.request_submission_id) || session.client_reference_id;
          if (subId && !isNaN(Number(subId)) && !invoiceId) {
            await sql`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT`;
            await sql`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending'`;
            await sql`
              UPDATE service_requests
              SET stripe_checkout_session_id = ${session.id},
                  payment_status = 'paid'
              WHERE id = ${parseInt(subId, 10)}
            `;
            logger.info(LOG_CATEGORIES.DB, 'Payment marked paid via webhook', { submissionId: subId, sessionId: session.id });
          }
        }

        jsonResponse(res, 200, { received: true });
      } catch (err) {
        logger.error(LOG_CATEGORIES.API, 'Webhook handler error', err);
        jsonResponse(res, 500, { success: false });
      }
      return;
    }

    // GET /api/checkout-session?id=cs_... — used by success page to display confirmed items
    if (url.startsWith('/api/checkout-session') && method === 'GET') {
      try {
        if (!stripeClient) {
          jsonResponse(res, 503, { success: false, message: 'Not configured.' });
          return;
        }
        const qs = req.url.includes('?') ? req.url.split('?')[1] : '';
        const sessionId = new URLSearchParams(qs).get('id');
        if (!sessionId || !sessionId.startsWith('cs_')) {
          jsonResponse(res, 400, { success: false, message: 'Invalid session ID.' });
          return;
        }
        const session = await stripeClient.checkout.sessions.retrieve(sessionId, { expand: ['line_items'] });
        jsonResponse(res, 200, {
          success: true,
          customerEmail: session.customer_details && session.customer_details.email,
          amountTotal: session.amount_total,
          currency: session.currency,
          lineItems: (session.line_items && session.line_items.data || []).map(function (li) {
            return { description: li.description, qty: li.quantity, amount: li.amount_total };
          }),
        });
      } catch (err) {
        logger.error(LOG_CATEGORIES.API, 'Checkout session retrieve error', err);
        jsonResponse(res, 500, { success: false });
      }
      return;
    }

    // GET /api/admin/invoices — list invoices
    if (url === '/api/admin/invoices' && method === 'GET') {
      try {
        const sql = getSql();
        await invoiceUtils.ensureInvoicesTable(sql);
        const result = await sql`SELECT id, invoice_number, status, invoice_date, due_date, case_number, client_email, subtotal_cents, total_cents, stripe_fee_enabled, paid_at, created_at, access_token FROM invoices ORDER BY created_at DESC LIMIT 500`;
        jsonResponse(res, 200, { success: true, data: result });
      } catch (err) {
        logger.error(LOG_CATEGORIES.API, 'Admin invoices list error', err);
        jsonResponse(res, 500, { success: false, message: err.message });
      }
      return;
    }

    // POST /api/admin/invoices — create invoice
    if (url === '/api/admin/invoices' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const sql = getSql();
        await invoiceUtils.ensureInvoicesTable(sql);
        const payload = invoiceUtils.sanitizeInvoicePayload(body);
        const invoiceNumber = payload.invoice_number || await invoiceUtils.getNextInvoiceNumber(sql);
        const accessToken = invoiceUtils.generateAccessToken();
        const today = new Date().toISOString().split('T')[0];
        const inserted = await sql`
          INSERT INTO invoices (
            invoice_number, status, invoice_date, due_date, case_number,
            bill_to, service_details, line_items,
            subtotal_cents, tax_pct, tax_cents, discount_cents,
            stripe_fee_enabled, stripe_fee_cents, total_cents,
            notes, client_email, access_token, stripe_pay_url
          ) VALUES (
            ${invoiceNumber}, ${payload.status || 'unpaid'},
            ${payload.invoice_date || today}, ${payload.due_date || today},
            ${payload.case_number},
            ${JSON.stringify(payload.bill_to)}, ${JSON.stringify(payload.service_details)},
            ${JSON.stringify(payload.line_items)},
            ${payload.subtotal_cents}, ${payload.tax_pct}, ${payload.tax_cents},
            ${payload.discount_cents}, ${payload.stripe_fee_enabled},
            ${payload.stripe_fee_cents}, ${payload.total_cents},
            ${payload.notes}, ${payload.client_email}, ${accessToken}, ${payload.stripe_pay_url}
          ) RETURNING *
        `;
        const inv = inserted[0];
        const payUrl = SITE_URL + '/invoice.html?number=' + encodeURIComponent(inv.invoice_number) + '&token=' + encodeURIComponent(inv.access_token);
        jsonResponse(res, 201, { success: true, data: inv, payUrl });
      } catch (err) {
        logger.error(LOG_CATEGORIES.API, 'Create invoice error', err);
        jsonResponse(res, 500, { success: false, message: err.message });
      }
      return;
    }

    // GET/PUT/DELETE /api/admin/invoices/:id
    if (url.match(/^\/api\/admin\/invoices\/\d+$/) && ['GET', 'PUT', 'DELETE'].includes(method)) {
      const invId = parseInt(url.split('/').pop(), 10);
      try {
        const sql = getSql();
        await invoiceUtils.ensureInvoicesTable(sql);
        if (method === 'GET') {
          const rows = await sql`SELECT * FROM invoices WHERE id = ${invId}`;
          if (!rows.length) { jsonResponse(res, 404, { success: false, message: 'Not found' }); return; }
          jsonResponse(res, 200, { success: true, data: rows[0] });
          return;
        }
        if (method === 'DELETE') {
          await sql`DELETE FROM invoices WHERE id = ${invId}`;
          jsonResponse(res, 200, { success: true, message: 'Deleted' });
          return;
        }
        if (method === 'PUT') {
          const body = await parseBody(req);
          const payload = invoiceUtils.sanitizeInvoicePayload(body);
          const updated = await sql`
            UPDATE invoices SET
              status = ${body.status || 'unpaid'},
              invoice_date = ${payload.invoice_date},
              due_date = ${payload.due_date},
              case_number = ${payload.case_number},
              bill_to = ${JSON.stringify(payload.bill_to)},
              service_details = ${JSON.stringify(payload.service_details)},
              line_items = ${JSON.stringify(payload.line_items)},
              subtotal_cents = ${payload.subtotal_cents},
              tax_pct = ${payload.tax_pct},
              tax_cents = ${payload.tax_cents},
              discount_cents = ${payload.discount_cents},
              stripe_fee_enabled = ${payload.stripe_fee_enabled},
              stripe_fee_cents = ${payload.stripe_fee_cents},
              total_cents = ${payload.total_cents},
              notes = ${payload.notes},
              client_email = ${payload.client_email},
              stripe_pay_url = ${payload.stripe_pay_url},
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ${invId}
            RETURNING *
          `;
          if (!updated.length) { jsonResponse(res, 404, { success: false, message: 'Not found' }); return; }
          jsonResponse(res, 200, { success: true, data: updated[0] });
          return;
        }
      } catch (err) {
        logger.error(LOG_CATEGORIES.API, 'Admin invoice detail error', err);
        jsonResponse(res, 500, { success: false, message: err.message });
      }
      return;
    }

    // GET /api/invoices/:number?token= — public invoice view
    if (url.match(/^\/api\/invoices\/INV-[0-9]+$/) && method === 'GET') {
      const invNumber = decodeURIComponent(url.split('/').pop());
      const qs = req.url.includes('?') ? req.url.split('?')[1] : '';
      const token = new URLSearchParams(qs).get('token');
      if (!token) {
        jsonResponse(res, 400, { success: false, message: 'Access code required.' });
        return;
      }
      try {
        const sql = getSql();
        await invoiceUtils.ensureInvoicesTable(sql);
        const rows = await sql`
          SELECT * FROM invoices
          WHERE invoice_number = ${invNumber} AND access_token = ${token}
          LIMIT 1
        `;
        if (!rows.length) {
          jsonResponse(res, 404, { success: false, message: 'Invoice not found.' });
          return;
        }
        jsonResponse(res, 200, { success: true, data: invoiceUtils.publicInvoiceView(rows[0]) });
      } catch (err) {
        logger.error(LOG_CATEGORIES.API, 'Public invoice error', err);
        jsonResponse(res, 500, { success: false, message: err.message });
      }
      return;
    }

    // POST /api/invoices/:number/checkout — Stripe checkout for invoice
    if (url.match(/^\/api\/invoices\/INV-[0-9]+\/checkout$/) && method === 'POST') {
      if (!stripeClient) {
        jsonResponse(res, 503, { success: false, message: 'Payment processing not configured.' });
        return;
      }
      const invNumber = decodeURIComponent(url.split('/')[3]);
      try {
        const body = await parseBody(req);
        const token = body.token;
        if (!token) {
          jsonResponse(res, 400, { success: false, message: 'Access code required.' });
          return;
        }
        const sql = getSql();
        await invoiceUtils.ensureInvoicesTable(sql);
        const rows = await sql`
          SELECT * FROM invoices
          WHERE invoice_number = ${invNumber} AND access_token = ${token}
          LIMIT 1
        `;
        if (!rows.length) {
          jsonResponse(res, 404, { success: false, message: 'Invoice not found.' });
          return;
        }
        const invoice = rows[0];
        if (invoice.status === 'paid') {
          jsonResponse(res, 400, { success: false, message: 'Invoice already paid.' });
          return;
        }
        const session = await invoiceUtils.createInvoiceCheckoutSession(stripeClient, invoice, SITE_URL);
        await sql`
          UPDATE invoices SET stripe_checkout_session_id = ${session.id}, status = 'sent', updated_at = CURRENT_TIMESTAMP
          WHERE id = ${invoice.id}
        `;
        jsonResponse(res, 200, { success: true, url: session.url });
      } catch (err) {
        logger.error(LOG_CATEGORIES.API, 'Invoice checkout error', err);
        jsonResponse(res, 500, { success: false, message: err.message });
      }
      return;
    }

    // GET /api/invoice-catalog — service types for quote builder
    if (url === '/api/invoice-catalog' && method === 'GET') {
      jsonResponse(res, 200, {
        success: true,
        types: invoiceUtils.INVOICE_SERVICE_TYPES,
        prices: invoiceUtils.INVOICE_DEFAULT_PRICES,
      });
      return;
    }

    jsonResponse(res, 404, { message: 'API endpoint not found' });
    return;
  }
  // Static file handling — also serves SEO assets (robots.txt, sitemap.xml,
  // llms.txt, .well-known/*, etc.) with correct MIME types.
  const safeUrl = url.replace(/\.{2,}/g, '.'); // basic traversal guard
  let filePath = path.join(__dirname, safeUrl === '/' ? 'index.html' : safeUrl);

  // Block direct access to sensitive server-side files
  const blocked = ['server.js', '.env', '.env.local', 'package.json', 'package-lock.json'];
  const rel = path.relative(__dirname, filePath);
  if (blocked.some(b => rel === b) || rel.startsWith('api' + path.sep) || rel.startsWith('node_modules' + path.sep)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
    return;
  }

  const fileExists = fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  const ext = path.extname(filePath).toLowerCase();

  const contentTypes = {
    '.html':        'text/html; charset=utf-8',
    '.htm':         'text/html; charset=utf-8',
    '.css':         'text/css; charset=utf-8',
    '.js':          'text/javascript; charset=utf-8',
    '.mjs':         'text/javascript; charset=utf-8',
    '.json':        'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.xml':         'application/xml; charset=utf-8',
    '.txt':         'text/plain; charset=utf-8',
    '.md':          'text/markdown; charset=utf-8',
    '.png':         'image/png',
    '.jpeg':        'image/jpeg',
    '.jpg':         'image/jpeg',
    '.gif':         'image/gif',
    '.svg':         'image/svg+xml; charset=utf-8',
    '.ico':         'image/x-icon',
    '.webp':        'image/webp',
    '.avif':        'image/avif',
    '.woff':        'font/woff',
    '.woff2':       'font/woff2',
    '.ttf':         'font/ttf',
    '.otf':         'font/otf',
    '.map':         'application/json; charset=utf-8',
    '.pdf':         'application/pdf',
  };

  // Real 404 instead of silently returning the homepage — important for SEO
  // (avoids 200-soft-404s where every missing URL was indexed as the homepage).
  if (!fileExists) {
    const fallback404 = path.join(__dirname, '404.html');
    if (fs.existsSync(fallback404)) {
      res.writeHead(404, {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Robots-Tag': 'noindex',
      });
      res.end(fs.readFileSync(fallback404));
    } else {
      res.writeHead(404, {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Robots-Tag': 'noindex',
      });
      res.end('<!doctype html><html><head><title>404 — Not Found</title><meta name="robots" content="noindex"></head><body><h1>404 — Not Found</h1><p><a href="/">Back to Prestige Serves</a></p></body></html>');
    }
    return;
  }

  // Cache + security headers
  const headers = {
    'Content-Type': contentTypes[ext] || 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
  };
  if (/\.(png|jpg|jpeg|gif|webp|avif|svg|ico|woff|woff2|ttf|otf)$/i.test(ext)) {
    headers['Cache-Control'] = 'public, max-age=2592000, immutable'; // 30 days
  } else if (ext === '.html') {
    headers['Cache-Control'] = 'public, max-age=300, must-revalidate'; // 5 min
  } else if (ext === '.xml' || ext === '.txt' || ext === '.webmanifest') {
    headers['Cache-Control'] = 'public, max-age=3600'; // 1 hour for SEO files
  } else {
    headers['Cache-Control'] = 'public, max-age=600';
  }

  res.writeHead(200, headers);
  res.end(fs.readFileSync(filePath));
});

const PORT = parseInt(process.env.PORT, 10) || 3002;

server.listen(PORT, () => {
  logger.info(LOG_CATEGORIES.SERVER, 'Server started', { port: PORT });
});
