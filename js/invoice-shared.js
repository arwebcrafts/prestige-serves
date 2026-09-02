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
        'eFiling', 'eFiling - Standard', 'eFiling - Rush', 'eRecording',
        'Skip Trace', 'Legal Courier', 'Nationwide Service', 'Concierge',
        'Stakeout 2 Hours', 'Extended Stakeout', 'Half Day Stakeout',
        'Stakeout Extra Hour', 'Second Location Surcharge',
        'Document Printing (per page)', 'POS Preparation', 'First-Class Mailing',
        'White-Glove POS', 'Certified Mail w/ Return Receipt', 'Additional Defendant',
        'Custom / Write-in Item', 'Custom Service', 'Other'
      ];
      INVOICE_PRICES = {
        'Standard Serve': 97.99, 'Rush Serve': 119.99, 'Priority Serve': 149.99,
        'Emergency Serve': 249.99, 'eFiling': 75, 'eFiling - Standard': 75, 'eFiling - Rush': 125,
        'eRecording': 75, 'Skip Trace': 125, 'Legal Courier': 85, 'Nationwide Service': 150,
        'Concierge': 200, 'Stakeout 2 Hours': 250, 'Extended Stakeout': 450,
        'Half Day Stakeout': 600, 'Stakeout Extra Hour': 115, 'Second Location Surcharge': 75,
        'Document Printing (per page)': 0.35, 'POS Preparation': 35, 'First-Class Mailing': 20,
        'White-Glove POS': 85, 'Certified Mail w/ Return Receipt': 39, 'Additional Defendant': 45,
        'Custom / Write-in Item': 0, 'Custom Service': 0, 'Other': 0
      };
      if (cb) cb();
    });
}

function makeTypeSelectHtml(selected) {
  var opts = INVOICE_TYPES.map(function (t) {
    return '<option value="' + escapeInvHtml(t) + '"' + (t === selected ? ' selected' : '') + '>' + escapeInvHtml(t) + '</option>';
  }).join('');
  return '<select class="type-sel" onchange="onInvTypeChange(this)"><option value="">Select preset…</option>' + opts + '</select>';
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
    '<td><input class="desc-in" placeholder="Type custom service / item name…" value="' + escapeInvHtml(desc || '') + '" oninput="recalcInvoiceTable()"></td>' +
    '<td>' + makeTypeSelectHtml(type || '') + '</td>' +
    '<td class="r"><input class="qty-in" type="number" min="0" step="1" value="' + (qty != null ? qty : 1) + '" oninput="recalcInvoiceTable()"></td>' +
    '<td class="r"><input class="prc-in" type="number" min="0" step="0.01" value="' + (price > 0 ? price.toFixed(2) : (price === 0 ? '0.00' : '')) + '" placeholder="0.00" oninput="recalcInvoiceTable()"></td>' +
    '<td class="r row-amt">' + formatUsdFromDollars(0) + '</td>' +
    '<td style="text-align:center"><button type="button" class="del-btn" onclick="this.closest(\'tr\').remove();recalcInvoiceTable()" style="background:none;border:none;color:#ccc;cursor:pointer;font-size:16px;">×</button></td>';
  tb.appendChild(tr);
  recalcInvoiceTable();
}

function onInvTypeChange(sel) {
  var row = sel.closest('tr');
  var prc = row.querySelector('.prc-in');
  var desc = row.querySelector('.desc-in');
  var val = sel.value;

  var isCustomType = (val === 'Custom / Write-in Item' || val === 'Custom Service' || val === 'Other');

  if (val && INVOICE_PRICES[val] !== undefined) {
    if (!isCustomType) {
      prc.value = INVOICE_PRICES[val].toFixed(2);
      if (!desc.value || INVOICE_TYPES.indexOf(desc.value) !== -1) {
        desc.value = val;
      }
    }
  }

  if (isCustomType) {
    if (desc.value === 'Custom / Write-in Item' || desc.value === 'Custom Service' || desc.value === 'Other' || INVOICE_TYPES.indexOf(desc.value) !== -1) {
      desc.value = '';
    }
    desc.placeholder = 'Type custom service or item name…';
    desc.focus();
  } else {
    desc.placeholder = 'Describe service or custom item name…';
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
    stripe_pay_url: ensureAbsoluteUrl(val('inv-stripe-url')) || 'https://buy.stripe.com/4gM4gzg8xdrR0Uxfrf6sw0n',
  };
}

function ensureAbsoluteUrl(url) {
  if (!url) return '';
  url = String(url).trim();
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (/^(buy\.stripe\.com|checkout\.stripe\.com|stripe\.com)/i.test(url)) {
    return 'https://' + url;
  }
  if (url.startsWith('/')) {
    return window.location.origin + url;
  }
  return window.location.origin + '/' + url;
}

function printInvoice() {
  // If jsPDF / html2canvas aren't loaded yet, fall back to window.print()
  if (typeof window.jspdf === 'undefined' || typeof html2canvas === 'undefined') {
    console.warn('PDF libraries not loaded – falling back to window.print()');
    window.print();
    return;
  }

  // The quote-builder uses #invoice-form; client view uses #inv-display
  var invEl = document.getElementById('invoice-form') || document.getElementById('inv-display');
  if (!invEl) { window.print(); return; }

  // Show a generating overlay
  var overlay = document.createElement('div');
  overlay.id = 'pdf-generating-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:99999;';
  overlay.innerHTML = '<div style="background:#fff;padding:32px 48px;border-radius:8px;text-align:center;font-family:Inter,sans-serif;">' +
    '<div style="font-size:18px;font-weight:600;color:#2a3a6e;margin-bottom:8px;">Generating PDF…</div>' +
    '<div style="font-size:13px;color:#6b7280;">Please wait a moment</div></div>';
  document.body.appendChild(overlay);

  // Hide UI-only elements before capture
  var hideEls = invEl.querySelectorAll('.inv-btn-print, .inv-add-row, .del-btn, .inv-action-bar, .inv-stripe-url-input');
  hideEls.forEach(function(el) { el.dataset.wasDisplay = el.style.display; el.style.display = 'none'; });

  // Also hide the Stripe URL input by ID
  var stripeInput = document.getElementById('inv-stripe-url');
  if (stripeInput) { stripeInput.dataset.wasDisplay = stripeInput.style.display; stripeInput.style.display = 'none'; }

  html2canvas(invEl, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
  }).then(function(canvas) {
    var jsPDF = window.jspdf.jsPDF;

    var pageWidthMm = 215.9;
    var pageHeightMm = 279.4;
    var marginMm = 6;
    var contentWidthMm = pageWidthMm - (marginMm * 2);

    var imgWidth = canvas.width;
    var imgHeight = canvas.height;
    var ratio = contentWidthMm / imgWidth;
    var contentHeightMm = imgHeight * ratio;

    var pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter',
    });

    var usablePageHeight = pageHeightMm - (marginMm * 2);

    if (contentHeightMm <= usablePageHeight) {
      var imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', marginMm, marginMm, contentWidthMm, contentHeightMm);
    } else {
      var pageCount = Math.ceil(contentHeightMm / usablePageHeight);
      for (var p = 0; p < pageCount; p++) {
        if (p > 0) pdf.addPage();
        var srcY = Math.round(p * usablePageHeight / ratio);
        var srcH = Math.round(usablePageHeight / ratio);
        if (srcY + srcH > imgHeight) srcH = imgHeight - srcY;

        var sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = imgWidth;
        sliceCanvas.height = srcH;
        var ctx = sliceCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, srcY, imgWidth, srcH, 0, 0, imgWidth, srcH);

        var sliceData = sliceCanvas.toDataURL('image/png');
        var sliceHeightMm = srcH * ratio;
        pdf.addImage(sliceData, 'PNG', marginMm, marginMm, contentWidthMm, sliceHeightMm);
      }
    }

    // Add clickable link annotations over every <a> in the invoice
    var allLinks = invEl.querySelectorAll('a[href]');
    var invRect = invEl.getBoundingClientRect();
    var scaleX = contentWidthMm / invEl.offsetWidth;
    var scaleY = contentHeightMm / (imgHeight / (canvas.width / invEl.offsetWidth));

    allLinks.forEach(function(link) {
      var href = link.getAttribute('href');
      if (!href || href === '#' || href.startsWith('javascript:')) return;
      // Skip hidden links
      if (link.offsetParent === null && link.style.display === 'none') return;

      var linkRect = link.getBoundingClientRect();
      if (linkRect.width === 0 || linkRect.height === 0) return;

      var x = (linkRect.left - invRect.left) * scaleX + marginMm;
      var y = (linkRect.top - invRect.top) * scaleY + marginMm;
      var w = linkRect.width * scaleX;
      var h = linkRect.height * scaleY;

      var linkPage = 0;
      if (contentHeightMm > usablePageHeight) {
        linkPage = Math.floor(y / usablePageHeight);
        y = y - (linkPage * usablePageHeight);
      }

      if (linkPage < pdf.getNumberOfPages()) {
        pdf.setPage(linkPage + 1);
        pdf.link(x, y, w, h, { url: href });
      }
    });

    // Set metadata and save
    var invNumEl = document.getElementById('inv-num');
    var invNum = invNumEl ? invNumEl.value : '';
    var filename = 'Invoice-' + (invNum ? String(invNum).trim().replace(/[^a-zA-Z0-9_-]/g, '') : 'Quote') + '-Prestige-Serves.pdf';
    pdf.setProperties({
      title: filename.replace('.pdf', ''),
      subject: 'Invoice from Prestige Serves LLC',
      creator: 'Prestige Serves LLC',
    });

    pdf.save(filename);

    // Restore hidden elements
    hideEls.forEach(function(el) { el.style.display = el.dataset.wasDisplay || ''; delete el.dataset.wasDisplay; });
    if (stripeInput) { stripeInput.style.display = stripeInput.dataset.wasDisplay || ''; delete stripeInput.dataset.wasDisplay; }

    var ov = document.getElementById('pdf-generating-overlay');
    if (ov) ov.remove();

  }).catch(function(err) {
    console.error('PDF generation failed:', err);
    hideEls.forEach(function(el) { el.style.display = el.dataset.wasDisplay || ''; delete el.dataset.wasDisplay; });
    if (stripeInput) { stripeInput.style.display = stripeInput.dataset.wasDisplay || ''; delete stripeInput.dataset.wasDisplay; }
    var ov = document.getElementById('pdf-generating-overlay');
    if (ov) ov.remove();
    window.print();
  });
}

function savePDF() { printInvoice(); }
function downloadPDF() { printInvoice(); }
function saveInvoicePDF() { printInvoice(); }
function exportPDF() { printInvoice(); }

