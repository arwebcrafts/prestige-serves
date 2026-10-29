function savePdfWithNewWindow(pdfDoc, filename) {
  try {
    var pdfArrayBuf = pdfDoc.output('arraybuffer');
    var pdfBytes = new Uint8Array(pdfArrayBuf);
    var pdfStr = '';
    var chunk = 8192;
    for (var i = 0; i < pdfBytes.length; i += chunk) {
      pdfStr += String.fromCharCode.apply(null, pdfBytes.subarray(i, i + chunk));
    }
    if (pdfStr.indexOf('/S /URI /URI (') !== -1) {
      pdfStr = pdfStr.replace(/\/S \/URI \/URI \(/g, '/S /URI /NewWindow true /URI (');
      var updatedBytes = new Uint8Array(pdfStr.length);
      for (var j = 0; j < pdfStr.length; j++) {
        updatedBytes[j] = pdfStr.charCodeAt(j) & 0xff;
      }
      var blob = new Blob([updatedBytes], { type: 'application/pdf' });
      var blobUrl = URL.createObjectURL(blob);
      var downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      setTimeout(function() {
        if (downloadLink.parentNode) downloadLink.parentNode.removeChild(downloadLink);
        URL.revokeObjectURL(blobUrl);
      }, 1500);
      return;
    }
  } catch (e) {
    console.warn('PDF NewWindow injection fallback to default save:', e);
  }
  pdfDoc.save(filename);
}

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
  if (status === 'paid') return 's-paid';
  if (status === 'sent') return 's-sent';
  return 's-unpaid';
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
  return v ? '<div class="field"><input readonly value="' + escapeHtml(v) + '"></div>' : '';
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
      '<td style="padding:6px;font-size:11.5px;color:var(--black);font-family:Inter,sans-serif;">' + escapeHtml(itemType) + '</td>' +
      '<td class="r">' + (li.qty || 0) + '</td>' +
      '<td class="r">' + formatUsd(Math.round((li.unit_price || 0) * 100)) + '</td>' +
      '<td class="amt r row-amt">' + formatUsd(Math.round(amt * 100)) + '</td>' +
      '</tr>';
  }).join('');

  // Resolve the payment URL ? must be absolute for PDF
  var defaultStripeUrl = 'https://buy.stripe.com/4gM4gzg8xdrR0Uxfrf6sw0n';
  var stripeTargetUrl = (inv.stripe_pay_url && inv.stripe_pay_url.trim() && inv.stripe_pay_url !== '#')
    ? ensureAbsoluteUrl(inv.stripe_pay_url)
    : defaultStripeUrl;

  // Payment block inside the dark navy Stripe box
  var payBlock;
  if (isPaid) {
    payBlock =
      '<div class="pay-info-box">' +
        '<div class="pay-info-eye">PAYMENT INFORMATION</div>' +
        '<div class="pay-info-title">Stripe Payment &middot; Secure Online Payment</div>' +
        '<div class="pay-btn-wrap">' +
          '<div style="display:inline-block;padding:9px 20px;background:#27ae60;color:#fff;font-family:Inter,sans-serif;font-size:11px;font-weight:600;letter-spacing:1.5px;border-radius:3px;text-transform:uppercase;">PAID IN FULL</div>' +
        '</div>' +
      '</div>';
  } else {
    payBlock =
      '<div class="pay-info-box">' +
        '<div class="pay-info-eye">PAYMENT INFORMATION</div>' +
        '<div class="pay-info-title">Stripe Payment &middot; Secure Online Payment</div>' +
        '<div class="pay-btn-wrap">' +
          '<a id="inv-pay-btn" href="' + escapeHtml(stripeTargetUrl) + '" target="_blank" rel="noopener noreferrer" class="inv-pay-now-btn" onclick="window.open(this.href, &quot;_blank&quot;, &quot;noopener,noreferrer&quot;); if(event){event.preventDefault();event.stopPropagation();} return false;">' +
            'PAY NOW' +
          '</a>' +
        '</div>' +
      '</div>';
  }

  // Assemble full invoice HTML
  document.getElementById('inv-display').innerHTML =
    '<div class="topbar">' +
      '<div class="logo-area">' +
        '<svg width="30" height="23" viewBox="0 0 44 34" fill="none">' +
          '<rect x="1" y="1" width="42" height="32" rx="1" stroke="#2a3a6e" stroke-width="1.6" fill="none"/>' +
          '<polyline points="1,1 22,19 43,1" stroke="#2a3a6e" stroke-width="1.6" fill="none"/>' +
          '<line x1="12" y1="20" x2="26" y2="20" stroke="#2a3a6e" stroke-width="1.7" stroke-linecap="round"/>' +
          '<polyline points="22,16 27,20 22,24" stroke="#2a3a6e" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
        '</svg>' +
        '<span class="logo-text">Prestige Serves</span>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:12px;">' +
        '<button type="button" onclick="printInvoice()" class="inv-btn-print" style="background:var(--navy);color:#fff;border:none;padding:5px 12px;font-size:10px;letter-spacing:1px;text-transform:uppercase;cursor:pointer;border-radius:2px;">Print / Save PDF</button>' +
        '<span class="inv-label-top">Invoice</span>' +
      '</div>' +
    '</div>' +

    '<div class="hero">' +
      '<div class="hero-left">' +
        '<div class="eyebrow">Licensed &amp; Bonded Process Server ? Los Angeles</div>' +
        '<div class="inv-title">Invoice.</div>' +
        '<div class="inv-subtitle">Reliable. Professional. Fast.</div>' +
      '</div>' +
      '<div class="hero-right">' +
        '<div class="meta-chips">' +
          '<span style="font-size:10px;color:var(--mid)">No.</span> ' +
          '<span style="font-family:\'EB Garamond\',serif;font-size:14px;color:var(--navy);font-weight:600;margin-right:4px;">' + escapeHtml(inv.invoice_number) + '</span> ' +
          '<span class="status-pill ' + statusClass(inv.status) + '">' + statusLabel(inv.status) + '</span>' +
        '</div>' +
        '<div class="date-row">' +
          '<div class="date-item">' +
            '<div class="date-lbl">Invoice Date</div>' +
            '<span style="font-family:\'EB Garamond\',serif;font-size:12px;color:var(--black);">' + escapeHtml((inv.invoice_date || '').slice(0, 10)) + '</span>' +
          '</div>' +
          '<div class="date-item">' +
            '<div class="date-lbl">Due Date</div>' +
            '<span style="font-family:\'EB Garamond\',serif;font-size:12px;color:var(--black);">' + escapeHtml((inv.due_date || '').slice(0, 10)) + '</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div class="upfront">' +
      '<span style="color:var(--navy);flex-shrink:0">?</span>' +
      '<span><strong>Payment Required in Full Before Service Begins.</strong> All services are prepaid in advance ? no job is scheduled or assigned without confirmed payment.</span>' +
    '</div>' +

    (inv.case_number ? '<div class="case-row"><span class="case-lbl">Case / Matter #</span> <span style="font-family:\'EB Garamond\',serif;font-size:13px;color:var(--black);">' + escapeHtml(inv.case_number) + '</span></div>' : '') +

    '<div class="bill-grid">' +
      '<div class="bill-col"><div class="sec-eye">Bill To</div>' +
        fieldLine(bill.firm) + fieldLine(bill.contact) + fieldLine(bill.street) +
        fieldLine(bill.cityStateZip) + fieldLine(bill.phone) + fieldLine(bill.email) +
      '</div>' +
      '<div class="bill-col right"><div class="sec-eye">From</div>' +
        '<div class="static-field"><span class="static-val brand">Prestige Serves LLC</span></div>' +
        '<div class="static-field"><span class="static-val">1240 S Corning St., Suite 105</span></div>' +
        '<div class="static-field"><span class="static-val">Los Angeles, CA 90035</span></div>' +
        '<div class="static-field"><span class="static-val">(424) 235-3089</span></div>' +
        '<div class="static-field"><span class="static-val">info@prestigeserves.com</span></div>' +
        '<div class="static-field"><span class="static-val">prestigeserves.com</span></div>' +
        '<div class="svc-div"></div>' +
        '<div class="sec-eye">Service Details</div>' +
        fieldLine(svc.subject) + fieldLine(svc.serviceAddress) +
        fieldLine(svc.documents) + fieldLine(svc.assignedServer) +
      '</div>' +
    '</div>' +

    '<div class="items-section">' +
      '<div class="items-eye">Services &amp; Line Items</div>' +
      '<table class="tbl"><thead><tr>' +
        '<th style="width:34%">Description</th><th style="width:23%">Service Type</th><th class="r" style="width:8%">Qty</th><th class="r" style="width:16%">Unit Price</th><th class="r" style="width:14%">Amount</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>' +
    '</div>' +

    '<div class="bottom-grid">' +
      '<div class="stripe-col">' +
        payBlock +
        '<div class="stripe-note">Payment must be received before any service is dispatched. A 3% Stripe processing fee is included in the total due and is required for payment.</div>' +
      '</div>' +
      '<div class="totals-col">' +
        '<div class="t-row"><span class="lbl">Subtotal</span><span class="val">' + formatUsd(inv.subtotal_cents) + '</span></div>' +
        '<div class="t-row"><span class="lbl">Tax / Fees</span><span class="val">' + formatUsd(inv.tax_cents) + '</span></div>' +
        (inv.stripe_fee_enabled ? '<div class="t-row"><span class="lbl">Stripe Fee (3%)</span><span class="val">' + formatUsd(inv.stripe_fee_cents) + '</span></div>' : '') +
        (inv.discount_cents ? '<div class="t-row t-row-discount" style="border-bottom:none !important;"><span class="lbl">Discount</span><span class="val">?' + formatUsd(inv.discount_cents) + '</span></div>' : '') +
        '<div class="grand-section">' +
          '<div class="grand-lbl">Total Due</div>' +
          '<div class="grand-val">' + formatUsd(inv.total_cents) + '</div>' +
          (inv.stripe_fee_enabled ? '<div class="stripe-fee-line" style="display:block">Includes required 3% Stripe processing fee.</div>' : '') +
          '<div class="grand-note">Payment required before service begins.</div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div class="notes-section">' +
      '<div class="sec-eye" style="margin-bottom:6px">Notes</div>' +
      '<div style="font-size:12px;font-family:\'EB Garamond\',serif;color:var(--black);line-height:1.6;font-style:italic;">' +
        escapeHtml(inv.notes || 'Payment is required in full before any job is scheduled or assigned. All service attempts are documented and court-ready. Questions? Call (424) 235-3089 or email info@prestigeserves.com.') +
      '</div>' +
    '</div>' +

    '<div class="inv-footer">' +
      '<div style="display:flex;align-items:center;gap:9px">' +
        '<svg width="26" height="20" viewBox="0 0 44 34" fill="none">' +
          '<rect x="1" y="1" width="42" height="32" rx="1" stroke="rgba(255,255,255,0.5)" stroke-width="1.6" fill="none"/>' +
          '<polyline points="1,1 22,19 43,1" stroke="rgba(255,255,255,0.5)" stroke-width="1.6" fill="none"/>' +
          '<line x1="12" y1="20" x2="26" y2="20" stroke="rgba(255,255,255,0.5)" stroke-width="1.7" stroke-linecap="round"/>' +
          '<polyline points="22,16 27,20 22,24" stroke="rgba(255,255,255,0.5)" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
        '</svg>' +
        '<div>' +
          '<div class="footer-brand">Prestige Serves LLC</div>' +
          '<div class="footer-tagline">Reliable. Professional. Fast.</div>' +
        '</div>' +
      '</div>' +
      '<div class="footer-right">' +
        '1240 S Corning St., Suite 105 ? Los Angeles, CA 90035<br>' +
        'info@prestigeserves.com ? (424) 235-3089<br>' +
        'prestigeserves.com ? Licensed &amp; Bonded' +
      '</div>' +
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
  var payWindow = window.open('about:blank', '_blank');
  try {
    var resp = await fetch('/api/invoices/' + encodeURIComponent(currentNumber) + '/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: currentToken }),
    });
    var data = await resp.json();
    if (data.success && data.url) {
      if (payWindow) {
        payWindow.location.href = data.url;
      } else {
        window.open(data.url, '_blank');
      }
      return;
    }
    if (payWindow) payWindow.close();
    alert(data.message || 'Could not start payment.');
  } catch (err) {
    if (payWindow) payWindow.close();
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
  var number = params.get('number') || params.get('num');
  var token  = params.get('token');
  if (number && token) {
    currentNumber = number;
    currentToken  = token;
    fetchInvoice(number, token).then(function (data) {
      if (data.success) {
        renderInvoice(data.data);
        if (params.get('pay') === '1' && data.data.status !== 'paid') {
          setTimeout(function() {
            payInvoice();
          }, 400);
        }
      }
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
    scale: 3,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
  }).then(function(canvas) {
    var jsPDF = window.jspdf.jsPDF;

    // Calculate PDF dimensions (letter = 215.9mm x 279.4mm)
    var pageWidthMm = 215.9;
    var pageHeightMm = 279.4;
    var marginMm = 0;
    var contentWidthMm = pageWidthMm;

    var imgWidth = canvas.width;
    var imgHeight = canvas.height;
    var ratio = contentWidthMm / imgWidth;
    var contentHeightMm = imgHeight * ratio;

    // Create PDF (may need multiple pages)
    var pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter',
      compress: true,
    });

    var usablePageHeight = pageHeightMm;
    var isSinglePage = false;
    var renderWidthMm = contentWidthMm;
    var renderHeightMm = contentHeightMm;
    var xOffsetMm = 0;
    var yOffsetMm = 0;

    // Single page: fill full letter page edge-to-edge (zero excessive margins)
    if (contentHeightMm <= usablePageHeight * 1.30) {
      isSinglePage = true;
      renderWidthMm = pageWidthMm;
      renderHeightMm = pageHeightMm;
      xOffsetMm = 0;
      yOffsetMm = 0;
      var imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', 0, 0, renderWidthMm, renderHeightMm, undefined, 'FAST');
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
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, imgWidth, srcH);
        ctx.drawImage(canvas, 0, srcY, imgWidth, srcH, 0, 0, imgWidth, srcH);

        var sliceData = sliceCanvas.toDataURL('image/jpeg', 0.95);
        var sliceHeightMm = srcH * ratio;
        pdf.addImage(sliceData, 'JPEG', 0, 0, pageWidthMm, sliceHeightMm, undefined, 'FAST');
      }
    }

    // ── Add clickable link annotations over every <a> in the invoice ──
    var allLinks = invEl.querySelectorAll('a[href]');
    var invRect = invEl.getBoundingClientRect();
    var invWidth = invEl.offsetWidth || invRect.width || 1;
    var invHeight = invEl.offsetHeight || invRect.height || 1;

    allLinks.forEach(function(link) {
      var href = link.href || link.getAttribute('href');
      if (!href || href === '#' || href.startsWith('javascript:')) return;
      if (link.offsetParent === null && link.style.display === 'none') return;

      var linkRect = link.getBoundingClientRect();
      if (linkRect.width === 0 || linkRect.height === 0) return;

      var x = ((linkRect.left - invRect.left) / invWidth) * renderWidthMm + xOffsetMm;
      var y = ((linkRect.top - invRect.top) / invHeight) * renderHeightMm + yOffsetMm;
      var w = (linkRect.width / invWidth) * renderWidthMm;
      var h = (linkRect.height / invHeight) * renderHeightMm;

      // Add generous clickable padding so clicking anywhere on or near the button works effortlessly
      var padX = 1.5;
      var padY = 1.5;
      x = Math.max(0, x - padX);
      y = Math.max(0, y - padY);
      w = w + (padX * 2);
      h = Math.max(6, h + (padY * 2));

      // Determine which page this link falls on
      var linkPage = 0;
      if (!isSinglePage && contentHeightMm > usablePageHeight) {
        linkPage = Math.floor(y / usablePageHeight);
        y = y - (linkPage * usablePageHeight);
      }

      if (linkPage < pdf.getNumberOfPages()) {
        pdf.setPage(linkPage + 1);
        pdf.link(x, y, w, h, { url: ensureAbsoluteUrl(href) });
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

    // Save with /NewWindow true so PDF viewers open link in new tab
    savePdfWithNewWindow(pdf, filename);

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

if (typeof window !== 'undefined') {
  window.printInvoice = printInvoice;
  window.savePDF = printInvoice;
  window.downloadPDF = printInvoice;
  window.saveInvoicePDF = printInvoice;
  window.exportPDF = printInvoice;
}
