import { sendSMTPEmail, TO_EMAIL, FROM_EMAIL } from './smtp-email.js';
import { logger, emailLogger, LOG_CATEGORIES } from './logger.js';

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
    const { to, subject, html, text } = req.body;

    if (!to || !subject) {
      return res.status(400).json({ success: false, message: 'Missing required fields: to, subject' });
    }

    const emailResult = await sendSMTPEmail({
      to: to,
      subject: subject,
      html: html || '',
      text: text || '',
    });

    if (!emailResult.success) {
      logger.error(LOG_CATEGORIES.EMAIL, 'SMTP Email error', new Error(emailResult.error));
      return res.status(500).json({
        success: false,
        message: 'Failed to send email',
        error: emailResult.error,
      });
    }

    return res.status(200).json({ success: true, data: emailResult });
  } catch (err) {
    logger.error(LOG_CATEGORIES.EMAIL, 'Email send error', err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
}
