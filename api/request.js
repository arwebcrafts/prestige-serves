import { neon } from '@neondatabase/serverless';
import { put } from '@vercel/blob';

const DATABASE_URL = process.env.DATABASE_URL;
const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

export const config = {
  api: {
    bodyParser: false,
  },
};

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
    const contentType = req.headers['content-type'] || '';
    const sql = neon(DATABASE_URL);
    
    let clientName, contactName, email, phone, addressLine1, addressLine2, city, state, zip;
    let defendantName, caseNumber, courtJurisdiction, multipleDefendants, serviceType, deadlineDate;
    let specialInstructions, defendantsData;
    let uploadedFiles = null;

    if (contentType.includes('multipart/form-data')) {
      // Vercel provides req.body as a Buffer when bodyParser is false
      const data = req.body;
      
      if (!data || !Buffer.isBuffer(data)) {
        throw new Error('Request body is not available');
      }
      
      const boundary = contentType.split('boundary=')[1];
      if (!boundary) {
        throw new Error('No boundary found');
      }

      const boundaryBuffer = Buffer.from('--' + boundary, 'binary');
      const sections = splitBuffer(data, boundaryBuffer);
      
      for (const section of sections) {
        if (section.length === 0 || section.equals(Buffer.from('--', 'binary'))) continue;
        
        const idx = section.indexOf(Buffer.from('\r\n\r\n'));
        if (idx === -1) continue;
        
        const header = section.slice(0, idx).toString('binary');
        const content = section.slice(idx + 4);
        const headerMatch = header.match(/name="([^"]+)"/);
        if (!headerMatch) continue;
        
        const fieldName = headerMatch[1];
        
        if (header.includes('filename')) {
          const filenameMatch = header.match(/filename="([^"]+)"/);
          if (filenameMatch && content.length > 2) {
            const filename = filenameMatch[1];
            const binaryContent = content.slice(0, content.length - 2);
            
            try {
              const blobResult = await put(filename, binaryContent, {
                access: 'public',
                token: BLOB_READ_WRITE_TOKEN,
              });
              
              if (!uploadedFiles) uploadedFiles = [];
              uploadedFiles.push({ name: filename, url: blobResult.url });
            } catch (blobErr) {
              console.error('Blob upload error:', blobErr);
            }
          }
        } else {
          const value = content.slice(0, content.length - 2).toString('utf8');
          switch (fieldName) {
            case 'clientName': clientName = value; break;
            case 'contactName': contactName = value; break;
            case 'email': email = value; break;
            case 'phone': phone = value; break;
            case 'addressLine1': addressLine1 = value; break;
            case 'addressLine2': addressLine2 = value; break;
            case 'city': city = value; break;
            case 'state': state = value; break;
            case 'zip': zip = value; break;
            case 'defendantName': defendantName = value; break;
            case 'caseNumber': caseNumber = value; break;
            case 'courtJurisdiction': courtJurisdiction = value; break;
            case 'multiple_defendants': multipleDefendants = value === 'true'; break;
            case 'serviceType': serviceType = value; break;
            case 'deadlineDate': deadlineDate = value || null; break;
            case 'specialInstructions': specialInstructions = value; break;
            case 'defendantsData': defendantsData = value || null; break;
          }
        }
      }
    } else {
      // JSON body
      const body = req.body;
      clientName = body.clientName;
      contactName = body.contactName;
      email = body.email;
      phone = body.phone;
      addressLine1 = body.addressLine1;
      addressLine2 = body.addressLine2;
      city = body.city;
      state = body.state;
      zip = body.zip;
      defendantName = body.defendantName;
      caseNumber = body.caseNumber;
      courtJurisdiction = body.courtJurisdiction;
      multipleDefendants = body.multipleDefendants || false;
      serviceType = body.serviceType;
      deadlineDate = body.deadlineDate || null;
      specialInstructions = body.specialInstructions;
      defendantsData = body.defendantsData || null;
    }

    const uploadedFilesJson = uploadedFiles ? JSON.stringify(uploadedFiles) : null;

    await sql`
      INSERT INTO service_requests (
        client_name, contact_name, email, phone,
        address_line1, address_line2, city, state, zip,
        defendant_name, case_number, court_jurisdiction,
        multiple_defendants, service_type, deadline_date,
        special_instructions, defendants_data, uploaded_files
      ) VALUES (
        ${clientName || ''}, ${contactName || ''}, ${email || ''}, ${phone || ''},
        ${addressLine1 || ''}, ${addressLine2 || ''}, ${city || ''}, ${state || ''}, ${zip || ''},
        ${defendantName || ''}, ${caseNumber || ''}, ${courtJurisdiction || ''},
        ${multipleDefendants || false}, ${serviceType || ''}, ${deadlineDate},
        ${specialInstructions || ''}, ${defendantsData}, ${uploadedFilesJson}
      )
    `;
    
    return res.status(201).json({ success: true, message: 'Service request submitted successfully' });
  } catch (err) {
    console.error('Request submission error:', err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message, stack: err.stack });
  }
}

// Helper function to split buffer by boundary
function splitBuffer(buffer, delimiter) {
  const result = [];
  let start = 0;
  let idx = buffer.indexOf(delimiter, start);
  
  while (idx !== -1) {
    result.push(buffer.slice(start, idx));
    start = idx + delimiter.length;
    idx = buffer.indexOf(delimiter, start);
  }
  
  if (start < buffer.length) {
    result.push(buffer.slice(start));
  }
  
  return result;
}
