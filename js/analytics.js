/**
 * Google Analytics 4 (GA4) — Prestige Serves LLC
 * 
 * HOW TO ACTIVATE:
 * 1. Go to https://analytics.google.com → Create a new GA4 property
 * 2. Add a "Web" data stream for prestigeserves.com
 * 3. Copy your Measurement ID (looks like G-XXXXXXXXXX)
 * 4. Replace 'G-XXXXXXXXXX' below with your real Measurement ID
 * 5. Deploy — analytics will start collecting immediately
 *
 * This script is loaded on every page via a <script> tag.
 */

(function() {
  // ═══════════════════════════════════════════════════════════════════════
  // ▶▶▶  PASTE YOUR GOOGLE ANALYTICS MEASUREMENT ID HERE  ◀◀◀
  var GA_MEASUREMENT_ID = 'G-XXXXXXXXXX';
  // ═══════════════════════════════════════════════════════════════════════

  // Don't load if placeholder ID is still set
  if (!GA_MEASUREMENT_ID || GA_MEASUREMENT_ID === 'G-XXXXXXXXXX') {
    console.log('[Analytics] Google Analytics not configured. Replace G-XXXXXXXXXX in js/analytics.js with your Measurement ID.');
    return;
  }

  // Load gtag.js asynchronously
  var script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID;
  document.head.appendChild(script);

  // Initialize dataLayer and gtag
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: true,
    cookie_flags: 'SameSite=None;Secure'
  });

  // ── Track key business events ───────────────────────────────────────────

  // Track phone clicks
  document.addEventListener('click', function(e) {
    var link = e.target.closest('a[href^="tel:"]');
    if (link) {
      gtag('event', 'phone_call_click', {
        event_category: 'engagement',
        event_label: link.href.replace('tel:', ''),
        value: 1
      });
    }
  });

  // Track email clicks
  document.addEventListener('click', function(e) {
    var link = e.target.closest('a[href^="mailto:"]');
    if (link) {
      gtag('event', 'email_click', {
        event_category: 'engagement',
        event_label: link.href.replace('mailto:', ''),
        value: 1
      });
    }
  });

  // Track contact form submissions
  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (form && (form.closest('#contact-form-container') || form.closest('#home-form-container'))) {
      gtag('event', 'form_submit', {
        event_category: 'lead',
        event_label: 'contact_form',
        value: 1
      });
    }
  });

  // Track service request form submissions
  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (form && form.id === 'request-form') {
      gtag('event', 'form_submit', {
        event_category: 'lead',
        event_label: 'service_request',
        value: 1
      });
    }
  });

  // Track CTA button clicks
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('.btn-navy, .pay-btn');
    if (btn) {
      gtag('event', 'cta_click', {
        event_category: 'engagement',
        event_label: btn.textContent.trim().substring(0, 50)
      });
    }
  });

  // Track outbound portal clicks
  document.addEventListener('click', function(e) {
    var link = e.target.closest('a[href*="sopstatus.com"]');
    if (link) {
      gtag('event', 'client_portal_click', {
        event_category: 'engagement',
        event_label: 'client_portal',
        value: 1
      });
    }
  });
})();
