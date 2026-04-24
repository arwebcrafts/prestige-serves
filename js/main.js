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
}

function toggleServicesDropdown(e) {
  e.stopPropagation();
  var menu = document.getElementById('services-menu');
  menu.classList.toggle('open');
}

function closeServicesDropdown() {
  var menu = document.getElementById('services-menu');
  if (menu) menu.classList.remove('open');
}

document.addEventListener('DOMContentLoaded', function() {
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
    buildContactForm('home-form-container', 'home');
    initStateAutocomplete();
  }
});
