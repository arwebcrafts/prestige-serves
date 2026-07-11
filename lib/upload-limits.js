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

module.exports = {
  MAX_UPLOAD_FILE_MB,
  MAX_UPLOAD_FILE_BYTES,
  MAX_UPLOAD_TOTAL_MB,
  MAX_UPLOAD_TOTAL_BYTES,
};
