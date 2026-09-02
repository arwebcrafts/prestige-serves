// Client invoice view + Stripe Pay Now
// This file is loaded on invoice.html (client-facing) WITHOUT invoice-shared.js
// so every helper it needs must be defined here.

var currentToken = '';
var currentNumber = '';

/* ── helpers ── */

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

function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fieldLine(v) {
  return v ? '<div class="inv-field">' + escapeHtml(v) + '</div>' : '';
}

function tRow(label, val) {
  return '<div class="inv-t-row"><span>' + label + '</span><span class="val">' + val + '</span></div>';
}

/**
 * Guarantee the URL starts with https:// so it works as a clickable
 * hyperlink inside a downloaded PDF (PDF readers ignore relative URLs).
 */
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

/**
 * Safely parse a field that might be a JSON string or already an object.
 */
function safeParse(val, fallback) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch (e) { return fallback; }
}

/* ── render ── */

function renderInvoice(inv) {
  var bill = safeParse(inv.bill_to, {});
  var svc  = safeParse(inv.service_details, {});
  var items = safeParse(inv.line_items, []);
  if (!Array.isArray(items)) items = [];
  var isPaid = inv.status === 'paid';

  // Build line-item rows
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

  // Resolve the payment URL — must be absolute for PDF
  var stripeTargetUrl = ensureAbsoluteUrl(
    inv.stripe_pay_url ||
    'https://buy.stripe.com/4gM4gzg8xdrR0Uxfrf6sw0n'
  );

  // Payment block inside the dark navy Stripe box
  var payBlock;
  if (isPaid) {
    payBlock =
      '<div style="padding:10px 14px;background:#27ae60;color:#fff;font-size:12px;font-weight:600;text-align:center;border-radius:4px;margin-top:10px;">PAID IN FULL</div>';
  } else {
    payBlock =
      '<a href="' + escapeHtml(stripeTargetUrl) + '" target="_blank" rel="noopener" class="inv-pay-btn-anchor">' +
        'PAY NOW VIA STRIPE · ' + formatUsd(inv.total_cents) +
      '</a>' +
      '<div class="inv-pdf-pay-url-box" style="margin-top:6px;font-size:9px;color:rgba(255,255,255,0.85);word-break:break-all;">' +
        'Payment Link: <a href="' + escapeHtml(stripeTargetUrl) + '" target="_blank" rel="noopener" style="color:#60a5fa;text-decoration:underline;">' + escapeHtml(stripeTargetUrl) + '</a>' +
      '</div>';
  }

  // ── Assemble full invoice HTML ──
  document.getElementById('inv-display').innerHTML =

    /* Top bar */
    '<div class="inv-topbar">' +
      '<div style="display:flex;align-items:center;gap:8px;"><span class="inv-logo-text">Prestige Serves</span></div>' +
      '<div style="display:flex;align-items:center;gap:12px;">' +
        '<button type="button" onclick="printInvoice()" class="inv-btn-print" style="background:#2a3a6e;color:#fff;border:none;padding:5px 12px;font-size:10px;letter-spacing:1px;text-transform:uppercase;cursor:pointer;border-radius:2px;">Print / Save PDF</button>' +
        '<span class="inv-label-top">Invoice</span>' +
      '</div>' +
    '</div>' +

    /* Hero */
    '<div class="inv-hero">' +
      '<div>' +
        '<div class="inv-eyebrow">Licensed &amp; Bonded Process Server · Los Angeles</div>' +
        '<div class="inv-title">Invoice.</div>' +
      '</div>' +
      '<div class="inv-meta-right">' +
        '<div><span style="font-size:10px;color:#6b7280;">No.</span> <strong>' + escapeHtml(inv.invoice_number) + '</strong> ' +
          '<span class="inv-status-pill ' + statusClass(inv.status) + '">' + statusLabel(inv.status) + '</span>' +
        '</div>' +
        '<div style="font-size:12px;margin-top:6px;color:#6b7280;">Date: ' + escapeHtml((inv.invoice_date || '').slice(0, 10)) +
          ' · Due: ' + escapeHtml((inv.due_date || '').slice(0, 10)) + '</div>' +
      '</div>' +
    '</div>' +

    /* Upfront notice */
    '<div class="inv-upfront"><strong style="color:#2a3a6e;">Payment Required in Full Before Service Begins.</strong></div>' +

    /* Case row */
    (inv.case_number ? '<div class="inv-case-row"><span class="inv-sec-eye">Case / Matter #</span> ' + escapeHtml(inv.case_number) + '</div>' : '') +

    /* Bill-To / From grid */
    '<div class="inv-bill-grid">' +
      '<div class="inv-bill-col"><div class="inv-sec-eye">Bill To</div>' +
        fieldLine(bill.firm) + fieldLine(bill.contact) + fieldLine(bill.street) +
        fieldLine(bill.cityStateZip) + fieldLine(bill.phone) + fieldLine(bill.email) +
      '</div>' +
      '<div class="inv-bill-col right"><div class="inv-sec-eye">From</div>' +
        '<div class="inv-field"><span class="inv-static-val brand">Prestige Serves LLC</span></div>' +
        '<div class="inv-field">1240 S Corning St., Suite 105</div>' +
        '<div class="inv-field">Los Angeles, CA 90035</div>' +
        '<div style="margin-top:8px;" class="inv-sec-eye">Service Details</div>' +
        fieldLine(svc.subject) + fieldLine(svc.serviceAddress) +
        fieldLine(svc.documents) + fieldLine(svc.assignedServer) +
      '</div>' +
    '</div>' +

    /* Line items table */
    '<div class="inv-items-section"><div class="inv-sec-eye">Services &amp; Line Items</div>' +
      '<table class="inv-tbl"><thead><tr>' +
        '<th>Description</th><th>Type</th><th class="r">Qty</th><th class="r">Unit</th><th class="r">Amount</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>' +
    '</div>' +

    /* Bottom grid: Stripe + Totals */
    '<div class="inv-bottom-grid">' +
      '<div class="inv-stripe-col"><div class="inv-sec-eye">Payment via Stripe</div>' +
        '<div class="inv-stripe-block">' +
          '<div class="inv-stripe-wordmark">str<b>i</b>pe</div>' +
          payBlock +
        '</div>' +
      '</div>' +
      '<div class="inv-totals-col">' +
        tRow('Subtotal', formatUsd(inv.subtotal_cents)) +
        tRow('Tax / Fees', formatUsd(inv.tax_cents)) +
        (inv.stripe_fee_enabled ? tRow('Stripe Fee (3%)', formatUsd(inv.stripe_fee_cents)) : '') +
        (inv.discount_cents ? tRow('Discount', '−' + formatUsd(inv.discount_cents)) : '') +
        '<div style="margin-top:10px;padding-top:9px;border-top:2px solid #2a3a6e;">' +
          '<div class="inv-sec-eye">Total Due</div>' +
          '<div class="inv-grand-val">' + formatUsd(inv.total_cents) + '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    /* PDF payment link banner — always visible in print */
    (!isPaid
      ? '<div class="inv-pdf-link-banner">' +
          '<strong>Pay Online:</strong> ' +
          '<a href="' + escapeHtml(stripeTargetUrl) + '" target="_blank" rel="noopener">' + escapeHtml(stripeTargetUrl) + '</a>' +
        '</div>'
      : '') +

    /* Notes */
    (inv.notes
      ? '<div class="inv-notes" style="padding:6px 20px;border-bottom:1px solid #e2e0db;font-size:11px;font-style:italic;color:#444;">' + escapeHtml(inv.notes) + '</div>'
      : '') +

    /* Footer bar */
    '<div class="inv-footer-bar">' +
      '<div style="color:#fff;font-family:EB Garamond,serif;">Prestige Serves LLC</div>' +
      '<div>info@prestigeserves.com · (424) 235-3089</div>' +
    '</div>';

  document.getElementById('inv-lookup-wrap').style.display = 'none';
  document.getElementById('inv-view-wrap').style.display = 'block';
}

/* ── API calls ── */

async function fetchInvoice(number, token) {
  var resp = await fetch('/api/invoices/' + encodeURIComponent(number) + '?token=' + encodeURIComponent(token));
  return resp.json();
}

function lookupInvoice(e) {
  e.preventDefault();
  var number = document.getElementById('lookup-number').value.trim();
  var token  = document.getElementById('lookup-token').value.trim();
  var errEl  = document.getElementById('lookup-error');
  errEl.style.display = 'none';

  fetchInvoice(number, token).then(function (data) {
    if (!data.success) {
      errEl.textContent = data.message || 'Invoice not found.';
      errEl.style.display = 'block';
      return;
    }
    currentNumber = number;
    currentToken  = token;
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
    if (data.success && data.url) { window.location.href = data.url; return; }
    alert(data.message || 'Could not start payment.');
  } catch (err) {
    alert('Network error. Please try again.');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Pay Now'; }
  }
}

/* ── Init ── */

document.addEventListener('DOMContentLoaded', function () {
  var params = new URLSearchParams(window.location.search);
  if (params.get('paid') === '1') {
    var banner = document.getElementById('inv-paid-banner');
    banner.textContent = 'Thank you! Your payment was received. We will confirm by email shortly.';
    banner.style.display = 'block';
  }
  var number = params.get('number');
  var token  = params.get('token');
  if (number && token) {
    currentNumber = number;
    currentToken  = token;
    fetchInvoice(number, token).then(function (data) {
      if (data.success) renderInvoice(data.data);
    });
  }
});

/* ── Print / PDF ── */

/**
 * Generate a real PDF with clickable link annotations using jsPDF + html2canvas.
 * This solves the Chrome Print-to-PDF limitation where <a> tags lose their
 * click targets. We render the invoice as a high-res image, then overlay
 * invisible clickable rectangles for every <a href="..."> in the invoice.
 */
function printInvoice() {
  // If jsPDF / html2canvas aren't loaded yet, fall back to window.print()
  if (typeof window.jspdf === 'undefined' || typeof html2canvas === 'undefined') {
    console.warn('PDF libraries not loaded – falling back to window.print()');
    window.print();
    return;
  }

  var invEl = document.getElementById('inv-display');
  if (!invEl) { window.print(); return; }

  // Show a generating overlay
  var overlay = document.createElement('div');
  overlay.id = 'pdf-generating-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:99999;';
  overlay.innerHTML = '<div style="background:#fff;padding:32px 48px;border-radius:8px;text-align:center;font-family:Inter,sans-serif;">' +
    '<div style="font-size:18px;font-weight:600;color:#2a3a6e;margin-bottom:8px;">Generating PDF…</div>' +
    '<div style="font-size:13px;color:#6b7280;">Please wait a moment</div></div>';
  document.body.appendChild(overlay);

  // Hide the print button before capture
  var printBtns = invEl.querySelectorAll('.inv-btn-print');
  printBtns.forEach(function(b) { b.style.display = 'none'; });

  // Use html2canvas to capture the invoice element
  html2canvas(invEl, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
  }).then(function(canvas) {
    var jsPDF = window.jspdf.jsPDF;

    // Calculate PDF dimensions (letter = 215.9mm x 279.4mm)
    var pageWidthMm = 215.9;
    var pageHeightMm = 279.4;
    var marginMm = 6;
    var contentWidthMm = pageWidthMm - (marginMm * 2);

    var imgWidth = canvas.width;
    var imgHeight = canvas.height;
    var ratio = contentWidthMm / imgWidth;
    var contentHeightMm = imgHeight * ratio;

    // Create PDF (may need multiple pages)
    var pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter',
    });

    var usablePageHeight = pageHeightMm - (marginMm * 2);

    if (contentHeightMm <= usablePageHeight) {
      // Fits on one page
      var imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', marginMm, marginMm, contentWidthMm, contentHeightMm);
    } else {
      // Multi-page: slice the canvas
      var pageCount = Math.ceil(contentHeightMm / usablePageHeight);
      for (var p = 0; p < pageCount; p++) {
        if (p > 0) pdf.addPage();

        // Calculate the slice of the source canvas for this page
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

    // ── Add clickable link annotations over every <a> in the invoice ──
    var allLinks = invEl.querySelectorAll('a[href]');
    var invRect = invEl.getBoundingClientRect();
    var scaleX = contentWidthMm / invEl.offsetWidth;
    var scaleY = contentHeightMm / (imgHeight / (canvas.width / invEl.offsetWidth));

    allLinks.forEach(function(link) {
      var href = link.getAttribute('href');
      if (!href || href === '#' || href.startsWith('javascript:')) return;

      var linkRect = link.getBoundingClientRect();
      var x = (linkRect.left - invRect.left) * scaleX + marginMm;
      var y = (linkRect.top - invRect.top) * scaleY + marginMm;
      var w = linkRect.width * scaleX;
      var h = linkRect.height * scaleY;

      // Determine which page this link falls on
      var linkPage = 0;
      if (contentHeightMm > usablePageHeight) {
        linkPage = Math.floor(y / usablePageHeight);
        y = y - (linkPage * usablePageHeight);
      }

      if (linkPage < pdf.getNumberOfPages()) {
        pdf.setPage(linkPage + 1);
        // Use pdf.link() to add a clickable annotation rectangle
        pdf.link(x, y, w, h, { url: href });
      }
    });

    // Set PDF metadata
    var invNum = currentNumber || 'Invoice';
    var filename = 'Invoice-' + String(invNum).trim().replace(/[^a-zA-Z0-9_-]/g, '') + '-Prestige-Serves.pdf';
    pdf.setProperties({
      title: filename.replace('.pdf', ''),
      subject: 'Invoice from Prestige Serves LLC',
      creator: 'Prestige Serves LLC',
    });

    // Download
    pdf.save(filename);

    // Restore print buttons
    printBtns.forEach(function(b) { b.style.display = ''; });

    // Remove overlay
    var ov = document.getElementById('pdf-generating-overlay');
    if (ov) ov.remove();

  }).catch(function(err) {
    console.error('PDF generation failed:', err);
    // Restore print buttons
    printBtns.forEach(function(b) { b.style.display = ''; });
    // Remove overlay
    var ov = document.getElementById('pdf-generating-overlay');
    if (ov) ov.remove();
    // Fall back to window.print()
    window.print();
  });
}

function savePDF()        { printInvoice(); }
function downloadPDF()    { printInvoice(); }
function saveInvoicePDF() { printInvoice(); }
function exportPDF()      { printInvoice(); }
