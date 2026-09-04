import { handleUpload } from '@vercel/blob/client';
import { logger, LOG_CATEGORIES } from './logger.js';
import { MAX_UPLOAD_FILE_BYTES, MAX_UPLOAD_FILE_MB, ALLOWED_UPLOAD_CONTENT_TYPES } from '../lib/upload-limits.js';

const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

// Vercel caps every serverless request body at 4.5 MB, so documents can never
// be relayed through /api/request. Instead the browser asks this route for a
// short-lived client token and PUTs the file straight to Vercel Blob, which has
// no such cap. Only the resulting URLs are posted with the form.
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
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  if (!BLOB_READ_WRITE_TOKEN) {
    logger.error(LOG_CATEGORIES.BLOB, 'BLOB_READ_WRITE_TOKEN is not configured', null);
    return res.status(500).json({
      success: false,
      message: 'File uploads are not configured. Please email your documents to info@prestigeserves.com.',
    });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid request body' });
    }
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      token: BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (pathname) => ({
        allowedContentTypes: ALLOWED_UPLOAD_CONTENT_TYPES,
        maximumSizeInBytes: MAX_UPLOAD_FILE_BYTES,
        addRandomSuffix: true,
        // The token is only good for a single upload, minutes long.
        validUntil: Date.now() + 10 * 60 * 1000,
        tokenPayload: JSON.stringify({ pathname }),
      }),
      onUploadCompleted: async ({ blob }) => {
        // Fires only on deployed environments. The browser also reports the URL
        // back with the form, so nothing depends on this callback arriving.
        logger.info(LOG_CATEGORIES.BLOB, 'Client upload completed', { url: blob && blob.url });
      },
    });

    return res.status(200).json(jsonResponse);
  } catch (err) {
    logger.error(LOG_CATEGORIES.BLOB, 'Client upload token error', err);
    return res.status(400).json({
      success: false,
      message: err && err.message
        ? err.message
        : `Upload failed. Files must be ${MAX_UPLOAD_FILE_MB} MB or smaller.`,
    });
  }
}
