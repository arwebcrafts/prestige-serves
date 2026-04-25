const http = require('http');
const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_P8aH3JElyXBw@ep-gentle-frog-a4yzwn3w-pooler.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';

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

const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];
  const method = req.method;

  // API routes
  if (url.startsWith('/api/')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Contact form submission (used by both index.html and contact.html)
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

    // Request form submission (request.html)
    if (url === '/api/request' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const sql = getSql();
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
            ${body.multipleDefendants}, ${body.serviceType}, ${body.deadlineDate},
            ${body.specialInstructions}, ${body.defendantsData || null}
          )
        `;
        jsonResponse(res, 201, { success: true, message: 'Service request submitted successfully' });
      } catch (err) {
        console.error('Request submission error:', err);
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
