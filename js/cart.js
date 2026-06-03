// Cart module — depends on CART_CATALOG from cart-catalog.js being loaded first.
// State is stored in sessionStorage so it survives page refreshes but not
// cross-tab/device sessions. The server re-validates everything on checkout.

(function () {
  var PS_CART_KEY = 'ps_cart';

  // ── State helpers ─────────────────────────────────────────────────────────

  function getItems() {
    try { return JSON.parse(sessionStorage.getItem(PS_CART_KEY) || '{}'); }
    catch (e) { return {}; }
  }

  function saveItems(items) {
    sessionStorage.setItem(PS_CART_KEY, JSON.stringify(items));
    updateBadge();
    renderDrawerBody();
  }

  function totalCount() {
    return Object.values(getItems()).reduce(function (s, v) { return s + v; }, 0);
  }

  // ── Public cart actions ───────────────────────────────────────────────────

  window.cartAdd = function (key) {
    var cat = (CART_CATALOG || []).find(function (c) { return c.key === key; });
    if (!cat) return;
    var items = getItems();
    var cur = items[key] || 0;
    items[key] = Math.min(cur + 1, cat.maxQty || 10);
    saveItems(items);
    flashButton(key);
    openDrawer();
  };

  window.cartRemove = function (key) {
    var items = getItems();
    delete items[key];
    saveItems(items);
  };

  window.cartSetQty = function (key, qty) {
    var cat = (CART_CATALOG || []).find(function (c) { return c.key === key; });
    if (!cat) return;
    var items = getItems();
    var n = parseInt(qty, 10);
    if (n <= 0 || isNaN(n)) { delete items[key]; }
    else { items[key] = Math.min(n, cat.maxQty || 10); }
    saveItems(items);
  };

  window.openCartDrawer = openDrawer;
  window.closeCartDrawer = closeDrawer;

  // ── Drawer open / close ───────────────────────────────────────────────────

  function openDrawer() {
    var drawer = document.getElementById('cart-drawer');
    var overlay = document.getElementById('cart-overlay');
    if (drawer) drawer.classList.add('open');
    if (overlay) overlay.classList.add('open');
    renderDrawerBody();
  }

  function closeDrawer() {
    var drawer = document.getElementById('cart-drawer');
    var overlay = document.getElementById('cart-overlay');
    if (drawer) drawer.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
  }

  // ── Render drawer body ────────────────────────────────────────────────────

  function renderDrawerBody() {
    var body = document.getElementById('cart-drawer-body');
    var footer = document.getElementById('cart-drawer-footer');
    if (!body) return;

    var items = getItems();
    var keys = Object.keys(items);

    if (keys.length === 0) {
      body.innerHTML = '<p class="cart-empty">Your cart is empty.<br>Select a service above to get started.</p>';
      if (footer) footer.style.display = 'none';
      return;
    }

    var total = 0;
    var html = '<ul class="cart-line-list">';
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var qty = items[key];
      var cat = (CART_CATALOG || []).find(function (c) { return c.key === key; });
      if (!cat) continue;
      var lineTotal = cat.cents * qty;
      total += lineTotal;
      html += [
        '<li class="cart-line">',
          '<div class="cart-line-top">',
            '<span class="cart-line-label">' + escHtml(cat.label) + '</span>',
            '<span class="cart-line-unit">' + escHtml(cat.displayPrice) + ' each</span>',
          '</div>',
          '<div class="cart-line-bottom">',
            '<div class="cart-qty-row">',
              '<button class="qty-btn" onclick="cartSetQty(\'' + key + '\',' + (qty - 1) + ')">−</button>',
              '<span class="qty-value">' + qty + '</span>',
              '<button class="qty-btn" onclick="cartSetQty(\'' + key + '\',' + (qty + 1) + ')">+</button>',
            '</div>',
            '<span class="cart-line-subtotal">$' + fmtCents(lineTotal) + '</span>',
            '<button class="cart-remove-btn" onclick="cartRemove(\'' + key + '\')" aria-label="Remove ' + escHtml(cat.label) + '">',
              '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>',
            '</button>',
          '</div>',
        '</li>',
      ].join('');
    }
    html += '</ul>';

    body.innerHTML = html;

    var totalEl = document.getElementById('cart-total-display');
    if (totalEl) totalEl.textContent = '$' + fmtCents(total);
    if (footer) footer.style.display = '';
  }

  // ── Badge ─────────────────────────────────────────────────────────────────

  function updateBadge() {
    var badge = document.getElementById('cart-count-badge');
    if (!badge) return;
    var n = totalCount();
    badge.textContent = n;
    badge.style.display = n > 0 ? 'flex' : 'none';
  }

  // ── Checkout ──────────────────────────────────────────────────────────────

  window.cartCheckout = async function () {
    var items = getItems();
    var keys = Object.keys(items);
    if (keys.length === 0) return;

    var btn = document.getElementById('cart-checkout-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Redirecting…'; }

    var payload = {
      items: keys.map(function (k) { return { key: k, qty: items[k] }; }),
    };

    var submissionId = sessionStorage.getItem('ps_submissionId');
    var customerEmail = sessionStorage.getItem('ps_customerEmail');
    if (submissionId) payload.submissionId = parseInt(submissionId, 10);
    if (customerEmail) payload.customerEmail = customerEmail;

    try {
      var resp = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      var data = await resp.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.message || 'Could not start checkout. Please try again.');
        if (btn) { btn.disabled = false; btn.textContent = 'Proceed to Checkout'; }
      }
    } catch (err) {
      console.error('[Cart] Checkout error:', err);
      alert('Network error. Please check your connection and try again.');
      if (btn) { btn.disabled = false; btn.textContent = 'Proceed to Checkout'; }
    }
  };

  // ── Visual feedback ───────────────────────────────────────────────────────

  function flashButton(key) {
    var btns = document.querySelectorAll('[data-cart-key="' + key + '"]');
    btns.forEach(function (btn) {
      var orig = btn.textContent;
      btn.textContent = 'Added ✓';
      btn.classList.add('cart-added');
      setTimeout(function () {
        btn.textContent = orig;
        btn.classList.remove('cart-added');
      }, 1500);
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fmtCents(cents) {
    return (cents / 100).toFixed(2);
  }

  // ── DOM injection & init ──────────────────────────────────────────────────

  function injectUI() {
    // Floating cart button
    if (!document.getElementById('cart-float-btn')) {
      var floatBtn = document.createElement('button');
      floatBtn.id = 'cart-float-btn';
      floatBtn.className = 'cart-float-btn';
      floatBtn.setAttribute('aria-label', 'Open cart');
      floatBtn.innerHTML =
        '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
          '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>' +
          '<path d="M1 1h4l2.68 13.39a2 2 0 001.99 1.61h9.72a2 2 0 001.98-1.69l1.65-8.69H6"/>' +
        '</svg>' +
        '<span id="cart-count-badge" class="cart-count-badge" style="display:none">0</span>';
      floatBtn.onclick = openDrawer;
      document.body.appendChild(floatBtn);
    }

    // Overlay
    if (!document.getElementById('cart-overlay')) {
      var overlay = document.createElement('div');
      overlay.id = 'cart-overlay';
      overlay.className = 'cart-overlay';
      overlay.onclick = closeDrawer;
      document.body.appendChild(overlay);
    }

    // Drawer
    if (!document.getElementById('cart-drawer')) {
      var drawer = document.createElement('aside');
      drawer.id = 'cart-drawer';
      drawer.className = 'cart-drawer';
      drawer.setAttribute('aria-label', 'Shopping cart');
      drawer.innerHTML = [
        '<div class="cart-drawer-header">',
          '<h3 class="cart-drawer-title">Your Order</h3>',
          '<button class="cart-close-btn" onclick="closeCartDrawer()" aria-label="Close cart">',
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">',
              '<path d="M18 6L6 18M6 6l12 12"/>',
            '</svg>',
          '</button>',
        '</div>',
        '<div id="cart-drawer-body" class="cart-drawer-body">',
          '<p class="cart-empty">Your cart is empty.<br>Select a service above to get started.</p>',
        '</div>',
        '<div id="cart-drawer-footer" class="cart-drawer-footer" style="display:none">',
          '<div class="cart-total-row">',
            '<span>Order Total</span>',
            '<strong id="cart-total-display">$0.00</strong>',
          '</div>',
          '<p class="cart-fee-note">A 3% card processing fee may be added at checkout.</p>',
          '<button id="cart-checkout-btn" class="cart-checkout-btn" onclick="cartCheckout()">',
            'Proceed to Checkout',
          '</button>',
          '<a href="request.html" class="cart-intake-link">Need to submit an intake form first? →</a>',
        '</div>',
      ].join('');
      document.body.appendChild(drawer);
    }

    updateBadge();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectUI);
  } else {
    injectUI();
  }
})();
