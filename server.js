const http = require('http');
const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');
const { put } = require('@vercel/blob');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_P8aH3JElyXBw@ep-gentle-frog-a4yzwn3w-pooler.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';
const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || 'vercel_blob_rw_1qFTdRzk36aoQZsG_uiiyBg0DZ8Sl5zySi6DmqaMnIz9eqV';

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

function csvEscape(val) {
  if (val === null || val === undefined) return '';
  let s = typeof val === 'object' ? JSON.stringify(val) : String(val);
  s = s.replace(/"/g, '""');
  if (/[",\r\n]/.test(s)) return `"${s}"`;
  return s;
}

function rowsToCsv(rows, columns) {
  const header = columns.map(csvEscape).join(',');
  const lines = rows.map((row) =>
    columns.map((col) => csvEscape(row[col])).join(',')
  );
  return [header, ...lines].join('\r\n');
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
  const rawUrl = req.url || '/';
  const url = rawUrl.split('?')[0];
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
        jsonResponse(res, 201, { success: true, message: 'Contact form submitted successfully' });
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
          jsonResponse(res, 201, { success: true, message: 'Service request submitted successfully' });
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
          jsonResponse(res, 201, { success: true, message: 'Service request submitted successfully' });
        }
      } catch (err) {
        console.error('Request submission error:', err);
        jsonResponse(res, 500, { success: false, message: 'Database error: ' + err.message });
      }
      return;
    }

    const reqPath = url;
    const query = new URLSearchParams(rawUrl.includes('?') ? rawUrl.split('?')[1] : '');

    // Admin API - List / export CSV / create service requests
    if (reqPath === '/api/admin/requests' && method === 'GET') {
      try {
        const sql = getSql();
        const result = await sql`SELECT * FROM service_requests ORDER BY created_at DESC LIMIT 500`;
        if (query.get('format') === 'csv') {
          const cols = [
            'id', 'created_at', 'client_name', 'contact_name', 'email', 'phone',
            'address_line1', 'address_line2', 'city', 'state', 'zip',
            'defendant_name', 'case_number', 'court_jurisdiction', 'multiple_defendants',
            'service_type', 'deadline_date', 'special_instructions', 'defendants_data', 'uploaded_files'
          ];
          const csv = rowsToCsv(result, cols);
          res.writeHead(200, {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename="service_requests.csv"',
            'Access-Control-Allow-Origin': '*'
          });
          res.end('\uFEFF' + csv);
          return;
        }
        jsonResponse(res, 200, { success: true, data: result });
      } catch (err) {
        console.error('Admin requests error:', err);
        jsonResponse(res, 500, { success: false, message: 'Database error' });
      }
      return;
    }

    if (reqPath === '/api/admin/requests' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const sql = getSql();
        await sql`
          INSERT INTO service_requests (
            client_name, contact_name, email, phone,
            address_line1, address_line2, city, state, zip,
            defendant_name, case_number, court_jurisdiction,
            multiple_defendants, service_type, deadline_date,
            special_instructions, defendants_data, uploaded_files
          ) VALUES (
            ${body.client_name || ''}, ${body.contact_name || ''}, ${body.email || ''}, ${body.phone || ''},
            ${body.address_line1 || ''}, ${body.address_line2 || ''}, ${body.city || ''}, ${body.state || ''}, ${body.zip || ''},
            ${body.defendant_name || ''}, ${body.case_number || ''}, ${body.court_jurisdiction || ''},
            ${!!body.multiple_defendants}, ${body.service_type || ''}, ${body.deadline_date || null},
            ${body.special_instructions || ''}, ${body.defendants_data || null}, ${body.uploaded_files || null}
          )
        `;
        jsonResponse(res, 201, { success: true, message: 'Request created' });
      } catch (err) {
        console.error('Admin create request error:', err);
        jsonResponse(res, 500, { success: false, message: 'Database error' });
      }
      return;
    }

    // Admin API - List / export CSV / create contact submissions
    if (reqPath === '/api/admin/contacts' && method === 'GET') {
      try {
        const sql = getSql();
        const result = await sql`SELECT * FROM contact_submissions ORDER BY created_at DESC LIMIT 500`;
        if (query.get('format') === 'csv') {
          const cols = [
            'id', 'created_at', 'first_name', 'last_name', 'company', 'email', 'phone',
            'reason', 'county', 'state', 'case_details', 'urgency', 'consent'
          ];
          const csv = rowsToCsv(result, cols);
          res.writeHead(200, {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename="contact_submissions.csv"',
            'Access-Control-Allow-Origin': '*'
          });
          res.end('\uFEFF' + csv);
          return;
        }
        jsonResponse(res, 200, { success: true, data: result });
      } catch (err) {
        console.error('Admin contacts error:', err);
        jsonResponse(res, 500, { success: false, message: 'Database error' });
      }
      return;
    }

    if (reqPath === '/api/admin/contacts' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const sql = getSql();
        await sql`
          INSERT INTO contact_submissions (
            first_name, last_name, company, email, phone,
            reason, county, state, case_details, urgency, consent
          ) VALUES (
            ${body.first_name || ''}, ${body.last_name || ''}, ${body.company || ''}, ${body.email || ''}, ${body.phone || ''},
            ${body.reason || ''}, ${body.county || ''}, ${body.state || ''}, ${body.case_details || ''}, ${body.urgency || ''},
            ${body.consent === true || body.consent === 'true'}
          )
        `;
        jsonResponse(res, 201, { success: true, message: 'Contact created' });
      } catch (err) {
        console.error('Admin create contact error:', err);
        jsonResponse(res, 500, { success: false, message: 'Database error' });
      }
      return;
    }

    // Admin API - Get single service request
    if (reqPath.match(/^\/api\/admin\/request\/\d+$/) && method === 'GET') {
      const id = reqPath.split('/').pop();
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

    if (reqPath.match(/^\/api\/admin\/request\/\d+$/) && method === 'DELETE') {
      const id = reqPath.split('/').pop();
      try {
        const sql = getSql();
        await sql`DELETE FROM service_requests WHERE id = ${id}`;
        jsonResponse(res, 200, { success: true, message: 'Deleted' });
      } catch (err) {
        console.error('Admin delete request error:', err);
        jsonResponse(res, 500, { success: false, message: 'Database error' });
      }
      return;
    }

    // Admin API - Get single contact submission
    if (reqPath.match(/^\/api\/admin\/contact\/\d+$/) && method === 'GET') {
      const id = reqPath.split('/').pop();
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

    if (reqPath.match(/^\/api\/admin\/contact\/\d+$/) && method === 'DELETE') {
      const id = reqPath.split('/').pop();
      try {
        const sql = getSql();
        await sql`DELETE FROM contact_submissions WHERE id = ${id}`;
        jsonResponse(res, 200, { success: true, message: 'Deleted' });
      } catch (err) {
        console.error('Admin delete contact error:', err);
        jsonResponse(res, 500, { success: false, message: 'Database error' });
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
