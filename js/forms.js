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
      <div class="reason-select-wrapper">
        <input type="text" id="reason-input" placeholder="Select an option..." autocomplete="off" required>
        <input type="hidden" id="reason-value" name="reason" value="">
        <div class="reason-dropdown" id="reason-dropdown"></div>
      </div>
    </div>
     <div class="form-row">
    <div class="form-group">
      <label>County / City <span class="req">(required)</span></label>
      <div class="county-select-wrapper">
        <input type="text" id="county-input" placeholder="Select an option..." autocomplete="off" required>
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

// County / City dropdown
const countyOptions = [
  'Los Angeles',
  'Beverly Hills',
  'Burbank',
  'Century City',
  'Compton',
  'Culver City',
  ' Downey',
  'El Segundo',
  'Glendale',
  'Hawthorne',
  'Hollywood',
  'Huntington Park',
  'Inglewood',
  'Long Beach',
  'Los Angeles County',
  'Malibu',
  'Manhattan Beach',
  'North Hollywood',
  'Pasadena',
  'Pomona',
  'Santa Clarita',
  'Santa Monica',
  'Sherman Oaks',
  'Silver Lake',
  'South Gate',
  'Studio City',
  'Toluca Lake',
  'Torrance',
  'Universal City',
  'Van Nuys',
  'Venice',
  'West Hollywood',
  'West Los Angeles',
  'Westlake Village',
  'Woodland Hills',
  'Alameda',
  'Alameda County',
  'Antioch',
  'Berkeley',
  'Brentwood',
  'Concord',
  'Contra Costa County',
  'Danville',
  'Dublin',
  'El Cerrito',
  'Emeryville',
  'Fremont',
  'Hayward',
  'Livermore',
  'Martinez',
  'Moraga',
  'Newark',
  'Oakland',
  'Orinda',
  'Pleasant Hill',
  'Pleasanton',
  'Richmond',
  'San Leandro',
  'San Lorenzo',
  'San Pablo',
  'San Ramon',
  'Union City',
  'Walnut Creek',
  'Fresno',
  'Fresno County',
  'Clovis',
  'Madera',
  'Merced',
  'Modesto',
  'Porterville',
  'Visalia',
  'Bakersfield',
  'Delano',
  'Imperial County',
  'El Centro',
  'Kern County',
  'Ridgecrest',
  'Anaheim',
  'Costa Mesa',
  'Cypress',
  'Dana Point',
  'Fullerton',
  'Garden Grove',
  'Huntington Beach',
  'Irvine',
  'La Habra',
  'Laguna Beach',
  'Laguna Hills',
  'Laguna Niguel',
  'Lake Forest',
  'Mission Viejo',
  'Newport Beach',
  'Orange',
  'Orange County',
  'Placentia',
  'Rancho Santa Margarita',
  'San Clemente',
  'San Juan Capistrano',
  'Santa Ana',
  'Seal Beach',
  'Stanton',
  'Tustin',
  'Westminster',
  'Yorba Linda',
  'Corona',
  'Hemet',
  'Indio',
  'Lake Elsinore',
  'Menifee',
  'Moreno Valley',
  'Murrieta',
  'Norco',
  'Perris',
  'Rancho Cucamonga',
  'Riverside',
  'Riverside County',
  'San Bernardino',
  'San Bernardino County',
  'Temecula',
  'Victorville',
  'Westminster',
  'Arden-Arcade',
  'Carmichael',
  'Citrus Heights',
  'Davis',
  'Elk Grove',
  'Folsom',
  'Galt',
  'Lincoln',
  'Natomas',
  'Rancho Cordova',
  'Rocklin',
  'Roseville',
  'Sacramento',
  'Sacramento County',
  'South Lake Tahoe',
  'Stockton',
  'Walnut Grove',
  'West Sacramento',
  'Yolo',
  'Chula Vista',
  'Coronado',
  'El Cajon',
  'Encinitas',
  'Escondido',
  'Fallbrook',
  'Imperial Beach',
  'La Jolla',
  'National City',
  'Oceanside',
  'Poway',
  'Ramona',
  'San Diego',
  'San Diego County',
  'San Marcos',
  'San Ysidro',
  'Santee',
  'Solana Beach',
  'Spring Valley',
  'Valley Center',
  'Vista',
  'Daly City',
  'Foster City',
  'Half Moon Bay',
  'Menlo Park',
  'Millbrae',
  'Pacifica',
  'Redwood City',
  'San Bruno',
  'San Carlos',
  'San Francisco',
  'San Francisco County',
  'San Mateo',
  'San Mateo County',
  'South San Francisco',
  'Campbell',
  'Cupertino',
  'Gilroy',
  'Los Altos',
  'Milpitas',
  'Morgan Hill',
  'Mountain View',
  'Palo Alto',
  'San Jose',
  'Santa Clara',
  'Santa Clara County',
  'Saratoga',
  'Sunnyvale',
  'Camarillo',
  'Moorpark',
  'Oxnard',
  'Port Hueneme',
  'San Buenaventura',
  'Santa Paula',
  'Simi Valley',
  'Thousand Oaks',
  'Ventura',
  'Ventura County',
  'Other California City',
  'Other California County',
  'Other State'
];

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
