import nodemailer from 'nodemailer';
import { logger, emailLogger, LOG_CATEGORIES } from './logger.js';

const HOSTINGER_SMTP_HOST = process.env.HOSTINGER_SMTP_HOST || 'smtp.hostinger.com';
const HOSTINGER_SMTP_PORT = parseInt(process.env.HOSTINGER_SMTP_PORT, 10) || 465;
// Implicit TLS on 465, STARTTLS on 587/25. The previous `x === 'true' || true`
// was always true, which broke any attempt to run on 587.
const HOSTINGER_SMTP_SECURE = process.env.HOSTINGER_SMTP_SECURE
  ? process.env.HOSTINGER_SMTP_SECURE === 'true'
  : HOSTINGER_SMTP_PORT === 465;
const HOSTINGER_SMTP_USER = process.env.HOSTINGER_SMTP_USER;
const HOSTINGER_SMTP_PASS = process.env.HOSTINGER_SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || HOSTINGER_SMTP_USER;
const TO_EMAIL = (process.env.TO_EMAIL || 'info@prestigeserves.com').trim();

// Serverless containers are frozen between invocations, so a cached socket is
// routinely dead by the time the next submission arrives. Keep timeouts short
// and be willing to throw the transporter away and rebuild it.
const CONNECTION_TIMEOUT_MS = parseInt(process.env.SMTP_CONNECTION_TIMEOUT_MS, 10) || 8000;
const GREETING_TIMEOUT_MS = parseInt(process.env.SMTP_GREETING_TIMEOUT_MS, 10) || 8000;
const SOCKET_TIMEOUT_MS = parseInt(process.env.SMTP_SOCKET_TIMEOUT_MS, 10) || 12000;

let transporter = null;
let transporterKey = null;

function buildTransport({ port, secure }) {
  return nodemailer.createTransport({
    host: HOSTINGER_SMTP_HOST,
    port,
    secure,
    auth: {
      user: HOSTINGER_SMTP_USER,
      pass: HOSTINGER_SMTP_PASS,
    },
    // No pooling: a pooled connection cannot survive a frozen container.
    pool: false,
    connectionTimeout: CONNECTION_TIMEOUT_MS,
    greetingTimeout: GREETING_TIMEOUT_MS,
    socketTimeout: SOCKET_TIMEOUT_MS,
    tls: {
      // Hostinger presents a shared certificate on some nodes; still verify by
      // default, but allow an opt-out rather than silently failing forever.
      rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false',
      servername: HOSTINGER_SMTP_HOST,
    },
  });
}

function getTransporter({ port, secure }) {
  const key = `${HOSTINGER_SMTP_HOST}:${port}:${secure}`;
  if (!transporter || transporterKey !== key) {
    transporter = buildTransport({ port, secure });
    transporterKey = key;
  }
  return transporter;
}

function resetTransporter() {
  if (transporter && typeof transporter.close === 'function') {
    try { transporter.close(); } catch (e) { /* socket already gone */ }
  }
  transporter = null;
  transporterKey = null;
}

// 465 implicit TLS first, then 587 STARTTLS. Hostinger blocks one or the other
// from some egress ranges, and Vercel's egress IPs move between deploys.
function buildAttempts() {
  const primary = { port: HOSTINGER_SMTP_PORT, secure: HOSTINGER_SMTP_SECURE };
  const fallbackPort = primary.port === 465 ? 587 : 465;
  const fallback = { port: fallbackPort, secure: fallbackPort === 465 };
  return [primary, fallback];
}

export async function sendSMTPEmail({ to, subject, html, text }) {
  if (!HOSTINGER_SMTP_USER || !HOSTINGER_SMTP_PASS) {
    logger.warn(LOG_CATEGORIES.EMAIL, 'Hostinger SMTP credentials not configured. Set HOSTINGER_SMTP_USER and HOSTINGER_SMTP_PASS in environment.');
    return { success: false, error: 'SMTP transporter not configured' };
  }

  const recipient = (to || TO_EMAIL || '').trim();
  if (!recipient) {
    return { success: false, error: 'No recipient address configured' };
  }

  const mailOptions = {
    from: `"Prestige Serves" <${FROM_EMAIL}>`,
    to: recipient,
    subject: subject,
    html: html || '',
    text: text || '',
  };

  const attempts = buildAttempts();
  let lastError = null;

  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    try {
      const transport = getTransporter(attempt);
      const info = await transport.sendMail(mailOptions);
      logger.info(LOG_CATEGORIES.EMAIL, 'Email sent via Hostinger SMTP', {
        messageId: info.messageId,
        port: attempt.port,
        attempt: i + 1,
      });
      return { success: true, messageId: info.messageId, port: attempt.port, response: info };
    } catch (err) {
      lastError = err;
      logger.error(LOG_CATEGORIES.EMAIL, 'SMTP send failed', err, {
        port: attempt.port,
        secure: attempt.secure,
        attempt: i + 1,
        code: err && err.code,
      });
      // Always rebuild before retrying — the usual cause is a dead socket.
      resetTransporter();
    }
  }

  return {
    success: false,
    error: (lastError && (lastError.message || lastError.code)) || 'Unknown SMTP error',
  };
}

export { TO_EMAIL, FROM_EMAIL };
