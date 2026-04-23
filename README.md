# Prestige Serves LLC

Professional process serving website for Prestige Serves LLC, a premium litigation support company in Los Angeles, CA.

## Overview

This is a multi-page static website for Prestige Serves LLC, providing information about their services including process serving, skip tracing, eFiling, eRecording, and legal courier services across Los Angeles.

## Getting Started

### Run Locally

From the `client-web` directory:

```bash
node index.js
```

Then open **http://localhost:3000** in your browser.

### File Structure

```
prestige-serves/
├── index.html           # Home page
├── about.html           # About page
├── services.html        # All services overview
├── process-serving.html  # Process serving details
├── skip-tracing.html    # Skip tracing details
├── payment.html         # Payment page
├── request.html         # Service request form
├── contact.html        # Contact page
├── terms.html           # Terms of service
├── css/
│   ├── global.css      # Base styles, variables, navigation, footer
│   ├── components.css   # Reusable component styles
│   └── pages/          # Page-specific styles
├── js/
│   ├── main.js         # Navigation routing, dropdowns
│   ├── forms.js        # Form building and handling
│   └── ui.js           # FAQ accordion, cart, toast notifications
└── assets/
    └── images/         # Site images
```

## Services

- **Service of Process** — California-focused document delivery
- **eFiling / eRecording** — Court filing and recording services
- **Skip Tracing** — Locate individuals or business agents
- **Nationwide Service** — Document service across the US
- **Concierge** — Full-service litigation support

## Pricing

| Service | Price |
|---------|-------|
| Standard Service | $97.99 |
| Rush Serve | $119.99 |
| Priority Serve | $149.99 |
| Emergency Serve | $249.99 |

## Configuration

### Tally.so Form

To enable the service request form, replace `FORM_ID_HERE` in `request.html` with your actual Tally form ID.

### Stripe Payment

To enable Stripe payments, replace the following placeholders in `payment.html`:
- `STRIPE_BUTTON_ID_HERE` — Your Stripe Buy Button ID
- `STRIPE_PUBLISHABLE_KEY_HERE` — Your Stripe Publishable Key

### PayPal

To add PayPal payments, paste your PayPal hosted button code into the `<div id="paypal-button-container"></div>` in `payment.html`.

## Contact

**Prestige Serves LLC**
1240 S Corning Street, Suite 105
Los Angeles, CA 90035

Email: prestigeservesllc@gmail.com
Phone: 609-240-5665

## Tech Stack

- HTML5, CSS3, JavaScript (Vanilla)
- Express.js (local development server)
- Google Fonts (Cormorant Garamond)
- Tally.so (form)
- Stripe (payments)
- PayPal (payments)

## License

Proprietary — Prestige Serves LLC
