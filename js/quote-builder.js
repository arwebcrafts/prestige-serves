// Admin quote builder

var editingInvoiceId = null;

function checkAdmin() {
  try {
    sessionStorage.setItem('adminLoggedIn', 'true');
  } catch (e) {}
  return true;
}

function initDates() {
  var today = new Date().toISOString().split('T')[0];
  var d1 = document.getElementById('inv-date');
  var d2 = document.getElementById('inv-due-date');
  if (d1 && !d1.value) d1.value = today;
  if (d2 && !d2.value) d2.value = today;
}

function onCustomAmountInput(value) {
  var amtInput = document.getElementById('inv-custom-amount');
  if (amtInput) amtInput.dataset.manualOverride = 'true';
  var valNum = parseFloat(value);
  if (isNaN(valNum) || valNum < 0) valNum = 0;

  var grandEl = document.getElementById('inv-grand');
  if (grandEl) grandEl.textContent = formatUsdFromDollars(valNum);

  var rows = document.querySelectorAll('#inv-tbl-body tr');
  if (rows.length === 0) {
    addInvoiceRow('Process Serving / Legal Service', 'Standard Serve', 1, valNum);
  } else {
    var firstRow = rows[0];
    var prcIn = firstRow.querySelector('.prc-in');
    var qtyIn = firstRow.querySelector('.qty-in');
    var descIn = firstRow.querySelector('.desc-in');
    if (descIn && !descIn.value) descIn.value = 'Process Serving / Legal Service';
    if (qtyIn && (!qtyIn.value || parseFloat(qtyIn.value) <= 0)) qtyIn.value = '1';
    if (prcIn) prcIn.value = valNum.toFixed(2);
    var rowAmt = firstRow.querySelector('.row-amt');
    if (rowAmt) rowAmt.textContent = formatUsdFromDollars(valNum * (parseFloat(qtyIn ? qtyIn.value : 1) || 1));
    var subEl = document.getElementById('inv-subtotal');
    if (subEl) subEl.textContent = formatUsdFromDollars(valNum);
  }
}

async function handlePayNowClick(event) {
  var btn = document.getElementById('inv-stripe-btn-link');
  var href = btn ? btn.getAttribute('href') : '';
  if (href && href !== '#' && href !== 'javascript:void(0)' && !href.startsWith('javascript:')) {
    return;
  }
  event.preventDefault();
  var ok = await saveInvoice();
  if (ok) {
    var newHref = btn ? btn.getAttribute('href') : '';
    if (newHref && newHref !== '#' && !newHref.startsWith('javascript:')) {
      window.open(newHref, '_blank', 'noopener');
    }
  }
}

function newInvoice() {
  if (!confirm('Start a new invoice? Unsaved changes will be lost.')) return;
  editingInvoiceId = null;
  document.getElementById('inv-num').value = '';
  document.getElementById('inv-case').value = '';
  ['bill-firm', 'bill-contact', 'bill-street', 'bill-city', 'bill-phone', 'bill-email',
   'svc-subject', 'svc-address', 'svc-docs', 'svc-server'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('inv-tbl-body').innerHTML = '';
  document.getElementById('inv-tax-pct').value = 0;
  var stripeOn = document.getElementById('inv-stripe-on');
  if (stripeOn) stripeOn.checked = false;
  var amtIn = document.getElementById('inv-custom-amount');
  if (amtIn) { amtIn.value = ''; delete amtIn.dataset.manualOverride; }
  document.getElementById('pay-link-box').style.display = 'none';
  document.getElementById('save-msg').style.display = 'none';
  initDates();
  addInvoiceRow();
  addInvoiceRow();
}

function showMsg(text, isError) {
  var el = document.getElementById('save-msg');
  if (!el) return;
  el.textContent = text;
  el.className = 'inv-msg ' + (isError ? 'inv-msg-error' : 'inv-msg-success');
  el.style.display = 'block';
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function showPayLink(url, invNum, token) {
  var box = document.getElementById('pay-link-box');
  if (!box) return;
  box.innerHTML =
    '<strong>Client pay link (' + escapeInvHtml(invNum) + '):</strong><br>' +
    '<input type="text" readonly value="' + escapeInvHtml(url) + '" style="width:100%;margin:8px 0;padding:8px;font-size:12px;" id="pay-url-input">' +
    '<button type="button" onclick="copyPayLink()" style="padding:6px 12px;font-size:11px;cursor:pointer;">Copy Link</button> ' +
    '<a href="' + escapeInvHtml(url) + '" target="_blank" rel="noopener" style="font-size:12px;margin-left:8px;">Preview</a>';
  box.style.display = 'block';
}

function copyPayLink() {
  var input = document.getElementById('pay-url-input');
  if (!input) return;
  input.select();
  document.execCommand('copy');
  showMsg('Pay link copied to clipboard.', false);
}

async function saveInvoice() {
  var payload = collectInvoicePayload();

  var customAmtEl = document.getElementById('inv-custom-amount');
  var customAmt = customAmtEl ? parseFloat(customAmtEl.value) : 0;
  if ((!payload.line_items || !payload.line_items.length) && customAmt > 0) {
    payload.line_items = [{
      description: 'Process Serving / Litigation Support',
      type: 'Standard Serve',
      qty: 1,
      unit_price: customAmt,
      amount_cents: Math.round(customAmt * 100),
    }];
    payload.total_cents = Math.round(customAmt * 100);
    payload.subtotal_cents = Math.round(customAmt * 100);
  }

  if (!payload.line_items || !payload.line_items.length) {
    showMsg('Please add at least one line item or enter an amount.', true);
    return false;
  }
  if (payload.total_cents <= 0) {
    showMsg('Total amount must be greater than zero.', true);
    return false;
  }

  var btn = document.querySelector('.inv-btn-save');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

  try {
    var url = editingInvoiceId
      ? '/api/admin/invoices/' + editingInvoiceId
      : '/api/admin/invoices';
    var method = editingInvoiceId ? 'PUT' : 'POST';

    var resp = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    var data = await resp.json();

    if (!data.success) {
      showMsg(data.message || 'Save failed.', true);
      return false;
    }

    var inv = data.data;
    editingInvoiceId = inv.id;
    if (document.getElementById('inv-num')) {
      document.getElementById('inv-num').value = inv.invoice_number;
    }

    var payUrl = ensureAbsoluteUrl(data.payUrl || (
      window.location.origin + '/invoice.html?number=' +
      encodeURIComponent(inv.invoice_number) + '&token=' + encodeURIComponent(inv.access_token)
    ));

    var currentStripeUrl = val('inv-stripe-url');
    var isCustom = currentStripeUrl && currentStripeUrl !== 'https://buy.stripe.com/4gM4gzg8xdrR0Uxfrf6sw0n';
    var activePayUrl = isCustom ? ensureAbsoluteUrl(currentStripeUrl) : (data.stripeCheckoutUrl || (payUrl + '&pay=1'));

    if (document.getElementById('inv-stripe-url')) {
      document.getElementById('inv-stripe-url').value = isCustom ? currentStripeUrl : '';
    }
    updateStripeUrlPreview(activePayUrl);

    showMsg('Invoice saved successfully. Total: ' + formatUsdFromDollars((inv.total_cents || 0) / 100), false);
    showPayLink(payUrl, inv.invoice_number, inv.access_token);
    return true;
  } catch (err) {
    console.error('saveInvoice error:', err);
    showMsg('Network error. Try again.', true);
    return false;
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Save Quote & Get Pay Link'; }
  }
}

function loadInvoiceFromQuery() {
  var params = new URLSearchParams(window.location.search);
  var id = params.get('id');
  if (!id) return;

  fetch('/api/admin/invoices/' + id)
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data.success || !data.data) return;
      var inv = data.data;
      editingInvoiceId = inv.id;
      document.getElementById('inv-num').value = inv.invoice_number;
      document.getElementById('inv-status').value = inv.status || 'unpaid';
      document.getElementById('inv-date').value = (inv.invoice_date || '').slice(0, 10);
      document.getElementById('inv-due-date').value = (inv.due_date || '').slice(0, 10);
      document.getElementById('inv-case').value = inv.case_number || '';
      setBillTo(typeof inv.bill_to === 'string' ? JSON.parse(inv.bill_to) : inv.bill_to);
      setServiceDetails(typeof inv.service_details === 'string' ? JSON.parse(inv.service_details) : inv.service_details);
      document.getElementById('inv-tax-pct').value = inv.tax_pct || 0;
      document.getElementById('inv-disc').value = (inv.discount_cents || 0) / 100;
      var stripeOn = document.getElementById('inv-stripe-on');
      if (stripeOn) stripeOn.checked = !!inv.stripe_fee_enabled;
      document.getElementById('inv-notes').value = inv.notes || '';
      var amtIn = document.getElementById('inv-custom-amount');
      if (amtIn) {
        amtIn.value = ((inv.total_cents || 0) / 100).toFixed(2);
      }
      var payUrl = ensureAbsoluteUrl(window.location.origin + '/invoice.html?number=' +
        encodeURIComponent(inv.invoice_number) + '&token=' + encodeURIComponent(inv.access_token));
      var isCustom = inv.stripe_pay_url && inv.stripe_pay_url !== 'https://buy.stripe.com/4gM4gzg8xdrR0Uxfrf6sw0n';
      var stripeUrl = isCustom ? ensureAbsoluteUrl(inv.stripe_pay_url) : (payUrl + '&pay=1');
      if (document.getElementById('inv-stripe-url')) {
        document.getElementById('inv-stripe-url').value = isCustom ? inv.stripe_pay_url : '';
      }
      updateStripeUrlPreview(stripeUrl);

      var items = typeof inv.line_items === 'string' ? JSON.parse(inv.line_items) : inv.line_items;
      document.getElementById('inv-tbl-body').innerHTML = '';
      (items || []).forEach(function (li) {
        addInvoiceRow(li.description, li.type, li.qty, li.unit_price);
      });
      if (!items || !items.length) { addInvoiceRow(); }
      recalcInvoiceTable();

      showPayLink(payUrl, inv.invoice_number, inv.access_token);
    });
}

function updateStripeUrlPreview(url) {
  var target = (!url || url === '#' || url === 'https://buy.stripe.com/4gM4gzg8xdrR0Uxfrf6sw0n') ? '' : ensureAbsoluteUrl(url);
  var btn = document.getElementById('inv-stripe-btn-link');
  var txt = document.getElementById('inv-stripe-text-link');
  var bnr = document.getElementById('inv-pdf-banner-link');
  if (btn) {
    btn.href = target || '#';
  }
  if (txt) {
    txt.href = target || '#';
    txt.textContent = target ? 'Click Here to Pay Online →' : '(Generates automatically on save)';
  }
  if (bnr) {
    bnr.href = target || '#';
    bnr.textContent = target ? 'Click Here to Pay Online →' : '(Generates automatically on save)';
  }
}

// Ensure PDF export auto-saves first if unsaved so the link is never empty in the PDF
var _originalPrintInvoice = window.printInvoice;
window.printInvoice = async function () {
  var printBtn = document.querySelector('.inv-action-bar button:nth-child(2)');
  var origText = printBtn ? printBtn.textContent : '';
  if (printBtn) { printBtn.disabled = true; printBtn.textContent = 'Generating PDF…'; }
  try {
    if (!editingInvoiceId) {
      try {
        await saveInvoice();
      } catch (saveErr) {
        console.warn('Auto-save prior to print warning:', saveErr);
      }
    }
    if (typeof _originalPrintInvoice === 'function') {
      await _originalPrintInvoice();
    } else {
      window.print();
    }
  } catch (err) {
    console.error('printInvoice error:', err);
    window.print();
  } finally {
    if (printBtn) { printBtn.disabled = false; printBtn.textContent = origText; }
  }
};

document.addEventListener('DOMContentLoaded', function () {
  if (!checkAdmin()) return;
  loadInvoiceCatalog(function () {
    initDates();
    if (!new URLSearchParams(window.location.search).get('id')) {
      addInvoiceRow();
      addInvoiceRow();
    }
    loadInvoiceFromQuery();
  });
});
