/**
 * extract-text.js
 * Fetches a file URL and extracts readable text from it.
 * Supports: PDF, plain text, DOCX. Returns up to MAX_CHARS characters.
 *
 * Compatible with:
 *  - node-fetch v3 (uses arrayBuffer(), not buffer())
 *  - pdf-parse v2 (uses ESM export at 'pdf-parse')
 */

import { logger, LOG_CATEGORIES } from './logger.js';

const MAX_CHARS = 4000; // keep within AI context window

/**
 * Fetch a URL and extract text content from it.
 * @param {string} url — public URL of the file (Vercel Blob, etc.)
 * @param {string} filename — original filename, used to detect type
 * @returns {Promise<string>} extracted text or empty string on failure
 */
export async function extractTextFromUrl(url, filename = '') {
  try {
    const { default: fetch } = await import('node-fetch');
    const response = await fetch(url, { timeout: 15000 });

    if (!response.ok) {
      logger.warn(LOG_CATEGORIES.EMAIL, `extractTextFromUrl: HTTP ${response.status} for ${url}`);
      return '';
    }

    const contentType = response.headers.get('content-type') || '';
    const lowerName = (filename || '').toLowerCase();

    // ── Plain text ──────────────────────────────────────────────────────────
    if (contentType.includes('text/plain') || lowerName.endsWith('.txt')) {
      const text = await response.text();
      return text.slice(0, MAX_CHARS);
    }

    // ── PDF ─────────────────────────────────────────────────────────────────
    if (contentType.includes('pdf') || lowerName.endsWith('.pdf')) {
      try {
        // pdf-parse v2 has proper ESM export
        const { default: pdfParse } = await import('pdf-parse');
        // node-fetch v3: use arrayBuffer() then convert to Buffer
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const data = await pdfParse(buffer);
        const text = (data.text || '').replace(/\s+/g, ' ').trim();
        return text.slice(0, MAX_CHARS);
      } catch (pdfErr) {
        logger.warn(LOG_CATEGORIES.EMAIL, 'pdf-parse failed', pdfErr);
        return '[PDF attached — could not extract text]';
      }
    }

    // ── DOCX (minimal inline extraction) ────────────────────────────────────
    if (lowerName.endsWith('.docx')) {
      try {
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const text = buffer.toString('utf8');
        const matches = text.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || [];
        const extracted = matches
          .map(m => m.replace(/<[^>]+>/g, ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        return extracted.slice(0, MAX_CHARS) || '[DOCX attached — could not extract text]';
      } catch {
        return '[DOCX attached]';
      }
    }

    // ── Unknown type ─────────────────────────────────────────────────────────
    return `[Attached file: ${filename || 'document'}]`;
  } catch (err) {
    logger.error(LOG_CATEGORIES.EMAIL, 'extractTextFromUrl error', err, { url });
    return '';
  }
}

/**
 * Extract text from multiple file objects { name, url }
 * Returns a combined summary string.
 */
export async function extractTextFromFiles(files = []) {
  if (!files || files.length === 0) return '';

  const results = await Promise.all(
    files.map(async (f) => {
      const text = await extractTextFromUrl(f.url, f.name);
      if (!text) return '';
      return `--- Document: ${f.name} ---\n${text}`;
    })
  );

  return results.filter(Boolean).join('\n\n');
}
