# Changelog

## [1.1.1] - 2026-04-28

### Changed
- Contact page hero section mobile height reduced for better mobile view
- Hero content repositioned to bottom on mobile with smaller text sizes
- Hero content moved to bottom on desktop (justify-content:flex-end)
- Hero content padding adjusted (100px→56px top) to position text at bottom
- Contact section (`contact-dark-section`) switched to flexbox column layout for mobile responsiveness
- All inline-styled elements in contact section now properly overrideable via CSS for mobile
- Text wrapping and overflow handling for contact info (email, phone, address)
- About page: removed top spacing from two-col-content on mobile
- About page: matched operating area section padding to two-col-item on mobile

### Added
- "Order Skip Trace" button on `skip-tracing.html` now scrolls to payment products section
- Prices displayed on skip trace product cards
- Skip Tracing Services section added to `payment.html`
- `.skip-trace-section` class for consistent mobile spacing

### Changed
- Mobile payment page now displays skip trace products in single column with consistent 20px horizontal padding

## [1.1.0] - 2026-04-28

### Added
- City autocomplete dropdown with state filtering for home form on `index.html` (mirrors `request.html` behavior)
- City autocomplete dropdown also added to `contact.html` form (same city/state/zip grid structure)
- Email notification system via GoHighLevel API (`api/email.js`)
- `email_sent` column to `service_requests` and `contact_submissions` tables (1=sent, 0=failed, -1=pending)
- "Email Sent" column to dashboard tables (Service Requests & Contact Submissions)
- Email status badge in dashboard table rows and detail modals
- `TO_EMAIL` environment variable for configurable recipient email
- `.env.local` template for local development with GHL credentials
- `api/email.js` reusable email sending endpoint via GHL API

### Changed
- Form submissions now trigger email notification to owner via GHL API
- Email sent/failed status tracked in database and displayed in admin dashboard
- GHL credentials configurable via environment variables (no hardcoded values)

### Added
- "Pay with Card" buttons to each pricing item in the `pricing-grid` on `index.html`
- Stripe checkout links for all 4 service tiers (Standard $97.99, Rush $119.99, Priority $149.99, Emergency $249.99)
- `.pricing-item-actions` container styles in `css/pages/home.css` for button layout
- Post-submit redirect to Stripe checkout on `request.html` based on selected Service Type (5 skip trace options)
- Added 4 process serving options to Service Type dropdown in `request.html` (Standard Service $97.99, Rush Service $119.99, Priority Serve $149.99, Emergency Serve $249.99)
- Stripe links mapped for all 9 service types in `request.html` form submission (`forms.js`)
- Added same service dropdown options and Stripe redirect to contact form on `index.html` and `contact.html` (built via `buildContactForm()` in `forms.js`)

### Added
- Mobile hero image for contact page (`contact.html`)
- Mobile responsive styles for skip-tracing page sections
- Payment products grid (5 skip tracing services) to `skip-tracing.html` after "Important Notes & Limitations" section
- Linked `payment.css` to `skip-tracing.html` for proper product card styling

### Changed
- Removed dark overlay from hero images on service pages
- Updated contact hero text color
- Changed nav links across all pages

## [1.0.8] - 2026-04-27

### Added
- `mobile.png` hero image for mobile view on contact page (`contact.html`)
- Mobile responsive styles for skip-tracing page sections (When Skip Tracing Is Recommended, Pricing, What We Need from You, Important Notes, FAQ)

### Changed
- Removed dark overlay (`.ps-hero-overlay`) from hero images on all service pages (`process-serving.html`, `nationwide.html`, `erecording.html`, `efiling.html`, `concierge.html`)
- Updated contact hero text color to `--accent-gold` with bold font weight
- Changed "Request Process Serving" nav link to "Book a Service" across all 13 HTML pages
- Updated Service Type dropdown options in `request.html` and `forms.js` to skip tracing options (Standard Skip Trace $75, Enhanced Trace $150, Rush Trace $225, Business/Agent Verification $95, Court-Ready Skip Trace Report $250)
- Increased side padding on grid sections (courts, counties, states, who-we-serve) on mobile view across `efiling.css`, `erecording.css`, `nationwide.css`, `concierge.css`

### Fixed
- Contact nav link (`li:last-child`) was hidden on mobile/tablet — removed `display:none` rule from `global.css`
- Added left padding to bullet-list on skip-tracing mobile view

## [1.0.7] - 2026-04-25

### Added
- `formidable` package for multipart form data parsing in Vercel serverless functions

### Fixed
- Request form file upload now works on Vercel deployment
- Fixed "req.formData is not a function" error by using formidable for multipart parsing
- Fixed typo in request.js causing "Cannot read properties of undefined" error

## [1.0.6] - 2026-04-25

### Added
- File upload functionality with Vercel Blob storage for request form
- Uploaded files displayed as clickable links in admin dashboard
- Admin dashboard (`dashboard.html`) with login and data viewing
- Admin login page (`admin.html`) with preset credentials
- Vercel serverless API routes (`/api/contact`, `/api/request`, `/api/admin/*`)
- PostgreSQL database tables for `contact_submissions` and `service_requests`
- SQL migration file for adding `uploaded_files` column
- `package.json` with dependencies (`@neontdatabase/serverless`, `@vercel/blob`)
- `vercel.json` for proper API routing
- City autocomplete dropdown for request form (uses county/city list)
- State autocomplete for request form
- Country autocomplete with all countries in defendant modal
- Modern radio button toggles (pill-style) for Yes/No selections

### Changed
- Request form fields now wrapped in `<form>` tags with proper name attributes
- Form submission uses `FormData` for multipart support
- Radio buttons replaced checkboxes for "multiple defendants" selection
- City and state fields use hidden inputs for proper data handling

### Fixed
- Form validation now checks city/state dropdown values
- JSONB column parsing in admin dashboard (Neon returns objects, not strings)
- File upload display shows selected file names
- Contact form submission works on Vercel deployment
- Admin dashboard View button works on deployment
- Request form file upload now works (fixed multipart parsing with formidable)
- Fixed typo in request.js causing "Cannot read properties of undefined" error

## [1.0.5] - 2026-04-25

### Added
- Dynamic "Add Defendant" feature with modal popup form
- Support for up to 10 additional defendants per request
- Defendant data stored as JSONB in database
- Edit/delete capability for added defendants
- Modal form with fields: name, gender, relationship, address, DOB, phone, aliases, employer, physical description, notes

### Changed
- Multiple defendants UI changed from checkboxes to radio button toggle
- Defendant modal styled consistently with existing design
- Defendant cards display in list format with edit button

## [1.0.4] - 2026-04-25

### Added
- Mobile hamburger navigation menu on all 13 HTML pages
- Comprehensive mobile responsiveness (768px breakpoint) across all pages
- `toggleMobileNav()` JavaScript function in `js/ui.js` for mobile menu toggle
- Mobile nav overlay with stacked menu items and full-screen coverage
- Mobile-specific styles for hero sections, services grids, pricing, testimonials, forms, and footer
- Additional mobile styles for all page-specific CSS files (about, services, request, payment, process-serving, contact, concierge, efiling, erecording, nationwide, skip-tracing, home)

### Changed
- All grid layouts (hero, pricing, testimonials, contact, coverage) now stack vertically on mobile
- Services grid changes from 3 columns to 2 columns on tablet, 1 column on mobile
- Navigation padding and font sizes adjusted for mobile
- Footer now single-column centered layout on mobile
- Form inputs use 16px font size on mobile for proper touch keyboard display
- Button padding and font sizes optimized for mobile touch targets

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
