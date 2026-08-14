// Client invoice view + Stripe Pay Now

var currentToken = '';
var currentNumber = '';

function formatUsd(cents) {
  return '$' + ((parseInt(cents, 10) || 0) / 100).toFixed(2);
}

function statusClass(status) {
  if (status === 'paid') return 'inv-status-paid';
  if (status === 'sent') return 'inv-status-sent';
  return 'inv-status-unpaid';
}

function statusLabel(status) {
  if (status === 'paid') return 'Paid';
  if (status === 'sent') return 'Sent';
  return 'Unpaid';
}

function renderInvoice(inv) {
  var bill = inv.bill_to || {};
  var svc = inv.service_details || {};
  var items = inv.line_items || [];
  var isPaid = inv.status === 'paid';

  var rows = items.map(function (li) {
    var amt = (li.amount_cents != null) ? li.amount_cents / 100 : (li.qty || 0) * (li.unit_price || 0);
    var itemDesc = li.description || li.type || 'Service Item';
    var itemType = (li.type && li.type !== 'Custom / Write-in Item' && li.type !== 'Custom Service' && li.type !== 'Other' && li.type !== itemDesc) ? li.type : '';
    return '<tr>' +
      '<td>' + escapeHtml(itemDesc) + '</td>' +
      '<td>' + escapeHtml(itemType) + '</td>' +
      '<td class="r">' + (li.qty || 0) + '</td>' +
      '<td class="r">' + formatUsd(Math.round((li.unit_price || 0) * 100)) + '</td>' +
      '<td class="r">' + formatUsd(Math.round(amt * 100)) + '</td>' +
      '</tr>';
  }).join('');

  var payBlock = isPaid
    ? '<button type="button" class="inv-pay-btn inv-pay-btn-paid" disabled>Paid in Full</button>'
    : '<button type="button" class="inv-pay-btn" id="inv-pay-btn" onclick="payInvoice()">Pay Now · ' + formatUsd(inv.total_cents) + '</button>';

  document.getElementById('inv-display').innerHTML =
    '<div class="inv-topbar">' +
      '<div style="display:flex;align-items:center;gap:8px;"><span class="inv-logo-text">Prestige Serves</span></div>' +
      '<div style="display:flex;align-items:center;gap:12px;">' +
        '<button type="button" onclick="printInvoice()" style="background:#2a3a6e;color:#fff;border:none;padding:5px 12px;font-size:10px;letter-spacing:1px;text-transform:uppercase;cursor:pointer;border-radius:2px;" class="inv-btn-print">Print / Save PDF</button>' +
        '<span class="inv-label-top">Invoice</span>' +
      '</div>' +
    '</div>' +
    '<div class="inv-hero">' +
      '<div><div class="inv-eyebrow">Licensed &amp; Bonded Process Server · Los Angeles</div>' +
      '<div class="inv-title">Invoice.</div></div>' +
      '<div class="inv-meta-right">' +
        '<div><span style="font-size:10px;color:#6b7280;">No.</span> <strong>' + escapeHtml(inv.invoice_number) + '</strong> ' +
        '<span class="inv-status-pill ' + statusClass(inv.status) + '">' + statusLabel(inv.status) + '</span></div>' +
        '<div style="font-size:12px;margin-top:6px;color:#6b7280;">Date: ' + escapeHtml((inv.invoice_date || '').slice(0, 10)) +
        ' · Due: ' + escapeHtml((inv.due_date || '').slice(0, 10)) + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="inv-upfront"><strong style="color:#2a3a6e;">Payment Required in Full Before Service Begins.</strong></div>' +
    (inv.case_number ? '<div class="inv-case-row"><span class="inv-sec-eye">Case / Matter #</span> ' + escapeHtml(inv.case_number) + '</div>' : '') +
    '<div class="inv-bill-grid">' +
      '<div class="inv-bill-col"><div class="inv-sec-eye">Bill To</div>' +
        fieldLine(bill.firm) + fieldLine(bill.contact) + fieldLine(bill.street) + fieldLine(bill.cityStateZip) +
        fieldLine(bill.phone) + fieldLine(bill.email) +
      '</div>' +
      '<div class="inv-bill-col right"><div class="inv-sec-eye">From</div>' +
        '<div class="inv-field"><span class="inv-static-val brand">Prestige Serves LLC</span></div>' +
        '<div class="inv-field">1240 S Corning St., Suite 105</div>' +
        '<div class="inv-field">Los Angeles, CA 90035</div>' +
        '<div style="margin-top:8px;" class="inv-sec-eye">Service Details</div>' +
        fieldLine(svc.subject) + fieldLine(svc.serviceAddress) + fieldLine(svc.documents) + fieldLine(svc.assignedServer) +
      '</div>' +
    '</div>' +
    '<div class="inv-items-section"><div class="inv-sec-eye">Services &amp; Line Items</div>' +
      '<table class="inv-tbl"><thead><tr><th>Description</th><th>Type</th><th class="r">Qty</th><th class="r">Unit</th><th class="r">Amount</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>' +
    '<div class="inv-bottom-grid">' +
      '<div class="inv-stripe-col"><div class="inv-sec-eye">Payment via Stripe</div>' +
        '<div class="inv-stripe-block"><div class="inv-stripe-wordmark">str<b>i</b>pe</div>' + payBlock +
        '<p style="font-size:9px;color:rgba(255,255,255,0.65);margin-top:8px;">Secure card payment. Service begins after payment is confirmed.</p></div></div>' +
      '<div class="inv-totals-col">' +
        tRow('Subtotal', formatUsd(inv.subtotal_cents)) +
        tRow('Tax / Fees', formatUsd(inv.tax_cents)) +
        (inv.stripe_fee_enabled ? tRow('Stripe Fee (3%)', formatUsd(inv.stripe_fee_cents)) : '') +
        (inv.discount_cents ? tRow('Discount', '−' + formatUsd(inv.discount_cents)) : '') +
        '<div style="margin-top:10px;padding-top:9px;border-top:2px solid #2a3a6e;"><div class="inv-sec-eye">Total Due</div>' +
        '<div class="inv-grand-val">' + formatUsd(inv.total_cents) + '</div></div>' +
      '</div>' +
    '</div>' +
    (inv.notes ? '<div style="padding:10px 32px;border-top:1px solid #e2e0db;font-size:12px;font-style:italic;color:#444;">' + escapeHtml(inv.notes) + '</div>' : '') +
    '<div class="inv-footer-bar"><div style="color:#fff;font-family:EB Garamond,serif;">Prestige Serves LLC</div>' +
    '<div>info@prestigeserves.com · (424) 235-3089</div></div>';

  document.getElementById('inv-lookup-wrap').style.display = 'none';
  document.getElementById('inv-view-wrap').style.display = 'block';
}

function fieldLine(v) {
  return v ? '<div class="inv-field">' + escapeHtml(v) + '</div>' : '';
}

function tRow(label, val) {
  return '<div class="inv-t-row"><span>' + label + '</span><span class="val">' + val + '</span></div>';
}

function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function fetchInvoice(number, token) {
  var resp = await fetch('/api/invoices/' + encodeURIComponent(number) + '?token=' + encodeURIComponent(token));
  return resp.json();
}

function lookupInvoice(e) {
  e.preventDefault();
  var number = document.getElementById('lookup-number').value.trim();
  var token = document.getElementById('lookup-token').value.trim();
  var errEl = document.getElementById('lookup-error');
  errEl.style.display = 'none';

  fetchInvoice(number, token).then(function (data) {
    if (!data.success) {
      errEl.textContent = data.message || 'Invoice not found.';
      errEl.style.display = 'block';
      return;
    }
    currentNumber = number;
    currentToken = token;
    history.replaceState(null, '', '?number=' + encodeURIComponent(number) + '&token=' + encodeURIComponent(token));
    renderInvoice(data.data);
  }).catch(function () {
    errEl.textContent = 'Could not load invoice. Try again.';
    errEl.style.display = 'block';
  });
}

async function payInvoice() {
  var btn = document.getElementById('inv-pay-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Opening checkout…'; }

  try {
    var resp = await fetch('/api/invoices/' + encodeURIComponent(currentNumber) + '/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: currentToken }),
    });
    var data = await resp.json();
    if (data.success && data.url) {
      window.location.href = data.url;
      return;
    }
    alert(data.message || 'Could not start payment.');
  } catch (err) {
    alert('Network error. Please try again.');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Pay Now'; }
  }
}

document.addEventListener('DOMContentLoaded', function () {
  var params = new URLSearchParams(window.location.search);
  if (params.get('paid') === '1') {
    var banner = document.getElementById('inv-paid-banner');
    banner.textContent = 'Thank you! Your payment was received. We will confirm by email shortly.';
    banner.style.display = 'block';
  }

  var number = params.get('number');
  var token = params.get('token');
  if (number && token) {
    currentNumber = number;
    currentToken = token;
    fetchInvoice(number, token).then(function (data) {
      if (data.success) renderInvoice(data.data);
    });
  }
});

function printInvoice() {
  window.print();
}

function savePDF() {
  window.print();
}

function downloadPDF() {
  window.print();
}

function saveInvoicePDF() {
  window.print();
}

function exportPDF() {
  window.print();
}
