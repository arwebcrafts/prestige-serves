// Form building and handling

function buildContactForm(containerId, formId) {
  const c = document.getElementById(containerId);
  if (!c) return;
  c.innerHTML = `
    <form onsubmit="handleFormSubmit(event, '${formId}-success')">
    <div class="form-row">
      <div class="form-group"><label>First Name <span class="req">(required)</span></label><input type="text" name="firstName" required></div>
      <div class="form-group"><label>Last Name <span class="req">(required)</span></label><input type="text" name="lastName" required></div>
    </div>
    <div class="form-group"><label>Firm / Company Name <span class="req">(required)</span></label><input type="text" name="company" required></div>
    <div class="form-group"><label>Email <span class="req">(required)</span></label><input type="email" name="email" required></div>
    <div class="form-group"><label>Phone <span class="req">(required)</span></label><input type="tel" name="phone" required></div>
    <div class="form-group">
      <label>Reason for Contact <span class="req">(required)</span></label>
      <select name="reason" required><option value="">Select an option</option><option>Process Serving</option><option>Skip Tracing</option><option>eFiling / eRecording</option><option>Legal Courier</option><option>General Inquiry</option></select>
    </div>
     <div class="form-row">
    <div class="form-group"><label>County / City <span class="req">(required)</span></label><input type="text" name="county" placeholder="Los Angeles County" required></div>
    <div class="form-group">
  <label>State <span class="req">(required)</span></label>
  <div class="state-select-wrapper">
    <input type="text" id="state-input" placeholder="Type to search..." autocomplete="off" required>
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
      <label>Urgency Level <span class="req">(Subject to Approval)</span></label>
      <select name="urgency" required><option value="">Select an option</option><option>Standard</option><option>Rush</option><option>Priority</option><option>Emergency</option></select>
    </div>
    <div class="form-checkbox">
      <input type="checkbox" id="${formId}-consent" name="consent" required>
      <label for="${formId}-consent">I understand that submitting this form does not guarantee service and all requests are subject to review and availability.</label>
    </div>
    <button type="submit" class="btn-navy">Submit</button>
    <div class="form-success" id="${formId}-success">Thank you! We'll be in touch shortly.</div>
    </form>
  `;
}

function handleFormSubmit(event, id) {
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
  }
  if (allFilled) {
    const el = document.getElementById(id);
    if (el) el.classList.add('show');
    form.reset();
  }
}

// State autocomplete
const states = [
  {value:'CA',label:'California'},
  {value:'AL',label:'Alabama'},{value:'AK',label:'Alaska'},{value:'AZ',label:'Arizona'},
  {value:'AR',label:'Arkansas'},{value:'CO',label:'Colorado'},{value:'CT',label:'Connecticut'},
  {value:'DE',label:'Delaware'},{value:'FL',label:'Florida'},{value:'GA',label:'Georgia'},
  {value:'HI',label:'Hawaii'},{value:'ID',label:'Idaho'},{value:'IL',label:'Illinois'},
  {value:'IN',label:'Indiana'},{value:'IA',label:'Iowa'},{value:'KS',label:'Kansas'},
  {value:'KY',label:'Kentucky'},{value:'LA',label:'Louisiana'},{value:'ME',label:'Maine'},
  {value:'MD',label:'Maryland'},{value:'MA',label:'Massachusetts'},{value:'MI',label:'Michigan'},
  {value:'MN',label:'Minnesota'},{value:'MS',label:'Mississippi'},{value:'MO',label:'Missouri'},
  {value:'MT',label:'Montana'},{value:'NE',label:'Nebraska'},{value:'NV',label:'Nevada'},
  {value:'NH',label:'New Hampshire'},{value:'NJ',label:'New Jersey'},{value:'NM',label:'New Mexico'},
  {value:'NY',label:'New York'},{value:'NC',label:'North Carolina'},{value:'ND',label:'North Dakota'},
  {value:'OH',label:'Ohio'},{value:'OK',label:'Oklahoma'},{value:'OR',label:'Oregon'},
  {value:'PA',label:'Pennsylvania'},{value:'RI',label:'Rhode Island'},{value:'SC',label:'South Carolina'},
  {value:'SD',label:'South Dakota'},{value:'TN',label:'Tennessee'},{value:'TX',label:'Texas'},
  {value:'UT',label:'Utah'},{value:'VT',label:'Vermont'},{value:'VA',label:'Virginia'},
  {value:'WA',label:'Washington'},{value:'WV',label:'West Virginia'},{value:'WI',label:'Wisconsin'},
  {value:'WY',label:'Wyoming'}
];

function initStateAutocomplete() {
  const input = document.getElementById('state-input');
  const hiddenInput = document.getElementById('state-value');
  const dropdown = document.getElementById('state-dropdown');
  if (!input || !dropdown) return;

  // Set initial value
  input.value = 'California';
  hiddenInput.value = 'CA';

  function renderDropdown(filter) {
    const filtered = states.filter(s => s.label.toLowerCase().includes(filter.toLowerCase()));
    dropdown.innerHTML = filtered.map(s =>
      '<div class="state-option' + (s.value === hiddenInput.value ? ' selected' : '') + '" data-value="' + s.value + '">' + s.label + '</div>'
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
      input.value = e.target.textContent;
      hiddenInput.value = e.target.dataset.value;
      dropdown.style.display = 'none';
    }
  });

  document.addEventListener('click', function(e) {
    if (!e.target.closest('.state-select-wrapper')) {
      dropdown.style.display = 'none';
    }
  });
}
