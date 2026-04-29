// Form building and handling

/** Process-serve tiers on home/contact — expands extra intake fields */
var HOME_PROCESS_SERVE_TYPES = [
  'Standard Service — $97.99 (5–7 business days)',
  'Rush Service — $119.99 (3 business days)',
  'Priority Serve — $149.99 (2 business days)',
  'Emergency Serve — $249.99 (Same-day, approval required)'
];

/** Skip trace service types that require intake form modal */
var SKIP_TRACE_SERVICE_TYPES = [
  'Standard Skip Trace — $75',
  'Enhanced Trace — $150',
  'Rush Trace (same/next-day) — $225',
  'Business / Agent Verification — $225',
  'Court-Ready Skip Trace Report — $250'
];

/** Store skip trace form data when user fills and saves the modal */
var skipTraceFormData = null;
var skipTraceModalFilled = false;

/** Detect if service type is skip trace */
function isSkipTraceService(val) {
  return SKIP_TRACE_SERVICE_TYPES.indexOf(val) !== -1;
}

/** Show skip trace intake modal */
function openSkipTraceModal() {
  var modal = document.getElementById('skip-trace-modal');
  var body = document.getElementById('skip-trace-modal-body');
  if (!modal || !body) return;

  // Inject skip trace form HTML
  body.innerHTML = `
    <div style="background:#fff;border-radius:6px;overflow:hidden;">
      <div style="background:#f5f4f1;padding:20px 28px;border-bottom:1px solid #d5d2cc;">
        <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#2d3a7c;font-weight:500;margin-bottom:8px;">✦ Skip Trace Intake</div>
        <h2 style="font-size:28px;font-weight:300;margin:0 0 6px;letter-spacing:-.01em;">Skip Trace Request</h2>
        <p style="font-size:14px;color:#666;font-style:italic;margin:0;">FCRA permissible purpose required. Fields marked * are required.</p>
      </div>
      <div style="padding:24px 28px 28px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px;">
          <div class="field"><label style="font-size:12px;font-weight:500;letter-spacing:.04em;">Full Name <span style="color:#999">*</span></label><input type="text" id="st-fullname" placeholder="Jane Smith" style="font-family:var(--serif);font-size:15px;padding:11px 16px;border:1px solid #d5d2cc;border-radius:100px;outline:none;width:100%;box-sizing:border-box;"></div>
          <div class="field"><label style="font-size:12px;font-weight:500;letter-spacing:.04em;">Company / Firm</label><input type="text" id="st-company" placeholder="Acme Collections LLC" style="font-family:var(--serif);font-size:15px;padding:11px 16px;border:1px solid #d5d2cc;border-radius:100px;outline:none;width:100%;box-sizing:border-box;"></div>
          <div class="field"><label style="font-size:12px;font-weight:500;letter-spacing:.04em;">Email <span style="color:#999">*</span></label><input type="email" id="st-email" placeholder="jane@firm.com" style="font-family:var(--serif);font-size:15px;padding:11px 16px;border:1px solid #d5d2cc;border-radius:100px;outline:none;width:100%;box-sizing:border-box;"></div>
          <div class="field"><label style="font-size:12px;font-weight:500;letter-spacing:.04em;">Phone <span style="color:#999">*</span></label><input type="tel" id="st-phone" placeholder="(555) 000-0000" style="font-family:var(--serif);font-size:15px;padding:11px 16px;border:1px solid #d5d2cc;border-radius:100px;outline:none;width:100%;box-sizing:border-box;"></div>
          <div class="field"><label style="font-size:12px;font-weight:500;letter-spacing:.04em;">Role</label>
            <select id="st-role" style="font-family:var(--serif);font-size:15px;padding:11px 16px;border:1px solid #d5d2cc;border-radius:100px;outline:none;width:100%;box-sizing:border-box;background:#fff;">
              <option value="">Select...</option>
              <option>Attorney</option>
              <option>Process server</option>
              <option>Debt collector</option>
              <option>Bail bondsman</option>
              <option>Private investigator</option>
              <option>Insurance adjuster</option>
              <option>Other</option>
            </select>
          </div>
          <div class="field"><label style="font-size:12px;font-weight:500;letter-spacing:.04em;">State of Jurisdiction <span style="color:#999">*</span></label><input type="text" id="st-jurisdiction" placeholder="e.g. California" style="font-family:var(--serif);font-size:15px;padding:11px 16px;border:1px solid #d5d2cc;border-radius:100px;outline:none;width:100%;box-sizing:border-box;"></div>
        </div>

        <div style="border:1px solid #d5d2cc;border-radius:4px;margin-bottom:18px;overflow:hidden;">
          <div style="background:#f5f4f1;padding:12px 20px;border-bottom:1px solid #d5d2cc;font-size:12px;font-weight:500;color:#333;letter-spacing:.04em;">Subject Information</div>
          <div style="padding:20px;display:grid;grid-template-columns:1fr 1fr;gap:14px;">
            <div class="field"><label style="font-size:12px;font-weight:500;letter-spacing:.04em;">First Name <span style="color:#999">*</span></label><input type="text" id="st-first" placeholder="John" style="font-family:var(--serif);font-size:15px;padding:11px 16px;border:1px solid #d5d2cc;border-radius:100px;outline:none;width:100%;box-sizing:border-box;"></div>
            <div class="field"><label style="font-size:12px;font-weight:500;letter-spacing:.04em;">Last Name <span style="color:#999">*</span></label><input type="text" id="st-last" placeholder="Doe" style="font-family:var(--serif);font-size:15px;padding:11px 16px;border:1px solid #d5d2cc;border-radius:100px;outline:none;width:100%;box-sizing:border-box;"></div>
            <div class="field"><label style="font-size:12px;font-weight:500;letter-spacing:.04em;">Middle Name</label><input type="text" id="st-middle" placeholder="Optional" style="font-family:var(--serif);font-size:15px;padding:11px 16px;border:1px solid #d5d2cc;border-radius:100px;outline:none;width:100%;box-sizing:border-box;"></div>
            <div class="field"><label style="font-size:12px;font-weight:500;letter-spacing:.04em;">Maiden Name / Aliases</label><input type="text" id="st-aliases" placeholder="Former names, nicknames" style="font-family:var(--serif);font-size:15px;padding:11px 16px;border:1px solid #d5d2cc;border-radius:100px;outline:none;width:100%;box-sizing:border-box;"></div>
            <div class="field"><label style="font-size:12px;font-weight:500;letter-spacing:.04em;">Date of Birth <span style="color:#999">*</span></label><input type="date" id="st-dob" style="font-family:var(--serif);font-size:15px;padding:11px 16px;border:1px solid #d5d2cc;border-radius:100px;outline:none;width:100%;box-sizing:border-box;"></div>
            <div class="field"><label style="font-size:12px;font-weight:500;letter-spacing:.04em;">Last Known Phone</label><input type="tel" id="st-phone2" placeholder="(555) 000-0000" style="font-family:var(--serif);font-size:15px;padding:11px 16px;border:1px solid #d5d2cc;border-radius:100px;outline:none;width:100%;box-sizing:border-box;"></div>
            <div class="field" style="grid-column:1/-1;"><label style="font-size:12px;font-weight:500;letter-spacing:.04em;">Last Known Address <span style="color:#999">*</span></label><input type="text" id="st-address" placeholder="Street, city, state, zip" style="font-family:var(--serif);font-size:15px;padding:11px 16px;border:1px solid #d5d2cc;border-radius:100px;outline:none;width:100%;box-sizing:border-box;"></div>
            <div class="field"><label style="font-size:12px;font-weight:500;letter-spacing:.04em;">Last Known Email</label><input type="email" id="st-email2" placeholder="subject@email.com" style="font-family:var(--serif);font-size:15px;padding:11px 16px;border:1px solid #d5d2cc;border-radius:100px;outline:none;width:100%;box-sizing:border-box;"></div>
            <div class="field"><label style="font-size:12px;font-weight:500;letter-spacing:.04em;">Social Media Handles</label><input type="text" id="st-social" placeholder="@username / platform" style="font-family:var(--serif);font-size:15px;padding:11px 16px;border:1px solid #d5d2cc;border-radius:100px;outline:none;width:100%;box-sizing:border-box;"></div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px;">
          <div class="field"><label style="font-size:12px;font-weight:500;letter-spacing:.04em;">Purpose of Search <span style="color:#999">*</span></label>
            <select id="st-purpose" style="font-family:var(--serif);font-size:15px;padding:11px 16px;border:1px solid #d5d2cc;border-radius:100px;outline:none;width:100%;box-sizing:border-box;background:#fff;">
              <option value="">Select...</option>
              <option>Debt collection</option>
              <option>Legal service / process</option>
              <option>Child custody / family law</option>
              <option>Estate / probate</option>
              <option>Bail recovery</option>
              <option>Insurance investigation</option>
              <option>Background verification</option>
              <option>Other</option>
            </select>
          </div>
          <div class="field"><label style="font-size:12px;font-weight:500;letter-spacing:.04em;">Case / File Number</label><input type="text" id="st-case" placeholder="Optional reference" style="font-family:var(--serif);font-size:15px;padding:11px 16px;border:1px solid #d5d2cc;border-radius:100px;outline:none;width:100%;box-sizing:border-box;"></div>
          <div class="field"><label style="font-size:12px;font-weight:500;letter-spacing:.04em;">Court / Jurisdiction</label><input type="text" id="st-court" placeholder="Required for court-ready reports" style="font-family:var(--serif);font-size:15px;padding:11px 16px;border:1px solid #d5d2cc;border-radius:100px;outline:none;width:100%;box-sizing:border-box;"></div>
          <div class="field"><label style="font-size:12px;font-weight:500;letter-spacing:.04em;">Deadline <span style="color:#999">*</span></label><input type="date" id="st-deadline" style="font-family:var(--serif);font-size:15px;padding:11px 16px;border:1px solid #d5d2cc;border-radius:100px;outline:none;width:100%;box-sizing:border-box;"></div>
          <div class="field" style="grid-column:1/-1;"><label style="font-size:12px;font-weight:500;letter-spacing:.04em;">Additional Notes / Known Information</label>
            <textarea id="st-notes" placeholder="Known relatives, employers, vehicles, frequented locations, prior addresses..." style="font-family:var(--serif);font-size:15px;padding:12px 16px;border:1px solid #d5d2cc;border-radius:10px;outline:none;width:100%;box-sizing:border-box;min-height:72px;resize:vertical;"></textarea>
          </div>
        </div>

        <div style="border:1px solid #d5d2cc;border-radius:4px;padding:16px 20px;margin-bottom:18px;background:#f9f9f9;">
          <label style="font-size:13px;color:#333;line-height:1.6;display:flex;align-items:flex-start;gap:10px;cursor:pointer;">
            <input type="checkbox" id="st-fcra" style="margin-top:2px;accent-color:#2d3a7c;">
            <span>I certify that I have a permissible purpose under the Fair Credit Reporting Act (FCRA) for this request and am authorized to request this information.</span>
          </label>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:16px;border-top:1px solid #d5d2cc;">
          <p style="font-size:12px;color:#888;font-style:italic;max-width:380px;line-height:1.6;margin:0;">By saving, you confirm all FCRA certifications above. Skip trace form must be completed before submitting.</p>
          <div style="display:flex;gap:10px;">
            <button type="button" onclick="closeSkipTraceModal()" style="font-family:var(--serif);font-size:13px;color:#666;background:none;border:1.5px solid #d5d2cc;border-radius:100px;padding:11px 22px;cursor:pointer;letter-spacing:.03em;">Cancel</button>
            <button type="button" onclick="saveSkipTraceForm()" style="font-family:var(--serif);font-size:14px;font-weight:400;background:#2d3a7c;color:#fff;border:none;border-radius:100px;padding:13px 28px;cursor:pointer;letter-spacing:.04em;white-space:nowrap;">Save & Continue</button>
          </div>
        </div>
      </div>
    </div>
  `;
  modal.style.display = 'flex';
  skipTraceModalFilled = false;
}

function closeSkipTraceModal() {
  var modal = document.getElementById('skip-trace-modal');
  if (modal) modal.style.display = 'none';
}

function saveSkipTraceForm() {
  var fullname = document.getElementById('st-fullname').value.trim();
  var email = document.getElementById('st-email').value.trim();
  var phone = document.getElementById('st-phone').value.trim();
  var jurisdiction = document.getElementById('st-jurisdiction').value.trim();
  var first = document.getElementById('st-first').value.trim();
  var last = document.getElementById('st-last').value.trim();
  var dob = document.getElementById('st-dob').value.trim();
  var address = document.getElementById('st-address').value.trim();
  var purpose = document.getElementById('st-purpose').value.trim();
  var deadline = document.getElementById('st-deadline').value.trim();
  var fcra = document.getElementById('st-fcra').checked;

  if (!fullname || !email || !phone || !jurisdiction || !first || !last || !dob || !address || !purpose || !deadline) {
    alert('Please fill in all required fields.');
    return;
  }
  if (!fcra) {
    alert('Please check the FCRA certification checkbox.');
    return;
  }

  console.log('[DEBUG saveSkipTraceForm] All required fields validated');
  console.log('[DEBUG saveSkipTraceForm] fullname:', fullname, 'first:', first, 'last:', last);

  skipTraceFormData = {
    fullname: fullname,
    company: document.getElementById('st-company').value.trim(),
    email: email,
    phone: phone,
    role: document.getElementById('st-role').value,
    jurisdiction: jurisdiction,
    firstName: first,
    lastName: last,
    middleName: document.getElementById('st-middle').value.trim(),
    aliases: document.getElementById('st-aliases').value.trim(),
    dob: dob,
    lastPhone: document.getElementById('st-phone2').value.trim(),
    lastAddress: address,
    lastEmail: document.getElementById('st-email2').value.trim(),
    social: document.getElementById('st-social').value.trim(),
    purpose: purpose,
    caseNumber: document.getElementById('st-case').value.trim(),
    court: document.getElementById('st-court').value.trim(),
    deadline: deadline,
    notes: document.getElementById('st-notes').value.trim(),
    fcraCertified: true
  };
  skipTraceModalFilled = true;
  closeSkipTraceModal();
  // Show toast to confirm saved
  var toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = 'Skip trace details saved. You may now submit the form.';
    toast.className = 'toast show ok';
    setTimeout(function() { toast.classList.remove('show'); }, 3500);
  }
}

function initHomeSkipTraceSection() {
  var sel = document.querySelector('#home-form-container select[name="serviceType"]');
  if (!sel) return;
  sel.addEventListener('change', function() {
    if (isSkipTraceService(sel.value)) {
      openSkipTraceModal();
    } else {
      // Reset skip trace data if user switches away from skip trace service
      if (skipTraceModalFilled) {
        skipTraceFormData = null;
        skipTraceModalFilled = false;
      }
    }
  });
}

function tomorrowDateInputMinLocal() {
  var d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function applyDeadlineFutureMin(inputEl) {
  if (!inputEl || inputEl.type !== 'date') return;
  inputEl.min = tomorrowDateInputMinLocal();
}

/** Deadline / scheduling fields only: mark inputs with data-min-tomorrow (not DOB / birthdates). */
function initFutureDeadlineDateInputs(root) {
  var base = root || document;
  base.querySelectorAll('input[type="date"][data-min-tomorrow]').forEach(function (el) {
    applyDeadlineFutureMin(el);
  });
}

function toggleHomeMultiDefTextarea() {
  var yes = document.querySelector('#home-form-container input[name="home_multiple_defendants"][value="yes"]');
  var ta = document.getElementById('home-additional-defendants');
  if (!ta) return;
  ta.style.display = yes && yes.checked ? 'block' : 'none';
}

function syncHomeProcessServeSection() {
  var wrap = document.getElementById('home-process-extra');
  var sel = document.querySelector('#home-form-container select[name="serviceType"]');
  if (!wrap || !sel) return;
  var show = HOME_PROCESS_SERVE_TYPES.indexOf(sel.value) !== -1;
  wrap.style.display = show ? 'block' : 'none';
  wrap.querySelectorAll('[data-home-required]').forEach(function (el) {
    if (show) el.setAttribute('required', 'required');
    else el.removeAttribute('required');
  });
  if (!show) {
    var dd = document.getElementById('home-deadlineDate');
    if (dd) dd.value = '';
  } else {
    initFutureDeadlineDateInputs(wrap);
  }
}

function initHomeProcessServeSection() {
  var sel = document.querySelector('#home-form-container select[name="serviceType"]');
  if (!sel) return;
  sel.addEventListener('change', syncHomeProcessServeSection);
  syncHomeProcessServeSection();
  var hc = document.getElementById('home-form-container');
  if (hc) initFutureDeadlineDateInputs(hc);
}

function initHomeFileUploadPreview() {
  var fileInput = document.getElementById('home-file-input');
  var fileList = document.getElementById('home-file-list');
  var uploadText = document.getElementById('home-file-upload-text');
  if (!fileInput || !fileList) return;
  fileInput.addEventListener('change', function () {
    var files = Array.from(fileInput.files);
    if (files.length === 0) {
      fileList.innerHTML = '';
      if (uploadText) uploadText.textContent = '+ Add a File';
      return;
    }
    var html = '<div style="display:flex;flex-wrap:wrap;gap:8px;">';
    files.forEach(function (file) {
      html += '<span style="background:#e8f0fe;padding:6px 12px;border-radius:4px;font-size:12px;">' + file.name + '</span>';
    });
    html += '</div>';
    fileList.innerHTML = html;
    if (uploadText) uploadText.textContent = files.length === 1 ? '1 file selected' : files.length + ' files selected';
  });
}

function validateHomeProcessServeFields(form) {
  var ok = true;
  function mark(el, bad) {
    if (!el) return;
    el.style.border = bad ? '2px solid #e74c3c' : '';
    if (bad) ok = false;
  }
  var a1 = form.querySelector('[name="serve_addressLine1"]');
  mark(a1, !(a1 && a1.value.trim()));
  var cv = document.getElementById('home-svc-city-value');
  mark(document.getElementById('home-svc-city-input'), !(cv && cv.value.trim()));
  var sv = document.getElementById('home-svc-state-value');
  mark(document.getElementById('home-svc-state-input'), !(sv && sv.value.trim()));
  var zp = form.querySelector('[name="serve_zip"]');
  mark(zp, !(zp && zp.value.trim()));
  var defn = form.querySelector('[name="defendantName"]');
  mark(defn, !(defn && defn.value.trim()));
  var fi = document.getElementById('home-file-input');
  mark(fi, !(fi && fi.files && fi.files.length));
  var dd = document.getElementById('home-deadlineDate');
  if (dd && dd.value && dd.min && dd.value < dd.min) {
    mark(dd, true);
    alert('Please choose a deadline date in the future.');
  }
  return ok;
}

function submitHomeProcessServe(form, successId) {
  var fd = new FormData();
  var fnEl = form.querySelector('[name="firstName"]');
  var lnEl = form.querySelector('[name="lastName"]');
  var coEl = form.querySelector('[name="company"]');
  var firstName = fnEl ? fnEl.value.trim() : '';
  var lastName = lnEl ? lnEl.value.trim() : '';
  var company = coEl ? coEl.value.trim() : '';
  fd.append('clientName', company || (firstName + ' ' + lastName).trim());
  fd.append('contactName', (firstName + ' ' + lastName).trim());
  fd.append('email', (function () {
    var e = form.querySelector('[name="email"]');
    return e ? e.value.trim() : '';
  })());
  fd.append('phone', (function () {
    var p = form.querySelector('[name="phone"]');
    return p ? p.value.trim() : '';
  })());
  fd.append('addressLine1', (function () {
    var el = form.querySelector('[name="serve_addressLine1"]');
    return el ? el.value.trim() : '';
  })());
  fd.append('addressLine2', (function () {
    var el = form.querySelector('[name="serve_addressLine2"]');
    return el ? el.value.trim() : '';
  })());
  var cvel = document.getElementById('home-svc-city-value');
  var svel = document.getElementById('home-svc-state-value');
  fd.append('city', cvel ? cvel.value.trim() : '');
  fd.append('state', svel ? svel.value.trim() : '');
  fd.append('zip', (function () {
    var el = form.querySelector('[name="serve_zip"]');
    return el ? el.value.trim() : '';
  })());
  fd.append('defendantName', (function () {
    var el = form.querySelector('[name="defendantName"]');
    return el ? el.value.trim() : '';
  })());
  fd.append('caseNumber', (function () {
    var el = form.querySelector('[name="caseNumber"]');
    return el ? el.value.trim() : '';
  })());
  fd.append('courtJurisdiction', (function () {
    var el = form.querySelector('[name="courtJurisdiction"]');
    return el ? el.value.trim() : '';
  })());
  var multiYes = document.querySelector('#home-form-container input[name="home_multiple_defendants"][value="yes"]');
  fd.append('multiple_defendants', multiYes && multiYes.checked ? 'true' : 'false');
  var addEl = document.getElementById('home-additional-defendants');
  var extraLines = addEl ? addEl.value : '';
  var defExtra = [];
  if (multiYes && multiYes.checked && extraLines.trim()) {
    extraLines.split('\n').forEach(function (line) {
      var t = line.trim();
      if (t) defExtra.push({ fullName: t });
    });
  }
  fd.append('defendantsData', JSON.stringify(defExtra));
  fd.append('serviceType', (function () {
    var el = form.querySelector('[name="serviceType"]');
    return el ? el.value.trim() : '';
  })());
  var dl = document.getElementById('home-deadlineDate');
  fd.append('deadlineDate', dl && dl.value ? dl.value : '');
  var reasonEl = document.getElementById('reason-value');
  var reason = reasonEl ? reasonEl.value : '';
  var caseDetailsEl = form.querySelector('[name="caseDetails"]');
  var caseDetails = caseDetailsEl ? caseDetailsEl.value.trim() : '';
  var specialEl = form.querySelector('[name="home_specialInstructions"]');
  var special = specialEl ? specialEl.value.trim() : '';
  var merged = '';
  if (reason) merged += 'Reason for contact: ' + reason + '\n\n';
  merged += 'Brief case details:\n' + caseDetails;
  if (special) merged += '\n\nSpecial instructions:\n' + special;
  fd.append('specialInstructions', merged);

  var fileInput = document.getElementById('home-file-input');
  if (fileInput && fileInput.files.length) {
    for (var i = 0; i < fileInput.files.length; i++) {
      fd.append('files', fileInput.files[i]);
    }
  }

  fetch('/api/request', { method: 'POST', body: fd })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (!data.success) {
        alert(data.message || 'Could not submit request. Please try again.');
        return;
      }
      var el = document.getElementById(successId);
      if (el) el.classList.add('show');
      var stripeLinks = {
        'Standard Service — $97.99 (5–7 business days)': 'https://buy.stripe.com/8x24gz7C11J9dHj3Ix6sw04',
        'Rush Service — $119.99 (3 business days)': 'https://buy.stripe.com/6oU6oH2hHevV1YB4MB6sw09',
        'Priority Serve — $149.99 (2 business days)': 'https://buy.stripe.com/bJeaEX09z3RhgTvcf36sw02',
        'Emergency Serve — $249.99 (Same-day, approval required)': 'https://buy.stripe.com/00w4gz1dD1J9fPr0wl6sw03'
      };
      var st = (form.querySelector('[name="serviceType"]') || {}).value || '';
      if (stripeLinks[st]) {
        setTimeout(function () { window.location.href = stripeLinks[st]; }, 1500);
      }
      form.reset();
      syncHomeProcessServeSection();
      var hc = document.getElementById('home-form-container');
      if (hc) initFutureDeadlineDateInputs(hc);
      var fl = document.getElementById('home-file-list');
      var ut = document.getElementById('home-file-upload-text');
      if (fl) fl.innerHTML = '';
      if (ut) ut.textContent = '+ Add a File';
      toggleHomeMultiDefTextarea();
    })
    .catch(function (err) {
      console.error('Home process serve submit error:', err);
      alert('Submission failed. Please try again.');
    });
}

function buildContactForm(containerId, formId) {
  const c = document.getElementById(containerId);
  if (!c) return;
  const homeProcessExtra = formId === 'home' ? `
    <div id="home-process-extra" class="home-process-extra" style="display:none;">
      <p class="form-hint" style="margin:12px 0 16px;font-style:italic;">Complete process serving details below.</p>
      <div class="form-group">
        <label>Service Address <span class="req">(required)</span></label>
        <input type="text" name="serve_addressLine1" data-home-required placeholder="Address Line 1" style="margin-bottom:8px;">
        <input type="text" name="serve_addressLine2" placeholder="Address Line 2" style="margin-bottom:8px;">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
          <div class="city-select-wrapper">
            <input type="text" id="home-svc-city-input" placeholder="City" autocomplete="off">
            <input type="hidden" id="home-svc-city-value" value="">
            <div class="city-dropdown" id="home-svc-city-dropdown"></div>
          </div>
          <div class="state-select-wrapper">
            <input type="text" id="home-svc-state-input" placeholder="State" autocomplete="off">
            <input type="hidden" id="home-svc-state-value" value="CA">
            <div class="state-dropdown" id="home-svc-state-dropdown"></div>
          </div>
          <input type="text" name="serve_zip" data-home-required placeholder="ZIP">
        </div>
      </div>
      <div class="form-group"><label>Defendant / Recipient Full Name <span class="req">(required)</span></label><input type="text" name="defendantName" data-home-required></div>
      <div class="form-group"><label>Case Number</label><input type="text" name="caseNumber"></div>
      <div class="form-group"><label>Court / Jurisdiction</label><input type="text" name="courtJurisdiction"></div>
      <div class="form-group">
        <label>Are there multiple defendants to be served?</label>
        <div class="form-hint" style="margin-bottom:10px;">Selecting &quot;Yes&quot; allows you to list additional names below (one per line).</div>
        <div class="radio-toggle-group">
          <label class="radio-toggle"><input type="radio" name="home_multiple_defendants" value="yes" onchange="toggleHomeMultiDefTextarea()"><span>Yes</span></label>
          <label class="radio-toggle"><input type="radio" name="home_multiple_defendants" value="no" checked onchange="toggleHomeMultiDefTextarea()"><span>No</span></label>
        </div>
        <textarea id="home-additional-defendants" name="home_additional_defendants" rows="3" placeholder="Additional defendant names, one per line" style="display:none;margin-top:10px;width:100%;box-sizing:border-box;"></textarea>
      </div>
      <div class="form-group">
        <label>Deadline Date</label>
        <input type="date" name="deadlineDate" id="home-deadlineDate" data-min-tomorrow>
      </div>
      <div class="form-group">
        <label>File Upload <span class="req">(required)</span></label>
        <div class="form-hint" style="margin-bottom:8px;">Upload all documents to be served (PDF preferred). Multiple files accepted.</div>
        <div class="file-upload-area" onclick="this.querySelector('input').click()">
          <input type="file" id="home-file-input" name="files" style="display:none;" multiple accept=".pdf,.doc,.docx" data-home-required>
          <span id="home-file-upload-text">+ Add a File</span>
        </div>
        <div id="home-file-list" style="margin-top:8px;font-size:13px;color:#333;"></div>
      </div>
      <div class="form-group"><label>Special Instructions</label><textarea name="home_specialInstructions" rows="3"></textarea></div>
    </div>` : '';
  c.innerHTML = `
    <form onsubmit="handleFormSubmit(event, '${formId}-success', 'contact')">
    <div class="form-row">
      <div class="form-group"><label>First Name <span class="req">(required)</span></label><input type="text" name="firstName" required></div>
      <div class="form-group"><label>Last Name <span class="req">(required)</span></label><input type="text" name="lastName" required></div>
    </div>
    <div class="form-group"><label>Firm / Company Name <span class="req">(required)</span></label><input type="text" name="company" required></div>
    <div class="form-group"><label>Email <span class="req">(required)</span></label><input type="email" name="email" required></div>
    <div class="form-group"><label>Phone <span class="req">(required)</span></label><input type="tel" name="phone" required></div>
    <div class="form-group">
      <label>Reason for Contact <span class="req">(required)</span></label>
      <div class="reason-select-wrapper">
        <input type="text" id="reason-input" placeholder="Select an option..." autocomplete="off" required>
        <input type="hidden" id="reason-value" name="reason" value="">
        <div class="reason-dropdown" id="reason-dropdown"></div>
      </div>
    </div>
     <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
    <div class="form-group">
      <label>City <span class="req">(required)</span></label>
      <div class="city-select-wrapper">
        <input type="text" id="city-input" placeholder="City" autocomplete="off" required>
        <input type="hidden" id="city-value" name="city" value="">
        <div class="city-dropdown" id="city-dropdown"></div>
      </div>
    </div>
    <div class="form-group">
      <label>State <span class="req">(required)</span></label>
      <div class="state-select-wrapper">
        <input type="text" id="state-input" placeholder="State" autocomplete="off" required>
        <input type="hidden" id="state-value" name="state" value="CA">
        <div class="state-dropdown" id="state-dropdown"></div>
      </div>
    </div>
       </div>
    <div class="form-group">
      <label>Brief Case Details <span class="req">(required)</span></label>
      <div class="form-hint" style="margin-bottom:8px;">Please include service type, deadlines, number of parties, and any known address information.</div>
      <textarea name="caseDetails" rows="3" required></textarea>
    </div>
    <div class="form-group">
      <label>Service Type <span class="req">(required)</span></label>
      <select name="serviceType" required><option value="">Select an option</option><option>Standard Service — $97.99 (5–7 business days)</option><option>Rush Service — $119.99 (3 business days)</option><option>Priority Serve — $149.99 (2 business days)</option><option>Emergency Serve — $249.99 (Same-day, approval required)</option><option>Standard Skip Trace — $75</option><option>Enhanced Trace — $150</option><option>Rush Trace (same/next-day) — $225</option><option>Business / Agent Verification — $225</option><option>Court-Ready Skip Trace Report — $250</option></select>
    </div>
    ${homeProcessExtra}
    <div class="form-checkbox">
      <input type="checkbox" id="${formId}-consent" name="consent" required>
      <label for="${formId}-consent">I understand that submitting this form does not guarantee service and all requests are subject to review and availability.</label>
    </div>
    <button type="submit" class="btn-navy">Submit</button>
    <div class="form-success" id="${formId}-success">Thank you! We'll be in touch shortly.</div>
    </form>
  `;
}

function handleFormSubmit(event, id, formType) {
  event.preventDefault();
  const form = event.target;
  const requiredFields = form.querySelectorAll('[required]');
  let allFilled = true;
  requiredFields.forEach(function(field) {
    if (!field.value.trim()) {
      allFilled = false;
      field.style.border = '2px solid #e74c3c';
    } else {
      field.style.border = '';
    }
  });
  const consent = form.querySelector('input[type="checkbox"][required]');
  if (consent && !consent.checked) {
    allFilled = false;
    consent.style.outline = '2px solid #e74c3c';
  } else if (consent) {
    consent.style.outline = '';
  }
  if (allFilled) {
    if (formType === 'contact') {
      const serviceTypeVal = form.querySelector('[name="serviceType"]')?.value || '';
      console.log('[DEBUG] serviceTypeVal:', serviceTypeVal);
      console.log('[DEBUG] skipTraceModalFilled:', skipTraceModalFilled);
      console.log('[DEBUG] skipTraceFormData:', skipTraceFormData);
      const isHomeProcess =
        Boolean(form.closest('#home-form-container')) &&
        HOME_PROCESS_SERVE_TYPES.indexOf(serviceTypeVal) !== -1;
      if (isHomeProcess) {
        if (!validateHomeProcessServeFields(form)) return;
        submitHomeProcessServe(form, id);
        return;
      }
      /* Skip trace service types require intake form to be filled first */
      const isSkipTrace = isSkipTraceService(serviceTypeVal);
      console.log('[DEBUG] isSkipTrace:', isSkipTrace);
      if (isSkipTrace && !skipTraceModalFilled) {
        alert('Please complete the Skip Trace Intake form before submitting. Select a skip trace service to open the form.');
        openSkipTraceModal();
        return;
      }
      const formData = {
        firstName: form.querySelector('[name="firstName"]')?.value || '',
        lastName: form.querySelector('[name="lastName"]')?.value || '',
        company: form.querySelector('[name="company"]')?.value || '',
        email: form.querySelector('[name="email"]')?.value || '',
        phone: form.querySelector('[name="phone"]')?.value || '',
        reason: document.getElementById('reason-value')?.value || '',
        city: document.getElementById('city-value')?.value || '',
        state: document.getElementById('state-value')?.value || '',
        caseDetails: form.querySelector('[name="caseDetails"]')?.value || '',
        serviceType: form.querySelector('[name="serviceType"]')?.value || '',
        consent: form.querySelector('[name="consent"]')?.checked || false,
        skipTraceData: skipTraceFormData
      };
      console.log('[DEBUG] formData being sent:', JSON.stringify(formData, null, 2));
      fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      .then(function(res) {
        console.log('[DEBUG] API response status:', res.status);
        return res.json();
      })
      .then(function(data) {
        console.log('[DEBUG] API response data:', data);
        if (data.success) {
          showToast && showToast('Request submitted successfully!', 'ok');
        }
      })
      .catch(err => console.error('Form submission error:', err));
    }
    const el = document.getElementById(id);
    if (el) el.classList.add('show');
    // Stripe redirect for contact form
    const stripeLinks = {
      'Standard Service — $97.99 (5–7 business days)': 'https://buy.stripe.com/8x24gz7C11J9dHj3Ix6sw04',
      'Rush Service — $119.99 (3 business days)': 'https://buy.stripe.com/6oU6oH2hHevV1YB4MB6sw09',
      'Priority Serve — $149.99 (2 business days)': 'https://buy.stripe.com/bJeaEX09z3RhgTvcf36sw02',
      'Emergency Serve — $249.99 (Same-day, approval required)': 'https://buy.stripe.com/00w4gz1dD1J9fPr0wl6sw03',
      'Standard Skip Trace — $75': 'https://buy.stripe.com/00w00j3lL9bBfPr5QF6sw08',
      'Enhanced Trace — $150': 'https://buy.stripe.com/8x24gz7C11J9dHj3Ix6sw04',
      'Rush Trace (same/next-day) — $225': 'https://buy.stripe.com/9B64gze0pafFcDf0wl6sw06',
      'Business / Agent Verification — $225': 'https://buy.stripe.com/9B64gze0pafFcDf0wl6sw06',
      'Court-Ready Skip Trace Report — $250': 'https://buy.stripe.com/cNieVd1dD87xcDfenb6sw0a'
    };
    const serviceTypeVal = form.querySelector('[name="serviceType"]')?.value || '';
    // TEMP DISABLED FOR DEBUG: if (stripeLinks[serviceTypeVal]) { setTimeout(() => { window.location.href = stripeLinks[serviceTypeVal]; }, 1500); }
    form.reset();
    if (isSkipTraceService(serviceTypeVal)) {
      skipTraceFormData = null;
      skipTraceModalFilled = false;
    }
  }
}

function handleRequestSubmit(event) {
  event.preventDefault();
  const form = event.target;
  let allFilled = true;
  let firstEmptyField = null;

  // Check standard required fields
  const requiredFields = form.querySelectorAll('[required]');
  requiredFields.forEach(function(field) {
    if (!field.value.trim()) {
      allFilled = false;
      field.style.border = '2px solid #e74c3c';
      if (!firstEmptyField) firstEmptyField = field;
    } else {
      field.style.border = '';
    }
  });

  // Check city dropdown (hidden input value)
  const cityValue = document.getElementById('req-city-value')?.value;
  if (!cityValue) {
    allFilled = false;
    document.getElementById('req-city-input').style.border = '2px solid #e74c3c';
    if (!firstEmptyField) firstEmptyField = document.getElementById('req-city-input');
  } else {
    document.getElementById('req-city-input').style.border = '';
  }

  // Check state dropdown (hidden input value)
  const stateValue = document.getElementById('req-state-value')?.value;
  if (!stateValue) {
    allFilled = false;
    document.getElementById('req-state-input').style.border = '2px solid #e74c3c';
    if (!firstEmptyField) firstEmptyField = document.getElementById('req-state-input');
  } else {
    document.getElementById('req-state-input').style.border = '';
  }

  if (!allFilled) {
    alert('Please fill in all required fields.');
    if (firstEmptyField) firstEmptyField.focus();
    return;
  }

  // Use FormData for multipart submission with files
  const formData = new FormData(form);
  formData.set('city', cityValue || '');
  formData.set('state', stateValue || '');
  formData.set('multiple_defendants', form.querySelector('input[name="multiple_defendants"][value="yes"]')?.checked ? 'true' : 'false');
  
  if (defendantsArray.length > 0) {
    formData.set('defendantsData', JSON.stringify(defendantsArray));
  }

  fetch('/api/request', {
    method: 'POST',
    body: formData
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      const serviceType = form.querySelector('[name="serviceType"]')?.value || '';
      const stripeLinks = {
        'Standard Service — $97.99 (5–7 business days)': 'https://buy.stripe.com/8x24gz7C11J9dHj3Ix6sw04',
        'Rush Service — $119.99 (3 business days)': 'https://buy.stripe.com/6oU6oH2hHevV1YB4MB6sw09',
        'Priority Serve — $149.99 (2 business days)': 'https://buy.stripe.com/bJeaEX09z3RhgTvcf36sw02',
        'Emergency Serve — $249.99 (Same-day, approval required)': 'https://buy.stripe.com/00w4gz1dD1J9fPr0wl6sw03',
        'Standard Skip Trace — $75': 'https://buy.stripe.com/00w00j3lL9bBfPr5QF6sw08',
        'Enhanced Trace — $150': 'https://buy.stripe.com/8x24gz7C11J9dHj3Ix6sw04',
        'Rush Trace (same/next-day) — $225': 'https://buy.stripe.com/9B64gze0pafFcDf0wl6sw06',
        'Business / Agent Verification — $225': 'https://buy.stripe.com/9B64gze0pafFcDf0wl6sw06',
        'Court-Ready Skip Trace Report — $250': 'https://buy.stripe.com/cNieVd1dD87xcDfenb6sw0a'
      };
      document.getElementById('req-success').classList.add('show');
      if (stripeLinks[serviceType]) {
        setTimeout(() => { window.location.href = stripeLinks[serviceType]; }, 1500);
      }
      form.reset();
      defendantsArray = [];
      renderDefendantsList();
      document.getElementById('defendants-list-container').style.display = 'none';
      document.getElementById('btn-add-defendant').style.display = 'none';
      document.querySelector('input[name="multiple_defendants"][value="no"]').checked = true;
      document.getElementById('file-list').innerHTML = '';
      const uploadText = document.getElementById('file-upload-text');
      if (uploadText) uploadText.textContent = '+ Add a File';
    }
  })
  .catch(err => console.error('Request submission error:', err));
}

// State autocomplete
const states = [
  {value:'AL',label:'Alabama',postal:'AL'},
  {value:'AK',label:'Alaska',postal:'AK'},
  {value:'AZ',label:'Arizona',postal:'AZ'},
  {value:'AR',label:'Arkansas',postal:'AR'},
  {value:'CA',label:'California',postal:'CA'},
  {value:'CO',label:'Colorado',postal:'CO'},
  {value:'CT',label:'Connecticut',postal:'CT'},
  {value:'DE',label:'Delaware',postal:'DE'},
  {value:'FL',label:'Florida',postal:'FL'},
  {value:'GA',label:'Georgia',postal:'GA'},
  {value:'HI',label:'Hawaii',postal:'HI'},
  {value:'ID',label:'Idaho',postal:'ID'},
  {value:'IL',label:'Illinois',postal:'IL'},
  {value:'IN',label:'Indiana',postal:'IN'},
  {value:'IA',label:'Iowa',postal:'IA'},
  {value:'KS',label:'Kansas',postal:'KS'},
  {value:'KY',label:'Kentucky',postal:'KY'},
  {value:'LA',label:'Louisiana',postal:'LA'},
  {value:'ME',label:'Maine',postal:'ME'},
  {value:'MD',label:'Maryland',postal:'MD'},
  {value:'MA',label:'Massachusetts',postal:'MA'},
  {value:'MI',label:'Michigan',postal:'MI'},
  {value:'MN',label:'Minnesota',postal:'MN'},
  {value:'MS',label:'Mississippi',postal:'MS'},
  {value:'MO',label:'Missouri',postal:'MO'},
  {value:'MT',label:'Montana',postal:'MT'},
  {value:'NE',label:'Nebraska',postal:'NE'},
  {value:'NV',label:'Nevada',postal:'NV'},
  {value:'NH',label:'New Hampshire',postal:'NH'},
  {value:'NJ',label:'New Jersey',postal:'NJ'},
  {value:'NM',label:'New Mexico',postal:'NM'},
  {value:'NY',label:'New York',postal:'NY'},
  {value:'NC',label:'North Carolina',postal:'NC'},
  {value:'ND',label:'North Dakota',postal:'ND'},
  {value:'OH',label:'Ohio',postal:'OH'},
  {value:'OK',label:'Oklahoma',postal:'OK'},
  {value:'OR',label:'Oregon',postal:'OR'},
  {value:'PA',label:'Pennsylvania',postal:'PA'},
  {value:'RI',label:'Rhode Island',postal:'RI'},
  {value:'SC',label:'South Carolina',postal:'SC'},
  {value:'SD',label:'South Dakota',postal:'SD'},
  {value:'TN',label:'Tennessee',postal:'TN'},
  {value:'TX',label:'Texas',postal:'TX'},
  {value:'UT',label:'Utah',postal:'UT'},
  {value:'VT',label:'Vermont',postal:'VT'},
  {value:'VA',label:'Virginia',postal:'VA'},
  {value:'WA',label:'Washington',postal:'WA'},
  {value:'WV',label:'West Virginia',postal:'WV'},
  {value:'WI',label:'Wisconsin',postal:'WI'},
  {value:'WY',label:'Wyoming',postal:'WY'}
];

function initStateAutocomplete(inputId, hiddenInputId, dropdownId, defaultState) {
  const input = document.getElementById(inputId);
  const hiddenInput = document.getElementById(hiddenInputId);
  const dropdown = document.getElementById(dropdownId);
  if (!input || !dropdown) return;

  if (defaultState) {
    const state = states.find(s => s.value === defaultState || s.postal === defaultState);
    if (state) {
      input.value = state.label + ' (' + state.postal + ')';
      hiddenInput.value = state.value;
    }
  }

  function renderDropdown(filter) {
    const filterLower = filter.toLowerCase().trim();
    const filtered = states.filter(s => 
      s.label.toLowerCase().includes(filterLower) || 
      s.postal.toLowerCase() === filterLower ||
      s.postal.toLowerCase().startsWith(filterLower)
    );
    dropdown.innerHTML = filtered.map(s =>
      '<div class="state-option' + (s.value === hiddenInput.value ? ' selected' : '') + '" data-value="' + s.value + '">' + s.label + ' (' + s.postal + ')</div>'
    ).join('');
    dropdown.style.display = filtered.length ? 'block' : 'none';
  }

  input.addEventListener('input', function() {
    hiddenInput.value = '';
    renderDropdown(this.value);
  });

  input.addEventListener('focus', function() {
    renderDropdown(this.value);
  });

  dropdown.addEventListener('click', function(e) {
    if (e.target.classList.contains('state-option')) {
      const state = states.find(s => s.value === e.target.dataset.value);
      input.value = state.label + ' (' + state.postal + ')';
      hiddenInput.value = state.value;
      dropdown.style.display = 'none';
    }
  });

  document.addEventListener('click', function(e) {
    if (!e.target.closest('.state-select-wrapper')) {
      dropdown.style.display = 'none';
    }
  });
}

// Reason dropdown
const reasonOptions = [
  'Process Serving',
  'Concierge',
  'eFiling',
  'eRecording',
  'Nationwide',
  'Skip Tracing',
  'All Services',
  'Legal Courier',
  'General Inquiry'
];

function initReasonDropdown() {
  const input = document.getElementById('reason-input');
  const hiddenInput = document.getElementById('reason-value');
  const dropdown = document.getElementById('reason-dropdown');
  if (!input || !dropdown) return;

  function renderDropdown(filter) {
    const filterLower = filter.toLowerCase().trim();
    const filtered = reasonOptions.filter(r =>
      r.toLowerCase().includes(filterLower)
    );
    dropdown.innerHTML = filtered.map(r =>
      '<div class="reason-option' + (r === hiddenInput.value ? ' selected' : '') + '">' + r + '</div>'
    ).join('');
    dropdown.style.display = filtered.length ? 'block' : 'none';
  }

  input.addEventListener('input', function() {
    hiddenInput.value = '';
    renderDropdown(this.value);
  });

  input.addEventListener('focus', function() {
    renderDropdown(this.value);
  });

  dropdown.addEventListener('click', function(e) {
    if (e.target.classList.contains('reason-option')) {
      input.value = e.target.textContent;
      hiddenInput.value = e.target.textContent;
      dropdown.style.display = 'none';
    }
  });

  document.addEventListener('click', function(e) {
    if (!e.target.closest('.reason-select-wrapper')) {
      dropdown.style.display = 'none';
    }
  });
}

// Cities by state
const citiesByState = {
  'AL': ['Birmingham','Montgomery','Mobile','Huntsville','Tuscaloosa','Hoover','Dothan','Auburn','Madison','Florence','Anniston','Oxford','Gadsden','Vestavia Hills','Phenix City','Alabaster','Prattville','Trussville','Troy','Ozark'],
  'AK': ['Anchorage','Fairbanks','Juneau','Wasilla','Knik-Fairview','College','North Lakes','Badger','Ketchikan','Kenai','Sitka','College','Kodiak','Chena Ridge','Gateway','Haines','Soldotna','Ursine','Willow','Nome'],
  'AZ': ['Phoenix','Tucson','Mesa','Chandler','Scottsdale','Glendale','Gilbert','Tempe','Peoria','Surprise','Yuma','Prescott','Flagstaff','Goodyear','Buckeye','Avondale','Casa Grande','Laveen','Maricopa','Queen Creek'],
  'AR': ['Little Rock','Fort Smith','Fayetteville','Springdale','Jonesboro','Rogers','Conway','North Little Rock','Bentonville','Pine Bluff','Hot Springs','Benton','Bryant','Sherwood','Texarkana','Van Buren','Stuttgart','Marion','Blytheville','Searcy'],
  'CA': ['Los Angeles','Beverly Hills','Burbank','Century City','Compton','Culver City','Downey','El Segundo','Glendale','Hawthorne','Hollywood','Huntington Park','Inglewood','Long Beach','Malibu','Manhattan Beach','North Hollywood','Pasadena','Pomona','Santa Clarita','Santa Monica','Sherman Oaks','Silver Lake','South Gate','Studio City','Toluca Lake','Torrance','Universal City','Van Nuys','Venice','West Hollywood','West Los Angeles','Westlake Village','Woodland Hills','Oakland','Berkeley','Fresno','Sacramento','San Diego','San Francisco','San Jose','Anaheim','Santa Ana','Irvine','Riverside','Bakersfield','Stockton','Modesto','Stanislaus'],
  'CO': ['Denver','Colorado Springs','Aurora','Fort Collins','Lakewood','Thornton','Arvada','Westminster','Pueblo','Boulder','Greeley','Longmont','Loveland','Grand Junction','Aspen','Aurora','Colorado Springs','Parker','Castle Rock','Littleton'],
  'CT': ['Bridgeport','New Haven','Stamford','Hartford','Waterbury','Norwalk','Danbury','New Britain','Bristol','Meriden','West Haven','Milford','Stratford','East Hartford','Middletown','Norwich','Shelton','Groton','Trumbull','Wethersfield'],
  'DE': ['Wilmington','Dover','Newark','Middletown','Smyrna','Milford','Clayton','Lewes','Georgetown','Rehoboth Beach','Seaford','Millsboro','Ocean View','Elsmere','New Castle','Harrington','Bethany Beach','Blades','Bridgeville','Townsend'],
  'FL': ['Jacksonville','Miami','Tampa','Orlando','St. Petersburg','Hialeah','Tallahassee','Fort Lauderdale','Port St. Lucie','Cape Coral','Pembroke Pines','Hollywood','Gainesville','Miramar','Clearwater','Palm Bay','Pompano Beach','Lakeland','Miami Gardens','Davie'],
  'GA': ['Atlanta','Augusta','Columbus','Savannah','Athens','Macon','Albany','Johns Creek','Warner Robins','Sandy Springs','Roswell','Dalton','Hinesville','Rome','Georgia','Smyrna','Valdosta',' Alpharetta','Marietta','Stonecrest'],
  'HI': ['Honolulu','East Honolulu','Pearl City','Hilo','Kailua','Waipahu','Kaneohe','Mililani Town','Kailua','Kapolei','Ewa Gentry','Mile 55','Makakilo','Royal Kunia','Halawa','Waianae','Nanakuli','Makawao','Lahaina','Kaneohe'],
  'ID': ['Boise','Meridian','Nampa','Idaho Falls','Pocatello','Caldwell','Coeur d Alene','Twin Falls','Post Falls','Rexburg','Moscow','Kuna','Eagle','Star','Burley','Sandpoint','Chubbuck','Fruitland','Hailey','Ketchum'],
  'IL': ['Chicago','Aurora','Naperville','Joliet','Rockford','Springfield','Peoria','Elgin','Champaign','Bloomington','Decatur','Evanston','Wheaton','Hoffman Estates','Oak Lawn','Berwyn','Mount Prospect','Normal','Waukegan','Schaumburg'],
  'IN': ['Indianapolis','Fort Wayne','Evansville','South Bend','Carmel','Fishers','Bloomington','Hammond','Gary','Lafayette','Muncie','Noblesville','Terre Haute','Anderson','Kokomo','Greenfield','Richmond','New Albany','Elkhart','Mishawaka'],
  'IA': ['Des Moines','Cedar Rapids','Davenport','Sioux City','Iowa City','Ames','West Des Moines','Waterloo','Council Bluffs','Dubuque','Marion','Bettendorf','Fort Dodge','Ottumwa','Boon','Clinton','Muscatine','Burlington','Coralville','North Liberty'],
  'KS': ['Wichita','Overland Park','Kansas City','Olathe','Topeka','Lawrence','Shawnee','Manhattan','Lenexa','Salina','Hutchinson','Leavenworth','Gardner','Derby','Prairie Village','Hays','Junction City','Atchison','Ottawa','Winfield'],
  'KY': ['Louisville','Lexington','Bowling Green','Owensboro','Covington','Richmond','Florence','Georgetown','Hopkinsville','Nicholasville','Frankfort','Paducah','Lawton','Middletown','Elizabethtown','Ashland','Radcliff','Independence','Murray','Bardstown'],
  'LA': ['New Orleans','Baton Rouge','Shreveport','Metairie','Lafayette','Lake Charles','Bossier City','Monroe','Alexandria','Hammond','Houma','Terrebone','Ruston','Sulphur','Natchitoches','Gretna','LaPlace','St. Gabriel','Zachary','Baker'],
  'ME': ['Portland','Lewiston','Bangor','South Portland','Auburn','Biddeford','Sanford','Saco','Augusta','Scarborough','Brunswick','Rockland','Kennebunk','York','Falmouth','Kittery','Windham','Old Town','Ellsworth','Caribou'],
  'MD': ['Baltimore','Frederick','Rockville','Gaithersburg','Bowie','Hagerstown','Annapolis','College Park','Salisbury','Laurel','Greenbelt','Cumberland','Hyattsville','Takoma Park','Easton','Aberdeen','Bel Air','Elkton','Chestertown','Ocean City'],
  'MA': ['Boston','Worcester','Springfield','Cambridge','Lowell','Quincy','Lynn','New Bedford','Brockton','Quincy','Fall River','Somerville','Lawrence','Waltham','Haverhill','Malden','Weymouth','Medford','Taunton','Chicopee'],
  'MI': ['Detroit','Grand Rapids','Warren','Sterling Heights','Ann Arbor','Lansing','Dearborn','Livonia','Flint','Concord','Muskegon','Troy','Kalamazoo','Ypsilanti','Southfield','Novi','Pontiac','Royal Oak','St. Clair Shores','Jackson'],
  'MN': ['Minneapolis','St. Paul','Rochester','Duluth','Bloomington','Brooklyn Park','Plymouth','St. Cloud','Eden Prairie','Blaine','Lakeville','Eagan','Burnsville','Coon Rapids','Edina','St. Louis Park','Maple Grove','Minnetonka','Mankato','St. Paul'],
  'MS': ['Jackson','Gulfport','Southaven','Hattiesburg','Biloxi','Meridian','Tupelo','Vicksburg','Clinton','Pearl','Oxford','Starkville','Columbus','Greenville','Horn Lake','Brandon','Ridgeland','Olive Branch','Natchez','Laurel'],
  'MO': ['Kansas City','St. Louis','Springfield','Columbia','Jefferson City','Lee\'s Summit','O\'Fallon','St. Joseph','St. Charles','St. Peters','Blue Springs','Florissant','University City','Chesterfield','Joplin','Warrensburg','Liberty','Ballwin','Raytown','Kirkwood'],
  'MT': ['Billings','Missoula','Great Falls','Bozeman','Butte','Helena','Kalispell','Havre','Anaconda','Miles City','Whitefish','Belgrade','Laurel','Livingston','Lockwood','Red Lodge','West Yellowstone','Baker','Glasgow','Wolf Point'],
  'NE': ['Omaha','Lincoln','Bellevue','Grand Island','Kearney','Fremont','Hastings','North Platte','Norfolk','Columbus','Plattsmouth','La Vista','Scottsbluff','Bridgeport','Chadron','Gering','Blair','South Sioux City','Valley','Madison'],
  'NV': ['Las Vegas','Henderson','Reno','Sparks','Carson City','North Las Vegas','Elko','Fernley','Landing','Spring Valley','Enterprise','Sunrise Manor','Paradise','Winchester','Sandy Valley','Mesquite','Nixon','Owyhee','Yerington','Minden'],
  'NH': ['Manchester','Nashua','Concord','Derry','Rochester','Keene','Derry','Salem','Merrimack','Goffstown','Londonderry','Hudson','Bedford','Milford','Durham','Exeter','Swanzey','Claremont','Laconia','Hanover'],
  'NJ': ['Newark','Jersey City','Paterson','Elizabeth','Trenton','Camden','Clifton','Passaic','Union City','Bayonne','Vineland','New Brunswick','West New York','Hackensack','Morristown','Kearny','Linden','Paramus','Somerville','Princeton'],
  'NM': ['Albuquerque','Las Cruces','Rio Rancho','Santa Fe','Roswell','Farmington','Clovis',' Hobbs','Alamogordo','Los Lunas','Silver City',' Gallup','Anthony','Sunland Park','Lovington','Truth or Consequences','Portales','Los Alamos','Artesia','Carlsbad'],
  'NY': ['New York','Buffalo','Rochester','Syracuse','Albany','New Rochelle','Mount Vernon','Schenectady','Utica','White Plains','Troy','Niagara Falls','Binghamton','Forest Hills','Saratoga Springs','Hicksville','Huntington','Manhattan','Brooklyn','Queens'],
  'NC': ['Charlotte','Raleigh','Greensboro','Durham','Winston-Salem','Fayetteville','Cary','Wilmington','High Point','Greenville','Jacksonville','Chapel Hill','Goldsboro','Rocky Mount','Kernersville','Indian Trail','Holly Springs','Garner','Thomasville','Mooresville'],
  'ND': ['Fargo','Bismarck','Grand Forks','Minot','West Fargo','Mandan','Jamestown','Wahpeton','Dickinson','Bottineau','Rugby','Burlington','Casselton','Langdon','Mandan','New Town','Horace','Harvey','Lincoln','Hillsboro'],
  'OH': ['Columbus','Cleveland','Cincinnati','Toledo','Akron','Dayton','Canton','Youngstown','Parma','Lorain','Hamilton','Springfield','Kettering','Elyria','Cuyahoga Falls','Lakewood','Euclid','Middletown','Independence','Mansfield'],
  'OK': ['Oklahoma City','Tulsa','Norman','Broken Arrow','Lawton','Moore','Midwest City','Enid','Stillwater','Muskogee','Bartlesville','Shawnee','Ponca City','Azure','Ardmore','Duncan','Yukon','Sapulpa','Del City','Muskogee'],
  'OR': ['Portland','Eugene','Salem','Gresham','Hillsboro','Beaverton','Bend','Medford','Springfield','Corvallis','Albany','Lake Oswego','Keizer','Oregon City','McMinnville','Grants Pass','Tigard','Newberg','Redmond','Klamath Falls'],
  'PA': ['Philadelphia','Pittsburgh','Allentown','Erie','Reading','Scranton','Lancaster','York','Harrisburg','Altoona','Lancaster','Norristown','York','Springfield','Bryn Mawr','Wilkes-Barre','Hazleton','Kingston','Pottstown','Monroeville'],
  'RI': ['Providence','Cranston','Warwick','Pawtucket','East Providence','Woonsocket','Coventry','Cumberland','North Providence','South Kingstown','West Warwick','North Kingstown','Newport','Lincoln','Smithfield','Central Falls','Middletown','Bristol','East Greenwich','West Greenwich'],
  'SC': ['Charleston','Columbia','North Charleston','Mount Pleasant','Rock Hill','Greenville','Summerville','Sumter','Hilton Head Island','Spartanburg','Goose Creek',' Greer','Aiken','Mount Pleasant','Florence','Charleston','North Augusta','West Columbia','Beaufort','Bluffton'],
  'SD': ['Sioux Falls','Rapid City','Aberdeen','Brookings','Watertown','Mitchell','Yankton','Pierre','Huron','Spearfish','Brandon','Harrisburg','Sturgis','Vermillion','Deadwood','Hartford','Mellette','North Sioux City','Dakota Dunes','Sisseton'],
  'TN': ['Memphis','Nashville','Knoxville','Chattanooga','Clarksville','Murfreesboro','Franklin','Johnson City','Jackson','Murfreesboro','Nashville','Memphis','Knoxville','Chattanooga','Hendersonville','Kingsport','Murfreesboro','Arlington','Jackson','Gallatin'],
  'TX': ['Houston','San Antonio','Dallas','Austin','Fort Worth','El Paso','Arlington','Corpus Christi','Plano','Lubbock','Garland','Irving','Frisco','McKinney','Amarillo','Grand Prairie','Brownsville','McAllen','Killeen','Round Rock'],
  'UT': ['Salt Lake City','Provo','West Valley City','Logan','Murray','South Salt Lake','Park City','St. George','Ogden','Layton','Millcreek','Holladay','Canyon','Bountiful','Syracuse','Clearfield','Washington','Cedar City','Lehi','South Jordan'],
  'VT': ['Burlington','South Burlington','Rutland','Essex Junction','Barre','Montpelier','Winooski','St. Albans','Newport','Bristol','Richmond','Colchester','Milton','Shelburne','Williston','St. Johnsbury','Windsor','Springfield','Middlebury','Fair Haven'],
  'VA': ['Virginia Beach','Norfolk','Chesapeake','Richmond','Newport News','Arlington','Alexandria','Hampton','Newport News','Virginia Beach','Norfolk','Chesapeake','Richmond','Newport News','Suffolk','Powhatan','Chesterfield','Henrico','Arlington','Fairfax'],
  'WA': ['Seattle','Spokane','Tacoma','Vancouver','Bellevue','Kent','Renton','Yakima','Kirkland','Spokane Valley','Redmond','Everett','Federal Way','Auburn','Bellingham','Kennewick','Pasco','Richland','Lakewood','Olympia'],
  'WV': ['Charleston','Huntington','Morgantown','Parkersburg','Wheeling','Weirton','Fairmont','Martinsburg','Beckley','Clarksburg','South Charleston','St. Albans','Vienna','Bluefield','Dunbar','Elkins','Keyser','Lewisburg','Moundsville','Moundsville'],
  'WI': ['Milwaukee','Madison','Green Bay','Kenosha','Racine','Kenosha','Waukesha','Oshkosh','Madison','Green Bay','Appleton','Janesville','Waukesha','Eau Claire','Sheboygan','La Crosse',' Fond du Lac','Brookfield','Menomonee Falls','Wauwatosa'],
  'WY': ['Cheyenne','Casper','Laramie','Gillette','Sheridan','Rock Springs','Lander','Riverton','Jackson','Powell','Cody','Rawlins','Douglas','Torrington','Evanston','Lander','Riverton','Cody','Powell','Sundance']
};

function getCitiesForState(stateCode) {
  return citiesByState[stateCode] || [];
}

function initCountyDropdown() {
  const input = document.getElementById('county-input');
  const hiddenInput = document.getElementById('county-value');
  const dropdown = document.getElementById('county-dropdown');
  if (!input || !dropdown) return;

  function renderDropdown(filter) {
    const filterLower = filter.toLowerCase().trim();
    const filtered = countyOptions.filter(c =>
      c.toLowerCase().includes(filterLower)
    );
    dropdown.innerHTML = filtered.map(c =>
      '<div class="county-option' + (c === hiddenInput.value ? ' selected' : '') + '">' + c + '</div>'
    ).join('');
    dropdown.style.display = filtered.length ? 'block' : 'none';
  }

  input.addEventListener('input', function() {
    hiddenInput.value = '';
    renderDropdown(this.value);
  });

  input.addEventListener('focus', function() {
    renderDropdown(this.value);
  });

  dropdown.addEventListener('click', function(e) {
    if (e.target.classList.contains('county-option')) {
      input.value = e.target.textContent;
      hiddenInput.value = e.target.textContent;
      dropdown.style.display = 'none';
    }
  });

  document.addEventListener('click', function(e) {
    if (!e.target.closest('.county-select-wrapper')) {
      dropdown.style.display = 'none';
    }
  });
}

// Store defendants in an array
let defendantsArray = [];
const MAX_DEFENDANTS = 10;

function toggleDefendantUI() {
  const form = document.getElementById('request-form');
  if (!form) return;
  const yesRadio = form.querySelector('input[name="multiple_defendants"][value="yes"]');
  const listContainer = document.getElementById('defendants-list-container');
  const addBtn = document.getElementById('btn-add-defendant');
  if (!yesRadio || !listContainer || !addBtn) return;

  const isYes = yesRadio.checked;

  if (isYes) {
    listContainer.style.display = 'flex';
    if (defendantsArray.length < MAX_DEFENDANTS) {
      addBtn.style.display = 'block';
    } else {
      addBtn.style.display = 'none';
    }
    // Open the existing modal once when enabling multiple defendants so users can add via the full form
    if (defendantsArray.length === 0 && typeof openDefendantModal === 'function') {
      requestAnimationFrame(function () {
        openDefendantModal(-1);
      });
    }
  } else {
    listContainer.style.display = 'none';
    addBtn.style.display = 'none';
  }
}

function openDefendantModal(editIndex = -1) {
  const modal = document.getElementById('defendant-modal');
  const title = document.getElementById('modal-title');
  
  if (editIndex > -1) {
    title.innerText = "Edit Defendant";
    document.getElementById('def-edit-index').value = editIndex;
    
    const def = defendantsArray[editIndex];
    document.getElementById('def-first-name').value = def.firstName;
    document.getElementById('def-middle-name').value = def.middleName;
    document.getElementById('def-last-name').value = def.lastName;
    document.getElementById('def-gender').value = def.gender;
    document.getElementById('def-relationship').value = def.relationship;
    document.getElementById('def-address').value = def.address;
    document.getElementById('def-city').value = def.city;
    document.getElementById('def-city-value').value = def.city;
    document.getElementById('def-country-input').value = def.country;
    document.getElementById('def-country-value').value = def.country;
    document.getElementById('def-state-input').value = def.state;
    document.getElementById('def-state-value').value = def.state;
    document.getElementById('def-dob').value = def.dob;
    document.getElementById('def-phone').value = def.phone;
    document.getElementById('def-aliases').value = def.aliases;
    document.getElementById('def-employer').value = def.employer;
    document.getElementById('def-physical').value = def.physical;
    document.getElementById('def-notes').value = def.notes;
  } else {
    title.innerText = "Add Additional Defendant";
    document.getElementById('def-edit-index').value = "-1";
    clearDefendantForm();
  }
  
  modal.style.display = 'flex';
}

function closeDefendantModal() {
  document.getElementById('defendant-modal').style.display = 'none';
}

function clearDefendantForm() {
  const inputs = document.querySelectorAll('#defendant-modal input, #defendant-modal textarea, #defendant-modal select');
  inputs.forEach(input => {
    if(input.id !== 'def-country' && input.id !== 'def-edit-index') {
      input.value = '';
    }
  });
}

function saveDefendant() {
  const firstName = document.getElementById('def-first-name').value.trim();
  const lastName = document.getElementById('def-last-name').value.trim();
  const address = document.getElementById('def-address').value.trim();
  const city = document.getElementById('def-city-value').value.trim();

  if(!firstName || !lastName || !address || !city) {
    alert("Please fill in all required fields (First Name, Last Name, Address, City).");
    return;
  }

  const defendantData = {
    firstName: firstName,
    middleName: document.getElementById('def-middle-name').value,
    lastName: lastName,
    gender: document.getElementById('def-gender').value,
    relationship: document.getElementById('def-relationship').value,
    address: address,
    city: document.getElementById('def-city-value').value || city,
    state: document.getElementById('def-state-value').value,
    country: document.getElementById('def-country-value').value,
    dob: document.getElementById('def-dob').value,
    phone: document.getElementById('def-phone').value,
    aliases: document.getElementById('def-aliases').value,
    employer: document.getElementById('def-employer').value,
    physical: document.getElementById('def-physical').value,
    notes: document.getElementById('def-notes').value,
  };

  const editIndex = parseInt(document.getElementById('def-edit-index').value);

  if (editIndex > -1) {
    defendantsArray[editIndex] = defendantData;
  } else {
    if (defendantsArray.length < MAX_DEFENDANTS) {
      defendantsArray.push(defendantData);
    }
  }

  renderDefendantsList();
  closeDefendantModal();
  toggleDefendantUI();
}

function renderDefendantsList() {
  const container = document.getElementById('defendants-list-container');
  container.innerHTML = '';

  defendantsArray.forEach((def, index) => {
    const card = document.createElement('div');
    card.className = 'defendant-card';
    
    const mid = def.middleName ? ` ${def.middleName} ` : ' ';
    const fullName = `${def.firstName}${mid}${def.lastName}`;

    card.innerHTML = `
      <div class="defendant-info">
        <h5>Defendant #${index + 2}: ${fullName}</h5>
        <p>${def.address}, ${def.city}</p>
      </div>
      <button type="button" class="edit-def-btn" onclick="openDefendantModal(${index})">Edit</button>
    `;
    
    container.appendChild(card);
  });
}

// City autocomplete for request page and defendant modal
function initCityAutocomplete(inputId, hiddenInputId, dropdownId, stateInputId) {
  const input = document.getElementById(inputId);
  const hiddenInput = document.getElementById(hiddenInputId);
  const dropdown = document.getElementById(dropdownId);
  if (!input || !dropdown) {
    console.log('initCityAutocomplete early return: input=', input, 'dropdown=', dropdown);
    return;
  }
  console.log('initCityAutocomplete initialized for', inputId, 'stateInputId=', stateInputId);

  function renderDropdown(filter, cities) {
    const filterLower = filter.toLowerCase().trim();
    const filtered = (cities || []).filter(c =>
      c.toLowerCase().includes(filterLower)
    );
    dropdown.innerHTML = filtered.slice(0, 50).map(c =>
      '<div class="city-option' + (c === hiddenInput.value ? ' selected' : '') + '">' + c + '</div>'
    ).join('');
    dropdown.style.display = filtered.length ? 'block' : 'none';
    console.log('renderDropdown called: filter=', filter, 'cities count=', (cities || []).length, 'display=', dropdown.style.display);
  }

  function getCurrentStateCities() {
    const stateInput = stateInputId ? document.getElementById(stateInputId) : null;
    const stateHiddenInput = stateInputId ? document.getElementById(stateInputId.replace('-input', '-value')) : null;
    let stateCode = stateHiddenInput ? stateHiddenInput.value : '';
    if (!stateCode && stateInput) {
      const stateMatch = stateInput.value.match(/\(([A-Z]{2})\)/);
      if (stateMatch) stateCode = stateMatch[1];
    }
    if (!stateCode) {
      const stateMatch = stateInput ? stateInput.value.match(/\(([A-Z]{2})\)/) : null;
      if (stateMatch) stateCode = stateMatch[1];
    }
    console.log('getCurrentStateCities: stateCode=', stateCode, 'stateInput=', stateInput ? stateInput.value : 'null');
    return getCitiesForState(stateCode);
  }

  input.addEventListener('input', function() {
    hiddenInput.value = '';
    renderDropdown(this.value, getCurrentStateCities());
  });

  input.addEventListener('focus', function() {
    console.log('city input focus event');
    renderDropdown(this.value, getCurrentStateCities());
  });

  dropdown.addEventListener('click', function(e) {
    if (e.target.classList.contains('city-option')) {
      input.value = e.target.textContent;
      hiddenInput.value = e.target.textContent;
      dropdown.style.display = 'none';
    }
  });

  document.addEventListener('click', function(e) {
    if (!e.target.closest('.city-select-wrapper')) {
      dropdown.style.display = 'none';
    }
  });

  if (stateInputId) {
    const stateInput = document.getElementById(stateInputId);
    if (stateInput) {
      stateInput.addEventListener('input', function() {
        input.value = '';
        hiddenInput.value = '';
        renderDropdown('', getCurrentStateCities());
      });
    }
  }
}

// Country autocomplete
const countryOptions = ['United States'];

function initCountryAutocomplete(inputId, hiddenInputId, dropdownId) {
  const input = document.getElementById(inputId);
  const hiddenInput = document.getElementById(hiddenInputId);
  const dropdown = document.getElementById(dropdownId);
  if (!input || !dropdown) return;

  function renderDropdown(filter) {
    const filterLower = filter.toLowerCase().trim();
    const filtered = countryOptions.filter(c =>
      c.toLowerCase().includes(filterLower)
    );
    dropdown.innerHTML = filtered.slice(0, 50).map(c =>
      '<div class="country-option' + (c === hiddenInput.value ? ' selected' : '') + '">' + c + '</div>'
    ).join('');
    dropdown.style.display = filtered.length ? 'block' : 'none';
  }

  input.addEventListener('input', function() {
    hiddenInput.value = '';
    renderDropdown(this.value);
  });

  input.addEventListener('focus', function() {
    renderDropdown(this.value);
  });

  dropdown.addEventListener('click', function(e) {
    if (e.target.classList.contains('country-option')) {
      input.value = e.target.textContent;
      hiddenInput.value = e.target.textContent;
      dropdown.style.display = 'none';
    }
  });

  document.addEventListener('click', function(e) {
    if (!e.target.closest('.country-select-wrapper')) {
      dropdown.style.display = 'none';
    }
  });
}

// Initialize file upload display
function initFileUpload() {
  const fileInput = document.getElementById('file-input');
  const fileList = document.getElementById('file-list');
  const uploadText = document.getElementById('file-upload-text');
  
  if (!fileInput || !fileList) return;
  
  fileInput.addEventListener('change', function() {
    const files = Array.from(fileInput.files);
    if (files.length === 0) {
      fileList.innerHTML = '';
      if (uploadText) uploadText.textContent = '+ Add a File';
      return;
    }
    
    let html = '<div style="display:flex;flex-wrap:wrap;gap:8px;">';
    files.forEach((file, index) => {
      html += `<span style="background:#e8f0fe;padding:6px 12px;border-radius:4px;font-size:12px;display:flex;align-items:center;gap:6px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
        ${file.name}
      </span>`;
    });
    html += '</div>';
    fileList.innerHTML = html;
    
    if (uploadText) uploadText.textContent = files.length === 1 ? '1 file selected' : files.length + ' files selected';
  });
}

// Initialize all autocomplete inputs
document.addEventListener('DOMContentLoaded', function() {
  var reqForm = document.getElementById('request-form');
  if (reqForm) {
    reqForm.querySelectorAll('input[name="multiple_defendants"]').forEach(function (r) {
      r.addEventListener('change', toggleDefendantUI);
    });
    toggleDefendantUI();
  }

  initCityAutocomplete('req-city-input', 'req-city-value', 'req-city-dropdown', 'req-state-input');
  initCityAutocomplete('def-city', 'def-city-value', 'def-city-dropdown', 'def-state-input');
  initCountryAutocomplete('def-country-input', 'def-country-value', 'def-country-dropdown');
  initStateAutocomplete('def-state-input', 'def-state-value', 'def-state-dropdown', 'CA');
  initStateAutocomplete('req-state-input', 'req-state-value', 'req-state-dropdown', 'CA');
  initStateAutocomplete('state-input', 'state-value', 'state-dropdown', 'CA');
  initFileUpload();
  initFutureDeadlineDateInputs();
  initHomeProcessServeSection();
  initHomeSkipTraceSection();
});
