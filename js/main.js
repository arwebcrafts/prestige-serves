// Navigation & Routing

function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');
  const navEl = document.getElementById('nav-' + page);
  if (navEl) navEl.classList.add('active');
  if (['process-serving','skip-tracing','all-services'].includes(page)) {
    const s = document.getElementById('nav-services');
    if (s) s.classList.add('active');
  }
  window.scrollTo(0,0);
  // Close mobile nav when navigating
  closeMobileNav();
}

function toggleServicesDropdown(e) {
  if (e && e.preventDefault) e.preventDefault();
  e.stopPropagation();
  var menu = document.getElementById('services-menu');
  var dropdown = document.getElementById('services-dropdown');
  
  // Check if mobile (match CSS breakpoint at 960px)
  var isMobile = window.innerWidth <= 960;
  
  if (isMobile) {
    // Toggle mobile dropdown
    menu.classList.toggle('open');
    dropdown.classList.toggle('open');
  } else {
    menu.classList.toggle('open');
  }
}

function closeMobileNav() {
  var navLinks = document.querySelector('.nav-links');
  var hamburger = document.querySelector('.nav-hamburger');
  if (navLinks) navLinks.classList.remove('open');
  if (hamburger) hamburger.classList.remove('open');
}

function closeServicesDropdown() {
  var menu = document.getElementById('services-menu');
  var dropdown = document.getElementById('services-dropdown');
  if (menu) menu.classList.remove('open');
  if (dropdown) dropdown.classList.remove('open');
}

document.addEventListener('DOMContentLoaded', function() {
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  // Set active nav based on current page
  var path = window.location.pathname;
  var page = path.substring(path.lastIndexOf('/') + 1).replace('.html', '') || 'index';
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  var activeNav = document.getElementById('nav-' + page);
  if (activeNav) activeNav.classList.add('active');
  if (['process-serving', 'skip-tracing', 'services'].includes(page)) {
    var servicesNav = document.getElementById('nav-services');
    if (servicesNav) servicesNav.classList.add('active');
  }

  // Services dropdown click outside handler
  document.addEventListener('click', function(e) {
    var dd = document.getElementById('services-dropdown');
    var menu = document.getElementById('services-menu');
    if (dd && menu && !dd.contains(e.target)) {
      menu.classList.remove('open');
    }
  });

  // Initialize page-specific content
  if (document.getElementById('home-form-container')) {
    console.log('home-form-container found, building form...');
    buildContactForm('home-form-container', 'home');
    console.log('form built, state-value element:', document.getElementById('state-value'));
    console.log('state-value content:', document.getElementById('state-value') ? document.getElementById('state-value').value : 'N/A');
    initStateAutocomplete('state-input', 'state-value', 'state-dropdown', 'CA');
    initCityAutocomplete('city-input', 'city-value', 'city-dropdown', 'state-input');
    initStateAutocomplete('home-svc-state-input', 'home-svc-state-value', 'home-svc-state-dropdown', 'CA');
    initCityAutocomplete('home-svc-city-input', 'home-svc-city-value', 'home-svc-city-dropdown', 'home-svc-state-input');
    initReasonDropdown();
    initCountyDropdown();
    initHomeProcessServeSection();
    initHomeFileUploadPreview();
    console.log('All home form init done');
  }
});
