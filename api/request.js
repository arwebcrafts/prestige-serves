import { neon } from '@neondatabase/serverless';
import { put } from '@vercel/blob';

const DATABASE_URL = process.env.DATABASE_URL;
const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

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
    let uploadedFiles = [];

    if (contentType.includes('multipart/form-data')) {
      // Use req.formData() which is available in Vercel serverless
      const formData = await req.formData();
      
      for (const [key, value] of formData.entries()) {
        if (typeof value === 'string') {
          switch (key) {
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
        } else if (value instanceof File) {
          // Handle file upload
          try {
            const arrayBuffer = await value.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const blobResult = await put(value.name, buffer, {
              access: 'public',
              token: BLOB_READ_WRITE_TOKEN,
            });
            uploadedFiles.push({ name: value.name, url: blobResult.url });
          } catch (blobErr) {
            console.error('Blob upload error:', blobErr);
          }
        }
      }
    } else {
      const body = req.body;
      if (body) {
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
    }

    const uploadedFilesJson = uploadedFiles.length > 0 ? JSON.stringify(uploadedFiles) : null;

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
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
}
