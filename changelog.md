# Changelog

## [1.0.1] - 2026-04-23

### Fixed
- Removed duplicate footers from `about.html`, `contact.html`, `process-serving.html`, `skip-tracing.html`, and `terms.html`
- Updated `process-serving.html` hero image from `prestige-serves-img-0.jpeg` to `prestige-serves-img-14.png`
- Contact page now uses consistent hero section styling with `ps-hero` class like other pages
- Contact page form labels and inputs now display in white text for better visibility on dark background
- Removed "Get In Touch" heading from contact page hero section
- Updated contact page hero subtitle from "Available for..." to "Reliable for..."

### Changed
- Contact page hero image: uses `prestige-serves-img-0.png` with `ps-hero` section structure
- Contact page CSS now imports `process-serving.css` for consistent hero styling

## [1.0.0] - 2026-04-23

### Changed
- Restructured monolithic `prestige-serves.html` (~60MB) into a proper multi-page website
- Split all embedded CSS into separate stylesheet files
- Split all embedded JavaScript into separate module files
- Converted JavaScript-routed single-page app into independent HTML files
- Extracted 39 base64 images (total ~25MB) to `assets/images/` — HTML files reduced from 60MB to under 15KB each
- Replaced custom HTML service request form in `request.html` with Tally.so embed (placeholder: `FORM_ID_HERE`)
- Replaced cart-based payment flow in `payment.html` with Stripe Buy Button embed (placeholders: `STRIPE_BUTTON_ID_HERE`, `STRIPE_PUBLISHABLE_KEY_HERE`)
- Added PayPal button container to `payment.html` (placeholder div for client's own PayPal button code)
- Initialized git repo and pushed to GitHub (https://github.com/arwebcrafts/prestige-serves)
- Made service icon boxes on `services.html` clickable with light blue hover effect (`#d0e4f7`)
- Service boxes route to `process-serving.html` (Service of Process, eFiling, eRecording, Nationwide, Concierge) or `skip-tracing.html` (Skip Tracing)
- "Request Process Serving" nav link now routes to `services.html` (all services page) for service selection before request form
- Simplified home page contact section — "Prestige Serves" in gold with tagline in white, form on right
- Form labels and inputs on dark backgrounds now use white text for legibility
- All icons throughout site updated to consistent 110x110px size (matching homepage)
- Address updated to include "Suite 105" across all pages

### Added
- `css/global.css` - CSS custom properties, resets, navigation, buttons, footer, base responsive styles
- `css/components.css` - Reusable component styles: hero, ticker, services icons, pricing, testimonials, contact forms, dark theme forms, CTA banner, coverage grid, icon wrappers, cart, FAQ accordion, terms accordion
- `css/pages/` - Page-specific styles for home, about, services, process-serving, skip-tracing, payment, request, contact, terms
- `js/main.js` - Navigation routing, services dropdown, page initialization
- `js/forms.js` - Contact form builder, form submission handler
- `js/ui.js` - FAQ accordion, terms accordion, shopping cart drawer, toast notifications
- `assets/images/` - 39 extracted image files (prestige-serves-img-0.png through prestige-serves-img-38.png)

### File Structure
```
prestige-serves/
├── index.html
├── about.html
├── services.html
├── process-serving.html
├── skip-tracing.html
├── payment.html
├── request.html
├── contact.html
├── terms.html
├── css/
│   ├── global.css
│   ├── components.css
│   └── pages/
│       ├── home.css
│       ├── about.css
│       ├── services.css
│       ├── process-serving.css
│       ├── skip-tracing.css
│       ├── payment.css
│       ├── request.css
│       ├── contact.css
│       └── terms.css
├── js/
│   ├── main.js
│   ├── forms.js
│   └── ui.js
└── assets/
    └── images/
```

### Pages
- **index.html** - Home page with hero, services, pricing, testimonials, contact split, coverage, CTA
- **about.html** - About page with hero and two-column content sections
- **services.html** - All services overview with grid layout
- **process-serving.html** - Process serving service page with FAQ
- **skip-tracing.html** - Skip tracing service page with FAQ
- **payment.html** - Payment page with product grid and policies
- **request.html** - Service request form page
- **contact.html** - Contact page with dark-themed form
- **terms.html** - Terms of service and privacy policy with accordion
