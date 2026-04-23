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
  var isOpen = menu.style.display === 'block';
  menu.style.display = isOpen ? 'none' : 'block';
}

function closeServicesDropdown() {
  var menu = document.getElementById('services-menu');
  if (menu) menu.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function() {
  // Services dropdown click outside handler
  document.addEventListener('click', function(e) {
    var dd = document.getElementById('services-dropdown');
    var menu = document.getElementById('services-menu');
    if (dd && menu && !dd.contains(e.target)) {
      menu.style.display = 'none';
    }
  });

  // Initialize page-specific content
  if (document.getElementById('home-form-container')) {
    buildContactForm('home-form-container', 'home');
  }
});
