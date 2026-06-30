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

/** Store home form defendants */
var homeDefendantsArray = [];
const HOME_MAX_DEFENDANTS = 10;
var skipTraceFormData = null;
var skipTraceModalFilled = false;
var activeServiceTypeSelection = '';

/** Map dropdown skip-trace options to modal service cards */
var DROPDOWN_TO_SKIP_MODAL = {
  'Standard Skip Trace — $75': 'standard',
  'Enhanced Trace — $150': 'deep',
  'Rush Trace (same/next-day) — $225': 'process',
  'Business / Agent Verification — $225': 'deep',
  'Court-Ready Skip Trace Report — $250': 'court'
};

/** Stripe Payment Links — one per service tier (from payment.html) */
var SERVICE_STRIPE_LINKS = {
  standard_service: 'https://buy.stripe.com/fZuaEX3lL0F58mZbaZ6sw05',
  rush_serve: 'https://buy.stripe.com/6oU6oH2hHevV1YB4MB6sw09',
  priority_serve: 'https://buy.stripe.com/bJeaEX09z3RhgTvcf36sw02',
  emergency_serve: 'https://buy.stripe.com/00w4gz1dD1J9fPr0wl6sw03',
  skip_trace_standard: 'https://buy.stripe.com/9B6aEX8G573tav7a6V6sw0c',
  skip_trace_rush: 'https://buy.stripe.com/9B64gze0pafFcDf0wl6sw06',
  skip_trace_court_ready: 'https://buy.stripe.com/cNieVd1dD87xcDfenb6sw0a',
  skip_trace_enhanced: 'https://buy.stripe.com/8x24gz7C11J9dHj3Ix6sw04',
  skip_trace_business: 'https://buy.stripe.com/9B64gze0pafFcDf0wl6sw06'
};

var SERVICE_TYPE_TO_CART_KEY = {
  'Standard Service': 'standard_service',
  'Rush Service': 'rush_serve',
  'Priority Serve': 'priority_serve',
  'Emergency Serve': 'emergency_serve',
  'Standard Skip Trace': 'skip_trace_standard',
  'Enhanced Trace': 'skip_trace_enhanced',
  'Rush Trace': 'skip_trace_rush',
  'Business / Agent Verification': 'skip_trace_business',
  'Court-Ready Skip Trace Report': 'skip_trace_court_ready'
};

function resolveServiceCartKey(serviceType) {
  if (!serviceType) return null;
  for (var label in SERVICE_TYPE_TO_CART_KEY) {
    if (serviceType.indexOf(label) !== -1) return SERVICE_TYPE_TO_CART_KEY[label];
  }
  return null;
}

function getStripePaymentUrl(serviceType) {
  var key = resolveServiceCartKey(serviceType);
  return key ? (SERVICE_STRIPE_LINKS[key] || null) : null;
}

function redirectAfterServiceSubmit(serviceType, submissionId) {
  var stripeUrl = getStripePaymentUrl(serviceType);
  if (stripeUrl) {
    window.location.href = stripeUrl;
    return;
  }
  var qs = submissionId ? '?ref=' + submissionId : '';
  window.location.href = 'payment.html' + qs;
}

function appendProcessServeFieldsToFormData(form, formData) {
  var serveA1 = form.querySelector('[name="serve_addressLine1"]');
  var serveA2 = form.querySelector('[name="serve_addressLine2"]');
  if (serveA1 && serveA1.value.trim()) formData.set('addressLine1', serveA1.value.trim());
  if (serveA2) formData.set('addressLine2', serveA2.value.trim());

  var svcCityVal = document.getElementById('home-svc-city-value');
  var svcCityIn = document.getElementById('home-svc-city-input');
  var svcCity = (svcCityVal && svcCityVal.value.trim()) || (svcCityIn && svcCityIn.value.trim()) || '';
  if (svcCity) formData.set('city', svcCity);

  var svcStateVal = document.getElementById('home-svc-state-value');
  var svcStateIn = document.getElementById('home-svc-state-input');
  var svcState = (svcStateVal && svcStateVal.value.trim()) || (svcStateIn && svcStateIn.value.trim()) || '';
  if (svcState) formData.set('state', svcState);

  var serveZip = form.querySelector('[name="serve_zip"]');
  if (serveZip && serveZip.value.trim()) formData.set('zip', sanitizeUsZip5(serveZip.value));

  var extraDef = form.querySelector('#home-process-extra [name="serve_defendantName"]');
  if (extraDef && extraDef.value.trim()) formData.set('defendantName', extraDef.value.trim());

  var extraCase = form.querySelector('#home-process-extra [name="serve_caseNumber"]');
  if (extraCase && extraCase.value.trim()) formData.set('caseNumber', extraCase.value.trim());
  var extraCourt = form.querySelector('#home-process-extra [name="serve_courtJurisdiction"]');
  if (extraCourt && extraCourt.value.trim()) formData.set('courtJurisdiction', extraCourt.value.trim());

  var dd = document.getElementById('home-deadlineDate');
  if (dd && dd.value) formData.set('deadlineDate', dd.value);

  var homeSpecial = form.querySelector('[name="home_specialInstructions"]');
  var topSpecial = form.querySelector('[name="specialInstructions"]');
  var merged = topSpecial ? topSpecial.value.trim() : '';
  if (homeSpecial && homeSpecial.value.trim()) {
    merged += (merged ? '\n\n' : '') + 'Process serving notes:\n' + homeSpecial.value.trim();
  }
  if (merged) formData.set('specialInstructions', merged);

  var homeMultiYes = form.querySelector('input[name="home_multiple_defendants"][value="yes"]');
  if (homeMultiYes) {
    formData.set('multiple_defendants', homeMultiYes.checked ? 'true' : 'false');
  }
}

function parseSkipTraceAddress(lastAddress, jurisdiction) {
  var result = {
    line1: String(lastAddress || '').trim(),
    city: '',
    state: '',
    zip: ''
  };
  var jur = String(jurisdiction || '').trim();
  if (jur.length === 2) {
    result.state = jur.toUpperCase();
  } else if (jur) {
    result.city = jur;
  }

  if (!result.line1) return result;

  var zipMatch = result.line1.match(/\b(\d{5})(?:-\d{4})?\b/);
  if (zipMatch) result.zip = zipMatch[1];

  var csz = result.line1.match(/,\s*([^,]+?),\s*([A-Za-z]{2})\s+(\d{5})(?:-\d{4})?\s*$/);
  if (csz) {
    result.city = csz[1].trim();
    result.state = csz[2].toUpperCase();
    result.zip = csz[3];
    result.line1 = result.line1.substring(0, result.line1.indexOf(',')).trim() || result.line1;
  }
  return result;
}

function syncSkipTraceMainFormRequirements(serviceTypeVal) {
  var form = document.getElementById('request-form');
  if (!form) return;
  var isST = isSkipTraceService(serviceTypeVal);
  var zip = form.querySelector('input[name="zip"]');
  var addrGroup = form.querySelector('[name="addressLine1"]');
  var addrLabel = addrGroup && addrGroup.closest('.form-group') ? addrGroup.closest('.form-group').querySelector('label') : null;
  if (zip) {
    if (isST) zip.removeAttribute('required');
    else zip.setAttribute('required', 'required');
  }
  if (addrLabel) {
    if (isST) {
      addrLabel.innerHTML = 'Service Address <span style="font-weight:normal;color:#666;">(optional — subject address collected in skip trace intake)</span>';
    } else {
      addrLabel.innerHTML = 'Service Address <span class="req">(required)</span>';
    }
  }
}

function prefillRequestFormFromSkipTrace(form) {
  if (!skipTraceModalFilled || !skipTraceFormData) return;
  var st = skipTraceFormData;
  var subjectName = [st.firstName, st.middleName, st.lastName].filter(Boolean).join(' ').trim();
  var parsed = parseSkipTraceAddress(st.lastAddress, st.jurisdiction);

  function fillIfEmpty(name, val) {
    if (val == null || val === '') return;
    var el = form.querySelector('[name="' + name + '"]');
    if (el && !String(el.value || '').trim()) el.value = val;
  }

  fillIfEmpty('clientName', st.company || st.fullname);
  fillIfEmpty('contactName', st.fullname);
  fillIfEmpty('email', st.email);
  fillIfEmpty('phone', st.phone);
  fillIfEmpty('defendantName', subjectName);
  fillIfEmpty('addressLine1', parsed.line1 || st.lastAddress);
  fillIfEmpty('caseNumber', st.caseNumber);
  fillIfEmpty('courtJurisdiction', st.court);
  fillIfEmpty('zip', parsed.zip);

  var cityInput = document.getElementById('req-city-input');
  var cityHidden = document.getElementById('req-city-value');
  var cityVal = parsed.city || '';
  if (cityVal) {
    if (cityInput && !cityInput.value.trim()) cityInput.value = cityVal;
    if (cityHidden && !cityHidden.value.trim()) cityHidden.value = cityVal;
  }

  var stateHidden = document.getElementById('req-state-value');
  var stateInput = document.getElementById('req-state-input');
  var stateVal = parsed.state || (st.jurisdiction && st.jurisdiction.length === 2 ? st.jurisdiction.toUpperCase() : '') || 'CA';
  if (stateHidden) stateHidden.value = stateVal;
  if (stateInput && !stateInput.value.trim()) stateInput.value = stateVal;
}

function appendSkipTraceFieldsToFormData(form, formData) {
  if (!skipTraceModalFilled || !skipTraceFormData) return;
  var st = skipTraceFormData;
  formData.set('skipTraceData', JSON.stringify(st));

  var subjectName = [st.firstName, st.middleName, st.lastName].filter(Boolean).join(' ').trim();
  var parsed = parseSkipTraceAddress(st.lastAddress, st.jurisdiction);
  if (subjectName) formData.set('defendantName', subjectName);
  if (parsed.line1 || st.lastAddress) formData.set('addressLine1', parsed.line1 || st.lastAddress);
  if (parsed.city) formData.set('city', parsed.city);
  if (parsed.state) formData.set('state', parsed.state);
  if (parsed.zip) formData.set('zip', parsed.zip);
  if (st.caseNumber) formData.set('caseNumber', st.caseNumber);
  if (st.court) formData.set('courtJurisdiction', st.court);
  if (st.deadline) formData.set('deadlineDate', st.deadline);

  if (modalUploadedFiles && modalUploadedFiles.length) {
    modalUploadedFiles.forEach(function (file) {
      formData.append('files', file, file.name);
    });
  }

  var notes = [];
  if (st.purpose) notes.push('Purpose: ' + st.purpose);
  if (st.jurisdiction) notes.push('State of jurisdiction: ' + st.jurisdiction);
  if (st.dob) notes.push('Subject DOB: ' + st.dob);
  if (st.notes) notes.push(st.notes);
  if (notes.length) {
    var existing = formData.get('specialInstructions') || '';
    var block = '--- Skip Trace Intake ---\n' + notes.join('\n');
    formData.set('specialInstructions', existing ? (existing + '\n\n' + block) : block);
  }
}

/** Detect if service type is skip trace */
function isSkipTraceService(val) {
  return SKIP_TRACE_SERVICE_TYPES.indexOf(val) !== -1;
}

function getIntakeSummaryContainer() {
  return document.getElementById('skip-trace-summary-container')
    || document.getElementById('service-intake-summary-container');
}

function getActiveServiceTypeSelect() {
  return document.querySelector('#request-form select[name="serviceType"]')
    || document.querySelector('#home-form-container select[name="serviceType"]')
    || document.querySelector('#contact-form-container select[name="serviceType"]')
    || document.querySelector('select[name="serviceType"]');
}

function escapeFormHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderSkipTraceSummary() {
  var container = getIntakeSummaryContainer();
  if (!container) return;
  container.innerHTML = '';
  if (!skipTraceModalFilled || !skipTraceFormData) {
    container.style.display = 'none';
    return;
  }
  var st = skipTraceFormData;
  var subjectName = [st.firstName, st.middleName, st.lastName].filter(Boolean).join(' ').trim();
  var card = document.createElement('div');
  card.className = 'defendant-card skip-trace-summary-card';
  card.innerHTML =
    '<div class="defendant-info">' +
      '<h5>Skip Trace Intake: ' + escapeFormHtml(st.dropdownLabel || st.serviceType || 'Completed') + '</h5>' +
      '<p><strong>Subject:</strong> ' + escapeFormHtml(subjectName) + (st.lastAddress ? ' · ' + escapeFormHtml(st.lastAddress) : '') + '</p>' +
      '<p><strong>Requester:</strong> ' + escapeFormHtml(st.fullname || '') + (st.email ? ' · ' + escapeFormHtml(st.email) : '') + '</p>' +
      '<p><strong>Purpose:</strong> ' + escapeFormHtml(st.purpose || '') + (st.deadline ? ' · <strong>Deadline:</strong> ' + escapeFormHtml(st.deadline) : '') + '</p>' +
    '</div>' +
    '<button type="button" class="edit-def-btn" onclick="openSkipTraceModal(true)">Edit</button>';
  container.appendChild(card);
  container.style.display = 'flex';
}

function populateSkipTraceModal(data) {
  if (!data) return;
  function setVal(id, val) {
    var el = document.getElementById(id);
    if (el) el.value = val || '';
  }
  setVal('st-fullname', data.fullname);
  setVal('st-company', data.company);
  setVal('st-email', data.email);
  setVal('st-phone', data.phone);
  setVal('st-role', data.role);
  setVal('st-jurisdiction', data.jurisdiction);
  setVal('st-first', data.firstName);
  setVal('st-last', data.lastName);
  setVal('st-middle', data.middleName);
  setVal('st-aliases', data.aliases);
  setVal('st-dob', data.dob);
  setVal('st-phone2', data.lastPhone);
  setVal('st-address', data.lastAddress);
  setVal('st-email2', data.lastEmail);
  setVal('st-social', data.social);
  setVal('st-purpose', data.purpose);
  setVal('st-case', data.caseNumber);
  setVal('st-court', data.court);
  setVal('st-deadline', data.deadline);
  setVal('st-rush', data.rush || 'no');
  setVal('st-prior', data.priorSearch || 'no');
  setVal('st-notes', data.notes);

  var revMap = {
    'Standard Skip Trace': 'standard',
    'Deep Skip Trace': 'deep',
    'Court-Ready / Affidavit-Grade': 'court',
    'Process Server Locate': 'process'
  };
  var svcKey = revMap[data.serviceType] || '';
  if (svcKey) {
    var radio = document.querySelector('#skip-trace-modal-body input[name="st-service"][value="' + svcKey + '"]');
    if (radio) {
      radio.checked = true;
      var card = radio.closest('.svc-card');
      if (card) selectModalService(card, svcKey);
    }
  }

  setVal('st-ssn', data.ssn);
  setVal('st-dl', data.dl);
  setVal('st-vehicle', data.vehicle);
  setVal('st-employer', data.employer);

  ['st-fcra1', 'st-fcra2', 'st-fcra3', 'st-fcra4', 'st-fcra5'].forEach(function(id) {
    var cb = document.getElementById(id);
    if (cb) cb.checked = !!data.fcraCertified;
  });

  if (data.uploadedFiles && data.uploadedFiles.length) {
    renderSavedModalFileNames(data.uploadedFiles);
  }
}

function renderSavedModalFileNames(fileNames) {
  var list = document.getElementById('modalFileList');
  if (!list) return;
  list.innerHTML = fileNames.map(function(name) {
    return '<div style="display:flex;align-items:center;justify-content:space-between;background:#f5f4f1;border:1px solid #d5d2cc;border-radius:4px;padding:8px 14px;font-size:12.5px;color:#2e2e2e;font-family:var(--serif);"><span>' +
      escapeFormHtml(name) + ' <span style="color:#999">(saved — re-upload to replace)</span></span></div>';
  }).join('');
}

/** Show skip trace intake modal */
function openSkipTraceModal(isEdit) {
  var modal = document.getElementById('skip-trace-modal');
  var body = document.getElementById('skip-trace-modal-body');
  if (!modal || !body) return;

  // Prevent background page scrolling when modal is open
  document.body.style.overflow = 'hidden';

  // Inject skip trace form HTML — mirrors skip-trace-intake-form.html
  body.innerHTML = `
    <div style="background:#fff;border-radius:6px;overflow:hidden;">
      <div style="background:#f5f4f1;padding:20px 28px;border-bottom:1px solid #d5d2cc;" class="skip-trace-modal-header">
        <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#2d3a7c;font-weight:500;margin-bottom:8px;">✦ Skip Trace Intake</div>
        <h2 style="font-size:28px;font-weight:300;margin:0 0 6px;letter-spacing:-.01em;">Skip Trace Request</h2>
        <p style="font-size:14px;color:#666;font-style:italic;margin:0;">FCRA permissible purpose required. Fields marked * are required. Conditional fields appear based on service type selected.</p>
      </div>
      <div style="padding:24px 28px 28px;">

        <!-- Section 01: Client -->
        <div style="border:1px solid #d5d2cc;border-radius:4px;margin-bottom:18px;overflow:hidden;">
          <div style="background:#f5f4f1;padding:10px 20px;border-bottom:1px solid #d5d2cc;font-size:11px;font-weight:500;color:#2d3a7c;letter-spacing:.1em;text-transform:uppercase;" class="skip-trace-section-header">01 — Client / Requester Information</div>
          <div style="padding:20px;display:grid;grid-template-columns:1fr 1fr;gap:14px;" class="skip-trace-grid">
            <div class="field"><label style="font-size:12px;font-weight:500;letter-spacing:.04em;">Full Name <span style="color:#999">*</span></label><input type="text" id="st-fullname" placeholder="Jane Smith" style="font-family:var(--serif);font-size:15px;padding:11px 16px;border:1px solid #d5d2cc;border-radius:100px;outline:none;width:100%;box-sizing:border-box;"></div>
            <div class="field"><label style="font-size:12px;font-weight:500;letter-spacing:.04em;">Company / Firm</label><input type="text" id="st-company" placeholder="Acme Collections LLC" style="font-family:var(--serif);font-size:15px;padding:11px 16px;border:1px solid #d5d2cc;border-radius:100px;outline:none;width:100%;box-sizing:border-box;"></div>
            <div class="field"><label style="font-size:12px;font-weight:500;letter-spacing:.04em;">Email <span style="color:#999">*</span></label><input type="email" id="st-email" placeholder="jane@firm.com" style="font-family:var(--serif);font-size:15px;padding:11px 16px;border:1px solid #d5d2cc;border-radius:100px;outline:none;width:100%;box-sizing:border-box;"></div>
            <div class="field"><label style="font-size:12px;font-weight:500;letter-spacing:.04em;">Phone <span style="color:#999">*</span></label><input type="tel" id="st-phone" placeholder="555-010-0199" maxlength="12" inputmode="tel" autocomplete="tel-national" pattern="\\d{3}-\\d{3}-\\d{4}" title="10-digit US phone" style="font-family:var(--serif);font-size:15px;padding:11px 16px;border:1px solid #d5d2cc;border-radius:100px;outline:none;width:100%;box-sizing:border-box;"></div>
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
        </div>

        <!-- Section 02: Service Type -->
        <div style="border:1px solid #d5d2cc;border-radius:4px;margin-bottom:18px;overflow:hidden;">
          <div style="background:#f5f4f1;padding:10px 20px;border-bottom:1px solid #d5d2cc;font-size:11px;font-weight:500;color:#2d3a7c;letter-spacing:.1em;text-transform:uppercase;" class="skip-trace-section-header">02 — Service Type <span style="color:#999">*</span></div>
          <div style="padding:20px;display:grid;grid-template-columns:1fr 1fr;gap:14px;" class="skip-trace-grid skip-trace-section-body">
            <label class="svc-card" onclick="selectModalService(this,'standard')" style="border:1px solid #d5d2cc;border-radius:6px;padding:16px;cursor:pointer;transition:border-color .2s,background .2s;display:block;background:#fff;">
              <input type="radio" name="st-service" value="standard" style="display:none;">
              <div style="font-size:15px;font-weight:600;margin-bottom:4px;color:#1a1a1a;">Standard Skip Trace</div>
              <div style="font-size:12.5px;color:#666;margin-bottom:10px;line-height:1.5;">Current address, phone, and basic identity verification. Suitable for general locates.</div>
              <span style="display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:500;padding:3px 8px;border-radius:20px;text-transform:uppercase;letter-spacing:.04em;background:#e8f7ee;color:#16a34a;border:1px solid #b4d8b8;"><span style="width:5px;height:5px;border-radius:50%;background:#16a34a;"></span>Standard Priority</span>
            </label>
            <label class="svc-card" onclick="selectModalService(this,'deep')" style="border:1px solid #d5d2cc;border-radius:6px;padding:16px;cursor:pointer;transition:border-color .2s,background .2s;display:block;background:#fff;">
              <input type="radio" name="st-service" value="deep" style="display:none;">
              <div style="font-size:15px;font-weight:600;margin-bottom:4px;color:#1a1a1a;">Deep Skip Trace</div>
              <div style="font-size:12.5px;color:#666;margin-bottom:10px;line-height:1.5;">Full profile including associates, assets, employment history, and digital footprint.</div>
              <span style="display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:500;padding:3px 8px;border-radius:20px;text-transform:uppercase;letter-spacing:.04em;background:#e8f0fc;color:#2563eb;border:1px solid #b4c8e8;"><span style="width:5px;height:5px;border-radius:50%;background:#2563eb;"></span>Elevated Priority</span>
            </label>
            <label class="svc-card" onclick="selectModalService(this,'court')" style="border:1px solid #d5d2cc;border-radius:6px;padding:16px;cursor:pointer;transition:border-color .2s,background .2s;display:block;background:#fff;">
              <input type="radio" name="st-service" value="court" style="display:none;">
              <div style="font-size:15px;font-weight:600;margin-bottom:4px;color:#1a1a1a;">Court-Ready / Affidavit-Grade</div>
              <div style="font-size:12.5px;color:#666;margin-bottom:10px;line-height:1.5;">Documented, certified report with sourcing suitable for legal proceedings and filings.</div>
              <span style="display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:500;padding:3px 8px;border-radius:20px;text-transform:uppercase;letter-spacing:.04em;background:#fef3e2;color:#b7770d;border:1px solid #e8d0a8;"><span style="width:5px;height:5px;border-radius:50%;background:#b7770d;"></span>High Priority</span>
            </label>
            <label class="svc-card" onclick="selectModalService(this,'process')" style="border:1px solid #d5d2cc;border-radius:6px;padding:16px;cursor:pointer;transition:border-color .2s,background .2s;display:block;background:#fff;">
              <input type="radio" name="st-service" value="process" style="display:none;">
              <div style="font-size:15px;font-weight:600;margin-bottom:4px;color:#1a1a1a;">Process Server Locate</div>
              <div style="font-size:12.5px;color:#666;margin-bottom:10px;line-height:1.5;">Rapid current-address confirmation for same-day or next-day Process Serving.</div>
              <span style="display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:500;padding:3px 8px;border-radius:20px;text-transform:uppercase;letter-spacing:.04em;background:#fce8e8;color:#c0392b;border:1px solid #e8b4b4;"><span style="width:5px;height:5px;border-radius:50%;background:#c0392b;"></span>Critical Priority</span>
            </label>
          </div>
          <!-- Urgency Panel -->
          <div id="modalUrgPanel" style="display:none;margin:0 20px 20px;border:1px solid #d5d2cc;border-radius:6px;overflow:hidden;">
            <div id="modalUrgHeader" style="padding:10px 16px;background:#f5f4f1;border-bottom:1px solid #d5d2cc;font-size:10.5px;color:#666;letter-spacing:.06em;display:flex;align-items:center;gap:10px;"></div>
            <div id="modalUrgRows" style="padding:14px 16px;display:flex;flex-direction:column;gap:8px;"></div>
            <div id="modalEscInstruction" style="margin:0 16px 14px;border-radius:4px;padding:10px 14px;font-size:12px;line-height:1.6;border-left:3px solid;"></div>
          </div>
        </div>

        <!-- Section 03: Subject Information -->
        <div style="border:1px solid #d5d2cc;border-radius:4px;margin-bottom:18px;overflow:hidden;">
          <div style="background:#f5f4f1;padding:10px 20px;border-bottom:1px solid #d5d2cc;font-size:11px;font-weight:500;color:#2d3a7c;letter-spacing:.1em;text-transform:uppercase;" class="skip-trace-section-header">03 — Subject Information</div>
          <div style="padding:20px;display:grid;grid-template-columns:1fr 1fr;gap:14px;" class="skip-trace-grid">
            <div class="field"><label style="font-size:12px;font-weight:500;letter-spacing:.04em;">First Name <span style="color:#999">*</span></label><input type="text" id="st-first" placeholder="John" style="font-family:var(--serif);font-size:15px;padding:11px 16px;border:1px solid #d5d2cc;border-radius:100px;outline:none;width:100%;box-sizing:border-box;"></div>
            <div class="field"><label style="font-size:12px;font-weight:500;letter-spacing:.04em;">Last Name <span style="color:#999">*</span></label><input type="text" id="st-last" placeholder="Doe" style="font-family:var(--serif);font-size:15px;padding:11px 16px;border:1px solid #d5d2cc;border-radius:100px;outline:none;width:100%;box-sizing:border-box;"></div>
            <div class="field"><label style="font-size:12px;font-weight:500;letter-spacing:.04em;">Middle Name</label><input type="text" id="st-middle" placeholder="Optional" style="font-family:var(--serif);font-size:15px;padding:11px 16px;border:1px solid #d5d2cc;border-radius:100px;outline:none;width:100%;box-sizing:border-box;"></div>
            <div class="field"><label style="font-size:12px;font-weight:500;letter-spacing:.04em;">Maiden Name / Aliases</label><input type="text" id="st-aliases" placeholder="Former names, nicknames" style="font-family:var(--serif);font-size:15px;padding:11px 16px;border:1px solid #d5d2cc;border-radius:100px;outline:none;width:100%;box-sizing:border-box;"></div>
            <div class="field"><label style="font-size:12px;font-weight:500;letter-spacing:.04em;">Date of Birth <span style="color:#999">*</span></label><input type="date" id="st-dob" style="font-family:var(--serif);font-size:15px;padding:11px 16px;border:1px solid #d5d2cc;border-radius:100px;outline:none;width:100%;box-sizing:border-box;"></div>
            <div class="field"><label style="font-size:12px;font-weight:500;letter-spacing:.04em;">Last Known Phone</label><input type="tel" id="st-phone2" placeholder="555-010-0199" maxlength="12" inputmode="tel" autocomplete="tel-national" pattern="\\d{3}-\\d{3}-\\d{4}" title="10-digit US phone" style="font-family:var(--serif);font-size:15px;padding:11px 16px;border:1px solid #d5d2cc;border-radius:100px;outline:none;width:100%;box-sizing:border-box;"></div>
            <div class="field full-width"><label style="font-size:12px;font-weight:500;letter-spacing:.04em;">Last Known Address <span style="color:#999">*</span></label><input type="text" id="st-address" placeholder="Street, city, state, zip" style="font-family:var(--serif);font-size:15px;padding:11px 16px;border:1px solid #d5d2cc;border-radius:100px;outline:none;width:100%;box-sizing:border-box;"></div>
            <div class="field"><label style="font-size:12px;font-weight:500;letter-spacing:.04em;">Last Known Email</label><input type="email" id="st-email2" placeholder="subject@email.com" style="font-family:var(--serif);font-size:15px;padding:11px 16px;border:1px solid #d5d2cc;border-radius:100px;outline:none;width:100%;box-sizing:border-box;"></div>
            <div class="field"><label style="font-size:12px;font-weight:500;letter-spacing:.04em;">Social Media Handles</label><input type="text" id="st-social" placeholder="@username / platform" style="font-family:var(--serif);font-size:15px;padding:11px 16px;border:1px solid #d5d2cc;border-radius:100px;outline:none;width:100%;box-sizing:border-box;"></div>
            <!-- Extended fields (shown conditionally) -->
            <div id="modalExtendedFields" style="display:contents;"></div>
          </div>
        </div>

        <!-- Section 04: Case Details -->
        <div style="border:1px solid #d5d2cc;border-radius:4px;margin-bottom:18px;overflow:hidden;">
          <div style="background:#f5f4f1;padding:10px 20px;border-bottom:1px solid #d5d2cc;font-size:11px;font-weight:500;color:#2d3a7c;letter-spacing:.1em;text-transform:uppercase;" class="skip-trace-section-header">04 — Case Details</div>
          <div style="padding:20px;display:grid;grid-template-columns:1fr 1fr;gap:14px;" class="skip-trace-grid">
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
            <div class="field"><label style="font-size:12px;font-weight:500;letter-spacing:.04em;">Rush Request?</label>
              <select id="st-rush" style="font-family:var(--serif);font-size:15px;padding:11px 16px;border:1px solid #d5d2cc;border-radius:100px;outline:none;width:100%;box-sizing:border-box;background:#fff;">
                <option value="no">No</option>
                <option value="yes">Yes — I understand rush fees apply</option>
              </select>
            </div>
            <div class="field"><label style="font-size:12px;font-weight:500;letter-spacing:.04em;">Prior Search Attempted?</label>
              <select id="st-prior" style="font-family:var(--serif);font-size:15px;padding:11px 16px;border:1px solid #d5d2cc;border-radius:100px;outline:none;width:100%;box-sizing:border-box;background:#fff;">
                <option value="no">No</option>
                <option value="yes">Yes — see notes below</option>
              </select>
            </div>
            <div class="field full-width"><label style="font-size:12px;font-weight:500;letter-spacing:.04em;">Additional Notes / Known Information</label>
              <textarea id="st-notes" placeholder="Known relatives, employers, vehicles, frequented locations, prior addresses..." style="font-family:var(--serif);font-size:15px;padding:12px 16px;border:1px solid #d5d2cc;border-radius:10px;outline:none;width:100%;box-sizing:border-box;min-height:72px;resize:vertical;"></textarea>
            </div>
          </div>
        </div>

        <!-- Section 05: Document Upload -->
        <div style="border:1px solid #d5d2cc;border-radius:4px;margin-bottom:18px;overflow:hidden;">
          <div style="background:#f5f4f1;padding:10px 20px;border-bottom:1px solid #d5d2cc;font-size:11px;font-weight:500;color:#2d3a7c;letter-spacing:.1em;text-transform:uppercase;" class="skip-trace-section-header">05 — Supporting Documents</div>
          <div style="padding:20px;" class="skip-trace-section-body">
            <div onclick="document.getElementById('st-files').click()" style="border:1.5px dashed #d5d2cc;border-radius:6px;background:#fff;padding:24px;text-align:center;cursor:pointer;transition:border-color .2s;" class="skip-trace-upload-area" onmouseover="this.style.borderColor='#2d3a7c'" onmouseout="this.style.borderColor='#d5d2cc'">
              <input type="file" id="st-files" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt" style="display:none;" onchange="handleModalFiles(this.files)">
              <div style="color:#666;font-size:14px;margin-bottom:4px;">Click to upload or drag files here</div>
              <div style="color:#999;font-size:12px;font-style:italic;">PDF, DOC, JPG, PNG — prior reports, court orders, subpoenas, ID verification</div>
            </div>
            <div id="modalFileList" style="display:flex;flex-direction:column;gap:8px;margin-top:14px;"></div>
          </div>
        </div>

        <!-- Section 06: Compliance -->
        <div style="border:1px solid #d5d2cc;border-radius:4px;margin-bottom:18px;overflow:hidden;">
          <div style="background:#f5f4f1;padding:10px 20px;border-bottom:1px solid #d5d2cc;font-size:11px;font-weight:500;color:#2d3a7c;letter-spacing:.1em;text-transform:uppercase;">06 — Compliance & Authorization <span style="color:#999">*</span></div>
          <div style="padding:16px 20px;display:flex;flex-direction:column;gap:0;">
            <label style="font-size:13px;color:#333;line-height:1.55;display:flex;align-items:flex-start;gap:10px;cursor:pointer;padding:10px 0;border-bottom:1px solid #e8e6e1;">
              <input type="checkbox" id="st-fcra1" required style="margin-top:2px;accent-color:#2d3a7c;flex-shrink:0;">
              <span>I certify that I have a permissible purpose under the Fair Credit Reporting Act (FCRA) for this request and that I am authorized to request this information.</span>
            </label>
            <label style="font-size:13px;color:#333;line-height:1.55;display:flex;align-items:flex-start;gap:10px;cursor:pointer;padding:10px 0;border-bottom:1px solid #e8e6e1;">
              <input type="checkbox" id="st-fcra2" required style="margin-top:2px;accent-color:#2d3a7c;flex-shrink:0;">
              <span>I acknowledge that any DMV or driver record data is accessed solely under Driver's Privacy Protection Act (DPPA)-compliant purposes.</span>
            </label>
            <label style="font-size:13px;color:#333;line-height:1.55;display:flex;align-items:flex-start;gap:10px;cursor:pointer;padding:10px 0;border-bottom:1px solid #e8e6e1;">
              <input type="checkbox" id="st-fcra3" required style="margin-top:2px;accent-color:#2d3a7c;flex-shrink:0;">
              <span>I confirm this information will not be used for stalking, harassment, or any unlawful purpose, and that I assume full legal responsibility for its use.</span>
            </label>
            <label style="font-size:13px;color:#333;line-height:1.55;display:flex;align-items:flex-start;gap:10px;cursor:pointer;padding:10px 0;border-bottom:1px solid #e8e6e1;">
              <input type="checkbox" id="st-fcra4" required style="margin-top:2px;accent-color:#2d3a7c;flex-shrink:0;">
              <span>I have read and agree to the terms of service, refund policy, and no-results policy.</span>
            </label>
            <label style="font-size:13px;color:#333;line-height:1.55;display:flex;align-items:flex-start;gap:10px;cursor:pointer;padding:10px 0;">
              <input type="checkbox" id="st-fcra5" required style="margin-top:2px;accent-color:#2d3a7c;flex-shrink:0;">
              <span>I understand that results are not guaranteed and that the refund policy applies as stated in the service agreement.</span>
            </label>
          </div>
        </div>

        <div id="st-modal-errors" role="alert" style="display:none;margin-bottom:14px;padding:12px 16px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;color:#991b1b;font-size:13px;line-height:1.5;"></div>

        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:16px;border-top:1px solid #d5d2cc;" class="skip-trace-footer">
          <p style="font-size:12px;color:#888;font-style:italic;max-width:380px;line-height:1.6;margin:0;">By submitting this form you acknowledge all compliance certifications above. Skip trace form must be completed before submitting.</p>
          <div style="display:flex;gap:10px;" class="skip-trace-footer-btns">
            <button type="button" onclick="closeSkipTraceModal()" style="font-family:var(--serif);font-size:13px;color:#666;background:none;border:1.5px solid #d5d2cc;border-radius:100px;padding:11px 22px;cursor:pointer;letter-spacing:.03em;">Cancel</button>
            <button type="button" onclick="saveSkipTraceForm()" style="font-family:var(--serif);font-size:14px;font-weight:400;background:#2d3a7c;color:#fff;border:none;border-radius:100px;padding:13px 28px;cursor:pointer;letter-spacing:.04em;white-space:nowrap;">Save &amp; Continue</button>
          </div>
        </div>
      </div>
    </div>
  `;
  modal.style.display = 'flex';
  modalUploadedFiles = [];
  if (skipTraceFormData && (isEdit || skipTraceModalFilled)) {
    populateSkipTraceModal(skipTraceFormData);
  } else if (!isEdit) {
    skipTraceModalFilled = false;
    skipTraceFormData = null;
    renderSkipTraceSummary();
  }
  if (!skipTraceFormData || !skipTraceFormData.uploadedFiles || !skipTraceFormData.uploadedFiles.length) {
    renderModalFileList();
  }
  if (window.initPhoneAutoFormat) window.initPhoneAutoFormat();
  initFutureDeadlineDateInputs(document.getElementById('skip-trace-modal-body'));
  if (!isEdit && !skipTraceFormData) {
    prefillSkipTraceFromMainForm();
    var selVal = activeServiceTypeSelection || (getActiveServiceTypeSelect() && getActiveServiceTypeSelect().value) || '';
    preselectSkipTraceTierFromDropdown(selVal);
  }
}

function prefillSkipTraceFromMainForm() {
  var form = document.getElementById('request-form')
    || document.querySelector('#home-form-container form')
    || document.querySelector('#contact-form-container form');
  if (!form) return;
  function fill(id, name) {
    var el = document.getElementById(id);
    var src = form.querySelector('[name="' + name + '"]');
    if (el && src && !el.value.trim()) el.value = src.value.trim();
  }
  fill('st-fullname', 'contactName');
  if (!document.getElementById('st-fullname').value.trim()) {
    var fn = form.querySelector('[name="firstName"]');
    var ln = form.querySelector('[name="lastName"]');
    if (fn || ln) {
      document.getElementById('st-fullname').value = ((fn ? fn.value : '') + ' ' + (ln ? ln.value : '')).trim();
    }
  }
  fill('st-company', 'clientName');
  if (!document.getElementById('st-company').value.trim()) fill('st-company', 'company');
  fill('st-email', 'email');
  fill('st-phone', 'phone');
  var stateEl = document.getElementById('req-state-value') || document.getElementById('state-value');
  var jur = document.getElementById('st-jurisdiction');
  if (jur && stateEl && !jur.value.trim()) jur.value = stateEl.value.trim();
}

function preselectSkipTraceTierFromDropdown(dropdownVal) {
  var tier = DROPDOWN_TO_SKIP_MODAL[dropdownVal];
  if (!tier) return;
  setTimeout(function() {
    var radio = document.querySelector('#skip-trace-modal-body input[name="st-service"][value="' + tier + '"]');
    if (radio) {
      radio.checked = true;
      var card = radio.closest('.svc-card');
      if (card) selectModalService(card, tier);
    }
  }, 0);
}

// Service type selection in modal
var modalUrgData = {
  standard: { label: 'Standard Priority', pillClass: 'p-standard', dotColor: '#16a34a', sla: '3–5 business days', queue: 'General Queue', escalate: 'None required', notify: 'Email on completion', esc: 'Assign to next available analyst. No supervisor flag needed. Standard verification sources only.', escColor: '#16a34a', escBorder: '#b4d8b8', escBg: '#e8f7ee' },
  deep: { label: 'Elevated Priority', pillClass: 'p-elevated', dotColor: '#2563eb', sla: '1–2 business days', queue: 'Priority Queue', escalate: 'Lead analyst review', notify: 'Email + SMS on completion', esc: 'Flag to lead analyst immediately. Ensure all extended sources are queried — associates, assets, employment, digital. Review before delivery.', escColor: '#2563eb', escBorder: '#b4c8e8', escBg: '#e8f0fc' },
  court: { label: 'High Priority', pillClass: 'p-high', dotColor: '#b7770d', sla: '24 hours', queue: 'Expedited Legal Queue', escalate: 'Supervisor sign-off required', notify: 'Email + SMS + call on delivery', esc: 'Route to senior analyst immediately. Supervisor must review and sign off before any report is sent. Document all sources thoroughly for affidavit use.', escColor: '#b7770d', escBorder: '#e8d0a8', escBg: '#fef3e2' },
  process: { label: 'Critical Priority', pillClass: 'p-critical', dotColor: '#c0392b', sla: '2–4 hours', queue: 'Emergency Queue — immediate pickup', escalate: 'On-call manager notified by phone', notify: 'Call client immediately on locate', esc: 'STOP current non-critical tasks. Assign the next available analyst right now. Notify the on-call manager by phone immediately. Client must be reached by phone — do not rely on email. Clock starts on receipt.', escColor: '#c0392b', escBorder: '#e8b4b4', escBg: '#fce8e8' }
};

function selectModalService(el, type) {
  document.querySelectorAll('#skip-trace-modal-body .svc-card').forEach(function(c) { c.style.borderColor = '#d5d2cc'; c.style.background = '#fff'; });
  el.style.borderColor = '#2d3a7c';
  el.style.background = '#f0f3f8';
  var radio = el.querySelector('input[name="st-service"]') || document.querySelector('#skip-trace-modal-body input[name="st-service"][value="' + type + '"]');
  if (radio) radio.checked = true;
  var d = modalUrgData[type];
  var panel = document.getElementById('modalUrgPanel');
  if (!panel) return;
  panel.style.display = 'block';
  var header = document.getElementById('modalUrgHeader');
  if (header) header.innerHTML = '<span style="color:#666;">INTERNAL ESCALATION KEY</span> <span style="display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:500;padding:3px 8px;border-radius:20px;text-transform:uppercase;letter-spacing:.04em;background:' + d.escBg + ';color:' + d.escColor + ';border:1px solid ' + d.escBorder + ';"><span style="width:5px;height:5px;border-radius:50%;background:' + d.dotColor + ';"></span>' + d.label + '</span>';
  var rows = document.getElementById('modalUrgRows');
  if (rows) rows.innerHTML = '<div style="display:flex;justify-content:space-between;font-size:12.5px;padding-bottom:8px;border-bottom:1px solid #e8e6e1;"><span style="color:#888;">SLA</span><span style="font-weight:500;color:#333;">' + d.sla + '</span></div><div style="display:flex;justify-content:space-between;font-size:12.5px;padding-bottom:8px;border-bottom:1px solid #e8e6e1;"><span style="color:#888;">Queue</span><span style="font-weight:500;color:#333;">' + d.queue + '</span></div><div style="display:flex;justify-content:space-between;font-size:12.5px;padding-bottom:8px;border-bottom:1px solid #e8e6e1;"><span style="color:#888;">Escalation</span><span style="font-weight:500;color:#333;">' + d.escalate + '</span></div><div style="display:flex;justify-content:space-between;font-size:12.5px;"><span style="color:#888;">Client Notification</span><span style="font-weight:500;color:#333;">' + d.notify + '</span></div>';
  var esc = document.getElementById('modalEscInstruction');
  if (esc) { esc.style.background = d.escBg; esc.style.borderLeftColor = d.escBorder; esc.style.color = d.escColor; esc.innerHTML = '<strong>Team Instruction:</strong> ' + d.esc; }
  // Show extended fields for deep/court/process
  var ext = document.getElementById('modalExtendedFields');
  if (!ext) return;
  if (type === 'deep' || type === 'court' || type === 'process') {
    ext.innerHTML = '<div class="field"><label style="font-size:12px;font-weight:500;letter-spacing:.04em;">SSN — Last 4 Digits</label><input type="text" id="st-ssn" maxlength="4" placeholder="XXXX" style="font-family:var(--serif);font-size:15px;padding:11px 16px;border:1px solid #d5d2cc;border-radius:100px;outline:none;width:100%;box-sizing:border-box;"></div><div class="field"><label style="font-size:12px;font-weight:500;letter-spacing:.04em;">Driver\'s License / State</label><input type="text" id="st-dl" placeholder="DL# — State" style="font-family:var(--serif);font-size:15px;padding:11px 16px;border:1px solid #d5d2cc;border-radius:100px;outline:none;width:100%;box-sizing:border-box;"></div><div class="field"><label style="font-size:12px;font-weight:500;letter-spacing:.04em;">Vehicle Info</label><input type="text" id="st-vehicle" placeholder="Make, model, plate number" style="font-family:var(--serif);font-size:15px;padding:11px 16px;border:1px solid #d5d2cc;border-radius:100px;outline:none;width:100%;box-sizing:border-box;"></div><div class="field"><label style="font-size:12px;font-weight:500;letter-spacing:.04em;">Known Employer</label><input type="text" id="st-employer" placeholder="Company name and location" style="font-family:var(--serif);font-size:15px;padding:11px 16px;border:1px solid #d5d2cc;border-radius:100px;outline:none;width:100%;box-sizing:border-box;"></div>';
    ext.style.display = 'contents';
  } else {
    ext.innerHTML = '';
    ext.style.display = 'contents';
  }
}

function closeSkipTraceModal() {
  var modal = document.getElementById('skip-trace-modal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
}

var modalUploadedFiles = [];
function handleModalFiles(files) {
  Array.from(files).forEach(function(f) {
    if (!modalUploadedFiles.find(function(x) { return x.name === f.name; })) {
      modalUploadedFiles.push(f);
    }
  });
  renderModalFileList();
}
function renderModalFileList() {
  var list = document.getElementById('modalFileList');
  if (!list) return;
  list.innerHTML = modalUploadedFiles.map(function(f, i) {
    return '<div style="display:flex;align-items:center;justify-content:space-between;background:#f5f4f1;border:1px solid #d5d2cc;border-radius:4px;padding:8px 14px;font-size:12.5px;color:#2e2e2e;font-family:var(--serif);"><span>' + f.name + ' <span style="color:#999">(' + (f.size/1024).toFixed(1) + ' KB)</span></span><button onclick="removeModalFile(' + i + ')" style="background:none;border:none;color:#999;cursor:pointer;font-size:18px;line-height:1;padding:0 4px;">×</button></div>';
  }).join('');
}
function removeModalFile(i) {
  modalUploadedFiles.splice(i, 1);
  renderModalFileList();
}

function clearSkipTraceValidationErrors() {
  var body = document.getElementById('skip-trace-modal-body');
  if (!body) return;
  body.querySelectorAll('input, select, textarea').forEach(function (el) {
    el.style.borderColor = '';
    el.style.outline = '';
  });
  ['st-fcra1', 'st-fcra2', 'st-fcra3', 'st-fcra4', 'st-fcra5'].forEach(function (id) {
    var cb = document.getElementById(id);
    var wrap = cb && cb.closest('label');
    if (wrap) {
      wrap.style.background = '';
      wrap.style.outline = '';
    }
  });
  var err = document.getElementById('st-modal-errors');
  if (err) {
    err.style.display = 'none';
    err.innerHTML = '';
  }
}

function showSkipTraceModalErrors(missing) {
  var err = document.getElementById('st-modal-errors');
  if (err && missing.length) {
    err.style.display = 'block';
    err.innerHTML = '<strong>Please complete the following before saving:</strong><ul style="margin:8px 0 0 18px;padding:0;">' +
      missing.map(function (m) { return '<li>' + escapeFormHtml(m) + '</li>'; }).join('') + '</ul>';
    err.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function resolveSkipTraceServiceSelection() {
  var selectedSvc = document.querySelector('#skip-trace-modal-body input[name="st-service"]:checked');
  if (selectedSvc) return selectedSvc;
  var dropdownSel = getActiveServiceTypeSelect();
  var dv = (dropdownSel && dropdownSel.value) || activeServiceTypeSelection || '';
  var tier = DROPDOWN_TO_SKIP_MODAL[dv];
  if (!tier) return null;
  var radio = document.querySelector('#skip-trace-modal-body input[name="st-service"][value="' + tier + '"]');
  if (radio) {
    radio.checked = true;
    var card = radio.closest('.svc-card');
    if (card) selectModalService(card, tier);
    return radio;
  }
  return null;
}

function saveSkipTraceForm() {
  clearSkipTraceValidationErrors();
  var missing = [];
  var firstBadEl = null;

  function need(id, label) {
    var el = document.getElementById(id);
    var v = el ? String(el.value || '').trim() : '';
    if (!v) {
      missing.push(label);
      if (el) {
        el.style.border = '2px solid #e74c3c';
        if (!firstBadEl) firstBadEl = el;
      }
    }
  }

  need('st-fullname', 'Full name');
  need('st-email', 'Email');
  need('st-phone', 'Phone');
  need('st-jurisdiction', 'State of jurisdiction');
  need('st-first', 'Subject first name');
  need('st-last', 'Subject last name');
  need('st-dob', 'Date of birth');
  need('st-address', 'Last known address');
  need('st-purpose', 'Purpose of search (select from dropdown)');
  need('st-deadline', 'Needed-by date');

  var stPhone = document.getElementById('st-phone');
  if (stPhone) {
    var d = (stPhone.value || '').replace(/\D/g, '');
    if (d.length > 0 && d.length < 10) {
      missing.push('Phone (enter all 10 digits)');
      stPhone.style.border = '2px solid #e74c3c';
      if (!firstBadEl) firstBadEl = stPhone;
    }
  }

  var complianceChecks = [
    { id: 'st-fcra1', label: 'FCRA permissible purpose certification' },
    { id: 'st-fcra2', label: 'DPPA compliance acknowledgment' },
    { id: 'st-fcra3', label: 'Lawful use certification' },
    { id: 'st-fcra4', label: 'Terms of service agreement' },
    { id: 'st-fcra5', label: 'Refund / no-results policy acknowledgment' }
  ];
  complianceChecks.forEach(function (item) {
    var cb = document.getElementById(item.id);
    if (!cb || cb.checked) return;
    missing.push(item.label);
    var wrap = cb.closest('label');
    if (wrap) {
      wrap.style.background = '#fef2f2';
      wrap.style.outline = '2px solid #e74c3c';
      if (!firstBadEl) firstBadEl = wrap;
    }
  });

  var selectedSvc = resolveSkipTraceServiceSelection();
  if (!selectedSvc) {
    missing.push('Skip trace service type (choose one card in section 02)');
  }

  if (missing.length) {
    showSkipTraceModalErrors(missing);
    if (firstBadEl && firstBadEl.scrollIntoView) {
      firstBadEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }

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

  var serviceTypeMap = { standard: 'Standard Skip Trace', deep: 'Deep Skip Trace', court: 'Court-Ready / Affidavit-Grade', process: 'Process Server Locate' };
  var serviceTypeVal = selectedSvc ? (serviceTypeMap[selectedSvc.value] || '') : '';
  var dropdownSel = getActiveServiceTypeSelect();

  skipTraceFormData = {
    dropdownLabel: dropdownSel ? dropdownSel.value : activeServiceTypeSelection,
    fullname: fullname,
    company: document.getElementById('st-company') ? document.getElementById('st-company').value.trim() : '',
    email: email,
    phone: phone,
    role: document.getElementById('st-role') ? document.getElementById('st-role').value : '',
    jurisdiction: jurisdiction,
    serviceType: serviceTypeVal,
    firstName: first,
    lastName: last,
    middleName: document.getElementById('st-middle') ? document.getElementById('st-middle').value.trim() : '',
    aliases: document.getElementById('st-aliases') ? document.getElementById('st-aliases').value.trim() : '',
    dob: dob,
    lastPhone: document.getElementById('st-phone2') ? document.getElementById('st-phone2').value.trim() : '',
    lastAddress: address,
    lastEmail: document.getElementById('st-email2') ? document.getElementById('st-email2').value.trim() : '',
    social: document.getElementById('st-social') ? document.getElementById('st-social').value.trim() : '',
    ssn: document.getElementById('st-ssn') ? document.getElementById('st-ssn').value.trim() : '',
    dl: document.getElementById('st-dl') ? document.getElementById('st-dl').value.trim() : '',
    vehicle: document.getElementById('st-vehicle') ? document.getElementById('st-vehicle').value.trim() : '',
    employer: document.getElementById('st-employer') ? document.getElementById('st-employer').value.trim() : '',
    purpose: purpose,
    caseNumber: document.getElementById('st-case') ? document.getElementById('st-case').value.trim() : '',
    court: document.getElementById('st-court') ? document.getElementById('st-court').value.trim() : '',
    deadline: deadline,
    rush: document.getElementById('st-rush') ? document.getElementById('st-rush').value : 'no',
    priorSearch: document.getElementById('st-prior') ? document.getElementById('st-prior').value : 'no',
    notes: document.getElementById('st-notes') ? document.getElementById('st-notes').value.trim() : '',
    fcraCertified: true,
    uploadedFiles: modalUploadedFiles.length
      ? modalUploadedFiles.map(function(f) { return f.name; })
      : ((skipTraceFormData && skipTraceFormData.uploadedFiles) || [])
  };
  skipTraceModalFilled = true;
  closeSkipTraceModal();
  renderSkipTraceSummary();
  var reqForm = document.getElementById('request-form');
  if (reqForm) {
    prefillRequestFormFromSkipTrace(reqForm);
    syncSkipTraceMainFormRequirements(getActiveServiceTypeSelect() ? getActiveServiceTypeSelect().value : '');
  }
  var toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = 'Skip trace details saved. Review the summary below or click Edit to change.';
    toast.className = 'toast show ok';
    setTimeout(function() { toast.classList.remove('show'); }, 4000);
  } else {
    alert('Skip trace details saved. You can review them below the Service Type field, then submit your request.');
  }
}

function initHomeSkipTraceSection(containerId) {
  var cid = containerId || 'home-form-container';
  if (!document.querySelector('#' + cid)) cid = 'request-form';
  var sel = document.querySelector('#' + cid + ' select[name="serviceType"]');
  if (!sel) return;
  if (sel.dataset.skipTraceBound === '1') return;
  sel.dataset.skipTraceBound = '1';

  sel.addEventListener('change', function() {
    activeServiceTypeSelection = sel.value;
    syncSkipTraceMainFormRequirements(sel.value);
    syncHomeProcessServeSection(cid);
    if (isSkipTraceService(sel.value)) {
      openSkipTraceModal();
    } else if (skipTraceModalFilled) {
      skipTraceFormData = null;
      skipTraceModalFilled = false;
      renderSkipTraceSummary();
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

/** US ZIP: digits only, max 5 (for live input / paste). */
function sanitizeUsZip5(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 5);
}

function isUsZip5(value) {
  return /^\d{5}$/.test(String(value || '').trim());
}

function attachUsZipInput(el) {
  if (!el || el.getAttribute('data-us-zip-bound') === '1') return;
  el.setAttribute('data-us-zip-bound', '1');
  el.setAttribute('inputmode', 'numeric');
  el.setAttribute('maxlength', '5');
  if (el.id !== 'home-def-zip') {
    el.setAttribute('pattern', '\\d{5}');
    el.setAttribute('title', 'Enter exactly 5 digits (US ZIP)');
  } else {
    el.setAttribute('title', '5-digit US ZIP, or leave blank');
  }
  if (!el.getAttribute('autocomplete')) el.setAttribute('autocomplete', 'postal-code');
  function sync() {
    var v = sanitizeUsZip5(el.value);
    if (el.value !== v) el.value = v;
  }
  el.addEventListener('input', sync);
  el.addEventListener('blur', sync);
}

/** Client ZIP, process-serve ZIP row, and additional-defendant modal ZIP. */
function initUsZipInputs(root) {
  var base = root || document;
  base.querySelectorAll('input[name="zip"],input[name="serve_zip"],#home-def-zip').forEach(attachUsZipInput);
}

/** Human-readable label for validation messages (uses label text, data-field-label, id, or name). */
function getFieldDisplayLabel(el) {
  if (!el) return 'Field';
  var custom = el.getAttribute('data-field-label');
  if (custom) return custom.trim();
  var id = el.id || '';
  var byId = {
    'reason-input': 'Reason for contact',
    'city-input': 'City',
    'state-input': 'State',
    'req-city-input': 'City',
    'req-state-input': 'State',
    'home-svc-city-input': 'Service city',
    'home-svc-state-input': 'Service state',
    'home-file-input': 'File upload',
    'file-input': 'File upload',
    'home-deadlineDate': 'Deadline date',
    'st-fullname': 'Full name',
    'st-email': 'Email',
    'st-phone': 'Phone',
    'st-jurisdiction': 'State of jurisdiction',
    'st-first': 'Subject first name',
    'st-last': 'Subject last name',
    'st-dob': 'Date of birth',
    'st-address': 'Last known address',
    'st-purpose': 'Permissible purpose',
    'st-deadline': 'Needed-by date',
    'st-phone2': 'Last known phone',
    'def-first-name': 'First name',
    'def-middle-name': 'Middle name',
    'def-last-name': 'Last name',
    'def-address': 'Service address',
    'def-city': 'City',
    'def-state-input': 'State',
    'def-dob': 'Date of birth',
    'def-phone': 'Phone number',
    'home-def-first-name': 'First name',
    'home-def-middle-name': 'Middle name',
    'home-def-last-name': 'Last name',
    'home-def-address': 'Service address',
    'home-def-city': 'City',
    'home-def-state-input': 'State',
    'home-def-zip': 'ZIP code',
    'home-def-dob': 'Date of birth',
    'home-def-phone': 'Phone number'
  };
  if (byId[id]) return byId[id];
  if ((el.name || '') === 'zip') return 'ZIP code';
  if ((el.name || '') === 'serve_zip') return 'Service ZIP code';
  if ((el.name || '') === 'addressLine1') return 'Service address (line 1)';
  if ((el.name || '') === 'serve_addressLine1') return 'Process serve address (line 1)';
  if ((el.name || '') === 'defendantName') return 'Defendant / recipient full name';
  var aria = el.getAttribute('aria-label');
  if (aria) return aria.trim();
  var wrap = el.closest('.form-group');
  if (wrap) {
    var lab = wrap.querySelector('label');
    if (lab) {
      var t = (lab.innerText || lab.textContent || '')
        .replace(/\s*\([^)]*\)\s*/g, ' ')
        .replace(/\s*\*\s*/g, '')
        .replace(/\(required\)/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (t) return t.split('\n')[0].trim();
    }
  }
  if (el.name) return el.name.replace(/_/g, ' ').replace(/\b\w/g, function (ch) { return ch.toUpperCase(); });
  if (el.placeholder) return el.placeholder;
  return 'Field';
}

function showMissingFieldsAlert(introLine, missingLabels) {
  var list = [...new Set((missingLabels || []).filter(Boolean))];
  if (!list.length) {
    alert(introLine || 'Some required information is missing.');
    return;
  }
  var body = list.map(function (name) { return '• ' + name + ' is missing.'; }).join('\n');
  alert((introLine ? introLine + '\n\n' : '') + body);
}

function isProcessExtraVisible() {
  var ex = document.getElementById('home-process-extra');
  if (!ex) return false;
  return ex.style.display === 'block' || window.getComputedStyle(ex).display === 'block';
}

function defendantNameInputInForm(form) {
  var ex = form && form.querySelector('#home-process-extra');
  if (ex && isProcessExtraVisible()) {
    var inner = ex.querySelector('[name="serve_defendantName"]');
    if (inner) return inner;
  }
  return form ? form.querySelector('[name="defendantName"]') : null;
}

function setProcessExtraFieldsDisabled(disabled) {
  var wrap = document.getElementById('home-process-extra');
  if (!wrap) return;
  wrap.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach(function (el) {
    el.disabled = !!disabled;
  });
}

function toggleHomeMultiDefTextarea(containerId) {
  var cid = containerId || 'home-form-container';
  if (!document.querySelector('#' + cid)) cid = 'request-form';
  console.log('[DEBUG toggleHomeMultiDefTextarea] cid:', cid, 'homeDefendantsArray length:', homeDefendantsArray.length);
  var yes = document.querySelector('#' + cid + ' input[name="home_multiple_defendants"][value="yes"]');
  var listContainer = document.getElementById('home-defendants-list-container');
  var addBtn = document.getElementById('home-btn-add-defendant');
  var isYes = yes && yes.checked;
  if (listContainer) listContainer.style.display = isYes ? 'flex' : 'none';
  if (addBtn) addBtn.style.display = isYes ? 'block' : 'none';
  if (isYes && homeDefendantsArray.length > 0) {
    console.log('[DEBUG toggleHomeMultiDefTextarea] calling renderHomeDefendantsList');
    renderHomeDefendantsList();
  }
}

function syncHomeProcessServeSection(containerId) {
  var cid = containerId || 'home-form-container';
  if (!document.querySelector('#' + cid)) cid = 'request-form';
  var wrap = document.getElementById('home-process-extra');
  var sel = document.querySelector('#' + cid + ' select[name="serviceType"]');
  if (!wrap || !sel) return;
  var show = HOME_PROCESS_SERVE_TYPES.indexOf(sel.value) !== -1;
  wrap.style.display = show ? 'block' : 'none';
  setProcessExtraFieldsDisabled(!show);
  wrap.querySelectorAll('[data-home-required]').forEach(function (el) {
    if (show) el.setAttribute('required', 'required');
    else el.removeAttribute('required');
  });
  if (!show) {
    var dd = document.getElementById('home-deadlineDate');
    if (dd) dd.value = '';
  } else {
    ensureDefaultServiceState();
    initFutureDeadlineDateInputs(wrap);
  }
}

function initHomeProcessServeSection(containerId) {
  var cid = containerId || 'home-form-container';
  if (!document.querySelector('#' + cid)) cid = 'request-form';
  var sel = document.querySelector('#' + cid + ' select[name="serviceType"]');
  if (!sel) return;
  if (sel.dataset.processServeBound === '1') return;
  sel.dataset.processServeBound = '1';

  sel.addEventListener('change', function() {
    syncHomeProcessServeSection(cid);
    if (HOME_PROCESS_SERVE_TYPES.indexOf(sel.value) !== -1 && skipTraceModalFilled) {
      skipTraceFormData = null;
      skipTraceModalFilled = false;
      renderSkipTraceSummary();
    }
  });
  syncHomeProcessServeSection(cid);
  var hc = document.getElementById(cid);
  if (hc) initFutureDeadlineDateInputs(hc);

  var radios = document.querySelectorAll('#' + cid + ' input[name="home_multiple_defendants"]');
  radios.forEach(function(r) {
    r.addEventListener('change', function() { toggleHomeMultiDefTextarea(cid); });
  });
  toggleHomeMultiDefTextarea(cid);
  initHomeFileUploadPreview();
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
      html += '<span style="background:#e8f0fe;padding:6px 12px;border-radius:4px;font-size:12px;">' + escapeFormHtml(file.name) + '</span>';
    });
    html += '</div>';
    fileList.innerHTML = html;
    if (uploadText) uploadText.textContent = files.length === 1 ? '1 file selected' : files.length + ' files selected';
  });
}

function validateHomeProcessServeFields(form) {
  var missing = [];
  function mark(el, bad) {
    if (!el) return;
    el.style.border = bad ? '2px solid #e74c3c' : '';
  }
  var a1 = form.querySelector('[name="serve_addressLine1"]');
  mark(a1, !(a1 && a1.value.trim()));
  if (!(a1 && a1.value.trim())) missing.push('Service address (line 1)');

  var cv = document.getElementById('home-svc-city-value');
  var ci = document.getElementById('home-svc-city-input');
  var cityOk = (cv && cv.value.trim()) || (ci && ci.value.trim());
  mark(ci, !cityOk);
  if (!cityOk) missing.push('Service city');

  var sv = document.getElementById('home-svc-state-value');
  var si = document.getElementById('home-svc-state-input');
  mark(si, !(sv && sv.value.trim()));
  if (!(sv && sv.value.trim())) missing.push('Service state');

  var zp = form.querySelector('[name="serve_zip"]');
  mark(zp, !(zp && isUsZip5(zp.value)));
  if (!(zp && isUsZip5(zp.value))) missing.push('Service ZIP code (5 digits)');

  var defn = defendantNameInputInForm(form);
  mark(defn, !(defn && defn.value.trim()));
  if (!(defn && defn.value.trim())) missing.push('Defendant / recipient full name');

  var fi = document.getElementById('home-file-input');
  if (fi) {
    mark(fi, !(fi.files && fi.files.length));
    if (!(fi.files && fi.files.length)) missing.push('File upload');
  }

  var dd = document.getElementById('home-deadlineDate');
  if (dd && dd.value && dd.min && dd.value < dd.min) {
    mark(dd, true);
    missing.push('Deadline date (must be a future date)');
  }

  if (missing.length) {
    showMissingFieldsAlert('Please complete the following process serving details:', missing);
    return false;
  }
  return true;
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
    var el = form.querySelector('[name="serve_defendantName"]');
    return el ? el.value.trim() : '';
  })());
  fd.append('caseNumber', (function () {
    var el = form.querySelector('[name="serve_caseNumber"]');
    return el ? el.value.trim() : '';
  })());
  fd.append('courtJurisdiction', (function () {
    var el = form.querySelector('[name="serve_courtJurisdiction"]');
    return el ? el.value.trim() : '';
  })());
  var multiYes = document.querySelector('#home-form-container input[name="home_multiple_defendants"][value="yes"]')
    || document.querySelector('#contact-form-container input[name="home_multiple_defendants"][value="yes"]');
  fd.append('multiple_defendants', multiYes && multiYes.checked ? 'true' : 'false');
  fd.append('defendantsData', JSON.stringify(homeDefendantsArray));
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
      var st = (form.querySelector('[name="serviceType"]') || {}).value || '';
      // Store submission context and redirect to payment page for checkout
      if (data.submissionId) {
        sessionStorage.setItem('ps_submissionId', data.submissionId);
      }
      var emailField = form.querySelector('[name="email"]') || form.querySelector('[type="email"]');
      if (emailField && emailField.value) {
        sessionStorage.setItem('ps_customerEmail', emailField.value.trim());
      }
      setTimeout(function () {
        redirectAfterServiceSubmit(st, data.submissionId);
      }, 1200);
      form.reset();
      syncHomeProcessServeSection();
      homeDefendantsArray = [];
      renderHomeDefendantsList();
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

function getRequestFormFieldsHtml() {
  return `
    <div class="form-group"><label>Client / Firm Name <span class="req">(required)</span></label><input type="text" name="clientName" required></div>
    <div class="form-group"><label>Contact Name <span class="req">(required)</span></label><input type="text" name="contactName" required></div>
    <div class="form-group"><label>Email Address <span class="req">(required)</span></label><input type="email" name="email" required></div>
    <div class="form-group"><label>Phone Number <span class="req">(required)</span></label><input type="tel" name="phone" placeholder="555-010-0199" maxlength="12" inputmode="tel" autocomplete="tel-national" pattern="\\d{3}-\\d{3}-\\d{4}" title="10-digit US phone" required></div>
    <div class="form-group">
      <label>Service Address <span class="req">(required)</span></label>
      <input type="text" name="addressLine1" placeholder="Address Line 1" style="margin-bottom:8px;">
      <input type="text" name="addressLine2" placeholder="Address Line 2" style="margin-bottom:8px;">
      <div class="city-state-zip-row" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
        <div class="city-select-wrapper">
          <input type="text" id="req-city-input" name="city" placeholder="City" autocomplete="off">
          <input type="hidden" id="req-city-value" value="">
          <div class="city-dropdown" id="req-city-dropdown"></div>
        </div>
        <div class="state-select-wrapper">
          <input type="text" id="req-state-input" placeholder="State" autocomplete="off">
          <input type="hidden" id="req-state-value" name="state" value="CA">
          <div class="state-dropdown" id="req-state-dropdown"></div>
        </div>
        <input type="text" name="zip" placeholder="12345" maxlength="5" inputmode="numeric" pattern="\\d{5}" title="5-digit US ZIP" autocomplete="postal-code" required>
      </div>
    </div>
    <div class="form-group"><label>Defendant / Recipient Full Name <span class="req">(required)</span></label><input type="text" name="defendantName" required></div>
    <div class="form-group"><label>Case Number</label><input type="text" name="caseNumber"></div>
    <div class="form-group"><label>Court / Jurisdiction</label><input type="text" name="courtJurisdiction"></div>
    <div class="form-group">
      <label>Are there multiple defendants to be served?</label>
      <div class="form-hint" style="margin-bottom:10px;">Selecting &quot;Yes&quot; allows you to add up to 10 additional defendants.</div>
      <div class="radio-toggle-group">
        <label class="radio-toggle"><input type="radio" name="multiple_defendants" value="yes"><span>Yes</span></label>
        <label class="radio-toggle"><input type="radio" name="multiple_defendants" value="no" checked><span>No</span></label>
      </div>
      <div id="defendants-list-container" style="display:none; flex-direction:column; gap:10px; margin-bottom: 15px;"></div>
      <button type="button" id="btn-add-defendant" class="btn-navy" style="display:none; width:auto; padding: 10px 20px; background-color: #f4f4f4; color: #333; border: 1px solid #ccc;" onclick="openDefendantModal()">+ Add Defendant</button>
    </div>
    <div class="form-group">
      <label>Service Type <span class="req">(required)</span></label>
      <div class="form-hint" style="margin-bottom:8px;">Emergency service requires internal approval. Additional fees apply.</div>
      <select name="serviceType" required>
        <option value="">Select an option</option>
        <option value="Standard Service — $97.99 (5–7 business days)">Standard Service — $97.99 (5–7 business days)</option>
        <option value="Rush Service — $119.99 (3 business days)">Rush Service — $119.99 (3 business days)</option>
        <option value="Priority Serve — $149.99 (2 business days)">Priority Serve — $149.99 (2 business days)</option>
        <option value="Emergency Serve — $249.99 (Same-day, approval required)">Emergency Serve — $249.99 (Same-day, approval required)</option>
        <option value="Standard Skip Trace — $75">Standard Skip Trace — $75</option>
        <option value="Enhanced Trace — $150">Enhanced Trace — $150</option>
        <option value="Rush Trace (same/next-day) — $225">Rush Trace (same/next-day) — $225</option>
        <option value="Business / Agent Verification — $225">Business / Agent Verification — $225</option>
        <option value="Court-Ready Skip Trace Report — $250">Court-Ready Skip Trace Report — $250</option>
      </select>
      <div id="skip-trace-summary-container" style="display:none; flex-direction:column; gap:10px; margin-top:12px;"></div>
    </div>
    <div id="home-process-extra" class="home-process-extra" style="display:none;">
      <p class="form-hint" style="margin:12px 0 16px;font-style:italic;">Complete process serving details below.</p>
      <div class="form-group">
        <label>Service Address <span class="req">(required)</span></label>
        <input type="text" name="serve_addressLine1" data-home-required placeholder="Address Line 1" style="margin-bottom:8px;">
        <input type="text" name="serve_addressLine2" placeholder="Address Line 2" style="margin-bottom:8px;">
        <div class="city-state-zip-row" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
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
          <input type="text" name="serve_zip" data-home-required placeholder="12345" maxlength="5" inputmode="numeric" pattern="\\d{5}" title="5-digit US ZIP" autocomplete="postal-code">
        </div>
      </div>
      <div class="form-group"><label>Defendant / Recipient Full Name <span class="req">(required)</span></label><input type="text" name="serve_defendantName" data-home-required></div>
      <div class="form-group"><label>Case Number</label><input type="text" name="serve_caseNumber"></div>
      <div class="form-group"><label>Court / Jurisdiction</label><input type="text" name="serve_courtJurisdiction"></div>
      <div class="form-group">
        <label>Are there multiple defendants to be served?</label>
        <div class="form-hint" style="margin-bottom:10px;">Selecting &quot;Yes&quot; allows you to add up to 10 additional defendants.</div>
        <div class="radio-toggle-group">
          <label class="radio-toggle"><input type="radio" name="home_multiple_defendants" value="yes"><span>Yes</span></label>
          <label class="radio-toggle"><input type="radio" name="home_multiple_defendants" value="no" checked><span>No</span></label>
        </div>
        <div id="home-defendants-list-container" style="display:none; flex-direction:column; gap:10px; margin-bottom: 15px;"></div>
        <button type="button" id="home-btn-add-defendant" class="btn-navy" style="display:none; width:auto; padding: 10px 20px; background-color: #f4f4f4; color: #333; border: 1px solid #ccc;" onclick="openHomeDefendantModal()">+ Add Defendant</button>
      </div>
      <div class="form-group"><label>Deadline Date</label><input type="date" name="home_deadlineDate" id="home-deadlineDate" data-min-tomorrow></div>
      <div class="form-group">
        <label>Upload Documents <span class="req">(required)</span></label>
        <div class="form-hint" style="margin-bottom:8px;">Upload all documents to be served. PDF, Word, and image files are accepted.</div>
        <div class="file-upload-area" onclick="this.querySelector('input').click()">
          <input type="file" id="home-file-input" name="files" style="display:none;" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" data-home-required>
          <span id="home-file-upload-text">+ Add Files</span>
        </div>
        <div id="home-file-list" style="margin-top:8px;font-size:13px;color:#333;"></div>
      </div>
    </div>
    <div class="form-group"><label>Special Instructions</label><textarea name="specialInstructions" rows="3"></textarea></div>`;
}

function buildHomeRequestForm(containerId, formId) {
  var c = document.getElementById(containerId);
  if (!c) return;
  c.innerHTML = `
    <form id="request-form" onsubmit="handleRequestSubmit(event)" novalidate>
    ${getRequestFormFieldsHtml()}
    <div class="form-checkbox">
      <input type="checkbox" id="${formId}-consent" name="consent" required>
      <label for="${formId}-consent">I understand that submitting this form does not guarantee service and all requests are subject to review and availability.</label>
    </div>
    <button type="submit" class="btn-navy" style="width:100%;">Submit Request</button>
    <div class="form-success" id="home-success">Thank you! Your request has been received. We'll review it and be in touch shortly.</div>
    <div class="toast" id="toast" aria-live="polite"></div>
    </form>
  `;
  if (window.initPhoneAutoFormat) window.initPhoneAutoFormat();
  initRequestFormBindings(c);
}

function initRequestFormBindings(root) {
  var scope = root || document;
  var reqForm = scope.querySelector ? scope.querySelector('#request-form') : document.getElementById('request-form');
  if (!reqForm) return;
  if (reqForm.dataset.requestFormBound !== '1') {
    reqForm.dataset.requestFormBound = '1';
    reqForm.querySelectorAll('input[name="multiple_defendants"]').forEach(function (r) {
      r.addEventListener('change', toggleDefendantUI);
    });
    toggleDefendantUI();
    var stSel = reqForm.querySelector('select[name="serviceType"]');
    if (stSel) syncSkipTraceMainFormRequirements(stSel.value);
  }
  if (document.getElementById('req-city-input')) {
    initCityAutocomplete('req-city-input', 'req-city-value', 'req-city-dropdown', 'req-state-input');
    initStateAutocomplete('req-state-input', 'req-state-value', 'req-state-dropdown', 'CA');
  }
  initFutureDeadlineDateInputs(scope);
  initUsZipInputs(scope);
  var homeContainer = document.getElementById('home-form-container');
  initHomeProcessServeSection(homeContainer ? 'home-form-container' : 'request-form');
  initHomeSkipTraceSection(homeContainer ? 'home-form-container' : 'request-form');
  if (document.getElementById('home-svc-city-input')) {
    initCityAutocomplete('home-svc-city-input', 'home-svc-city-value', 'home-svc-city-dropdown', 'home-svc-state-input');
    initStateAutocomplete('home-svc-state-input', 'home-svc-state-value', 'home-svc-state-dropdown', 'CA');
  }
  initFileUpload();
}

function buildContactForm(containerId, formId) {
  const c = document.getElementById(containerId);
  if (!c) return;
  const isHome = formId === 'home';
  const isContact = formId === 'contact';
  const processExtra = (isHome || isContact) ? `
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
          <input type="text" name="serve_zip" data-home-required placeholder="12345" maxlength="5" inputmode="numeric" pattern="\\d{5}" title="5-digit US ZIP" autocomplete="postal-code">
        </div>
      </div>
      <div class="form-group"><label>Defendant / Recipient Full Name <span class="req">(required)</span></label><input type="text" name="serve_defendantName" data-home-required></div>
      <div class="form-group"><label>Case Number</label><input type="text" name="serve_caseNumber"></div>
      <div class="form-group"><label>Court / Jurisdiction</label><input type="text" name="serve_courtJurisdiction"></div>
      <div class="form-group">
        <label>Are there multiple defendants to be served?</label>
        <div class="form-hint" style="margin-bottom:10px;">Selecting &quot;Yes&quot; opens the defendant entry form. You can add up to 10 defendants.</div>
        <div class="radio-toggle-group">
          <label class="radio-toggle"><input type="radio" name="home_multiple_defendants" value="yes"><span>Yes</span></label>
          <label class="radio-toggle"><input type="radio" name="home_multiple_defendants" value="no" checked><span>No</span></label>
        </div>
        <div id="home-defendants-list-container" style="display:none; flex-direction:column; gap:10px; margin-top: 10px;"></div>
        <button type="button" id="home-btn-add-defendant" class="btn-navy" style="display:none; width:auto; padding: 10px 20px; margin-top: 10px; background-color: #f4f4f4; color: #333; border: 1px solid #ccc;" onclick="openHomeDefendantModal(-1)">+ Add Defendant</button>
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
    <div class="form-group"><label>Phone <span class="req">(required)</span></label><input type="tel" name="phone" placeholder="555-010-0199" maxlength="12" inputmode="tel" autocomplete="tel-national" pattern="\\d{3}-\\d{3}-\\d{4}" title="10-digit US phone" required></div>
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
      <div id="skip-trace-summary-container" style="display:none; flex-direction:column; gap:10px; margin-top:12px;"></div>
    </div>
    ${processExtra}
    <div class="form-checkbox">
      <input type="checkbox" id="${formId}-consent" name="consent" required>
      <label for="${formId}-consent">I understand that submitting this form does not guarantee service and all requests are subject to review and availability.</label>
    </div>
    <button type="submit" class="btn-navy">Submit</button>
    <div class="form-success" id="${formId}-success">Thank you! We'll be in touch shortly.</div>
    </form>
  `;

  // Apply phone auto-format to any tel inputs just added to the DOM
  if (window.initPhoneAutoFormat) {
    window.initPhoneAutoFormat();
  }
  initUsZipInputs(c);
}

function handleFormSubmit(event, id, formType) {
  event.preventDefault();
  const form = event.target;
  var missing = [];

  const requiredFields = form.querySelectorAll('[required]');
  requiredFields.forEach(function(field) {
    var empty = field.type === 'checkbox' ? !field.checked : !String(field.value || '').trim();
    if (empty) {
      missing.push(getFieldDisplayLabel(field));
      field.style.border = field.type === 'checkbox' ? '' : '2px solid #e74c3c';
      if (field.type === 'checkbox') field.style.outline = '2px solid #e74c3c';
    } else {
      field.style.border = '';
      if (field.type === 'checkbox') field.style.outline = '';
    }
  });

  const consent = form.querySelector('input[name="consent"]') || form.querySelector('input[type="checkbox"][required]');
  if (consent && !consent.checked) {
    missing.push('Consent confirmation');
    consent.style.outline = '2px solid #e74c3c';
  } else if (consent) {
    consent.style.outline = '';
  }

  var reasonVal = document.getElementById('reason-value');
  var reasonIn = document.getElementById('reason-input');
  if (reasonIn && form.contains(reasonIn) && reasonIn.required && !(reasonVal && reasonVal.value.trim())) {
    missing.push('Reason for contact');
    reasonIn.style.border = '2px solid #e74c3c';
  } else if (reasonIn && form.contains(reasonIn)) {
    reasonIn.style.border = '';
  }

  var cityValEl = document.getElementById('city-value');
  var cityInEl = document.getElementById('city-input');
  if (cityInEl && form.contains(cityInEl) && cityInEl.required && !(cityValEl && cityValEl.value.trim())) {
    if (missing.indexOf('City') === -1) missing.push('City');
    cityInEl.style.border = '2px solid #e74c3c';
  } else if (cityInEl && form.contains(cityInEl)) {
    cityInEl.style.border = '';
  }

  var stateValEl = document.getElementById('state-value');
  var stateInEl = document.getElementById('state-input');
  if (stateInEl && form.contains(stateInEl) && stateInEl.required && !(stateValEl && stateValEl.value.trim())) {
    if (missing.indexOf('State') === -1) missing.push('State');
    stateInEl.style.border = '2px solid #e74c3c';
  } else if (stateInEl && form.contains(stateInEl)) {
    stateInEl.style.border = '';
  }

  var phoneEl = form.querySelector('input[name="phone"][type="tel"]');
  if (phoneEl) {
    phoneEl.style.border = '';
    var pd = (phoneEl.value || '').replace(/\D/g, '');
    if (pd.length > 0 && pd.length < 10) {
      missing.push('Phone number (enter all 10 digits)');
      phoneEl.style.border = '2px solid #e74c3c';
    }
  }

  if (missing.length) {
    showMissingFieldsAlert('Please complete your submission:', missing);
    return;
  }

  if (formType === 'contact') {
    const serviceTypeVal = form.querySelector('[name="serviceType"]')?.value || '';
    const isHomeProcess =
      (Boolean(form.closest('#home-form-container')) || Boolean(form.closest('#contact-form-container'))) &&
      HOME_PROCESS_SERVE_TYPES.indexOf(serviceTypeVal) !== -1;
    if (isHomeProcess) {
      if (!validateHomeProcessServeFields(form)) return;
      submitHomeProcessServe(form, id);
      return;
    }
    const isSkipTrace = isSkipTraceService(serviceTypeVal);
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
      urgency: form.querySelector('[name="urgency"]')?.value || (skipTraceFormData && skipTraceFormData.rush ? (skipTraceFormData.rush === 'yes' ? 'High' : 'Standard') : ''),
      serviceType: form.querySelector('[name="serviceType"]')?.value || '',
      consent: form.querySelector('[name="consent"]')?.checked || false,
      skipTraceData: skipTraceFormData
    };
    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
    .then(function(res) {
      return res.json();
    })
    .then(function(data) {
      if (data.success) {
        var serviceType = form.querySelector('[name="serviceType"]')?.value || '';
        if (isSkipTraceService(serviceType)) {
          if (data.submissionId) sessionStorage.setItem('ps_submissionId', data.submissionId);
          var emailField = form.querySelector('[name="email"]');
          if (emailField && emailField.value) sessionStorage.setItem('ps_customerEmail', emailField.value.trim());
          setTimeout(function () { redirectAfterServiceSubmit(serviceType, data.submissionId); }, 1200);
        } else {
          showToast && showToast('Request submitted successfully!', 'ok');
        }
      }
    })
    .catch(err => console.error('Form submission error:', err));
  }
  if (formType === 'contact') {
    const el = document.getElementById(id);
    if (el) el.classList.add('show');
    const serviceTypeValReset = form.querySelector('[name="serviceType"]')?.value || '';
    form.reset();
    if (isSkipTraceService(serviceTypeValReset)) {
      skipTraceFormData = null;
      skipTraceModalFilled = false;
      renderSkipTraceSummary();
    }
  }
}

function handleRequestSubmit(event) {
  event.preventDefault();
  const form = event.target;
  var missing = [];
  var firstEmptyField = null;

  var serviceTypeVal = form.querySelector('[name="serviceType"]')?.value || '';
  var isSkipTrace = isSkipTraceService(serviceTypeVal);

  if (isSkipTrace && !skipTraceModalFilled) {
    alert('Skip trace intake form: please open and complete the intake form before submitting.');
    openSkipTraceModal();
    return;
  }

  if (isSkipTrace && skipTraceModalFilled && skipTraceFormData) {
    prefillRequestFormFromSkipTrace(form);
  }

  const requiredFields = form.querySelectorAll('[required]');
  requiredFields.forEach(function(field) {
    var empty = field.type === 'checkbox' ? !field.checked : !String(field.value || '').trim();
    if (empty) {
      missing.push(getFieldDisplayLabel(field));
      field.style.border = field.type === 'checkbox' ? '' : '2px solid #e74c3c';
      if (!firstEmptyField && field.type !== 'checkbox') firstEmptyField = field;
    } else {
      field.style.border = '';
    }
  });

  var addr1 = form.querySelector('[name="addressLine1"]');
  if (!isSkipTrace && addr1 && !addr1.value.trim()) {
    missing.push('Service address (line 1)');
    addr1.style.border = '2px solid #e74c3c';
    if (!firstEmptyField) firstEmptyField = addr1;
  } else if (addr1) {
    addr1.style.border = '';
  }

  const cityInput = document.getElementById('req-city-input');
  const cityHidden = document.getElementById('req-city-value');
  const cityValue = ((cityHidden && cityHidden.value.trim()) || (cityInput && cityInput.value.trim()) || '');
  if (!isSkipTrace || !skipTraceModalFilled) {
    if (!cityValue) {
      missing.push('City');
      if (cityInput) {
        cityInput.style.border = '2px solid #e74c3c';
        if (!firstEmptyField) firstEmptyField = cityInput;
      }
    } else if (cityInput) {
      cityInput.style.border = '';
    }
  } else if (cityInput) {
    cityInput.style.border = '';
  }

  const stateHiddenEl = document.getElementById('req-state-value');
  const stateInput = document.getElementById('req-state-input');
  let stateValue = (stateHiddenEl?.value || '').trim() || (stateInput?.value || '').trim() || 'CA';
  if (stateHiddenEl && !stateHiddenEl.value.trim()) {
    stateHiddenEl.value = stateValue;
  }
  if (!isSkipTrace || !skipTraceModalFilled) {
    if (!stateValue) {
      missing.push('State');
      if (stateInput) {
        stateInput.style.border = '2px solid #e74c3c';
        if (!firstEmptyField) firstEmptyField = stateInput;
      }
    } else if (stateInput) {
      stateInput.style.border = '';
    }
  } else if (stateInput) {
    stateInput.style.border = '';
  }

  var zipInput = form.querySelector('input[name="zip"]');
  if (zipInput) {
    zipInput.value = sanitizeUsZip5(zipInput.value);
    if (!isSkipTrace || !skipTraceModalFilled) {
      if (!isUsZip5(zipInput.value)) {
        missing.push('ZIP code (5 digits)');
        zipInput.style.border = '2px solid #e74c3c';
        if (!firstEmptyField) firstEmptyField = zipInput;
      } else {
        zipInput.style.border = '';
      }
    } else {
      zipInput.style.border = '';
    }
  }

  var resolvedCity = cityValue;
  if (isSkipTrace && skipTraceModalFilled && skipTraceFormData && !resolvedCity) {
    resolvedCity = parseSkipTraceAddress(skipTraceFormData.lastAddress, skipTraceFormData.jurisdiction).city
      || skipTraceFormData.jurisdiction || '';
  }
  if (isSkipTrace && skipTraceModalFilled && skipTraceFormData && zipInput && !isUsZip5(zipInput.value)) {
    var parsedZip = parseSkipTraceAddress(skipTraceFormData.lastAddress, skipTraceFormData.jurisdiction).zip;
    if (parsedZip) zipInput.value = parsedZip;
  }

  var reqExtraEl = document.getElementById('home-process-extra');
  var serveZipEl = form.querySelector('input[name="serve_zip"]');
  var extraShown = reqExtraEl && (reqExtraEl.style.display === 'block' || window.getComputedStyle(reqExtraEl).display === 'block');
  if (serveZipEl && extraShown) {
    serveZipEl.value = sanitizeUsZip5(serveZipEl.value);
    if (!isUsZip5(serveZipEl.value)) {
      missing.push('Service ZIP code (5 digits)');
      serveZipEl.style.border = '2px solid #e74c3c';
      if (!firstEmptyField) firstEmptyField = serveZipEl;
    } else {
      serveZipEl.style.border = '';
    }
  }

  var reqPhone = form.querySelector('input[name="phone"][type="tel"]');
  if (reqPhone) {
    var pd = (reqPhone.value || '').replace(/\D/g, '');
    if (pd.length > 0 && pd.length < 10) {
      missing.push('Phone number (enter all 10 digits)');
      reqPhone.style.border = '2px solid #e74c3c';
      if (!firstEmptyField) firstEmptyField = reqPhone;
    }
  }

  if (missing.length) {
    showMissingFieldsAlert('Please complete your request:', missing);
    if (firstEmptyField && firstEmptyField.focus) firstEmptyField.focus();
    return;
  }

  if (extraShown) {
    if (!validateHomeProcessServeFields(form)) return;
  }

  const formData = new FormData(form);
  formData.set('city', resolvedCity || cityValue || '');
  formData.set('state', stateValue || '');
  const isMultiDef = form.querySelector('input[name="home_multiple_defendants"][value="yes"]')?.checked || form.querySelector('input[name="multiple_defendants"][value="yes"]')?.checked;
  formData.set('multiple_defendants', isMultiDef ? 'true' : 'false');

  var allDefendants = [...defendantsArray, ...homeDefendantsArray];
  if (allDefendants.length > 0) {
    formData.set('defendantsData', JSON.stringify(allDefendants));
  }
  if (skipTraceModalFilled && skipTraceFormData) {
    appendSkipTraceFieldsToFormData(form, formData);
  }
  if (extraShown) {
    appendProcessServeFieldsToFormData(form, formData);
    if (homeDefendantsArray.length > 0) {
      formData.set('defendantsData', JSON.stringify(homeDefendantsArray));
    }
  }

  var submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';
  }

  fetch('/api/request', {
    method: 'POST',
    body: formData
  })
  .then(function(res) {
    return res.json().then(function(data) {
      return { ok: res.ok, data: data };
    });
  })
  .then(function(result) {
    var data = result.data;
    if (!result.ok || !data.success) {
      var errMsg = (data && data.message) ? data.message : 'Could not submit your request. Please try again or call 424.235.3089.';
      alert(errMsg);
      return;
    }
    if (data.success) {
      const serviceType = form.querySelector('[name="serviceType"]')?.value || '';
      var successEl = form.querySelector('.form-success') || document.getElementById('req-success');
      if (successEl) successEl.classList.add('show');

      // Store submission context for the cart checkout
      if (data.submissionId) {
        sessionStorage.setItem('ps_submissionId', data.submissionId);
      }
      const emailField = form.querySelector('[name="email"]') || form.querySelector('[type="email"]');
      if (emailField && emailField.value) {
        sessionStorage.setItem('ps_customerEmail', emailField.value.trim());
      }

      setTimeout(function () {
        redirectAfterServiceSubmit(serviceType, data.submissionId);
      }, 1200);
      form.reset();
      defendantsArray = [];
      homeDefendantsArray = [];
      renderDefendantsList();
      renderHomeDefendantsList();
      var defList = document.getElementById('defendants-list-container');
      if (defList) defList.style.display = 'none';
      var addDefBtn = document.getElementById('btn-add-defendant');
      if (addDefBtn) addDefBtn.style.display = 'none';
      var homeDefList = document.getElementById('home-defendants-list-container');
      if (homeDefList) homeDefList.style.display = 'none';
      var homeAddBtn = document.getElementById('home-btn-add-defendant');
      if (homeAddBtn) homeAddBtn.style.display = 'none';
      var homeMultiNo = document.querySelector('input[name="home_multiple_defendants"][value="no"]');
      if (homeMultiNo) homeMultiNo.checked = true;
      var origNo = document.querySelector('input[name="multiple_defendants"][value="no"]');
      if (origNo) origNo.checked = true;
      var fileListEl = document.getElementById('file-list');
      if (fileListEl) fileListEl.innerHTML = '';
      var uploadText = document.getElementById('file-upload-text');
      if (uploadText) uploadText.textContent = '+ Add a File';
      // Also hide #home-process-extra after reset
      var reqExtra = document.getElementById('home-process-extra');
      if (reqExtra) reqExtra.style.display = 'none';
      skipTraceFormData = null;
      skipTraceModalFilled = false;
      renderSkipTraceSummary();
    }
  })
  .catch(function(err) {
    console.error('Request submission error:', err);
    alert('Network error — your request could not be sent. Please check your connection and try again.');
  })
  .finally(function() {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Request';
    }
  });
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

  dropdown.addEventListener('mousedown', function(e) {
    var opt = e.target.closest('.state-option');
    if (!opt) return;
    e.preventDefault();
    const state = states.find(s => s.value === opt.dataset.value);
    if (!state) return;
    input.value = state.label + ' (' + state.postal + ')';
    hiddenInput.value = state.value;
    dropdown.style.display = 'none';
    input.dispatchEvent(new Event('change', { bubbles: true }));
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
  'e-Recording',
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

var CITY_DEFAULT_STATE_BY_INPUT = {
  'home-svc-state-input': 'CA',
  'req-state-input': 'CA',
  'def-state-input': 'CA',
  'state-input': 'CA'
};

function escapeHtmlText(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

function resolveStateCode(stateInputId) {
  if (!stateInputId) return '';
  var stateInput = document.getElementById(stateInputId);
  var stateHiddenInput = document.getElementById(stateInputId.replace('-input', '-value'));
  var stateCode = (stateHiddenInput && stateHiddenInput.value.trim()) || '';
  if (!stateCode && stateInput) {
    var stateMatch = stateInput.value.match(/\(([A-Z]{2})\)/);
    if (stateMatch) stateCode = stateMatch[1];
  }
  if (!stateCode && stateInput) {
    var raw = stateInput.value.trim();
    var byPostal = states.find(function (s) {
      return s.postal.toLowerCase() === raw.toLowerCase();
    });
    if (byPostal) stateCode = byPostal.value;
    else {
      var byLabel = states.find(function (s) {
        return s.label.toLowerCase() === raw.toLowerCase();
      });
      if (byLabel) stateCode = byLabel.value;
    }
  }
  if (!stateCode && CITY_DEFAULT_STATE_BY_INPUT[stateInputId]) {
    stateCode = CITY_DEFAULT_STATE_BY_INPUT[stateInputId];
    if (stateHiddenInput) stateHiddenInput.value = stateCode;
  }
  return stateCode;
}

function ensureDefaultServiceState() {
  var stVal = document.getElementById('home-svc-state-value');
  var stIn = document.getElementById('home-svc-state-input');
  if (!stVal || !stIn) return;
  if (stVal.value.trim()) return;
  var ca = states.find(function (s) { return s.value === 'CA'; });
  if (!ca) return;
  stVal.value = 'CA';
  if (!stIn.value.trim()) stIn.value = ca.label + ' (' + ca.postal + ')';
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
    var defCityValue = document.getElementById('def-city-value');
    if (defCityValue) defCityValue.value = def.city;
    document.getElementById('def-country-input').value = def.country;
    document.getElementById('def-country-value').value = def.country;
    document.getElementById('def-state-input').value = def.state;
    document.getElementById('def-state-value').value = def.state;
    document.getElementById('def-dob').value = def.dob;
    document.getElementById('def-phone').value = formatPhoneValue(def.phone);
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
    if (input.id !== 'def-country-value' && input.id !== 'def-edit-index') {
      input.value = '';
    }
  });
  const countryInput = document.getElementById('def-country-input');
  if (countryInput) countryInput.value = 'United States';
}

function saveDefendant() {
  var missing = [];
  const firstName = document.getElementById('def-first-name').value.trim();
  const lastName = document.getElementById('def-last-name').value.trim();
  const address = document.getElementById('def-address').value.trim();
  const cityEl = document.getElementById('def-city-value');
  const cityInput = document.getElementById('def-city');
  const city = ((cityEl && cityEl.value) || (cityInput && cityInput.value) || '').trim();

  if (!firstName) missing.push('First name');
  if (!lastName) missing.push('Last name');
  if (!address) missing.push('Service address');
  if (!city) missing.push('City');

  var phEl = document.getElementById('def-phone');
  if (phEl) {
    var pd = (phEl.value || '').replace(/\D/g, '');
    if (pd.length > 0 && pd.length < 10) missing.push('Phone number (enter all 10 digits)');
  }

  if (missing.length) {
    showMissingFieldsAlert('Please fill out the defendant information before saving.', missing);
    return;
  }

  const defendantData = {
    firstName: firstName,
    middleName: document.getElementById('def-middle-name').value,
    lastName: lastName,
    gender: document.getElementById('def-gender').value,
    relationship: document.getElementById('def-relationship').value,
    address: address,
    city: city,
    state: document.getElementById('def-state-value').value,
    country: document.getElementById('def-country-value').value,
    dob: document.getElementById('def-dob').value,
    phone: formatPhoneValue(document.getElementById('def-phone').value),
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
  if (!input || !dropdown) return;
  if (input.getAttribute('data-city-ac-init') === '1') return;
  input.setAttribute('data-city-ac-init', '1');

  function getCurrentStateCities() {
    var stateCode = resolveStateCode(stateInputId);
    return stateCode ? getCitiesForState(stateCode) : [];
  }

  function selectCityValue(value) {
    var next = String(value || '').trim();
    input.value = next;
    hiddenInput.value = next;
    dropdown.style.display = 'none';
  }

  function renderDropdown(filter, cities) {
    const filterLower = filter.toLowerCase().trim();
    const filtered = (cities || [])
      .filter(function (c) { return c.toLowerCase().includes(filterLower); })
      .sort(function (a, b) { return a.localeCompare(b); });
    var html = filtered.slice(0, 80).map(function (c) {
      return '<div class="city-option' + (c === hiddenInput.value ? ' selected' : '') + '" data-value="' + escapeHtmlText(c) + '">' + escapeHtmlText(c) + '</div>';
    }).join('');
    if (filterLower && !filtered.some(function (c) { return c.toLowerCase() === filterLower; })) {
      html += '<div class="city-option city-option-custom" data-value="' + escapeHtmlText(filter.trim()) + '">Use &quot;' + escapeHtmlText(filter.trim()) + '&quot;</div>';
    }
    if (!html && !filterLower) {
      html = '<div class="city-option city-option-hint">Select a state first</div>';
    }
    dropdown.innerHTML = html;
    dropdown.style.display = html ? 'block' : 'none';
  }

  input.addEventListener('input', function() {
    hiddenInput.value = this.value.trim();
    renderDropdown(this.value, getCurrentStateCities());
  });

  input.addEventListener('blur', function() {
    hiddenInput.value = this.value.trim();
  });

  input.addEventListener('focus', function() {
    renderDropdown(this.value, getCurrentStateCities());
  });

  dropdown.addEventListener('mousedown', function(e) {
    var opt = e.target.closest('.city-option');
    if (!opt || opt.classList.contains('city-option-hint')) return;
    e.preventDefault();
    selectCityValue(opt.getAttribute('data-value') || opt.textContent);
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
        renderDropdown(input.value, getCurrentStateCities());
      });
      stateInput.addEventListener('change', function() {
        renderDropdown(input.value, getCurrentStateCities());
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

// Home form defendant modal functions
function openHomeDefendantModal(editIndex) {
  var modal = document.getElementById('home-defendant-modal');
  var title = document.getElementById('home-modal-title');

  if (editIndex > -1) {
    title.innerText = "Edit Defendant";
    document.getElementById('home-def-edit-index').value = editIndex;
    var def = homeDefendantsArray[editIndex];
    document.getElementById('home-def-first-name').value = def.firstName || '';
    document.getElementById('home-def-middle-name').value = def.middleName || '';
    document.getElementById('home-def-last-name').value = def.lastName || '';
    document.getElementById('home-def-gender').value = def.gender || '';
    document.getElementById('home-def-relationship').value = def.relationship || '';
    document.getElementById('home-def-address').value = def.address || '';
    document.getElementById('home-def-city').value = def.city || '';
    document.getElementById('home-def-city-value').value = def.city || '';
    document.getElementById('home-def-state-input').value = def.state || '';
    document.getElementById('home-def-state-value').value = def.state || '';
    document.getElementById('home-def-zip').value = sanitizeUsZip5(def.zip || '');
    document.getElementById('home-def-dob').value = def.dob || '';
    document.getElementById('home-def-phone').value = formatPhoneValue(def.phone || '');
    document.getElementById('home-def-aliases').value = def.aliases || '';
    document.getElementById('home-def-employer').value = def.employer || '';
    document.getElementById('home-def-physical').value = def.physical || '';
    document.getElementById('home-def-notes').value = def.notes || '';
  } else {
    title.innerText = "Add Additional Defendant";
    document.getElementById('home-def-edit-index').value = "-1";
    clearHomeDefendantForm();
  }

  modal.style.display = 'flex';
  initHomeDefendantsAutocomplete();
}

function closeHomeDefendantModal() {
  document.getElementById('home-defendant-modal').style.display = 'none';
}

function clearHomeDefendantForm() {
  var ids = [
    'home-def-first-name','home-def-middle-name','home-def-last-name',
    'home-def-gender','home-def-relationship','home-def-address',
    'home-def-city','home-def-city-value','home-def-state-input',
    'home-def-state-value','home-def-zip','home-def-dob',
    'home-def-phone','home-def-aliases','home-def-employer',
    'home-def-physical','home-def-notes'
  ];
  ids.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) {
      if (el.tagName === 'SELECT') el.selectedIndex = 0;
      else el.value = '';
    }
  });
}

function saveHomeDefendant() {
  var missing = [];
  var firstName = document.getElementById('home-def-first-name').value.trim();
  var lastName = document.getElementById('home-def-last-name').value.trim();
  var address = document.getElementById('home-def-address').value.trim();
  var cityVal = document.getElementById('home-def-city-value').value.trim() || document.getElementById('home-def-city').value.trim();

  if (!firstName) missing.push('First name');
  if (!lastName) missing.push('Last name');
  if (!address) missing.push('Service address');
  if (!cityVal) missing.push('City');

  var zipEl = document.getElementById('home-def-zip');
  var zipVal = zipEl ? sanitizeUsZip5(zipEl.value) : '';
  if (zipEl) zipEl.value = zipVal;
  if (zipVal && !isUsZip5(zipVal)) {
    missing.push('ZIP code (5 digits or leave blank)');
    if (zipEl) zipEl.style.border = '2px solid #e74c3c';
  } else if (zipEl) {
    zipEl.style.border = '';
  }

  var hp = document.getElementById('home-def-phone');
  if (hp) {
    var hd = (hp.value || '').replace(/\D/g, '');
    if (hd.length > 0 && hd.length < 10) missing.push('Phone number (enter all 10 digits)');
  }

  if (missing.length) {
    showMissingFieldsAlert('Please fill out the defendant information before saving.', missing);
    return;
  }

  var defendantData = {
    firstName: firstName,
    middleName: document.getElementById('home-def-middle-name').value.trim(),
    lastName: lastName,
    gender: document.getElementById('home-def-gender').value,
    relationship: document.getElementById('home-def-relationship').value,
    address: address,
    city: cityVal,
    state: document.getElementById('home-def-state-value').value.trim(),
    zip: zipVal,
    dob: document.getElementById('home-def-dob').value,
    phone: formatPhoneValue(document.getElementById('home-def-phone').value.trim()),
    aliases: document.getElementById('home-def-aliases').value.trim(),
    employer: document.getElementById('home-def-employer').value.trim(),
    physical: document.getElementById('home-def-physical').value.trim(),
    notes: document.getElementById('home-def-notes').value.trim()
  };

  var editIndex = parseInt(document.getElementById('home-def-edit-index').value);
  if (editIndex > -1) {
    homeDefendantsArray[editIndex] = defendantData;
  } else {
    if (homeDefendantsArray.length < HOME_MAX_DEFENDANTS) {
      homeDefendantsArray.push(defendantData);
    } else {
      alert('Maximum of ' + HOME_MAX_DEFENDANTS + ' defendants allowed.');
      return;
    }
  }

  console.log('[DEBUG saveHomeDefendant] homeDefendantsArray length:', homeDefendantsArray.length);
  renderHomeDefendantsList();
  closeHomeDefendantModal();
  // Determine which form container is active by checking which "Yes" radio is checked
  var contactYes = document.querySelector('#contact-form-container input[name="home_multiple_defendants"][value="yes"]');
  var formContainer = (contactYes && contactYes.checked) ? 'contact-form-container' : 'home-form-container';
  console.log('[DEBUG saveHomeDefendant] formContainer determined:', formContainer);
  toggleHomeMultiDefTextarea(formContainer);
}

function renderHomeDefendantsList() {
  var container = document.getElementById('home-defendants-list-container');
  if (!container) return;
  container.innerHTML = '';
  homeDefendantsArray.forEach(function(def, index) {
      var card = document.createElement('div');
      card.className = 'defendant-card';
      var mid = def.middleName ? ' ' + def.middleName + ' ' : ' ';
      var fullName = def.firstName + mid + def.lastName;
      card.innerHTML = '<div class="defendant-info"><h5>Defendant #' + (index + 2) + ': ' + fullName + '</h5><p>' + def.address + ', ' + def.city + '</p></div><button type="button" class="edit-def-btn" onclick="openHomeDefendantModal(' + index + ')">Edit</button>';
      container.appendChild(card);
    });
}

function initHomeDefendantsAutocomplete() {
  initCityAutocomplete('home-def-city', 'home-def-city-value', 'home-def-city-dropdown', 'home-def-state-input');
  initStateAutocomplete('home-def-state-input', 'home-def-state-value', 'home-def-state-dropdown', '');
}

// Initialize all autocomplete inputs
document.addEventListener('DOMContentLoaded', function() {
  initRequestFormBindings(document);
  initCityAutocomplete('def-city', 'def-city-value', 'def-city-dropdown', 'def-state-input');
  initCountryAutocomplete('def-country-input', 'def-country-value', 'def-country-dropdown');
  initStateAutocomplete('def-state-input', 'def-state-value', 'def-state-dropdown', 'CA');
  initStateAutocomplete('state-input', 'state-value', 'state-dropdown', 'CA');
});
