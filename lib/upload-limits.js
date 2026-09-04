'use strict';

/** Max size per uploaded file (default 25 MB). Override with UPLOAD_MAX_FILE_MB in .env */
const MAX_UPLOAD_FILE_MB = Math.max(1, parseInt(process.env.UPLOAD_MAX_FILE_MB, 10) || 25);
const MAX_UPLOAD_FILE_BYTES = MAX_UPLOAD_FILE_MB * 1024 * 1024;

/** Max combined upload size for one request (default 100 MB). Override with UPLOAD_MAX_TOTAL_MB */
const MAX_UPLOAD_TOTAL_MB = Math.max(
  MAX_UPLOAD_FILE_MB,
  parseInt(process.env.UPLOAD_MAX_TOTAL_MB, 10) || 100
);
const MAX_UPLOAD_TOTAL_BYTES = MAX_UPLOAD_TOTAL_MB * 1024 * 1024;

/** Content types the request form accepts. Enforced when minting Blob client
 *  upload tokens so the browser cannot upload arbitrary file types. */
const ALLOWED_UPLOAD_CONTENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/tiff',
];

/** Extensions shown to the user and checked before an upload starts. */
const ALLOWED_UPLOAD_EXTENSIONS = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.heic', '.tif', '.tiff'];

module.exports = {
  ALLOWED_UPLOAD_CONTENT_TYPES,
  ALLOWED_UPLOAD_EXTENSIONS,
  MAX_UPLOAD_FILE_MB,
  MAX_UPLOAD_FILE_BYTES,
  MAX_UPLOAD_TOTAL_MB,
  MAX_UPLOAD_TOTAL_BYTES,
};
