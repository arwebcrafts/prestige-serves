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

function initStateAutocomplete() {
  const input = document.getElementById('state-input');
  const hiddenInput = document.getElementById('state-value');
  const dropdown = document.getElementById('state-dropdown');
  if (!input || !dropdown) return;

  // Set initial value
  input.value = 'California';
  hiddenInput.value = 'CA';

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
