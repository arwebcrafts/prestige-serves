// Admin quote builder

var editingInvoiceId = null;

function checkAdmin() {
  if (sessionStorage.getItem('adminLoggedIn') !== 'true') {
    window.location.href = 'admin.html';
    return false;
  }
  return true;
}

function initDates() {
  var today = new Date().toISOString().split('T')[0];
  document.getElementById('inv-date').value = today;
  document.getElementById('inv-due-date').value = today;
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
  document.getElementById('inv-disc').value = 0;
  document.getElementById('inv-stripe-on').checked = false;
  document.getElementById('pay-link-box').style.display = 'none';
  document.getElementById('save-msg').style.display = 'none';
  initDates();
  addInvoiceRow();
  addInvoiceRow();
}

function showMsg(text, isError) {
  var el = document.getElementById('save-msg');
  el.textContent = text;
  el.className = 'inv-msg ' + (isError ? 'inv-msg-error' : 'inv-msg-success');
  el.style.display = 'block';
}

function showPayLink(url, invNum, token) {
  var box = document.getElementById('pay-link-box');
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
  if (!payload.line_items.length) {
    showMsg('Add at least one line item.', true);
    return;
  }
  if (payload.total_cents <= 0) {
    showMsg('Total must be greater than zero.', true);
    return;
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
      return;
    }

    var inv = data.data;
    editingInvoiceId = inv.id;
    document.getElementById('inv-num').value = inv.invoice_number;

    var payUrl = data.payUrl || (
      window.location.origin + '/invoice.html?number=' +
      encodeURIComponent(inv.invoice_number) + '&token=' + encodeURIComponent(inv.access_token)
    );

    showMsg('Invoice saved successfully.', false);
    showPayLink(payUrl, inv.invoice_number, inv.access_token);
  } catch (err) {
    showMsg('Network error. Try again.', true);
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
      document.getElementById('inv-stripe-on').checked = !!inv.stripe_fee_enabled;
      document.getElementById('inv-notes').value = inv.notes || '';
      var stripeUrl = inv.stripe_pay_url || 'https://buy.stripe.com/4gM4gzg8xdrR0Uxfrf6sw0n';
      if (document.getElementById('inv-stripe-url')) {
        document.getElementById('inv-stripe-url').value = stripeUrl;
      }
      updateStripeUrlPreview(stripeUrl);

      var items = typeof inv.line_items === 'string' ? JSON.parse(inv.line_items) : inv.line_items;
      document.getElementById('inv-tbl-body').innerHTML = '';
      (items || []).forEach(function (li) {
        addInvoiceRow(li.description, li.type, li.qty, li.unit_price);
      });
      if (!items || !items.length) { addInvoiceRow(); }
      recalcInvoiceTable();

      var payUrl = window.location.origin + '/invoice.html?number=' +
        encodeURIComponent(inv.invoice_number) + '&token=' + encodeURIComponent(inv.access_token);
      showPayLink(payUrl, inv.invoice_number, inv.access_token);
    });
}

function updateStripeUrlPreview(url) {
  var target = (url || 'https://buy.stripe.com/4gM4gzg8xdrR0Uxfrf6sw0n').trim();
  var btn = document.getElementById('inv-stripe-btn-link');
  var txt = document.getElementById('inv-stripe-text-link');
  if (btn) btn.href = target;
  if (txt) {
    txt.href = target;
    txt.textContent = target;
  }
}

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
