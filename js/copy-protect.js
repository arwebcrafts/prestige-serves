(function () {
  function isExcluded() {
    return document.body.classList.contains('admin-login-body')
      || document.body.classList.contains('admin-dashboard-body');
  }

  function isEditable(target) {
    return target && target.closest && target.closest('input, textarea, select, [contenteditable="true"]');
  }

  function init() {
    if (isExcluded()) return;

    document.addEventListener('contextmenu', function (e) {
      if (isEditable(e.target)) return;
      e.preventDefault();
    });

    document.addEventListener('copy', function (e) {
      if (isEditable(e.target)) return;
      e.preventDefault();
    });

    document.addEventListener('cut', function (e) {
      if (isEditable(e.target)) return;
      e.preventDefault();
    });

    document.addEventListener('dragstart', function (e) {
      if (e.target && (e.target.tagName === 'IMG' || e.target.tagName === 'SVG')) {
        e.preventDefault();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (isEditable(e.target)) return;
      var key = (e.key || '').toLowerCase();
      if ((e.ctrlKey || e.metaKey) && (key === 'c' || key === 'x' || key === 'a' || key === 'u' || key === 's')) {
        e.preventDefault();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
