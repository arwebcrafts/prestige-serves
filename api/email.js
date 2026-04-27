const GOHIGHLEVEL_API_TOKEN = process.env.GOHIGHLEVEL_API_TOKEN;
const GOHIGHLEVEL_LOCATION_ID = process.env.GOHIGHLEVEL_LOCATION_ID;
const FROM_EMAIL = process.env.FROM_EMAIL || 'arwebcraftsagency.com';
const TO_EMAIL = process.env.TO_EMAIL || 'prestigeservesllc@gmail.com';

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

    const emailData = {
      email: {
        from: FROM_EMAIL,
        to: [to],
        subject: subject,
        html: html || '',
        text: text || '',
      },
    };

    const response = await fetch(
      `https://services.leadconnectorhq.com/emails/{${GOHIGHLEVEL_LOCATION_ID}}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GOHIGHLEVEL_API_TOKEN}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
        body: JSON.stringify(emailData),
      }
    );

    const responseData = await response.json();

    if (!response.ok) {
      console.error('GHL Email API error:', responseData);
      return res.status(response.status).json({
        success: false,
        message: 'Failed to send email',
        error: responseData,
      });
    }

    return res.status(200).json({ success: true, data: responseData });
  } catch (err) {
    console.error('Email send error:', err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
}
