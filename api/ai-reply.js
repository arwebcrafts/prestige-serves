/**
 * ai-reply.js
 * Core AI auto-responder engine for Prestige Serves.
 *
 * Flow:
 *  1. Extract text from any attached files (PDFs, etc.)
 *  2. Build a prompt using the Prestige Serves knowledge base
 *  3. Call OpenRouter chat completions (gpt-4o-mini)
 *  4. Send the AI-generated reply to the CLIENT via Hostinger SMTP
 *  5. Send a copy + [Take Over] button alert to the OWNER
 *  6. Mark ai_reply_sent = 1 in the DB
 */

import { neon } from '@neondatabase/serverless';
import { PRESTIGE_KB } from './knowledge-base.js';
import { extractTextFromFiles } from './extract-text.js';
import { sendSMTPEmail, TO_EMAIL, FROM_EMAIL } from './smtp-email.js';
import {
  buildAiClientReplyHtml,
  buildOwnerAiAlertHtml,
} from './email-templates.js';
import { logger, LOG_CATEGORIES } from './logger.js';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const AI_MODEL = 'openai/gpt-4o-mini';

const DATABASE_URL = process.env.DATABASE_URL;
const AI_HANDOFF_SECRET = process.env.AI_HANDOFF_SECRET || 'prestige-handoff-2024';
const SITE_URL = process.env.SITE_URL || 'https://prestigeserves.com';

// ─── Check if thread is already owner-handled ────────────────────────────────
async function isOwnerHandling(submissionId, tableType) {
  if (!submissionId || !DATABASE_URL) return false;
  try {
    const sql = neon(DATABASE_URL);
    const table = tableType === 'contact' ? 'contact_submissions' : 'service_requests';
    const result = await sql`
      SELECT ai_mode FROM ${sql(table)} WHERE id = ${submissionId} LIMIT 1
    `;
    return result.length > 0 && result[0].ai_mode === 'owner';
  } catch {
    return false;
  }
}

// ─── Ensure DB columns exist ─────────────────────────────────────────────────
async function ensureAiColumns(sql, table) {
  try {
    await sql`ALTER TABLE ${sql(table)} ADD COLUMN IF NOT EXISTS ai_mode VARCHAR(20) DEFAULT 'ai'`;
    await sql`ALTER TABLE ${sql(table)} ADD COLUMN IF NOT EXISTS ai_reply_sent INTEGER DEFAULT 0`;
  } catch {
    // columns may already exist
  }
}

// ─── Mark reply sent in DB ───────────────────────────────────────────────────
async function markAiReplySent(submissionId, tableType) {
  if (!submissionId || !DATABASE_URL) return;
  try {
    const sql = neon(DATABASE_URL);
    const table = tableType === 'contact' ? 'contact_submissions' : 'service_requests';
    await sql`UPDATE ${sql(table)} SET ai_reply_sent = 1 WHERE id = ${submissionId}`;
  } catch (e) {
    logger.warn(LOG_CATEGORIES.EMAIL, 'markAiReplySent failed', e);
  }
}

// ─── Call OpenRouter ──────────────────────────────────────────────────────────
async function callOpenRouter(systemPrompt, userMessage) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not set in environment variables');
  }

  const { default: fetch } = await import('node-fetch');

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': SITE_URL,
      'X-Title': 'Prestige Serves AI Assistant',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 900,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const reply = data?.choices?.[0]?.message?.content;
  if (!reply) throw new Error('OpenRouter returned no reply content');
  return reply.trim();
}

// ─── Build system prompt ──────────────────────────────────────────────────────
function buildSystemPrompt() {
  return `You are the professional AI email assistant for Prestige Serves LLC, a licensed process serving company in Los Angeles, CA.

Your job is to reply to incoming client inquiries in a warm, professional, and clear manner.

GUIDELINES:
- Always greet the client by their first name (or "there" if unknown)
- Thank them genuinely for reaching out to Prestige Serves
- If they attached documents, briefly acknowledge what you saw in them (case name, parties, document type)
- Based on what they need, provide a clear, itemized cost ESTIMATE using the pricing from the knowledge base
- Explain what happens next (we review, send invoice, dispatch server, provide proof of service)
- If you are unsure of something, say a team member will follow up to confirm
- Use a warm but professional tone — not overly formal, not casual
- Keep the reply concise: 200–350 words maximum
- End with: "Warm regards,\nPrestige Serves Team\n📞 424-235-3089 | ✉️ info@prestigeserves.com"
- Do NOT make up information not in the knowledge base
- Do NOT include HTML tags — plain text only; the email system will render it beautifully

KNOWLEDGE BASE:
${PRESTIGE_KB}`;
}

// ─── Build user message for AI ───────────────────────────────────────────────
function buildUserMessage({ clientName, clientEmail, serviceType, inquiry, attachmentText, specialInstructions }) {
  let msg = `New inquiry received from: ${clientName} (${clientEmail})\n\n`;
  if (serviceType) msg += `Service requested: ${serviceType}\n\n`;
  if (inquiry) msg += `Their message / inquiry details:\n${inquiry}\n\n`;
  if (specialInstructions) msg += `Special instructions: ${specialInstructions}\n\n`;
  if (attachmentText) {
    msg += `Attached document content (extracted):\n${attachmentText}\n\n`;
  }
  msg += `Please write a warm, professional reply email to this client.`;
  return msg;
}

// ─── Main export: generate and send AI reply ──────────────────────────────────
/**
 * @param {object} opts
 * @param {number} opts.submissionId  — DB row ID
 * @param {'contact'|'request'} opts.tableType
 * @param {string} opts.clientName    — e.g. "John Smith" or "Jane" 
 * @param {string} opts.clientEmail   — reply-to address
 * @param {string} opts.serviceType   — e.g. "Process Serving", "eFiling"
 * @param {string} opts.inquiry       — the text body of their inquiry / form fields combined
 * @param {string} [opts.specialInstructions]
 * @param {Array<{name:string, url:string}>} [opts.uploadedFiles]  — attachments
 */
export async function generateAndSendAiReply(opts) {
  const {
    submissionId,
    tableType = 'contact',
    clientName = 'there',
    clientEmail,
    serviceType,
    inquiry,
    specialInstructions,
    uploadedFiles = [],
  } = opts;

  if (!clientEmail) {
    logger.warn(LOG_CATEGORIES.EMAIL, 'generateAndSendAiReply: no clientEmail, skipping');
    return { success: false, reason: 'no client email' };
  }

  // ── Ensure DB columns exist ───────────────────────────────────────────────
  if (DATABASE_URL && submissionId) {
    try {
      const sql = neon(DATABASE_URL);
      const table = tableType === 'contact' ? 'contact_submissions' : 'service_requests';
      await ensureAiColumns(sql, table);
    } catch { /* non-fatal */ }
  }

  // ── Check if owner already handling ──────────────────────────────────────
  const ownerHandling = await isOwnerHandling(submissionId, tableType);
  if (ownerHandling) {
    logger.info(LOG_CATEGORIES.EMAIL, 'AI reply skipped — owner is handling', { submissionId });
    return { success: false, reason: 'owner_handling' };
  }

  try {
    // ── Extract text from attachments ─────────────────────────────────────
    let attachmentText = '';
    if (uploadedFiles.length > 0) {
      attachmentText = await extractTextFromFiles(uploadedFiles);
    }

    // ── Call AI ───────────────────────────────────────────────────────────
    const systemPrompt = buildSystemPrompt();
    const userMessage = buildUserMessage({
      clientName: clientName.split(' ')[0] || clientName,
      clientEmail,
      serviceType,
      inquiry,
      attachmentText,
      specialInstructions,
    });

    const aiReplyText = await callOpenRouter(systemPrompt, userMessage);

    // ── Send AI reply to CLIENT ───────────────────────────────────────────
    const firstName = clientName.split(' ')[0] || clientName;
    const clientHtml = buildAiClientReplyHtml({
      clientName: firstName,
      replyText: aiReplyText,
      serviceType,
    });

    const clientEmailResult = await sendSMTPEmail({
      to: clientEmail,
      subject: `Re: Your Inquiry to Prestige Serves${serviceType ? ` — ${serviceType}` : ''}`,
      html: clientHtml,
      text: aiReplyText,
    });

    logger.info(LOG_CATEGORIES.EMAIL, 'AI reply sent to client', {
      clientEmail,
      success: clientEmailResult.success,
    });

    // ── Send copy + [Take Over] button to OWNER ───────────────────────────
    const ownerEmail = process.env.TO_EMAIL || 'info@prestigeserves.com';
    const handoffUrl = `${SITE_URL}/api/ai-handoff?id=${submissionId}&type=${tableType}&token=${AI_HANDOFF_SECRET}`;

    const ownerHtml = buildOwnerAiAlertHtml({
      clientName,
      clientEmail,
      serviceType,
      inquiry,
      aiReplyText,
      handoffUrl,
      attachmentCount: uploadedFiles.length,
    });

    await sendSMTPEmail({
      to: ownerEmail,
      subject: `[AI Auto-Replied] ${clientName}${serviceType ? ` — ${serviceType}` : ''} | Take Over Available`,
      html: ownerHtml,
      text: `AI auto-replied to ${clientName} (${clientEmail}).\n\nAI reply:\n${aiReplyText}\n\nTo take over this thread and stop AI replies:\n${handoffUrl}`,
    });

    // ── Mark in DB ────────────────────────────────────────────────────────
    await markAiReplySent(submissionId, tableType);

    return { success: true, aiReplyText };
  } catch (err) {
    logger.error(LOG_CATEGORIES.EMAIL, 'generateAndSendAiReply failed', err);
    return { success: false, error: err.message };
  }
}
