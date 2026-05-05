// Admin Dashboard JavaScript

var requestsPageSize = 10;
var allRequests = [];
var requestsPage = 1;
var selectedRequests = new Set();
var requestsDatePreset = 'all';
var requestsDateFrom = '';
var requestsDateTo = '';
var requestsSearch = '';
var requestsServiceFilter = '';
var requestsStateFilter = '';
var requestsEmailSentFilter = '';
var requestsEmergencyOnly = false;

var contactsPageSize = 10;
var allContacts = [];
var contactsPage = 1;
var selectedContacts = new Set();
var contactsDatePreset = 'all';
var contactsDateFrom = '';
var contactsDateTo = '';
var contactsSearch = '';
var contactsUrgencyFilter = '';
var contactsReasonFilter = '';
var contactsStateFilter = '';
var contactsEmailSentFilter = '';
var contactsSkipTraceFilter = '';

function getUrgencyBadge(urgency) {
  var u = urgency || '';
  var styles = {
    'Standard': 'background:#e8f7ee;color:#16a34a;border:1px solid #b4d8b8;',
    'Elevated': 'background:#e8f0fc;color:#2563eb;border:1px solid #b4c8e8;',
    'High': 'background:#fef3e2;color:#b7770d;border:1px solid #e8d0a8;',
    'Critical': 'background:#fce8e8;color:#c0392b;border:1px solid #e8b4b4;'
  };
  var dotColors = {
    'Standard': '#16a34a',
    'Elevated': '#2563eb',
    'High': '#b7770d',
    'Critical': '#c0392b'
  };
  var cls = styles[u] || 'background:#f5f5f5;color:#666;border:1px solid #ddd;';
  var dot = dotColors[u] || '#999';
  return '<span class="status-badge" style="' + cls + '"><span style="display:inline-flex;align-items:center;gap:4px;"><span style="width:5px;height:5px;border-radius:50%;background:' + dot + ';display:inline-block;"></span>' + u + '</span></span>';
}

document.addEventListener('DOMContentLoaded', function() {
  // Check if logged in
  if (!sessionStorage.getItem('adminLoggedIn')) {
    window.location.href = 'admin.html';
    return;
  }
  
  loadOwnerEmail();
  loadRequests();
  loadContacts();
  makeTabsScrollable();
});

function handleLogout() {
  sessionStorage.removeItem('adminLoggedIn');
  window.location.href = 'admin.html';
}

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    var on = btn.getAttribute('data-tab') === tab;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  document.querySelectorAll('.tab-content').forEach(function(content) {
    content.classList.toggle('active', content.id === 'tab-' + tab);
  });
}

function getPresetTimeRange(preset, dateFrom, dateTo) {
  var now = new Date();
  var endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  if (!preset || preset === 'all') return null;
  if (preset === 'custom') {
    var a = dateFrom ? new Date(dateFrom + 'T00:00:00') : null;
    var b = dateTo ? new Date(dateTo + 'T23:59:59.999') : null;
    if (a && isNaN(a.getTime())) a = null;
    if (b && isNaN(b.getTime())) b = null;
    if (!a && !b) return null;
    return { start: a, end: b };
  }
  var d = new Date(now);
  if (preset === 'last_week') {
    var startLw = new Date(d);
    startLw.setDate(d.getDate() - 7);
    startLw.setHours(0, 0, 0, 0);
    return { start: startLw, end: endToday };
  }
  if (preset === 'last_month') {
    var sm = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    var em = new Date(d.getFullYear(), d.getMonth(), 0, 23, 59, 59, 999);
    return { start: sm, end: em };
  }
  if (preset === 'this_month') {
    return { start: new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0), end: endToday };
  }
  if (preset === 'this_year') {
    return { start: new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0), end: endToday };
  }
  if (preset === 'last_year') {
    var y = d.getFullYear() - 1;
    return { start: new Date(y, 0, 1, 0, 0, 0, 0), end: new Date(y, 11, 31, 23, 59, 59, 999) };
  }
  return null;
}

function createdInTimeRange(createdAt, range) {
  if (!range) return true;
  if (!createdAt) return false;
  var t = new Date(createdAt).getTime();
  if (isNaN(t)) return false;
  if (range.start && t < range.start.getTime()) return false;
  if (range.end && t > range.end.getTime()) return false;
  return true;
}

function requestMatchesSearch(r, q) {
  if (!q) return true;
  var s = q.toLowerCase();
  var hay = [
    r.client_name,
    r.contact_name,
    r.email,
    r.phone,
    r.service_type,
    r.case_number,
    r.city,
    r.state,
    r.zip,
    r.defendant_name,
    r.court_jurisdiction
  ]
    .join(' ')
    .toLowerCase();
  return hay.indexOf(s) !== -1;
}

function getFilteredRequests() {
  var range = getPresetTimeRange(requestsDatePreset, requestsDateFrom, requestsDateTo);
  return allRequests.filter(function(r) {
    if (!createdInTimeRange(r.created_at, range)) return false;
    if (!requestMatchesSearch(r, requestsSearch)) return false;
    if (requestsEmergencyOnly) {
      if (!r.service_type || String(r.service_type).indexOf('Emergency') === -1) return false;
    }
    if (requestsServiceFilter && String(r.service_type || '') !== requestsServiceFilter) return false;
    if (requestsStateFilter) {
      if (String(r.state || '').toUpperCase() !== String(requestsStateFilter).toUpperCase()) return false;
    }
    if (requestsEmailSentFilter === 'sent' && Number(r.email_sent) !== 1) return false;
    if (requestsEmailSentFilter === 'failed' && Number(r.email_sent) !== 0) return false;
    if (requestsEmailSentFilter === 'pending') {
      var es = r.email_sent;
      if (es === 1 || es === 0) return false;
    }
    return true;
  });
}

function updateRequestStats() {
  var totalEl = document.getElementById('requests-total');
  if (!totalEl) return;
  var filtered = getFilteredRequests();
  var today = new Date().toDateString();
  totalEl.textContent = allRequests.length;
  var fc = document.getElementById('requests-filtered-count');
  if (fc) fc.textContent = filtered.length;
  document.getElementById('requests-today').textContent = filtered.filter(function(r) {
    return r.created_at && new Date(r.created_at).toDateString() === today;
  }).length;
  document.getElementById('requests-emergency').textContent = filtered.filter(function(r) {
    return r.service_type && String(r.service_type).indexOf('Emergency') !== -1;
  }).length;
}

function renderRequestsFilterMeta() {
  var el = document.getElementById('requests-filter-meta');
  if (!el) return;
  var n = getFilteredRequests().length;
  var m = allRequests.length;
  el.textContent = n === m ? 'Showing all ' + m + ' loaded record(s).' : 'Filters match ' + n + ' of ' + m + ' loaded record(s).';
}

function getUniqueRequestField(field) {
  var set = {};
  allRequests.forEach(function(r) {
    var v = r[field];
    if (v != null && String(v).trim() !== '') set[String(v).trim()] = true;
  });
  return Object.keys(set).sort();
}

function escapeAttr(s) {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function csvCell(val) {
  var str = val == null ? '' : String(val);
  str = str.replace(/\r?\n/g, ' ');
  if (/[",\n]/.test(str)) return '"' + str.replace(/"/g, '""') + '"';
  return str;
}

function downloadCsv(filename, csvLines) {
  var blob = new Blob(['\uFEFF' + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportRequestsCsv() {
  var rows = getFilteredRequests();
  if (!rows.length) {
    alert('No rows to export for the current filters.');
    return;
  }
  var keys = [
    'id',
    'created_at',
    'client_name',
    'contact_name',
    'email',
    'phone',
    'service_type',
    'case_number',
    'deadline_date',
    'address_line1',
    'city',
    'state',
    'zip',
    'defendant_name',
    'court_jurisdiction',
    'email_sent'
  ];
  var lines = [keys.join(',')];
  rows.forEach(function(r) {
    lines.push(keys.map(function(k) {
      return csvCell(r[k]);
    }).join(','));
  });
  downloadCsv('prestige-requests-' + new Date().toISOString().slice(0, 10) + '.csv', lines);
}

function refreshRequestsDataView() {
  updateRequestStats();
  renderRequestsFilterMeta();
  renderRequestsTable();
}

function setRequestsPreset(preset) {
  requestsDatePreset = preset;
  if (preset !== 'custom') {
    requestsDateFrom = '';
    requestsDateTo = '';
  }
  requestsPage = 1;
  updateRequestStats();
  renderRequestsFilterMeta();
  renderRequestsToolbar();
  renderRequestsTable();
}

function onRequestCustomDateChange() {
  var f = document.getElementById('req-date-from');
  var t = document.getElementById('req-date-to');
  requestsDateFrom = f && f.value ? f.value : '';
  requestsDateTo = t && t.value ? t.value : '';
  requestsDatePreset = 'custom';
  requestsPage = 1;
  updateRequestStats();
  renderRequestsFilterMeta();
  renderRequestsToolbar();
  renderRequestsTable();
}

var __reqSearchTimer = null;
function scheduleRequestSearch(raw) {
  clearTimeout(__reqSearchTimer);
  __reqSearchTimer = setTimeout(function() {
    requestsSearch = raw;
    requestsPage = 1;
    refreshRequestsDataView();
  }, 280);
}

function setRequestsServiceFilter(v) {
  requestsServiceFilter = v;
  requestsPage = 1;
  refreshRequestsDataView();
}

function setRequestsStateFilter(v) {
  requestsStateFilter = v;
  requestsPage = 1;
  refreshRequestsDataView();
}

function setRequestsEmailSentFilter(v) {
  requestsEmailSentFilter = v;
  requestsPage = 1;
  refreshRequestsDataView();
}

function setRequestsEmergencyOnly(checked) {
  requestsEmergencyOnly = !!checked;
  requestsPage = 1;
  refreshRequestsDataView();
}

function setRequestsPageSize(v) {
  var n = parseInt(v, 10);
  if (!isNaN(n) && n > 0) requestsPageSize = n;
  requestsPage = 1;
  refreshRequestsDataView();
}

function resetRequestsFilters() {
  requestsDatePreset = 'all';
  requestsDateFrom = '';
  requestsDateTo = '';
  requestsSearch = '';
  requestsServiceFilter = '';
  requestsStateFilter = '';
  requestsEmailSentFilter = '';
  requestsEmergencyOnly = false;
  requestsPageSize = 10;
  requestsPage = 1;
  renderRequestsToolbar();
  refreshRequestsDataView();
}

function presetBtnClass(id, current) {
  return 'preset-btn' + (current === id ? ' active' : '');
}

function renderRequestsToolbar() {
  var el = document.getElementById('requests-toolbar');
  if (!el) return;
  var services = getUniqueRequestField('service_type');
  var states = getUniqueRequestField('state');
  var svcOpts =
    '<option value="">All services</option>' +
    services
      .map(function(s) {
        return (
          '<option value="' +
          escapeAttr(s) +
          '"' +
          (requestsServiceFilter === s ? ' selected' : '') +
          '>' +
          escapeHtml(s) +
          '</option>'
        );
      })
      .join('');
  var stOpts =
    '<option value="">All states</option>' +
    states
      .map(function(s) {
        return (
          '<option value="' +
          escapeAttr(s) +
          '"' +
          (requestsStateFilter === s ? ' selected' : '') +
          '>' +
          escapeHtml(s) +
          '</option>'
        );
      })
      .join('');
  var emailOpts = [
    { v: '', l: 'Email status (all)' },
    { v: 'sent', l: 'Sent' },
    { v: 'failed', l: 'Failed' },
    { v: 'pending', l: 'Pending' }
  ]
    .map(function(o) {
      return '<option value="' + o.v + '"' + (requestsEmailSentFilter === o.v ? ' selected' : '') + '>' + o.l + '</option>';
    })
    .join('');
  el.innerHTML =
    '<div class="dashboard-toolbar-inner">' +
    '<div class="dashboard-toolbar-row">' +
    '<span class="dashboard-filter-label">Date range</span>' +
    '<button type="button" class="' +
    presetBtnClass('all', requestsDatePreset) +
    '" onclick="setRequestsPreset(\'all\')">All time</button>' +
    '<button type="button" class="' +
    presetBtnClass('last_week', requestsDatePreset) +
    '" onclick="setRequestsPreset(\'last_week\')">Last week</button>' +
    '<button type="button" class="' +
    presetBtnClass('last_month', requestsDatePreset) +
    '" onclick="setRequestsPreset(\'last_month\')">Last month</button>' +
    '<button type="button" class="' +
    presetBtnClass('this_month', requestsDatePreset) +
    '" onclick="setRequestsPreset(\'this_month\')">This month</button>' +
    '<button type="button" class="' +
    presetBtnClass('this_year', requestsDatePreset) +
    '" onclick="setRequestsPreset(\'this_year\')">This year</button>' +
    '<button type="button" class="' +
    presetBtnClass('last_year', requestsDatePreset) +
    '" onclick="setRequestsPreset(\'last_year\')">Last year</button>' +
    '<span class="dashboard-filter-label dashboard-filter-label-gap">Custom</span>' +
    '<input type="date" id="req-date-from" class="dashboard-date-input" value="' +
    escapeAttr(requestsDateFrom) +
    '" onchange="onRequestCustomDateChange()" aria-label="From date">' +
    '<span class="dashboard-date-sep">—</span>' +
    '<input type="date" id="req-date-to" class="dashboard-date-input" value="' +
    escapeAttr(requestsDateTo) +
    '" onchange="onRequestCustomDateChange()" aria-label="To date">' +
    '</div>' +
    '<div class="dashboard-toolbar-row">' +
    '<span class="dashboard-filter-label">Search</span>' +
    '<input type="search" id="req-search" class="dashboard-search-input" placeholder="Client, email, case #, phone…" value="' +
    escapeAttr(requestsSearch) +
    '" oninput="scheduleRequestSearch(this.value)" aria-label="Search requests">' +
    '<span class="dashboard-filter-label">Filters</span>' +
    '<select class="dashboard-select" onchange="setRequestsServiceFilter(this.value)" aria-label="Service type">' +
    svcOpts +
    '</select>' +
    '<select class="dashboard-select" onchange="setRequestsStateFilter(this.value)" aria-label="State">' +
    stOpts +
    '</select>' +
    '<select class="dashboard-select" onchange="setRequestsEmailSentFilter(this.value)" aria-label="Email sent status">' +
    emailOpts +
    '</select>' +
    '<label class="dashboard-check-label"><input type="checkbox"' +
    (requestsEmergencyOnly ? ' checked' : '') +
    ' onchange="setRequestsEmergencyOnly(this.checked)"> Emergency only</label>' +
    '<span class="dashboard-filter-label dashboard-filter-label-gap">Rows / page</span>' +
    '<select class="dashboard-select dashboard-select-narrow" onchange="setRequestsPageSize(this.value)" aria-label="Page size">' +
    ['10', '25', '50', '100']
      .map(function(ps) {
        return '<option value="' + ps + '"' + (String(requestsPageSize) === ps ? ' selected' : '') + '>' + ps + '</option>';
      })
      .join('') +
    '</select>' +
    '</div>' +
    '<div class="dashboard-toolbar-actions">' +
    '<button type="button" class="btn-toolbar-export" onclick="exportRequestsCsv()">Export CSV</button>' +
    '<button type="button" class="btn-toolbar-reset" onclick="resetRequestsFilters()">Reset filters</button>' +
    '</div>' +
    '</div>';
}

function renderRequestsPagination(total, page, pageSize) {
  var el = document.getElementById('requests-pagination');
  if (!el) return;
  var pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) {
    el.innerHTML = '<span class="admin-pagination-info">No records</span>';
    return;
  }
  var start = (page - 1) * pageSize + 1;
  var end = Math.min(page * pageSize, total);
  el.innerHTML =
    '<span class="admin-pagination-info">Showing ' +
    start +
    '–' +
    end +
    ' of ' +
    total +
    '</span>' +
    '<div class="admin-pagination-btns">' +
    '<button type="button" class="btn-pagination"' +
    (page <= 1 ? ' disabled' : '') +
    ' onclick="goRequestsPage(' +
    (page - 1) +
    ')">Previous</button>' +
    '<span class="admin-pagination-page">Page ' +
    page +
    ' of ' +
    pages +
    '</span>' +
    '<button type="button" class="btn-pagination"' +
    (page >= pages ? ' disabled' : '') +
    ' onclick="goRequestsPage(' +
    (page + 1) +
    ')">Next</button>' +
    '</div>';
}

function goRequestsPage(page) {
  var filteredRequests = getFilteredRequests();
  var pages = Math.max(1, Math.ceil(filteredRequests.length / requestsPageSize));
  if (page < 1) page = 1;
  if (page > pages) page = pages;
  requestsPage = page;
  renderRequestsTable();
}

function renderRequestsTable() {
  var tbody = document.getElementById('requests-body');
  if (!tbody) return;
  var filteredRequests = getFilteredRequests();
  var total = filteredRequests.length;
  var pages = Math.max(1, Math.ceil(total / requestsPageSize));
  if (requestsPage > pages) requestsPage = pages;
  if (requestsPage < 1) requestsPage = 1;
  var start = (requestsPage - 1) * requestsPageSize;
  var slice = filteredRequests.slice(start, start + requestsPageSize);
  tbody.innerHTML = slice
    .map(function(r) {
      return (
        '<tr>' +
        '<td><input type="checkbox" class="request-checkbox" value="' +
        r.id +
        '"' +
        (selectedRequests.has(String(r.id)) ? ' checked' : '') +
        ' onchange="updateRequestSelection(this)"></td>' +
        '<td>#' +
        r.id +
        '</td>' +
        '<td>' +
        formatDateColor(r.created_at) +
        '</td>' +
        '<td>' +
        escapeHtml(r.client_name || '') +
        '</td>' +
        '<td>' +
        escapeHtml(r.contact_name || '') +
        '</td>' +
        '<td>' +
        escapeHtml(r.email || '') +
        '</td>' +
        '<td>' +
        escapeHtml(r.phone || '') +
        '</td>' +
        '<td>' +
        (r.service_type ? r.service_type.replace(/[^ -~]/g, '') : '') +
        '</td>' +
        '<td>' +
        escapeHtml(r.case_number || '') +
        '</td>' +
        '<td>' +
        (r.deadline_date ? formatDate(r.deadline_date) : '') +
        '</td>' +
        '<td><span class="status-badge">New</span></td>' +
        '<td><span class="email-status-badge ' +
        (r.email_sent === 1 ? 'success' : r.email_sent === 0 ? 'failed' : 'pending') +
        '">' +
        (r.email_sent === 1 ? 'Sent' : r.email_sent === 0 ? 'Failed' : 'Pending') +
        '</span></td>' +
        '<td><button type="button" class="action-btn view" onclick="viewRequest(' +
        r.id +
        ')">View</button> ' +
        '<button type="button" class="action-btn delete" onclick="deleteRequestRow(' +
        r.id +
        ')">Delete</button></td>' +
        '</tr>'
      );
    })
    .join('');
  renderRequestsPagination(total, requestsPage, requestsPageSize);
  makeTablesScrollable();
}

async function deleteRequestRow(id) {
  if (!confirm('Delete request #' + id + '? This cannot be undone.')) return;
  try {
    var res = await fetch('/api/admin/request/' + id, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    allRequests = allRequests.filter(function(r) {
      return String(r.id) !== String(id);
    });
    selectedRequests.delete(String(id));
    closeDetailModal();
    renderRequestsToolbar();
    refreshRequestsDataView();
  } catch (err) {
    console.error(err);
    alert('Could not delete this row. Check the server allows DELETE on /api/admin/request/:id');
  }
}

// Request selection functions
function updateRequestSelection(checkbox) {
  if (checkbox.checked) {
    selectedRequests.add(checkbox.value);
  } else {
    selectedRequests.delete(checkbox.value);
  }
  updateSelectAllRequestsCheckbox();
}

function toggleSelectAllRequests() {
  var checkboxes = document.querySelectorAll('.request-checkbox');
  var selectAllCheckbox = document.getElementById('select-all-requests');
  checkboxes.forEach(function(cb) {
    if (selectAllCheckbox.checked) {
      cb.checked = true;
      selectedRequests.add(cb.value);
    } else {
      cb.checked = false;
      selectedRequests.delete(cb.value);
    }
  });
}

function updateSelectAllRequestsCheckbox() {
  var checkboxes = document.querySelectorAll('.request-checkbox');
  var selectAllCheckbox = document.getElementById('select-all-requests');
  if (checkboxes.length === 0) {
    selectAllCheckbox.checked = false;
    return;
  }
  var allChecked = true;
  var noneChecked = true;
  checkboxes.forEach(function(cb) {
    if (cb.checked) noneChecked = false;
    else allChecked = false;
  });
  selectAllCheckbox.checked = allChecked;
  selectAllCheckbox.indeterminate = !allChecked && !noneChecked;
}

function selectAllRequests() {
  document.getElementById('select-all-requests').checked = true;
  document.querySelectorAll('.request-checkbox').forEach(function(cb) {
    cb.checked = true;
    selectedRequests.add(cb.value);
  });
}

function deselectAllRequests() {
  document.getElementById('select-all-requests').checked = false;
  document.querySelectorAll('.request-checkbox').forEach(function(cb) {
    cb.checked = false;
    selectedRequests.delete(cb.value);
  });
  selectedRequests.clear();
}

async function deleteSelectedRequests() {
  if (selectedRequests.size === 0) {
    alert('No requests selected');
    return;
  }
  if (!confirm('Delete ' + selectedRequests.size + ' selected request(s)? This cannot be undone.')) return;
  try {
    var ids = Array.from(selectedRequests);
    var res = await fetch('/api/admin/requests/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: ids })
    });
    if (!res.ok) throw new Error('Delete failed');
    allRequests = allRequests.filter(function(r) {
      return !selectedRequests.has(String(r.id));
    });
    selectedRequests.clear();
    closeDetailModal();
    renderRequestsToolbar();
    refreshRequestsDataView();
  } catch (err) {
    console.error(err);
    alert('Could not delete selected rows');
  }
}

async function loadRequests() {
  try {
    var response = await fetch('/api/admin/requests');
    var data = await response.json();
    allRequests = data.data || [];
    requestsPage = 1;
    requestsDatePreset = 'all';
    requestsDateFrom = '';
    requestsDateTo = '';
    requestsSearch = '';
    requestsServiceFilter = '';
    requestsStateFilter = '';
    requestsEmailSentFilter = '';
    requestsEmergencyOnly = false;
    requestsPageSize = 10;
    renderRequestsToolbar();
    refreshRequestsDataView();
  } catch (err) {
    console.error('Error loading requests:', err);
  }
}

async function loadContacts() {
  try {
    var response = await fetch('/api/admin/contacts');
    var data = await response.json();
    allContacts = data.data || [];
    contactsPage = 1;
    contactsDatePreset = 'all';
    contactsDateFrom = '';
    contactsDateTo = '';
    contactsSearch = '';
    contactsUrgencyFilter = '';
    contactsReasonFilter = '';
    contactsStateFilter = '';
    contactsEmailSentFilter = '';
    contactsSkipTraceFilter = '';
    contactsPageSize = 10;
    renderContactsToolbar();
    refreshContactsDataView();
  } catch (err) {
    console.error('Error loading contacts:', err);
  }
}

async function viewRequest(id) {
  try {
    const response = await fetch(`/api/admin/request/${id}`);
    const data = await response.json();
    const r = data.data;
    
    document.getElementById('modal-detail-title').textContent = `Request #${id}`;
    document.getElementById('modal-detail-body').innerHTML = `
      <div class="detail-section">
        <h4>Client Information</h4>
        <div class="highlight">
          <p><strong>Client Name:</strong> ${escapeHtml(r.client_name || '')}</p>
          <p><strong>Contact Name:</strong> ${escapeHtml(r.contact_name || '')}</p>
          <p><strong>Email:</strong> ${escapeHtml(r.email || '')}</p>
          <p><strong>Phone:</strong> ${escapeHtml(r.phone || '')}</p>
        </div>
      </div>
      <div class="detail-section">
        <h4>Service Address</h4>
        <div class="highlight">
          <p>${escapeHtml(r.address_line1 || '')}</p>
          <p>${escapeHtml(r.address_line2 || '')}</p>
          <p>${escapeHtml(r.city || '')}, ${escapeHtml(r.state || '')} ${escapeHtml(r.zip || '')}</p>
        </div>
      </div>
      <div class="detail-section">
        <h4>Case Details</h4>
        <p><strong>Defendant:</strong> ${escapeHtml(r.defendant_name || '')}</p>
        <p><strong>Case Number:</strong> ${escapeHtml(r.case_number || '')}</p>
        <p><strong>Court:</strong> ${escapeHtml(r.court_jurisdiction || '')}</p>
        <p><strong>Service Type:</strong> ${r.service_type ? r.service_type.replace(/[^ -~]/g, '') : ''}</p>
        <p><strong>Deadline:</strong> ${r.deadline_date ? formatDate(r.deadline_date) : 'Not specified'}</p>
        <p><strong>Multiple Defendants:</strong> ${r.multiple_defendants ? 'Yes' : 'No'}</p>
      </div>
      ${r.defendants_data ? `
      <div class="detail-section">
        <h4>Additional Defendants</h4>
        <div class="highlight">
          ${(function() {
            var defs = typeof r.defendants_data === 'string' ? JSON.parse(r.defendants_data) : r.defendants_data;
            return defs.map(function(d, i) {
              return '<div style="border:1px solid #e2e8f0;border-radius:6px;padding:12px 16px;margin-bottom:12px;background:#f8fafc;">' +
                '<p style="margin:0 0 8px 0;font-size:14px;font-weight:700;color:#1a3a5c;"><strong>Defendant #' + (i + 2) + ':</strong> ' + escapeHtml((d.firstName || '') + ' ' + (d.middleName || '') + ' ' + (d.lastName || '')) + '</p>' +
                (d.gender ? '<p style="margin:0 0 4px 0;font-size:13px;"><strong>Gender:</strong> ' + escapeHtml(d.gender) + '</p>' : '') +
                (d.relationship ? '<p style="margin:0 0 4px 0;font-size:13px;"><strong>Relationship:</strong> ' + escapeHtml(d.relationship) + '</p>' : '') +
                '<p style="margin:0 0 4px 0;font-size:13px;"><strong>Address:</strong> ' + escapeHtml(d.address || '') + '</p>' +
                '<p style="margin:0 0 4px 0;font-size:13px;"><strong>City:</strong> ' + escapeHtml(d.city || '') + ' <strong>State:</strong> ' + escapeHtml(d.state || '') + ' <strong>ZIP:</strong> ' + escapeHtml(d.zip || '') + '</p>' +
                (d.dob ? '<p style="margin:0 0 4px 0;font-size:13px;"><strong>DOB:</strong> ' + escapeHtml(d.dob) + '</p>' : '') +
                (d.phone ? '<p style="margin:0 0 4px 0;font-size:13px;"><strong>Phone:</strong> ' + escapeHtml(d.phone) + '</p>' : '') +
                (d.aliases ? '<p style="margin:0 0 4px 0;font-size:13px;"><strong>Known Aliases:</strong> ' + escapeHtml(d.aliases) + '</p>' : '') +
                (d.employer ? '<p style="margin:0 0 4px 0;font-size:13px;"><strong>Employer:</strong> ' + escapeHtml(d.employer) + '</p>' : '') +
                (d.physical ? '<p style="margin:0 0 4px 0;font-size:13px;"><strong>Physical Description:</strong> ' + escapeHtml(d.physical) + '</p>' : '') +
                (d.notes ? '<p style="margin:0 0 4px 0;font-size:13px;"><strong>Notes:</strong> ' + escapeHtml(d.notes) + '</p>' : '') +
                '</div>';
            }).join('');
          })()}
        </div>
      </div>
      ` : ''}
      <div class="detail-section">
        <h4>Special Instructions</h4>
        <p>${escapeHtml(r.special_instructions || 'None')}</p>
      </div>
      <div class="detail-section">
        <h4>Submission Info</h4>
        <p><strong>Submitted:</strong> ${formatDateColor(r.created_at)}</p>
        <p><strong>Email Sent:</strong> <span class="email-status-badge ${r.email_sent === 1 ? 'success' : r.email_sent === 0 ? 'failed' : 'pending'}">${r.email_sent === 1 ? 'Sent' : r.email_sent === 0 ? 'Failed' : 'Pending'}</span></p>
      </div>
      ${r.uploaded_files ? `
      <div class="detail-section">
        <h4>Uploaded Files</h4>
        <div class="highlight">
          ${(typeof r.uploaded_files === 'string' ? JSON.parse(r.uploaded_files) : r.uploaded_files).map((f, i) => `
            <p><a href="${f.url}" target="_blank" style="color:#1a2332;word-break:break-all;">${escapeHtml(f.name)}</a></p>
          `).join('')}
        </div>
      </div>
      ` : ''}
    `;
    
    document.getElementById('detail-modal').style.display = 'flex';
  } catch (err) {
    console.error('Error loading request:', err);
  }
}

async function viewContact(id) {
  try {
    const response = await fetch(`/api/admin/contact/${id}`);
    const data = await response.json();
    const c = data.data;

    console.log('[DEBUG viewContact] Full contact object:', JSON.stringify(c, null, 2));
    console.log('[DEBUG viewContact] c.skip_trace_data:', c.skip_trace_data);
    console.log('[DEBUG viewContact] type:', typeof c.skip_trace_data);
    console.log('[DEBUG viewContact] c.skip_trace_data keys:', c.skip_trace_data ? Object.keys(c.skip_trace_data) : 'N/A');

    // Parse skip trace data if present
    var skipTraceData = null;
    if (c.skip_trace_data) {
      try {
        // Handle case where Neon returns JSONB as string or already parsed object
        if (typeof c.skip_trace_data === 'string') {
          skipTraceData = JSON.parse(c.skip_trace_data);
        } else if (typeof c.skip_trace_data === 'object' && c.skip_trace_data !== null) {
          skipTraceData = c.skip_trace_data;
        } else {
          // Try parsing anyway in case it's a different format
          skipTraceData = JSON.parse(JSON.stringify(c.skip_trace_data));
        }
        console.log('[DEBUG viewContact] parsed skipTraceData:', skipTraceData);
      } catch(e) {
        skipTraceData = c.skip_trace_data;
        console.log('[DEBUG viewContact] parse error, using raw:', skipTraceData);
      }
    }

    var skipTraceSection = '';
    console.log('[DEBUG viewContact] skipTraceData exists:', !!skipTraceData, 'skipTraceData.firstName:', skipTraceData?.firstName, 'skipTraceData.fullname:', skipTraceData?.fullname);
    
    // Also check for fullname as fallback (some forms send fullname instead of firstName/lastName)
    const hasSkipTraceData = skipTraceData && (skipTraceData.firstName || skipTraceData.fullname);
    
    if (hasSkipTraceData) {
      console.log('[DEBUG viewContact] Skip trace section WILL render');
      
      // Handle fullname fallback
      if (!skipTraceData.firstName && skipTraceData.fullname) {
        const nameParts = skipTraceData.fullname.split(' ');
        skipTraceData.firstName = nameParts[0] || '';
        skipTraceData.lastName = nameParts.slice(1).join(' ') || '';
      }
      
      skipTraceSection = `
        <div class="detail-section" style="border-left:3px solid #2d3a7c;padding-left:16px;margin-top:16px;">
          <h4 style="color:#2d3a7c;">Skip Trace Intake Data</h4>
          <div class="highlight">
            <p><strong>Subject Name:</strong> ${escapeHtml((skipTraceData.firstName || '') + ' ' + (skipTraceData.lastName || ''))}</p>
            ${skipTraceData.middleName ? '<p><strong>Middle Name:</strong> ' + escapeHtml(skipTraceData.middleName) + '</p>' : ''}
            ${skipTraceData.aliases ? '<p><strong>Aliases/Maiden Name:</strong> ' + escapeHtml(skipTraceData.aliases) + '</p>' : ''}
            <p><strong>Date of Birth:</strong> ${skipTraceData.dob ? formatDate(skipTraceData.dob) : ''}</p>
            <p><strong>Last Known Phone:</strong> ${escapeHtml(skipTraceData.lastPhone || '')}</p>
            <p><strong>Last Known Address:</strong> ${escapeHtml(skipTraceData.lastAddress || '')}</p>
            <p><strong>Last Known Email:</strong> ${escapeHtml(skipTraceData.lastEmail || '')}</p>
            <p><strong>Social Media:</strong> ${escapeHtml(skipTraceData.social || '')}</p>
            ${skipTraceData.ssn ? '<p><strong>SSN (Last 4):</strong> ****' + escapeHtml(skipTraceData.ssn) + '</p>' : ''}
            ${skipTraceData.dl ? '<p><strong>Driver\'s License:</strong> ' + escapeHtml(skipTraceData.dl) + '</p>' : ''}
            ${skipTraceData.vehicle ? '<p><strong>Vehicle:</strong> ' + escapeHtml(skipTraceData.vehicle) + '</p>' : ''}
            ${skipTraceData.employer ? '<p><strong>Known Employer:</strong> ' + escapeHtml(skipTraceData.employer) + '</p>' : ''}
          </div>
        </div>
        <div class="detail-section" style="border-left:3px solid #2d3a7c;padding-left:16px;">
          <h4 style="color:#2d3a7c;">Search Details</h4>
          ${skipTraceData.serviceType ? '<p><strong>Service Type:</strong> ' + escapeHtml(skipTraceData.serviceType) + '</p>' : ''}
          <p><strong>Purpose:</strong> ${escapeHtml(skipTraceData.purpose || '')}</p>
          <p><strong>Case / File Number:</strong> ${escapeHtml(skipTraceData.caseNumber || '')}</p>
          <p><strong>Court / Jurisdiction:</strong> ${escapeHtml(skipTraceData.court || '')}</p>
          <p><strong>Deadline:</strong> ${skipTraceData.deadline ? formatDate(skipTraceData.deadline) : ''}</p>
          <p><strong>Rush Request:</strong> ${skipTraceData.rush === 'yes' ? '<span style="color:#c0392b;font-weight:600;">Yes — rush fees apply</span>' : 'No'}</p>
          <p><strong>Prior Search Attempted:</strong> ${skipTraceData.priorSearch === 'yes' ? 'Yes' : 'No'}</p>
          <p><strong>Role / Relationship:</strong> ${escapeHtml(skipTraceData.role || '')}</p>
          <p><strong>State of Jurisdiction:</strong> ${escapeHtml(skipTraceData.jurisdiction || '')}</p>
        </div>
        ${skipTraceData.notes ? `
        <div class="detail-section" style="border-left:3px solid #2d3a7c;padding-left:16px;">
          <h4 style="color:#2d3a7c;">Additional Notes</h4>
          <p>${escapeHtml(skipTraceData.notes)}</p>
        </div>
        ` : ''}
        <div class="detail-section" style="border-left:3px solid #2d3a7c;padding-left:16px;">
          <p><span style="display:inline-block;background:#e8f7ee;color:#16a34a;border:1px solid #b4d8b8;border-radius:4px;padding:4px 10px;font-size:12px;font-weight:500;">FCRA Certified</span></p>
        </div>
        ${skipTraceData.uploadedFiles && skipTraceData.uploadedFiles.length ? `
        <div class="detail-section" style="border-left:3px solid #2d3a7c;padding-left:16px;">
          <h4 style="color:#2d3a7c;">Uploaded Files</h4>
          <div class="highlight">
            ${skipTraceData.uploadedFiles.map(function(f) { return '<p>📎 ' + escapeHtml(f) + '</p>'; }).join('')}
          </div>
        </div>
        ` : ''}
        ${skipTraceData.defendants && skipTraceData.defendants.length ? `
        <div class="detail-section" style="border-left:3px solid #2d3a7c;padding-left:16px;margin-top:16px;">
          <h4 style="color:#2d3a7c;">Additional Defendants</h4>
          <div class="highlight">
            ${skipTraceData.defendants.map(function(def, i) {
              return '<p><strong>Defendant #' + (i + 2) + ':</strong> ' + escapeHtml((def.firstName || '') + ' ' + (def.middleName || '') + ' ' + (def.lastName || '')) + '</p><p style="margin-left:16px;font-size:13px;">Address: ' + escapeHtml(def.address || '') + ', ' + escapeHtml(def.city || '') + ', ' + escapeHtml(def.state || '') + '</p>';
            }).join('')}
          </div>
        </div>
        ` : ''}
      `;
    }

    document.getElementById('modal-detail-title').textContent = `Contact #${id}`;
    document.getElementById('modal-detail-body').innerHTML = `
      <div class="detail-section">
        <h4>Contact Information</h4>
        <div class="highlight">
          <p><strong>Name:</strong> ${escapeHtml((c.first_name || '') + ' ' + (c.last_name || ''))}</p>
          <p><strong>Company:</strong> ${escapeHtml(c.company || '')}</p>
          <p><strong>Email:</strong> ${escapeHtml(c.email || '')}</p>
          <p><strong>Phone:</strong> ${escapeHtml(c.phone || '')}</p>
        </div>
      </div>
      <div class="detail-section">
        <h4>Case Information</h4>
        <p><strong>Reason:</strong> ${escapeHtml(c.reason || '')}</p>
        <p><strong>County/City:</strong> ${escapeHtml(c.county || '')}</p>
        <p><strong>State:</strong> ${escapeHtml(c.state || '')}</p>
        <p><strong>Urgency:</strong> ${getUrgencyBadge(c.urgency)}</p>
      </div>
      <div class="detail-section">
        <h4>Case Details</h4>
        <div class="highlight">
          <p>${escapeHtml(c.case_details || '')}</p>
        </div>
      </div>
      ${skipTraceSection}
      <div class="detail-section">
        <h4>Submission Info</h4>
        <p><strong>Submitted:</strong> ${formatDateColor(c.created_at)}</p>
        <p><strong>Email Sent:</strong> <span class="email-status-badge ${c.email_sent === 1 ? 'success' : c.email_sent === 0 ? 'failed' : 'pending'}">${c.email_sent === 1 ? 'Sent' : c.email_sent === 0 ? 'Failed' : 'Pending'}</span></p>
      </div>
    `;

    document.getElementById('detail-modal').style.display = 'flex';
  } catch (err) {
    console.error('Error loading contact:', err);
  }
}

async function deleteContactRow(id) {
  if (!confirm('Delete contact #' + id + '? This cannot be undone.')) return;
  try {
    var res = await fetch('/api/admin/contact/' + id, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    allContacts = allContacts.filter(function(c) {
      return String(c.id) !== String(id);
    });
    selectedContacts.delete(String(id));
    closeDetailModal();
    refreshContactsDataView();
  } catch (err) {
    console.error(err);
    alert('Could not delete this contact');
  }
}

// Contact selection functions
function updateContactSelection(checkbox) {
  if (checkbox.checked) {
    selectedContacts.add(checkbox.value);
  } else {
    selectedContacts.delete(checkbox.value);
  }
  updateSelectAllContactsCheckbox();
}

function toggleSelectAllContacts() {
  var checkboxes = document.querySelectorAll('.contact-checkbox');
  var selectAllCheckbox = document.getElementById('select-all-contacts');
  checkboxes.forEach(function(cb) {
    if (selectAllCheckbox.checked) {
      cb.checked = true;
      selectedContacts.add(cb.value);
    } else {
      cb.checked = false;
      selectedContacts.delete(cb.value);
    }
  });
}

function updateSelectAllContactsCheckbox() {
  var checkboxes = document.querySelectorAll('.contact-checkbox');
  var selectAllCheckbox = document.getElementById('select-all-contacts');
  if (checkboxes.length === 0) {
    selectAllCheckbox.checked = false;
    return;
  }
  var allChecked = true;
  var noneChecked = true;
  checkboxes.forEach(function(cb) {
    if (cb.checked) noneChecked = false;
    else allChecked = false;
  });
  selectAllCheckbox.checked = allChecked;
  selectAllCheckbox.indeterminate = !allChecked && !noneChecked;
}

function selectAllContacts() {
  document.getElementById('select-all-contacts').checked = true;
  document.querySelectorAll('.contact-checkbox').forEach(function(cb) {
    cb.checked = true;
    selectedContacts.add(cb.value);
  });
}

function deselectAllContacts() {
  document.getElementById('select-all-contacts').checked = false;
  document.querySelectorAll('.contact-checkbox').forEach(function(cb) {
    cb.checked = false;
    selectedContacts.delete(cb.value);
  });
  selectedContacts.clear();
}

async function deleteSelectedContacts() {
  if (selectedContacts.size === 0) {
    alert('No contacts selected');
    return;
  }
  if (!confirm('Delete ' + selectedContacts.size + ' selected contact(s)? This cannot be undone.')) return;
  try {
    var ids = Array.from(selectedContacts);
    var res = await fetch('/api/admin/contacts/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: ids })
    });
    if (!res.ok) throw new Error('Delete failed');
    allContacts = allContacts.filter(function(c) {
      return !selectedContacts.has(String(c.id));
    });
    selectedContacts.clear();
    closeDetailModal();
    refreshContactsDataView();
  } catch (err) {
    console.error(err);
    alert('Could not delete selected contacts');
  }
}

function renderContactsTable() {
  var tbody = document.getElementById('contacts-body');
  if (!tbody) return;
  var filteredContacts = getFilteredContacts();
  var total = filteredContacts.length;
  var pages = Math.max(1, Math.ceil(total / contactsPageSize));
  if (contactsPage > pages) contactsPage = pages;
  if (contactsPage < 1) contactsPage = 1;
  var start = (contactsPage - 1) * contactsPageSize;
  var slice = filteredContacts.slice(start, start + contactsPageSize);
  tbody.innerHTML = slice
    .map(function(c) {
      return (
        '<tr>' +
        '<td><input type="checkbox" class="contact-checkbox" value="' +
        c.id +
        '"' +
        (selectedContacts.has(String(c.id)) ? ' checked' : '') +
        ' onchange="updateContactSelection(this)"></td>' +
        '<td>#' +
        c.id +
        '</td>' +
        '<td>' +
        formatDateColor(c.created_at) +
        '</td>' +
        '<td>' +
        escapeHtml((c.first_name || '') + ' ' + (c.last_name || '')) +
        '</td>' +
        '<td>' +
        escapeHtml(c.company || '') +
        '</td>' +
        '<td>' +
        escapeHtml(c.email || '') +
        '</td>' +
        '<td>' +
        escapeHtml(c.phone || '') +
        '</td>' +
        '<td>' +
        escapeHtml(c.reason || '') +
        '</td>' +
        '<td>' +
        escapeHtml(c.case_number || '') +
        '</td>' +
        '<td>' +
        (c.deadline_date ? formatDate(c.deadline_date) : '') +
        '</td>' +
        '<td>' + getUrgencyBadge(c.urgency) + '</td>' +
        '<td><span class="email-status-badge ' +
        (c.email_sent === 1 ? 'success' : c.email_sent === 0 ? 'failed' : 'pending') +
        '">' +
        (c.email_sent === 1 ? 'Sent' : c.email_sent === 0 ? 'Failed' : 'Pending') +
        '</span></td>' +
        '<td><button class="action-btn view" onclick="viewContact(' +
        c.id +
        ')">View</button> <button class="action-btn delete" onclick="deleteContactRow(' +
        c.id +
        ')">Delete</button></td>' +
        '</tr>'
      );
    })
    .join('');
  renderContactsPagination(total, contactsPage, contactsPageSize);
  makeTablesScrollable();
}

function renderContactsPagination(total, page, pageSize) {
  var el = document.getElementById('contacts-pagination');
  if (!el) return;
  var pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) {
    el.innerHTML = '<span class="admin-pagination-info">No records</span>';
    return;
  }
  var start = (page - 1) * pageSize + 1;
  var end = Math.min(page * pageSize, total);
  el.innerHTML =
    '<span class="admin-pagination-info">Showing ' +
    start +
    '–' +
    end +
    ' of ' +
    total +
    '</span>' +
    '<div class="admin-pagination-btns">' +
    '<button type="button" class="btn-pagination"' +
    (page <= 1 ? ' disabled' : '') +
    ' onclick="goContactsPage(' +
    (page - 1) +
    ')">Previous</button>' +
    '<span class="admin-pagination-page">Page ' +
    page +
    ' of ' +
    pages +
    '</span>' +
    '<button type="button" class="btn-pagination"' +
    (page >= pages ? ' disabled' : '') +
    ' onclick="goContactsPage(' +
    (page + 1) +
    ')">Next</button>' +
    '</div>';
}

function goContactsPage(page) {
  var filteredContacts = getFilteredContacts();
  var pages = Math.max(1, Math.ceil(filteredContacts.length / contactsPageSize));
  if (page < 1) page = 1;
  if (page > pages) page = pages;
  contactsPage = page;
  renderContactsTable();
}

function closeDetailModal() {
  document.getElementById('detail-modal').style.display = 'none';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getDateColor(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const diffDays = Math.round((now - d) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return '#16a34a';       // green - today
  if (diffDays === 1) return '#2563eb';       // blue - yesterday
  if (diffDays === 2) return '#c0392b';      // red - 2 days ago
  return '#666';                             // gray - older
}

function formatDateColor(dateStr) {
  if (!dateStr) return '<span style="color:#999;">—</span>';
  const color = getDateColor(dateStr);
  const formatted = new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  return '<span style="color:' + color + ';font-weight:500;">' + formatted + '</span>';
}

function contactHasSkipTrace(c) {
  if (!c || !c.skip_trace_data) return false;
  var st = c.skip_trace_data;
  if (typeof st === 'string') {
    try {
      st = JSON.parse(st);
    } catch (e1) {
      return false;
    }
  }
  if (!st || typeof st !== 'object') return false;
  return !!(st.firstName || st.fullname);
}

function contactMatchesSearch(c, q) {
  if (!q) return true;
  var s = q.toLowerCase();
  var hay = [
    c.first_name,
    c.last_name,
    c.company,
    c.email,
    c.phone,
    c.reason,
    c.case_number,
    c.county,
    c.state,
    c.case_details
  ]
    .join(' ')
    .toLowerCase();
  return hay.indexOf(s) !== -1;
}

function getFilteredContacts() {
  var range = getPresetTimeRange(contactsDatePreset, contactsDateFrom, contactsDateTo);
  return allContacts.filter(function(c) {
    if (!createdInTimeRange(c.created_at, range)) return false;
    if (!contactMatchesSearch(c, contactsSearch)) return false;
    if (contactsUrgencyFilter && String(c.urgency || '') !== contactsUrgencyFilter) return false;
    if (contactsReasonFilter && String(c.reason || '') !== contactsReasonFilter) return false;
    if (contactsStateFilter && String(c.state || '').toUpperCase() !== String(contactsStateFilter).toUpperCase()) return false;
    if (contactsEmailSentFilter === 'sent' && Number(c.email_sent) !== 1) return false;
    if (contactsEmailSentFilter === 'failed' && Number(c.email_sent) !== 0) return false;
    if (contactsEmailSentFilter === 'pending') {
      var es = c.email_sent;
      if (es === 1 || es === 0) return false;
    }
    if (contactsSkipTraceFilter === 'yes' && !contactHasSkipTrace(c)) return false;
    if (contactsSkipTraceFilter === 'no' && contactHasSkipTrace(c)) return false;
    return true;
  });
}

function getUniqueContactField(field) {
  var set = {};
  allContacts.forEach(function(c) {
    var v = c[field];
    if (v != null && String(v).trim() !== '') set[String(v).trim()] = true;
  });
  return Object.keys(set).sort();
}

function updateContactsSummaryStats() {
  var totalEl = document.getElementById('contacts-total');
  if (!totalEl) return;
  var filtered = getFilteredContacts();
  var today = new Date().toDateString();
  totalEl.textContent = allContacts.length;
  var fc = document.getElementById('contacts-filtered-count');
  if (fc) fc.textContent = filtered.length;
  var td = document.getElementById('contacts-today');
  if (td) {
    td.textContent = filtered.filter(function(c) {
      return c.created_at && new Date(c.created_at).toDateString() === today;
    }).length;
  }
  var sk = document.getElementById('contacts-skiptrace');
  if (sk) sk.textContent = filtered.filter(contactHasSkipTrace).length;
}

function renderContactsFilterMeta() {
  var el = document.getElementById('contacts-filter-meta');
  if (!el) return;
  var n = getFilteredContacts().length;
  var m = allContacts.length;
  el.textContent = n === m ? 'Showing all ' + m + ' loaded record(s).' : 'Filters match ' + n + ' of ' + m + ' loaded record(s).';
}

function exportContactsCsv() {
  var rows = getFilteredContacts();
  if (!rows.length) {
    alert('No rows to export for the current filters.');
    return;
  }
  var keys = [
    'id',
    'created_at',
    'first_name',
    'last_name',
    'company',
    'email',
    'phone',
    'reason',
    'case_number',
    'deadline_date',
    'urgency',
    'county',
    'state',
    'email_sent',
    'has_skip_trace'
  ];
  var lines = [keys.join(',')];
  rows.forEach(function(c) {
    lines.push(
      keys
        .map(function(k) {
          if (k === 'has_skip_trace') return csvCell(contactHasSkipTrace(c) ? 'yes' : 'no');
          return csvCell(c[k]);
        })
        .join(',')
    );
  });
  downloadCsv('prestige-contacts-' + new Date().toISOString().slice(0, 10) + '.csv', lines);
}

function refreshContactsDataView() {
  updateContactsSummaryStats();
  renderContactsFilterMeta();
  renderContactsTable();
}

function setContactsPreset(preset) {
  contactsDatePreset = preset;
  if (preset !== 'custom') {
    contactsDateFrom = '';
    contactsDateTo = '';
  }
  contactsPage = 1;
  updateContactsSummaryStats();
  renderContactsFilterMeta();
  renderContactsToolbar();
  renderContactsTable();
}

function onContactCustomDateChange() {
  var f = document.getElementById('con-date-from');
  var t = document.getElementById('con-date-to');
  contactsDateFrom = f && f.value ? f.value : '';
  contactsDateTo = t && t.value ? t.value : '';
  contactsDatePreset = 'custom';
  contactsPage = 1;
  updateContactsSummaryStats();
  renderContactsFilterMeta();
  renderContactsToolbar();
  renderContactsTable();
}

var __conSearchTimer = null;
function scheduleContactSearch(raw) {
  clearTimeout(__conSearchTimer);
  __conSearchTimer = setTimeout(function() {
    contactsSearch = raw;
    contactsPage = 1;
    refreshContactsDataView();
  }, 280);
}

function setContactsUrgencyFilter(v) {
  contactsUrgencyFilter = v;
  contactsPage = 1;
  refreshContactsDataView();
}

function setContactsReasonFilter(v) {
  contactsReasonFilter = v;
  contactsPage = 1;
  refreshContactsDataView();
}

function setContactsStateFilter(v) {
  contactsStateFilter = v;
  contactsPage = 1;
  refreshContactsDataView();
}

function setContactsEmailSentFilter(v) {
  contactsEmailSentFilter = v;
  contactsPage = 1;
  refreshContactsDataView();
}

function setContactsSkipTraceFilter(v) {
  contactsSkipTraceFilter = v;
  contactsPage = 1;
  refreshContactsDataView();
}

function setContactsPageSize(v) {
  var n = parseInt(v, 10);
  if (!isNaN(n) && n > 0) contactsPageSize = n;
  contactsPage = 1;
  refreshContactsDataView();
}

function resetContactsFilters() {
  contactsDatePreset = 'all';
  contactsDateFrom = '';
  contactsDateTo = '';
  contactsSearch = '';
  contactsUrgencyFilter = '';
  contactsReasonFilter = '';
  contactsStateFilter = '';
  contactsEmailSentFilter = '';
  contactsSkipTraceFilter = '';
  contactsPageSize = 10;
  contactsPage = 1;
  renderContactsToolbar();
  refreshContactsDataView();
}

function renderContactsToolbar() {
  var el = document.getElementById('contacts-toolbar');
  if (!el) return;
  var reasons = getUniqueContactField('reason');
  var states = getUniqueContactField('state');
  var urgencies = ['Standard', 'Elevated', 'High', 'Critical'];
  var reaOpts =
    '<option value="">All reasons</option>' +
    reasons
      .map(function(s) {
        return (
          '<option value="' +
          escapeAttr(s) +
          '"' +
          (contactsReasonFilter === s ? ' selected' : '') +
          '>' +
          escapeHtml(s) +
          '</option>'
        );
      })
      .join('');
  var stOpts =
    '<option value="">All states</option>' +
    states
      .map(function(s) {
        return (
          '<option value="' +
          escapeAttr(s) +
          '"' +
          (contactsStateFilter === s ? ' selected' : '') +
          '>' +
          escapeHtml(s) +
          '</option>'
        );
      })
      .join('');
  var urgOpts =
    '<option value="">All urgencies</option>' +
    urgencies
      .map(function(u) {
        return (
          '<option value="' +
          escapeAttr(u) +
          '"' +
          (contactsUrgencyFilter === u ? ' selected' : '') +
          '>' +
          u +
          '</option>'
        );
      })
      .join('');
  var emailOpts = [
    { v: '', l: 'Email status (all)' },
    { v: 'sent', l: 'Sent' },
    { v: 'failed', l: 'Failed' },
    { v: 'pending', l: 'Pending' }
  ]
    .map(function(o) {
      return '<option value="' + o.v + '"' + (contactsEmailSentFilter === o.v ? ' selected' : '') + '>' + o.l + '</option>';
    })
    .join('');
  var skipOpts = [
    { v: '', l: 'Skip trace (all)' },
    { v: 'yes', l: 'With skip trace' },
    { v: 'no', l: 'Without skip trace' }
  ]
    .map(function(o) {
      return '<option value="' + o.v + '"' + (contactsSkipTraceFilter === o.v ? ' selected' : '') + '>' + o.l + '</option>';
    })
    .join('');
  el.innerHTML =
    '<div class="dashboard-toolbar-inner">' +
    '<div class="dashboard-toolbar-row">' +
    '<span class="dashboard-filter-label">Date range</span>' +
    '<button type="button" class="' +
    presetBtnClass('all', contactsDatePreset) +
    '" onclick="setContactsPreset(\'all\')">All time</button>' +
    '<button type="button" class="' +
    presetBtnClass('last_week', contactsDatePreset) +
    '" onclick="setContactsPreset(\'last_week\')">Last week</button>' +
    '<button type="button" class="' +
    presetBtnClass('last_month', contactsDatePreset) +
    '" onclick="setContactsPreset(\'last_month\')">Last month</button>' +
    '<button type="button" class="' +
    presetBtnClass('this_month', contactsDatePreset) +
    '" onclick="setContactsPreset(\'this_month\')">This month</button>' +
    '<button type="button" class="' +
    presetBtnClass('this_year', contactsDatePreset) +
    '" onclick="setContactsPreset(\'this_year\')">This year</button>' +
    '<button type="button" class="' +
    presetBtnClass('last_year', contactsDatePreset) +
    '" onclick="setContactsPreset(\'last_year\')">Last year</button>' +
    '<span class="dashboard-filter-label dashboard-filter-label-gap">Custom</span>' +
    '<input type="date" id="con-date-from" class="dashboard-date-input" value="' +
    escapeAttr(contactsDateFrom) +
    '" onchange="onContactCustomDateChange()" aria-label="From date">' +
    '<span class="dashboard-date-sep">—</span>' +
    '<input type="date" id="con-date-to" class="dashboard-date-input" value="' +
    escapeAttr(contactsDateTo) +
    '" onchange="onContactCustomDateChange()" aria-label="To date">' +
    '</div>' +
    '<div class="dashboard-toolbar-row">' +
    '<span class="dashboard-filter-label">Search</span>' +
    '<input type="search" id="con-search" class="dashboard-search-input" placeholder="Name, company, email, reason…" value="' +
    escapeAttr(contactsSearch) +
    '" oninput="scheduleContactSearch(this.value)" aria-label="Search contacts">' +
    '<span class="dashboard-filter-label">Filters</span>' +
    '<select class="dashboard-select" onchange="setContactsUrgencyFilter(this.value)" aria-label="Urgency">' +
    urgOpts +
    '</select>' +
    '<select class="dashboard-select" onchange="setContactsReasonFilter(this.value)" aria-label="Reason">' +
    reaOpts +
    '</select>' +
    '<select class="dashboard-select" onchange="setContactsStateFilter(this.value)" aria-label="State">' +
    stOpts +
    '</select>' +
    '<select class="dashboard-select" onchange="setContactsEmailSentFilter(this.value)" aria-label="Email sent">' +
    emailOpts +
    '</select>' +
    '<select class="dashboard-select" onchange="setContactsSkipTraceFilter(this.value)" aria-label="Skip trace">' +
    skipOpts +
    '</select>' +
    '<span class="dashboard-filter-label dashboard-filter-label-gap">Rows / page</span>' +
    '<select class="dashboard-select dashboard-select-narrow" onchange="setContactsPageSize(this.value)" aria-label="Page size">' +
    ['10', '25', '50', '100']
      .map(function(ps) {
        return '<option value="' + ps + '"' + (String(contactsPageSize) === ps ? ' selected' : '') + '>' + ps + '</option>';
      })
      .join('') +
    '</select>' +
    '</div>' +
    '<div class="dashboard-toolbar-actions">' +
    '<button type="button" class="btn-toolbar-export" onclick="exportContactsCsv()">Export CSV</button>' +
    '<button type="button" class="btn-toolbar-reset" onclick="resetContactsFilters()">Reset filters</button>' +
    '</div>' +
    '</div>';
}

function fixEncoding(str) {
  if (!str) return '';
  var result = str;
  result = result.split('â ').join('-- ');
  result = result.split('â7').join('-7');
  result = result.split('â€"').join('--');
  result = result.split('â€"').join('--');
  result = result.split('â€').join('--');
  result = result.split('â"' + '').join('-');
  result = result.split('â"').join('-');
  result = result.split('â€"').join('');
  result = result.split('â€').join('');
  result = result.split('â').join('');
  result = result.split('Â').join('');
  result = result.replace(/[Ã]+/g, '');
  return result;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Ensure tables scroll horizontally on mobile
function makeTablesScrollable() {
  document.querySelectorAll('.table-container').forEach(function(container) {
    container.style.overflowX = 'auto';
    container.style.webkitOverflowScrolling = 'touch';
  });
}

// Ensure tab bar scrolls horizontally on mobile
function makeTabsScrollable() {
  var tabs = document.querySelector('.dashboard-tabs');
  if (tabs) {
    tabs.style.overflowX = 'auto';
    tabs.style.whiteSpace = 'nowrap';
    tabs.style.scrollbarWidth = 'none';
    tabs.style.msOverflowStyle = 'none';
    var style = document.createElement('style');
    style.textContent = '.dashboard-tabs::-webkit-scrollbar { display: none; }';
    document.head.appendChild(style);
  }
}

function loadOwnerEmail() {
  fetch('/api/admin/settings')
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.ownerEmail) {
        document.getElementById('owner-email-input').value = data.ownerEmail;
      }
    })
    .catch(function(err) {
      console.error('Error loading owner email:', err);
    });
}

function saveOwnerEmail() {
  const emailInput = document.getElementById('owner-email-input');
  const statusEl = document.getElementById('email-save-status');
  const email = emailInput.value.trim();
  
  if (!email) {
    alert('Please enter a valid email address');
    return;
  }
  
  statusEl.textContent = 'Saving...';
  statusEl.style.color = '#666';
  statusEl.style.display = 'inline';
  
  fetch('/api/admin/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerEmail: email })
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    if (data.success) {
      statusEl.textContent = 'Saved!';
      statusEl.style.color = 'green';
      setTimeout(function() {
        statusEl.style.display = 'none';
      }, 3000);
    } else {
      statusEl.textContent = data.message || 'Save failed';
      statusEl.style.color = 'red';
    }
  })
  .catch(function(err) {
    console.error('Error saving owner email:', err);
    statusEl.textContent = 'Error saving';
    statusEl.style.color = 'red';
  });
}
