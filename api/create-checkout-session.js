import Stripe from 'stripe';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return res.status(500).json({
      success: false,
      message: 'Stripe Secret Key is missing in server configuration.'
    });
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: '2023-10-16'
  });

  try {
    const {
      serviceName = 'Prestige Serves Legal Service',
      amount,
      email,
      clientName,
      caseNumber,
      specialInstructions,
      cancelUrl,
      successUrl
    } = req.body || {};

    // Parsed amount in dollars (e.g. 145) -> converted to cents (14500)
    let parsedAmountInCents = 14500; // default $145
    if (typeof amount === 'number' && amount > 0) {
      parsedAmountInCents = Math.round(amount * 100);
    } else if (typeof amount === 'string') {
      const match = amount.match(/(\d+(\.\d+)?)/);
      if (match) {
        parsedAmountInCents = Math.round(parseFloat(match[1]) * 100);
      }
    }

    const domain = process.env.SITE_URL || `https://${req.headers.host}` || 'https://www.prestigeserves.com';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email || undefined,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: serviceName,
              description: caseNumber ? `Case #${caseNumber}` : 'Legal Process Serving & Support'
            },
            unit_amount: parsedAmountInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      metadata: {
        clientName: clientName || '',
        caseNumber: caseNumber || '',
        serviceName: serviceName || '',
        specialInstructions: (specialInstructions || '').substring(0, 450)
      },
      success_url: successUrl || `${domain}/payment.html?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${domain}/payment.html?status=cancelled`
    });

    return res.status(200).json({
      success: true,
      url: session.url,
      sessionId: session.id
    });
  } catch (err) {
    console.error('Stripe Checkout Creation Error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to create Stripe Checkout session.'
    });
  }
}
