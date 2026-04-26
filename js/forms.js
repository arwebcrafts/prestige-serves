// Form building and handling

function buildContactForm(containerId, formId) {
  const c = document.getElementById(containerId);
  if (!c) return;
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
     <div class="form-row">
    <div class="form-group">
      <label>City <span class="req">(required)</span></label>
      <div class="county-select-wrapper">
        <input type="text" id="county-input" placeholder="Select city..." autocomplete="off" required>
        <input type="hidden" id="county-value" name="county" value="">
        <div class="county-dropdown" id="county-dropdown"></div>
      </div>
    </div>
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
  }
  if (allFilled) {
    if (formType === 'contact') {
      const formData = {
        firstName: form.querySelector('[name="firstName"]')?.value || '',
        lastName: form.querySelector('[name="lastName"]')?.value || '',
        company: form.querySelector('[name="company"]')?.value || '',
        email: form.querySelector('[name="email"]')?.value || '',
        phone: form.querySelector('[name="phone"]')?.value || '',
        reason: document.getElementById('reason-value')?.value || '',
        county: document.getElementById('county-value')?.value || '',
        state: document.getElementById('state-value')?.value || '',
        caseDetails: form.querySelector('[name="caseDetails"]')?.value || '',
        urgency: form.querySelector('[name="urgency"]')?.value || '',
        consent: form.querySelector('[name="consent"]')?.checked || false
      };
      fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
        .then(function(res) {
          if (!res.ok) throw new Error('Server rejected submission');
          return res.json();
        })
        .then(function() {
          const el = document.getElementById(id);
          if (el) el.classList.add('show');
          form.reset();
          applyStateToFields('state-input', 'state-value', 'CA');
          const rv = document.getElementById('reason-value');
          const ci = document.getElementById('county-input');
          const ch = document.getElementById('county-value');
          if (rv) rv.value = '';
          if (ci) ci.value = '';
          if (ch) ch.value = '';
        })
        .catch(function(err) {
          console.error('Form submission error:', err);
          alert('We could not submit your message. Please try again or email prestigeservesllc@gmail.com.');
        });
      return;
    }
    const el = document.getElementById(id);
    if (el) el.classList.add('show');
    form.reset();
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
  formData.set('multiple_defendants', document.querySelector('input[name="multiple_defendants"][value="yes"]')?.checked ? 'true' : 'false');
  
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
      document.getElementById('req-success').classList.add('show');
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
  {value:'DC',label:'District of Columbia',postal:'DC'},
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

function getCitiesForStateCode(stateCode) {
  if (!window.CITIES_BY_STATE || typeof window.CITIES_BY_STATE !== 'object') return [];
  var raw = stateCode && String(stateCode).trim() ? String(stateCode).trim().toUpperCase() : 'CA';
  var code = raw.length >= 2 ? raw.slice(0, 2) : 'CA';
  var list = window.CITIES_BY_STATE[code];
  return Array.isArray(list) ? list : [];
}

function clearLinkedCityFields(cityInputId, cityHiddenId) {
  var ci = document.getElementById(cityInputId);
  var hi = document.getElementById(cityHiddenId);
  if (ci) ci.value = '';
  if (hi) hi.value = '';
}

function applyStateToFields(inputId, hiddenId, code) {
  var input = document.getElementById(inputId);
  var hidden = document.getElementById(hiddenId);
  if (!input || !hidden) return;
  var st = states.find(function(s) { return s.value === code; });
  if (st) {
    input.value = st.label + ' (' + st.postal + ')';
    hidden.value = st.value;
  } else {
    input.value = '';
    hidden.value = '';
  }
}

function initStateAutocomplete(inputId, hiddenInputId, dropdownId, defaultState, options) {
  const input = document.getElementById(inputId);
  const hiddenInput = document.getElementById(hiddenInputId);
  const dropdown = document.getElementById(dropdownId);
  if (!input || !hiddenInput || !dropdown) return;
  options = options || {};
  const onStateSelected = options.onStateSelected;

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
      if (typeof onStateSelected === 'function') {
        onStateSelected(state.value);
      }
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

// Contact form city list follows selected US state (see window.CITIES_BY_STATE)
function initCountyDropdown() {
  const input = document.getElementById('county-input');
  const hiddenInput = document.getElementById('county-value');
  const stateHidden = document.getElementById('state-value');
  const dropdown = document.getElementById('county-dropdown');
  if (!input || !hiddenInput || !dropdown) return;

  function renderDropdown(filter) {
    const filterLower = filter.toLowerCase().trim();
    var code = stateHidden && stateHidden.value ? stateHidden.value : 'CA';
    const filtered = getCitiesForStateCode(code).filter(c =>
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
  const isYes = document.querySelector('input[name="multiple_defendants"][value="yes"]').checked;
  const listContainer = document.getElementById('defendants-list-container');
  const addBtn = document.getElementById('btn-add-defendant');

  if (isYes) {
    listContainer.style.display = 'flex';
    if (defendantsArray.length < MAX_DEFENDANTS) {
      addBtn.style.display = 'block';
    } else {
      addBtn.style.display = 'none';
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
    applyStateToFields('def-state-input', 'def-state-value', def.state || 'CA');
    document.getElementById('def-country-input').value = def.country || 'United States';
    document.getElementById('def-country-value').value = def.country || 'United States';
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
  document.querySelectorAll('#defendant-modal input, #defendant-modal textarea, #defendant-modal select').forEach(function(input) {
    if (input.id === 'def-edit-index') return;
    input.value = '';
  });
  applyStateToFields('def-state-input', 'def-state-value', 'CA');
  var dci = document.getElementById('def-country-input');
  var dcv = document.getElementById('def-country-value');
  if (dci) dci.value = 'United States';
  if (dcv) dcv.value = 'United States';
}

function saveDefendant() {
  const firstName = document.getElementById('def-first-name').value.trim();
  const lastName = document.getElementById('def-last-name').value.trim();
  const address = document.getElementById('def-address').value.trim();
  const city = document.getElementById('def-city-value').value.trim();
  const defStateVal = document.getElementById('def-state-value') ? document.getElementById('def-state-value').value.trim() : '';

  if(!firstName || !lastName || !address || !city || !defStateVal) {
    alert("Please fill in all required fields (First Name, Last Name, Address, City, and State).");
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
    state: document.getElementById('def-state-value') ? document.getElementById('def-state-value').value || 'CA' : 'CA',
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
        <p>${def.address}, ${def.city}${def.state ? ', ' + def.state : ''}</p>
      </div>
      <button type="button" class="edit-def-btn" onclick="openDefendantModal(${index})">Edit</button>
    `;
    
    container.appendChild(card);
  });
}

// City autocomplete for request page and defendant modal (list depends on selected US state)
function initCityAutocomplete(inputId, hiddenInputId, dropdownId, stateHiddenInputId) {
  const input = document.getElementById(inputId);
  const hiddenInput = document.getElementById(hiddenInputId);
  const dropdown = document.getElementById(dropdownId);
  const stateHidden = stateHiddenInputId ? document.getElementById(stateHiddenInputId) : null;
  if (!input || !hiddenInput || !dropdown) return;

  function renderDropdown(filter) {
    const filterLower = filter.toLowerCase().trim();
    var code = stateHidden && stateHidden.value ? stateHidden.value : 'CA';
    const filtered = getCitiesForStateCode(code).filter(c =>
      c.toLowerCase().includes(filterLower)
    );
    var maxShow = 500;
    dropdown.innerHTML = filtered.slice(0, maxShow).map(c =>
      '<div class="city-option' + (c === hiddenInput.value ? ' selected' : '') + '">' + c + '</div>'
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
}

// Country autocomplete
const countryOptions = [
  'United States',
  'Afghanistan','Albania','Algeria','Andorra','Angola','Antigua and Barbuda','Argentina','Armenia','Australia','Austria','Azerbaijan','Bahamas','Bahrain','Bangladesh','Barbados','Belarus','Belgium','Belize','Benin','Bhutan','Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Brunei','Bulgaria','Burkina Faso','Burundi','Cabo Verde','Cambodia','Cameroon','Canada','Central African Republic','Chad','Chile','China','Colombia','Comoros','Congo','Costa Rica','Croatia','Cuba','Cyprus','Czech Republic','Denmark','Djibouti','Dominica','Dominican Republic','East Timor','Ecuador','Egypt','El Salvador','Equatorial Guinea','Eritrea','Estonia','Eswatini','Ethiopia','Fiji','Finland','France','Gabon','Gambia','Georgia','Germany','Ghana','Greece','Grenada','Guatemala','Guinea','Guinea-Bissau','Guyana','Haiti','Honduras','Hungary','Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel','Italy','Ivory Coast','Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kiribati','Korea, North','Korea, South','Kosovo','Kuwait','Kyrgyzstan','Laos','Latvia','Lebanon','Lesotho','Liberia','Libya','Liechtenstein','Lithuania','Luxembourg','Madagascar','Malawi','Malaysia','Maldives','Mali','Malta','Marshall Islands','Mauritania','Mauritius','Mexico','Micronesia','Moldova','Monaco','Mongolia','Montenegro','Morocco','Mozambique','Myanmar','Namibia','Nauru','Nepal','Netherlands','New Zealand','Nicaragua','Niger','Nigeria','North Macedonia','Norway','Oman','Pakistan','Palau','Palestine','Panama','Papua New Guinea','Paraguay','Peru','Philippines','Poland','Portugal','Qatar','Romania','Russia','Rwanda','Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines','Samoa','San Marino','Sao Tome and Principe','Saudi Arabia','Senegal','Serbia','Seychelles','Sierra Leone','Singapore','Slovakia','Slovenia','Solomon Islands','Somalia','South Africa','South Sudan','Spain','Sri Lanka','Sudan','Suriname','Sweden','Switzerland','Syria','Taiwan','Tajikistan','Tanzania','Thailand','Togo','Tonga','Trinidad and Tobago','Tunisia','Turkey','Turkmenistan','Tuvalu','Uganda','Ukraine','United Arab Emirates','United Kingdom','Uruguay','Uzbekistan','Vanuatu','Vatican City','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe'
];

function initCountryAutocomplete(inputId, hiddenInputId, dropdownId, countryList) {
  const input = document.getElementById(inputId);
  const hiddenInput = document.getElementById(hiddenInputId);
  const dropdown = document.getElementById(dropdownId);
  if (!input || !hiddenInput || !dropdown) return;
  const list = (countryList && countryList.length) ? countryList : countryOptions;

  function renderDropdown(filter) {
    const filterLower = filter.toLowerCase().trim();
    const filtered = list.filter(c =>
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
  initCityAutocomplete('req-city-input', 'req-city-value', 'req-city-dropdown', 'req-state-value');
  initCityAutocomplete('def-city', 'def-city-value', 'def-city-dropdown', 'def-state-value');
  initCountryAutocomplete('def-country-input', 'def-country-value', 'def-country-dropdown', ['United States']);
  initStateAutocomplete('req-state-input', 'req-state-value', 'req-state-dropdown', 'CA', {
    onStateSelected: function() {
      clearLinkedCityFields('req-city-input', 'req-city-value');
    }
  });
  initStateAutocomplete('def-state-input', 'def-state-value', 'def-state-dropdown', 'CA', {
    onStateSelected: function() {
      clearLinkedCityFields('def-city', 'def-city-value');
    }
  });
  var defCoIn = document.getElementById('def-country-input');
  var defCoHi = document.getElementById('def-country-value');
  if (defCoIn && defCoHi && defCoHi.value && !defCoIn.value) {
    defCoIn.value = defCoHi.value;
  }
  initFileUpload();
});
