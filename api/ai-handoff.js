/**
 * ai-handoff.js
 * One-click endpoint for the owner to take over a conversation thread.
 *
 * GET /api/ai-handoff?id=<submissionId>&type=<contact|request>&token=<secret>
 *
 * When clicked:
 *  - Sets ai_mode = 'owner' on the DB row
 *  - AI will not auto-reply to any further messages in this thread
 *  - Returns a simple confirmation HTML page
 */

import { neon } from '@neondatabase/serverless';
import { logger, LOG_CATEGORIES } from './logger.js';

const DATABASE_URL = process.env.DATABASE_URL;
const AI_HANDOFF_SECRET = process.env.AI_HANDOFF_SECRET || 'prestige-handoff-2024';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/html');

  const { id, type, token } = req.query || {};

  // ── Validate token ───────────────────────────────────────────────────────
  if (!token || token !== AI_HANDOFF_SECRET) {
    res.status(403).send(renderPage('❌ Access Denied', 'Invalid or missing security token.', '#dc2626'));
    return;
  }

  const submissionId = parseInt(id, 10);
  const tableType = type === 'request' ? 'service_requests' : 'contact_submissions';

  if (!submissionId || isNaN(submissionId)) {
    res.status(400).send(renderPage('❌ Invalid Request', 'Missing or invalid submission ID.', '#dc2626'));
    return;
  }

  if (!DATABASE_URL) {
    res.status(500).send(renderPage('❌ Server Error', 'Database not configured.', '#dc2626'));
    return;
  }

  try {
    const sql = neon(DATABASE_URL);

    // Ensure column exists
    await sql`ALTER TABLE ${sql(tableType)} ADD COLUMN IF NOT EXISTS ai_mode VARCHAR(20) DEFAULT 'ai'`.catch(() => {});

    // Set owner mode
    await sql`UPDATE ${sql(tableType)} SET ai_mode = 'owner' WHERE id = ${submissionId}`;

    logger.info(LOG_CATEGORIES.EMAIL, 'Human handoff activated', { submissionId, tableType });

    res.status(200).send(renderPage(
      '✅ You Are Now in Control',
      `The AI assistant has been silenced for submission #${submissionId}. <br><br>
       You can now reply to the client directly from your email client.<br>
       The AI will <strong>not</strong> send any more automated replies to this thread.`,
      '#16a34a'
    ));
  } catch (err) {
    logger.error(LOG_CATEGORIES.EMAIL, 'ai-handoff DB error', err);
    res.status(500).send(renderPage('❌ Server Error', err.message, '#dc2626'));
  }
}

function renderPage(title, message, color) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Prestige Serves</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', sans-serif;
      background: linear-gradient(135deg, #1a3a5c 0%, #0f2340 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: #fff;
      border-radius: 16px;
      padding: 48px 40px;
      max-width: 520px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .icon {
      font-size: 64px;
      margin-bottom: 24px;
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      color: ${color};
      margin-bottom: 16px;
    }
    p {
      font-size: 15px;
      line-height: 1.7;
      color: #555;
    }
    .brand {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e2e8f0;
      font-size: 13px;
      color: #94a3b8;
    }
    .brand strong { color: #1a3a5c; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${color === '#16a34a' ? '🤝' : '⚠️'}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <div class="brand">
      <strong>Prestige Serves LLC</strong><br>
      Professional Process Serving · Los Angeles, CA<br>
      📞 424-235-3089
    </div>
  </div>
</body>
</html>`;
}
