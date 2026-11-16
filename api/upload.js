import { put } from '@vercel/blob';
import formidable from 'formidable';
import fs from 'fs';

const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const data = await new Promise((resolve, reject) => {
      const form = formidable({ multiples: true });
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const fileField = data.files.files || data.files.file;
    const uploaded = [];
    if (fileField) {
      const fileArray = Array.isArray(fileField) ? fileField : [fileField];
      for (const file of fileArray) {
        if (file && file.filepath) {
          const buffer = fs.readFileSync(file.filepath);
          const blobResult = await put(file.originalFilename || file.newFilename, buffer, {
            access: 'public',
            token: BLOB_READ_WRITE_TOKEN,
          });
          uploaded.push({
            name: file.originalFilename || file.newFilename,
            url: blobResult.url,
          });
        }
      }
    }

    return res.status(200).json({ success: true, files: uploaded });
  } catch (err) {
    console.error('Upload handler error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
