// MOBILE NAVIGATION
function toggleMobileNav() {
  const navLinks = document.querySelector('.nav-links');
  const hamburger = document.querySelector('.nav-hamburger');
  if (!navLinks) return;
  navLinks.classList.toggle('open');
  if (hamburger) hamburger.classList.toggle('open');
}

// Close mobile nav when clicking a link or outside
document.addEventListener('click', function(e) {
  const navLinks = document.querySelector('.nav-links');
  const hamburger = document.querySelector('.nav-hamburger');
  
  // Check if mobile nav is open
  if (!navLinks || !navLinks.classList.contains('open')) return;
  
  // Don't close if clicking hamburger
  if (e.target.closest('.nav-hamburger')) return;
  
  // Close when clicking outside nav or on a nav link
  if (!e.target.closest('.nav-links')) {
    navLinks.classList.remove('open');
    if (hamburger) hamburger.classList.remove('open');
  }
});

// Close mobile nav on navigation link click
document.addEventListener('DOMContentLoaded', function() {
  const navLinks = document.querySelectorAll('.nav-links a');
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      // Do not close the menu if they are just opening the Services dropdown
      if (this.id === 'nav-services') {
        return;
      }
      // Small delay to allow navigation to start
      setTimeout(closeMobileNav, 100);
    });
  });
});

function closeMobileNav() {
  const navLinks = document.querySelector('.nav-links');
  const hamburger = document.querySelector('.nav-hamburger');
  if (navLinks) navLinks.classList.remove('open');
  if (hamburger) hamburger.classList.remove('open');
}

// FAQ, Accordion, and Cart functions

function buildFAQ(containerId, items) {
  const c = document.getElementById(containerId);
  if (!c) return;
  c.innerHTML = items.map(item => `
    <div class="faq-item">
      <button class="faq-q" onclick="toggleFAQ(this)">
        <span>${item.q}</span><span class="faq-icon">+</span>
      </button>
      <div class="faq-a">${item.a}</div>
    </div>
  `).join('');
}

function toggleFAQ(btn) {
  const answer = btn.nextElementSibling;
  const icon = btn.querySelector('.faq-icon');
  const isOpen = answer.classList.contains('open');
  btn.closest('.faq-list').querySelectorAll('.faq-a').forEach(a => a.classList.remove('open'));
  btn.closest('.faq-list').querySelectorAll('.faq-icon').forEach(i => i.textContent = '+');
  if (!isOpen) { answer.classList.add('open'); icon.textContent = '−'; }
}

function toggleAccordion(btn) {
  const body = btn.nextElementSibling;
  const span = btn.querySelector('span');
  const isOpen = body.classList.contains('open');
  body.classList.toggle('open', !isOpen);
  span.textContent = isOpen ? '+' : '−';
}

// ── CART ──
var cart = [];

function adjQty(pid, delta) {
  var el = document.getElementById(pid + '-qty');
  if (!el) return;
  var v = parseInt(el.textContent) + delta;
  if (v < 1) v = 1;
  if (v > 20) v = 20;
  el.textContent = v;
}

function addToCart(name, price, pid) {
  var qty = parseInt(document.getElementById(pid + '-qty').textContent);
  var existing = null;
  for (var i = 0; i < cart.length; i++) { if (cart[i].name === name) { existing = cart[i]; break; } }
  if (existing) { existing.qty += qty; } else { cart.push({name: name, price: price, qty: qty}); }
  showCartToast(name, qty);
  renderCartDrawer();
}

function showCartToast(name, qty) {
  var t = document.getElementById('cart-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'cart-toast';
    t.style.cssText = 'position:fixed;bottom:32px;left:50%;transform:translateX(-50%);background:#2d3a52;color:#fff;padding:14px 28px;border-radius:100px;font-size:15px;z-index:9999;opacity:0;transition:opacity 0.3s;white-space:nowrap;pointer-events:none;';
    document.body.appendChild(t);
  }
  t.textContent = qty + '\u00d7 ' + name + ' added';
  t.style.opacity = '1';
  setTimeout(function(){ t.style.opacity = '0'; }, 2500);
}

function closeCartDrawer() {
  var d = document.getElementById('cart-drawer');
  if (d) d.style.display = 'none';
}

function clearCart() {
  cart = [];
  renderCartDrawer();
}

function renderCartDrawer() {
  var d = document.getElementById('cart-drawer');
  if (!d) {
    d = document.createElement('div');
    d.id = 'cart-drawer';
    d.style.cssText = 'position:fixed;top:74px;right:0;width:340px;background:#fff;border-left:1px solid #d5d2cc;border-bottom:1px solid #d5d2cc;z-index:9998;padding:28px;box-shadow:-4px 4px 24px rgba(0,0,0,0.08);display:none;font-family:Cormorant Garamond,Georgia,serif;';
    document.body.appendChild(d);
  }
  if (cart.length === 0) { d.style.display = 'none'; return; }
  var total = 0;
  for (var i = 0; i < cart.length; i++) { total += cart[i].price * cart[i].qty; }
  var rows = '';
  for (var i = 0; i < cart.length; i++) {
    rows += '<div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:10px;">'
          + '<span>' + cart[i].qty + '\u00d7 ' + cart[i].name + '</span>'
          + '<span>$' + (cart[i].price * cart[i].qty).toFixed(2) + '</span></div>';
  }
  d.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">'
    + '<strong style="font-size:17px;">Your Order</strong>'
    + '<button onclick="closeCartDrawer()" style="background:none;border:none;font-size:22px;cursor:pointer;color:#666;line-height:1;">&times;</button>'
    + '</div>'
    + rows
    + '<div style="border-top:1px solid #e0e0e0;margin-top:16px;padding-top:16px;display:flex;justify-content:space-between;font-size:16px;font-weight:600;margin-bottom:20px;">'
    + '<span>Total</span><span>$' + total.toFixed(2) + '</span></div>'
    + '<button onclick="proceedToCheckout()" style="width:100%;background:#2d3a52;color:#fff;border:none;padding:14px;border-radius:100px;font-size:15px;cursor:pointer;font-family:inherit;margin-bottom:10px;">Proceed to Checkout</button>'
    + '<button onclick="clearCart()" style="width:100%;background:none;border:1.5px solid #d5d2cc;padding:11px;border-radius:100px;font-size:13px;cursor:pointer;color:#666;font-family:inherit;">Clear Cart</button>';
}

function proceedToCheckout() {
  var links = {
    'Standard Service': SERVICE_STRIPE_LINKS.standard_service,
    'Rush Serve': SERVICE_STRIPE_LINKS.rush_serve,
    'Rush Service': SERVICE_STRIPE_LINKS.rush_serve,
    'Priority Serve': SERVICE_STRIPE_LINKS.priority_serve,
    'Emergency Serve': SERVICE_STRIPE_LINKS.emergency_serve
  };
  if (cart.length === 1) {
    var url = links[cart[0].name];
    if (url && url.indexOf('REPLACE') === -1) {
      window.open(url, '_blank');
    } else {
      alert('Checkout link not yet configured.\nPlease contact: info@prestigeserves.com \nor call 424-235-3089 to complete your order.');
    }
  } else {
    alert('Please contact us at info@prestigeserves.com  or call 424-235-3089 to complete your order.');
  }
}

// ── TESTIMONIAL CAROUSEL ──
let testimonialIndex = 0;
let testimonialTimer = null;
let testimonialSlides = null;
let testimonialDots = null;
let testimonialSlidesCount = 0;

// Set your desired timing here (5000 = 5 seconds)
const slideDelay = 5000; 
let isCarouselInitialized = false;

function escapeHTML(value) {
  return String(value || '').replace(/[&<>"']/g, function(char) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char];
  });
}

function renderStars(rating) {
  var rounded = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  var stars = '';
  for (var i = 0; i < 5; i++) {
    stars += i < rounded ? '&#9733;' : '&#9734;';
  }
  return stars;
}

async function loadGoogleReviews() {
  var slidesContainer = document.querySelector('[data-google-reviews]');
  if (!slidesContainer) return;

  var summary = document.getElementById('google-reviews-summary');

  try {
    var controller = new AbortController();
    var timeoutId = setTimeout(function() {
      controller.abort();
    }, 4500);
    var response = await fetch('/api/google-reviews', { signal: controller.signal });
    clearTimeout(timeoutId);
    var data = await response.json();

    if (!response.ok || !data.success || !data.reviews || !data.reviews.length) {
      throw new Error(data.message || 'Google reviews are unavailable');
    }

    var place = data.place || {};
    var placeName = place.name || 'Prestige Serves';
    var placeUrl = place.url || '';
    var reviews = data.reviews.filter(function(review) {
      return review && review.text;
    });

    if (!reviews.length) {
      throw new Error('Google reviews did not include review text');
    }

    slidesContainer.innerHTML = reviews.map(function(review, index) {
      var authorName = escapeHTML(review.authorName || 'Google reviewer');
      var authorUrl = review.authorUrl ? escapeHTML(review.authorUrl) : '';
      var author = authorUrl
        ? '<a href="' + authorUrl + '" target="_blank" rel="noopener noreferrer">' + authorName + '</a>'
        : authorName;
      var time = review.relativeTimeDescription
        ? '<span class="google-review-time">' + escapeHTML(review.relativeTimeDescription) + '</span>'
        : '';

      return '<div class="testimonial-slide' + (index === 0 ? ' active' : '') + '">' +
        '<div class="google-review-stars" aria-label="' + escapeHTML(review.rating) + ' out of 5 stars">' + renderStars(review.rating) + '</div>' +
        '<p class="testimonial-quote">"' + escapeHTML(review.text) + '"</p>' +
        '<p class="testimonial-attr">— ' + author + time + '</p>' +
      '</div>';
    }).join('');

    if (summary) {
      var reviewCount = place.userRatingsTotal ? ' from ' + place.userRatingsTotal + ' Google reviews' : '';
      var rating = place.rating ? Number(place.rating).toFixed(1) + '/5' : 'Google rated';
      var summaryText = rating + reviewCount;
      summary.innerHTML = placeUrl
        ? '<a href="' + escapeHTML(placeUrl) + '" target="_blank" rel="noopener noreferrer">' + escapeHTML(summaryText) + ' on Google</a>'
        : escapeHTML(summaryText + ' on Google');
      summary.setAttribute('aria-label', placeName + ' Google review summary');
    }
  } catch (err) {
    if (summary) {
      summary.textContent = 'Recent client feedback. Live Google reviews will appear once the Google API is configured.';
    }
    console.warn('Google reviews fallback:', err.message);
  }
}

function showTestimonial(idx) {
  if (!testimonialSlides) return;
  testimonialSlides.forEach((s, i) => s.classList.toggle('active', i === idx));
  if (testimonialDots) {
    testimonialDots.forEach((d, i) => d.classList.toggle('active', i === idx));
  }
  testimonialIndex = idx;
}

// Just changes the slide, without touching the timer
function changeSlide(direction) {
  if (direction === 'next') {
    showTestimonial((testimonialIndex + 1) % testimonialSlidesCount);
  } else {
    showTestimonial((testimonialIndex - 1 + testimonialSlidesCount) % testimonialSlidesCount);
  }
}

// Manual controls reset the timer so it doesn't slide right after you click
function manualNext() {
  changeSlide('next');
  startTestimonialTimer(); 
}

function manualPrev() {
  changeSlide('prev');
  startTestimonialTimer();
}

function manualDot(idx) {
  showTestimonial(idx);
  startTestimonialTimer();
}

// Single function to manage starting the timer
function startTestimonialTimer() {
  if (testimonialSlidesCount <= 1) return;
  clearInterval(testimonialTimer); // Always clear before starting a new one
  testimonialTimer = setInterval(() => {
    changeSlide('next');
  }, slideDelay);
}

// Single function to manage stopping the timer
function stopTestimonialTimer() {
  clearInterval(testimonialTimer);
}

function initTestimonialCarousel() {
  // Prevent double-initialization rogue timers
  if (isCarouselInitialized) return; 
  isCarouselInitialized = true;

  const carousel = document.querySelector('.testimonial-carousel');
  if (!carousel) return;

  testimonialSlides = carousel.querySelectorAll('.testimonial-slide');
  const dotsContainer = carousel.parentElement.querySelector('.testimonial-dots');
  testimonialSlidesCount = testimonialSlides.length;
  
  if (!dotsContainer || testimonialSlidesCount <= 1) return;

  // Build dots
  dotsContainer.innerHTML = Array.from(testimonialSlides).map((_, i) => 
    `<button class="testimonial-dot${i === 0 ? ' active' : ''}" aria-label="Go to testimonial ${i + 1}"></button>`
  ).join('');
  testimonialDots = dotsContainer.querySelectorAll('.testimonial-dot');

  // Attach manual events
  carousel.querySelector('.testimonial-arrow-left').addEventListener('click', manualPrev);
  carousel.querySelector('.testimonial-arrow-right').addEventListener('click', manualNext);
  testimonialDots.forEach((dot, i) => dot.addEventListener('click', () => manualDot(i)));

  // 1. Start auto timer
  startTestimonialTimer();

  // 2. Pause on hover / touch
  const testContent = document.querySelector('.testimonial-content');
  if (testContent) {
    testContent.addEventListener('mouseenter', stopTestimonialTimer);
    testContent.addEventListener('mouseleave', startTestimonialTimer);
    testContent.addEventListener('touchstart', stopTestimonialTimer, {passive: true});
    testContent.addEventListener('touchend', startTestimonialTimer, {passive: true});
  }
}

window.prevTestimonialCarousel = manualPrev;
window.nextTestimonialCarousel = manualNext;

document.addEventListener('DOMContentLoaded', async function() {
  // Process Serving FAQ
  if (document.getElementById('ps-faq')) {
    buildFAQ('ps-faq', [
      {q:"What exactly is 'Process Serving'?",a:"Process Serving is the legal procedure of delivering documents (like a summons, complaint, or subpoena) to a defendant or witness to notify them of legal action. It is a constitutional requirement to ensure 'due process' so the other party has a chance to respond."},
      {q:"How much does a process server cost in Los Angeles?",a:"Rates vary based on the location and speed of service required. Our Routine LA service starts at competitive rates. Contact us for a free quote."},
      {q:"What happens if the defendant avoids service?",a:"We utilize advanced techniques to effectuate service on evasive individuals, including surveillance (stakeouts) and comprehensive background checks to verify active addresses."},
      {q:"Is your service valid for California courts?",a:"Yes. All our servers are registered and bonded in accordance with California law, ensuring that your Process Serving will be upheld by the judge."},
      {q:"Do you serve nationwide or just in Los Angeles?",a:"We are based in Los Angeles but handle service across the entire United States. For nationwide jobs, we act as your project manager, utilizing our vetted network of affiliates."},
      {q:"Logistics & Turnaround Times",a:"<strong>Standard:</strong> First attempt within 5–7 business days with 3 attempts.<br><strong>Rush:</strong> First attempt within 3 business days with 2–3 attempts.<br><strong>Priority:</strong> First attempt within 2 business days.<br><strong>Emergency:</strong> Immediate dispatch."},
      {q:"How many attempts do I get?",a:"Our standard fee includes up to 3 attempts at a single address. We make attempts at different times of day (morning, afternoon, evening) and usually one weekend attempt to maximize the chances of contact."},
      {q:"What if the person isn't home or refuses to open the door?",a:"If a subject is evasive, we document every attempt thoroughly. In California, we may be able to perform <strong>Substitute Service</strong> after diligent attempts, followed by mailing a copy."},
      {q:"What happens if the address I gave you is wrong/bad?",a:"We will notify you immediately. We offer <strong>Skip Tracing services</strong> to locate a current address for an additional fee."},
      {q:"Can you serve someone in a gated community or secure office building?",a:"Yes. In California, process servers have specific legal rights to access gated communities for the purpose of service."},
      {q:"How do I prove to the court that the papers were served?",a:"Once service is complete, we generate a <strong>Proof of Service (POS)</strong> or Affidavit of Service — a legal document signed by the process server stating who was served, when, where, and how."},
      {q:"Do you file the Proof of Service for me?",a:"We can! For an additional small fee, we can e-file your Proof of Service with the court or physically file it for you."},
      {q:"What if you can't serve them at all?",a:"If we exhaust all attempts, we will provide a <strong>Declaration of Due Diligence</strong>. This document details every attempt we made and why service was unsuccessful."}
    ]);
  }

  // Skip Tracing FAQ
  if (document.getElementById('st-faq')) {
    buildFAQ('st-faq', [
      {q:"How accurate is skip tracing?",a:"Accuracy depends on available records and how much identifying information is provided. We prioritize verified, consistent data points where possible."},
      {q:"Will you share multiple possible addresses?",a:"If multiple relevant addresses appear, we'll provide the most likely current address and note alternates when appropriate."},
      {q:"Can you handle businesses and registered agents?",a:"Yes. We can locate current registered agent information and business addresses for companies in California and other states."},
      {q:"Is skip tracing confidential?",a:"Yes. Requests are handled discreetly and shared only with the client who submitted the request."}
    ]);
  }

  // Stakeout Service FAQ
  if (document.getElementById('so-faq')) {
    buildFAQ('so-faq', [
      {q:"Do you need to be a licensed private investigator to do this?",a:"No. As a registered process server, watching a known address to complete personal service falls within our core service-of-process work, not investigative work. California law (CCP §1033.5(a)(4)(B)) specifically recognizes stakeout fees as a recoverable process-serving cost, separate from investigation expenses."},
      {q:"What happens if the subject never shows up?",a:"You're billed for the time booked, and we'll give you a full log of what was observed. From there we can recommend next steps — a longer window, a second location, or moving toward service by publication if the deadline is close."},
      {q:"Can this be combined with Skip Tracing?",a:"Yes — if the address itself is uncertain, we recommend starting with Skip Tracing to confirm a current location before booking surveillance time."},
      {q:"How quickly can a stakeout be scheduled?",a:"Most stakeouts can be scheduled within 24–48 hours. For deadline-critical cases, call us directly and we'll do what we can to move faster."}
    ]);
  }

  // Subpoena Domestication FAQ
  if (document.getElementById('sd-faq')) {
    buildFAQ('sd-faq', [
      {q:"Do I need to hire a California attorney?",a:"No. California follows the UIDDA, which allows us to complete domestication directly through the Superior Court on your behalf. You avoid local counsel fees entirely, and your subpoena comes back issued, served, and supported by court-ready proof."},
      {q:"How long does it take?",a:"Most assignments finish in about 2 to 3 business days from the moment you send your documents to the moment proof of service is in your inbox. Rush handling is available for tight deadlines, confirmed in writing before work begins."},
      {q:"How much does it cost?",a:"One flat rate of $225 covers both domestication and service anywhere in Los Angeles County. Court fees are advanced at cost with no markup, and you receive a written quote before any work begins."},
      {q:"What do you need from me to get started?",a:"Just your out-of-state subpoena, the case caption, and the name and Los Angeles area address of the party to be served. We handle everything else."},
      {q:"Can you serve corporate registered agents like CT Corporation or CSC?",a:"Yes. We regularly serve registered agents including CT Corporation, CSC, and Registered Agents Inc. throughout Los Angeles County, as well as individual witnesses and records custodians."},
      {q:"My case isn't in a UIDDA state. Can you still help?",a:"Usually, yes. Send us your subpoena and case details and we'll confirm the correct path for your matter, in writing, before any fees are incurred."}
    ]);
  }

  // Mail Service FAQ
  if (document.getElementById('ms-faq')) {
    buildFAQ('ms-faq', [
      {q:"Do your mail service prices include postage?",a:"Yes. Every rate includes postage, materials, and the declaration of mailing. There are no postage surcharges. The only exception is document sets over 50 pages, which add $0.50 per additional page."},
      {q:"When is the CCP § 415.20 mailing required?",a:"California law requires a follow-up mailing whenever documents are served by substituted service — meaning left with a competent adult — or posted at the property. You are charged only when substituted or posted service actually occurs. If personal service succeeds, this fee never applies."},
      {q:"What is service by mail with Notice & Acknowledgment?",a:"Under CCP § 415.30, documents are mailed to the defendant with Notice & Acknowledgment of Receipt forms and a prepaid return envelope. Service is complete when the defendant signs and returns the acknowledgment. It works best for cooperative parties and requires no field attempts."},
      {q:"What happens if the defendant never signs the acknowledgment?",a:"With N&A with Fallback, if the defendant never signs, $100 of the $150 fee converts to a credit toward standard personal service. You never pay for service twice."}
    ]);
  }

  // Load real Google reviews before the carousel is initialized.
  await loadGoogleReviews();

  // Initialize testimonial carousel safely once
  initTestimonialCarousel();
});
