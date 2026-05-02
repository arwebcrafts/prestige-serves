import nodemailer from 'nodemailer';
import { logger, emailLogger, LOG_CATEGORIES } from './logger.js';

const HOSTINGER_SMTP_HOST = process.env.HOSTINGER_SMTP_HOST || 'smtp.hostinger.com';
const HOSTINGER_SMTP_PORT = parseInt(process.env.HOSTINGER_SMTP_PORT) || 465;
const HOSTINGER_SMTP_SECURE = process.env.HOSTINGER_SMTP_SECURE === 'true' || true;
const HOSTINGER_SMTP_USER = process.env.HOSTINGER_SMTP_USER;
const HOSTINGER_SMTP_PASS = process.env.HOSTINGER_SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || HOSTINGER_SMTP_USER;
const TO_EMAIL = process.env.TO_EMAIL || 'info@prestigeserves.com ';

let transporter = null;

function getTransporter() {
  if (!HOSTINGER_SMTP_USER || !HOSTINGER_SMTP_PASS) {
    logger.warn(LOG_CATEGORIES.EMAIL, 'Hostinger SMTP credentials not configured. Set HOSTINGER_SMTP_USER and HOSTINGER_SMTP_PASS in environment.');
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: HOSTINGER_SMTP_HOST,
      port: HOSTINGER_SMTP_PORT,
      secure: HOSTINGER_SMTP_SECURE,
      auth: {
        user: HOSTINGER_SMTP_USER,
        pass: HOSTINGER_SMTP_PASS,
      },
    });
  }

  return transporter;
}

export async function sendSMTPEmail({ to, subject, html, text }) {
  const transport = getTransporter();
  
  if (!transport) {
    return { success: false, reason: 'SMTP transporter not configured' };
  }

  try {
    const mailOptions = {
      from: `"Prestige Serves" <${FROM_EMAIL}>`,
      to: to,
      subject: subject,
      html: html || '',
      text: text || '',
    };

    const info = await transport.sendMail(mailOptions);
    logger.info(LOG_CATEGORIES.EMAIL, 'Email sent via Hostinger SMTP', { messageId: info.messageId });
    return { success: true, messageId: info.messageId, response: info };
  } catch (err) {
    logger.error(LOG_CATEGORIES.EMAIL, 'SMTP Email send error', err);
    return { success: false, error: err.message };
  }
}

export { TO_EMAIL, FROM_EMAIL };
