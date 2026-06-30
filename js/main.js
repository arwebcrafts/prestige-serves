// Navigation & Routing

// CALSPro member badge — set userId to link to your member profile (from CALSPro directory URL)
var CALSPRO_BADGE = {
  userId: '',
  imageUrl: 'assets/images/calspro-member-badge.png'
};

function getCalsProBadgeHref() {
  if (CALSPRO_BADGE.userId) {
    return 'https://members.calspro.org/index.php?option=com_community&view=profile&userid=' +
      encodeURIComponent(CALSPRO_BADGE.userId);
  }
  return 'https://www.calspro.org/';
}

function initCalsProBadge() {
  document.querySelectorAll('footer .footer-brand').forEach(function (brand) {
    if (brand.querySelector('.footer-calspro-badge')) return;
    var wrap = document.createElement('div');
    wrap.className = 'footer-calspro-badge';
    var link = document.createElement('a');
    link.title = 'California Association of Legal Support Professionals';
    link.href = getCalsProBadgeHref();
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    var img = document.createElement('img');
    img.src = CALSPRO_BADGE.imageUrl;
    img.alt = 'CALSPro member — California Association of Legal Support Professionals';
    img.width = 140;
    img.height = 60;
    img.loading = 'lazy';
    link.appendChild(img);
    wrap.appendChild(link);
    brand.appendChild(wrap);
  });
}

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
    buildHomeRequestForm('home-form-container', 'home');
  }

  // Phone auto-format runs on ALL pages — independent of home-form-container
  initPhoneAutoFormat();
  initPhoneAutoFormatObserver();
  initCalsProBadge();
});

function formatPhoneValue(raw) {
  var digits = (raw || '').replace(/\D/g, '').substring(0, 10);
  if (digits.length >= 6) {
    return digits.substring(0, 3) + '-' + digits.substring(3, 6) + '-' + digits.substring(6);
  } else if (digits.length >= 4) {
    return digits.substring(0, 3) + '-' + digits.substring(3);
  } else if (digits.length > 0) {
    return digits;
  }
  return '';
}

function shouldBindPhoneFormat(input) {
  if (!input || input.type !== 'tel') return false;
  if (input.hasAttribute('data-no-phone-format')) return false;
  return true;
}

// Expose globally for use across scripts
window.formatPhoneValue = formatPhoneValue;
window.initPhoneAutoFormat = initPhoneAutoFormat;

function initPhoneAutoFormat() {
  document.querySelectorAll('input[type="tel"]').forEach(function(input) {
    if (!shouldBindPhoneFormat(input)) return;
    if (input.dataset.phoneFormatted) return;
    input.dataset.phoneFormatted = '1';

    input.addEventListener('input', function(e) {
      e.target.value = formatPhoneValue(e.target.value);
    });

    input.addEventListener('blur', function(e) {
      var formatted = formatPhoneValue(e.target.value);
      if (formatted !== e.target.value) {
        e.target.value = formatted;
      }
    });
  });
}

// Watch for dynamically added phone inputs (e.g., skip-trace modal) and apply formatting
function initPhoneAutoFormatObserver() {
  if (!MutationObserver) return;
  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        if (node.nodeType !== 1) return;
        if (node.tagName === 'INPUT' && node.type === 'tel') {
          applyPhoneFormatToInput(node);
        }
        var inputs = node.querySelectorAll ? node.querySelectorAll('input[type="tel"]') : [];
        inputs.forEach(function(input) {
          if (!input.dataset.phoneFormatted) applyPhoneFormatToInput(input);
        });
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function applyPhoneFormatToInput(input) {
  if (!shouldBindPhoneFormat(input)) return;
  if (input.dataset.phoneFormatted) return;
  input.dataset.phoneFormatted = '1';
  input.addEventListener('input', function(e) {
    e.target.value = formatPhoneValue(e.target.value);
  });
  input.addEventListener('blur', function(e) {
    var formatted = formatPhoneValue(e.target.value);
    if (formatted !== e.target.value) {
      e.target.value = formatted;
    }
  });
}

function isCopyProtectionExcluded() {
  return document.body.classList.contains('admin-login-body')
    || document.body.classList.contains('admin-dashboard-body');
}

function isEditableCopyTarget(target) {
  return target && target.closest && target.closest('input, textarea, select, [contenteditable="true"]');
}

function initCopyProtection() {
  if (isCopyProtectionExcluded()) return;

  document.addEventListener('contextmenu', function(e) {
    if (isEditableCopyTarget(e.target)) return;
    e.preventDefault();
  });

  document.addEventListener('copy', function(e) {
    if (isEditableCopyTarget(e.target)) return;
    e.preventDefault();
  });

  document.addEventListener('cut', function(e) {
    if (isEditableCopyTarget(e.target)) return;
    e.preventDefault();
  });

  document.addEventListener('dragstart', function(e) {
    if (e.target && (e.target.tagName === 'IMG' || e.target.tagName === 'SVG')) {
      e.preventDefault();
    }
  });

  document.addEventListener('keydown', function(e) {
    if (isEditableCopyTarget(e.target)) return;
    var key = (e.key || '').toLowerCase();
    if ((e.ctrlKey || e.metaKey) && (key === 'c' || key === 'x' || key === 'a' || key === 'u' || key === 's')) {
      e.preventDefault();
    }
  });
}

document.addEventListener('DOMContentLoaded', initCopyProtection);
