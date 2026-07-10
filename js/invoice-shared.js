// Shared invoice recalc + catalog (loaded on quote-builder and invoice pages)

var INVOICE_TYPES = [];
var INVOICE_PRICES = {};

function loadInvoiceCatalog(cb) {
  fetch('/api/invoice-catalog')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.success) {
        INVOICE_TYPES = data.types || [];
        INVOICE_PRICES = data.prices || {};
      }
      if (cb) cb();
    })
    .catch(function () {
      INVOICE_TYPES = [
        'Standard Serve', 'Rush Serve', 'Priority Serve', 'Emergency Serve',
        'Stakeout 2 Hours', 'Extended Stakeout', 'Half Day Stakeout',
        'Document Printing (per page)', 'Other'
      ];
      INVOICE_PRICES = {
        'Standard Serve': 97.99, 'Rush Serve': 119.99, 'Priority Serve': 149.99,
        'Emergency Serve': 249.99, 'Stakeout 2 Hours': 250, 'Other': 0
      };
      if (cb) cb();
    });
}

function makeTypeSelectHtml(selected) {
  var opts = INVOICE_TYPES.map(function (t) {
    return '<option value="' + escapeInvHtml(t) + '"' + (t === selected ? ' selected' : '') + '>' + escapeInvHtml(t) + '</option>';
  }).join('');
  return '<select class="type-sel" onchange="onInvTypeChange(this)"><option value="">Select…</option>' + opts + '</select>';
}

function escapeInvHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatUsd(cents) {
  return '$' + ((parseInt(cents, 10) || 0) / 100).toFixed(2);
}

function formatUsdFromDollars(n) {
  return '$' + (parseFloat(n) || 0).toFixed(2);
}

function recalcInvoiceTable() {
  var sub = 0;
  document.querySelectorAll('#inv-tbl-body tr').forEach(function (tr) {
    var q = parseFloat(tr.querySelector('.qty-in') && tr.querySelector('.qty-in').value) || 0;
    var p = parseFloat(tr.querySelector('.prc-in') && tr.querySelector('.prc-in').value) || 0;
    var amt = q * p;
    var cell = tr.querySelector('.row-amt');
    if (cell) cell.textContent = formatUsdFromDollars(amt);
    sub += amt;
  });

  var taxPct = parseFloat(document.getElementById('inv-tax-pct') && document.getElementById('inv-tax-pct').value) || 0;
  var disc = parseFloat(document.getElementById('inv-disc') && document.getElementById('inv-disc').value) || 0;
  var stripeOn = document.getElementById('inv-stripe-on') && document.getElementById('inv-stripe-on').checked;
  var taxAmt = sub * taxPct / 100;
  var preFee = sub + taxAmt - disc;
  var fee = stripeOn ? preFee * 0.03 : 0;
  var grand = Math.max(0, preFee + fee);

  var el;
  el = document.getElementById('inv-subtotal'); if (el) el.textContent = formatUsdFromDollars(sub);
  el = document.getElementById('inv-tax-amt'); if (el) el.textContent = formatUsdFromDollars(taxAmt);
  el = document.getElementById('inv-stripe-fee-amt'); if (el) el.textContent = formatUsdFromDollars(fee);
  el = document.getElementById('inv-grand'); if (el) el.textContent = formatUsdFromDollars(grand);
  el = document.getElementById('inv-stripe-fee-line'); if (el) el.style.display = stripeOn ? 'block' : 'none';

  return {
    subtotal_cents: Math.round(sub * 100),
    tax_pct: taxPct,
    tax_cents: Math.round(taxAmt * 100),
    discount_cents: Math.round(disc * 100),
    stripe_fee_enabled: stripeOn,
    stripe_fee_cents: Math.round(fee * 100),
    total_cents: Math.round(grand * 100),
  };
}

function addInvoiceRow(desc, type, qty, price) {
  var tb = document.getElementById('inv-tbl-body');
  if (!tb) return;
  var tr = document.createElement('tr');
  tr.innerHTML =
    '<td><input class="desc-in" placeholder="Describe service…" value="' + escapeInvHtml(desc || '') + '" oninput="recalcInvoiceTable()"></td>' +
    '<td>' + makeTypeSelectHtml(type || '') + '</td>' +
    '<td class="r"><input class="qty-in" type="number" min="0" step="1" value="' + (qty != null ? qty : 1) + '" oninput="recalcInvoiceTable()"></td>' +
    '<td class="r"><input class="prc-in" type="number" min="0" step="0.01" value="' + (price > 0 ? price.toFixed(2) : '') + '" placeholder="0.00" oninput="recalcInvoiceTable()"></td>' +
    '<td class="r row-amt">' + formatUsdFromDollars(0) + '</td>' +
    '<td style="text-align:center"><button type="button" class="del-btn" onclick="this.closest(\'tr\').remove();recalcInvoiceTable()" style="background:none;border:none;color:#ccc;cursor:pointer;font-size:16px;">×</button></td>';
  tb.appendChild(tr);
  recalcInvoiceTable();
}

function onInvTypeChange(sel) {
  var row = sel.closest('tr');
  var prc = row.querySelector('.prc-in');
  var desc = row.querySelector('.desc-in');
  if (sel.value && INVOICE_PRICES[sel.value] !== undefined) {
    prc.value = INVOICE_PRICES[sel.value].toFixed(2);
    if (!desc.value) desc.value = sel.value;
  }
  recalcInvoiceTable();
}

function collectLineItems() {
  var items = [];
  document.querySelectorAll('#inv-tbl-body tr').forEach(function (tr) {
    var desc = (tr.querySelector('.desc-in') && tr.querySelector('.desc-in').value) || '';
    var type = (tr.querySelector('.type-sel') && tr.querySelector('.type-sel').value) || '';
    var qty = parseFloat(tr.querySelector('.qty-in') && tr.querySelector('.qty-in').value) || 0;
    var unit_price = parseFloat(tr.querySelector('.prc-in') && tr.querySelector('.prc-in').value) || 0;
    if (qty > 0 && (desc || type)) {
      items.push({ description: desc || type, type: type, qty: qty, unit_price: unit_price });
    }
  });
  return items;
}

function collectBillTo() {
  return {
    firm: val('bill-firm'),
    contact: val('bill-contact'),
    street: val('bill-street'),
    cityStateZip: val('bill-city'),
    phone: val('bill-phone'),
    email: val('bill-email'),
  };
}

function collectServiceDetails() {
  return {
    subject: val('svc-subject'),
    serviceAddress: val('svc-address'),
    documents: val('svc-docs'),
    assignedServer: val('svc-server'),
  };
}

function val(id) {
  var el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function setBillTo(b) {
  if (!b) return;
  setVal('bill-firm', b.firm);
  setVal('bill-contact', b.contact);
  setVal('bill-street', b.street);
  setVal('bill-city', b.cityStateZip);
  setVal('bill-phone', b.phone);
  setVal('bill-email', b.email);
}

function setServiceDetails(s) {
  if (!s) return;
  setVal('svc-subject', s.subject);
  setVal('svc-address', s.serviceAddress);
  setVal('svc-docs', s.documents);
  setVal('svc-server', s.assignedServer);
}

function setVal(id, v) {
  var el = document.getElementById(id);
  if (el) el.value = v || '';
}

function collectInvoicePayload() {
  var totals = recalcInvoiceTable();
  return {
    invoice_number: val('inv-num') || null,
    status: document.getElementById('inv-status') ? document.getElementById('inv-status').value : 'unpaid',
    invoice_date: val('inv-date'),
    due_date: val('inv-due-date'),
    case_number: val('inv-case'),
    bill_to: collectBillTo(),
    service_details: collectServiceDetails(),
    line_items: collectLineItems(),
    tax_pct: totals.tax_pct,
    discount_cents: totals.discount_cents,
    stripe_fee_enabled: totals.stripe_fee_enabled,
    notes: val('inv-notes'),
    client_email: val('bill-email'),
  };
}
