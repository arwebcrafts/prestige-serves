# Changelog

## [1.0.3] - 2026-04-24

### Added
- Added `top.png` image to navigation bar on all 12 HTML pages (next to Contact button)
- Testimonial carousel now pauses auto-rotation on hover for better readability
- State dropdown now searches by both state name AND postal abbreviation (e.g., "CA" finds California)
- State dropdown displays state name with postal code in parentheses (e.g., "California (CA)")
- All form fields on index.html and contact.html are now required before submission
- Form validation with red border highlight on empty required fields

### Changed
- Contact form now uses same structure as index.html (dynamically built via `buildContactForm()`)
- Increased "Built for clients who value speed, precision, and professionalism." text to 21px
- Increased contact section text sizes on index.html (intro 18px, email/phone 24px)
- Contact page info section increased to 18px with email/phone at 24px
- Email and phone on index.html are now clickable mailto/tel links
- Removed "Get In Touch" heading from contact page below form
- Hero section content moved down with `padding-top:400px`
- Hero text sizes increased (✦ Contact Prestige Serves: 33px, subtitle: 33px)
- Added (required) labels to all form fields: Reason for Contact, County/City, State, Brief Case Details
- Form checkbox consent is now required
- Contact form wrapped in `<form>` tag with proper `type="submit"` button
- Increased font sizes of contact info on contact.html (heading 52px, sub 21px, info 18px, email/phone 24px)

### Fixed
- Fixed duplicate `</section>` tag in contact.html
- Contact page now uses full form from forms.js instead of static HTML
- State autocomplete properly clears and updates hidden input field

## [1.0.2] - 2026-04-24

### Changed
- Updated nav link buttons with `display:block` and `padding:8px 12px` for larger clickable areas
- Styled "Prestige Serves provides high-priority" text on `index.html` to match pull-quote style from `about.html` (21px italic, blue color, underline)
- Replaced mail SVG icon with `mail.png` image (`<img src="assets/images/mail.png" alt="Mail" style="width:80px;height:80px;object-fit:contain;">`) across all 12 HTML pages
- Added testimonial carousel on `index.html` with 5 testimonials, auto-rotation (3s), left/right arrow navigation, and dot indicators
- Changed testimonial attribution text color to gold (`--accent-gold`)
- Updated placeholder text color on home form to grey (#999) for better visibility
- Updated form hint and checkbox label text color on home form to grey (#666)
- Replaced State text input with searchable autocomplete dropdown (California pre-selected)
- Increased `ps-hero` min-height on `process-serving.html` for larger hero image area
- Increased `ps-hero-title` font size and weight for bolder, larger heading text
- Split "Nationwide" onto separate line in `process-serving.html` hero title
- Updated `process-serving.html` hero subtitle text
- Centered legal document type labels in `process-serving.html`

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
