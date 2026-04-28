require('dotenv').config({ path: '.env.local' });
const http = require('http');
const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');
const { put } = require('@vercel/blob');
const { processContactFormToPST, processServiceRequestToPST } = require('./api/pst-integration');
const nodemailer = require('nodemailer');

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
  const transport = getSMTPTransporter();
  if (!transport) {
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
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('SMTP Email error:', err);
    return { success: false, error: err.message };
  }
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
      try {
        const body = await parseBody(req);
        const sql = getSql();
        await sql`
          INSERT INTO contact_submissions (
            first_name, last_name, company, email, phone,
            reason, county, state, case_details, urgency, consent
          ) VALUES (
            ${body.firstName}, ${body.lastName}, ${body.company}, ${body.email}, ${body.phone},
            ${body.reason}, ${body.county}, ${body.state}, ${body.caseDetails}, ${body.urgency}, ${body.consent || false}
          )
        `;
        
        // Submit to PST API if configured
        const pstResult = await processContactFormToPST({
          firstName: body.firstName,
          lastName: body.lastName,
          company: body.company,
          email: body.email,
          phone: body.phone,
          city: body.city,
          state: body.state
        });
        
        if (pstResult.success) {
          console.log('Contact form also saved to PST:', pstResult.entitySerialNumber);
        }
        
        // Send email notification to owner
        const emailHtml = `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${body.firstName} ${body.lastName}</p>
          <p><strong>Company:</strong> ${body.company || 'N/A'}</p>
          <p><strong>Email:</strong> ${body.email}</p>
          <p><strong>Phone:</strong> ${body.phone || 'N/A'}</p>
          <p><strong>Reason:</strong> ${body.reason || 'N/A'}</p>
          <p><strong>City:</strong> ${body.city || 'N/A'}</p>
          <p><strong>State:</strong> ${body.state || 'N/A'}</p>
          <p><strong>Case Details:</strong> ${body.caseDetails || 'None provided'}</p>
        `;
        const emailResult = await sendSMTPEmail({
          to: TO_EMAIL,
          subject: `New Contact - ${body.reason || 'Inquiry'} from ${body.firstName} ${body.lastName}`,
          html: emailHtml,
          text: `New Contact from ${body.firstName} ${body.lastName}. Company: ${body.company || 'N/A'}. Reason: ${body.reason || 'N/A'}.`,
        });
        
        if (emailResult.success) {
          console.log('Contact form email sent:', emailResult.messageId);
        } else {
          console.error('Contact form email failed:', emailResult.error);
        }
        
        jsonResponse(res, 201, { success: true, message: 'Contact form submitted successfully', pstSync: pstResult.success, emailSent: emailResult.success });
      } catch (err) {
        console.error('Contact submission error:', err);
        jsonResponse(res, 500, { success: false, message: 'Database error' });
      }
      return;
    }

    // Request form submission with file upload
    if (url === '/api/request' && method === 'POST') {
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
                const blobResult = await put(file.originalName, file.buffer, {
                  access: 'public',
                  token: BLOB_READ_WRITE_TOKEN
                });
                uploadedFiles.push({
                  name: file.originalName,
                  url: blobResult.url
                });
              } catch (blobErr) {
                console.error('Blob upload error:', blobErr);
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
              special_instructions, defendants_data, uploaded_files
            ) VALUES (
              ${f.clientName || ''}, ${f.contactName || ''}, ${f.email || ''}, ${f.phone || ''},
              ${f.addressLine1 || ''}, ${f.addressLine2 || ''}, ${f.city || ''}, ${f.state || ''}, ${f.zip || ''},
              ${f.defendantName || ''}, ${f.caseNumber || ''}, ${f.courtJurisdiction || ''},
              ${f.multiple_defendants === 'true'}, ${f.serviceType || ''}, ${f.deadlineDate || null},
              ${f.specialInstructions || ''}, ${f.defendantsData || null}, ${fileData}
            )
          `;
          
          // Submit to PST API if configured
          const pstResult = await processServiceRequestToPST({
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
            console.log('Service request also saved to PST:', pstResult.jobNumber);
          }
          
          // Send email notification to owner
          const emailHtml = `
            <h2>New Service Request</h2>
            <p><strong>Client Name:</strong> ${f.clientName}</p>
            <p><strong>Contact Name:</strong> ${f.contactName}</p>
            <p><strong>Email:</strong> ${f.email}</p>
            <p><strong>Phone:</strong> ${f.phone}</p>
            <p><strong>Service Address:</strong> ${f.addressLine1}${f.addressLine2 ? ', ' + f.addressLine2 : ''}, ${f.city}, ${f.state} ${f.zip}</p>
            <p><strong>Defendant:</strong> ${f.defendantName}</p>
            <p><strong>Case Number:</strong> ${f.caseNumber || 'N/A'}</p>
            <p><strong>Court:</strong> ${f.courtJurisdiction || 'N/A'}</p>
            <p><strong>Service Type:</strong> ${f.serviceType}</p>
            <p><strong>Deadline:</strong> ${f.deadlineDate || 'Not specified'}</p>
            <p><strong>Special Instructions:</strong> ${f.specialInstructions || 'None'}</p>
          `;
          const emailResult = await sendSMTPEmail({
            to: TO_EMAIL,
            subject: `New Service Request - ${f.serviceType} from ${f.clientName}`,
            html: emailHtml,
            text: `New Service Request from ${f.clientName}. Contact: ${f.contactName}, ${f.email}, ${f.phone}. Service type: ${f.serviceType}.`,
          });
          
          if (emailResult.success) {
            console.log('Service request email sent:', emailResult.messageId);
          } else {
            console.error('Service request email failed:', emailResult.error);
          }
          
          jsonResponse(res, 201, { 
            success: true, 
            message: 'Service request submitted successfully',
            pstSync: pstResult.success,
            pstJobNumber: pstResult.jobNumber || null,
            emailSent: emailResult.success
          });
        } else {
          const body = await parseBody(req);
          await sql`
            INSERT INTO service_requests (
              client_name, contact_name, email, phone,
              address_line1, address_line2, city, state, zip,
              defendant_name, case_number, court_jurisdiction,
              multiple_defendants, service_type, deadline_date,
              special_instructions, defendants_data
            ) VALUES (
              ${body.clientName}, ${body.contactName}, ${body.email}, ${body.phone},
              ${body.addressLine1}, ${body.addressLine2}, ${body.city}, ${body.state}, ${body.zip},
              ${body.defendantName}, ${body.caseNumber}, ${body.courtJurisdiction},
              ${body.multipleDefendants || false}, ${body.serviceType}, ${body.deadlineDate},
              ${body.specialInstructions}, ${body.defendantsData || null}
            )
          `;
          
          // Submit to PST API if configured
          const pstResult = await processServiceRequestToPST(body);
          
          // Send email notification to owner
          const emailHtml = `
            <h2>New Service Request</h2>
            <p><strong>Client Name:</strong> ${body.clientName}</p>
            <p><strong>Contact Name:</strong> ${body.contactName}</p>
            <p><strong>Email:</strong> ${body.email}</p>
            <p><strong>Phone:</strong> ${body.phone}</p>
            <p><strong>Service Address:</strong> ${body.addressLine1}${body.addressLine2 ? ', ' + body.addressLine2 : ''}, ${body.city}, ${body.state} ${body.zip}</p>
            <p><strong>Defendant:</strong> ${body.defendantName}</p>
            <p><strong>Case Number:</strong> ${body.caseNumber || 'N/A'}</p>
            <p><strong>Court:</strong> ${body.courtJurisdiction || 'N/A'}</p>
            <p><strong>Service Type:</strong> ${body.serviceType}</p>
            <p><strong>Deadline:</strong> ${body.deadlineDate || 'Not specified'}</p>
            <p><strong>Special Instructions:</strong> ${body.specialInstructions || 'None'}</p>
          `;
          const emailResult = await sendSMTPEmail({
            to: TO_EMAIL,
            subject: `New Service Request - ${body.serviceType} from ${body.clientName}`,
            html: emailHtml,
            text: `New Service Request from ${body.clientName}. Contact: ${body.contactName}, ${body.email}, ${body.phone}. Service type: ${body.serviceType}.`,
          });
          
          if (emailResult.success) {
            console.log('Service request email sent:', emailResult.messageId);
          } else {
            console.error('Service request email failed:', emailResult.error);
          }
          
          jsonResponse(res, 201, { 
            success: true, 
            message: 'Service request submitted successfully',
            pstSync: pstResult.success,
            pstJobNumber: pstResult.jobNumber || null,
            emailSent: emailResult.success
          });
        }
      } catch (err) {
        console.error('Request submission error:', err);
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
        console.error('Admin requests error:', err);
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
        console.error('Admin contacts error:', err);
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
        console.error('Admin request detail error:', err);
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
        console.error('Admin contact detail error:', err);
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
        console.error('Admin request delete error:', err);
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
        console.error('Email API error:', err);
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
  console.log('Server running on http://localhost:3002');
});
