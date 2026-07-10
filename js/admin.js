// Admin Dashboard JavaScript

/** Date-only values (deadline, DOB) — YYYY-MM-DD, no timezone shift */
function parseCalendarDate(dateStr) {
  if (!dateStr) return null;
  var s = String(dateStr).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  var p = s.split('-');
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
}

/** UTC instants from the database (created_at, etc.) → shown in viewer's local timezone */
function parseInstantUtc(dateStr) {
  if (!dateStr) return null;
  var s = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;

  if (/[zZ]$/.test(s) || /[+-]\d{2}(:?\d{2})?$/.test(s)) {
    var direct = new Date(s);
    return isNaN(direct.getTime()) ? null : direct;
  }

  var normalized = s.replace(' ', 'T');
  if (!/T\d{2}:\d{2}/.test(normalized)) return null;
  normalized = normalized.replace(/(\.\d{3})\d*/, '$1');
  if (!/[zZ]$|[+-]/.test(normalized)) normalized += 'Z';
  var d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

function isDateOnlyValue(dateStr) {
  if (!dateStr) return false;
  var s = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return true;
  if (/^\d{4}-\d{2}-\d{2}T00:00:00/.test(s)) return true;
  return false;
}

/** Submitted date/time in the dashboard viewer's local timezone (USA, etc.) */
function formatSubmissionTime(dateStr) {
  var d = parseInstantUtc(dateStr);
  if (!d) {
    var cal = parseCalendarDate(dateStr);
    if (!cal) return '';
    return cal.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  });
}

/** Deadline / DOB — calendar date only (no misleading midnight time) */
function formatCalendarDate(dateStr) {
  var d = parseCalendarDate(dateStr);
  if (!d) {
    var instant = parseInstantUtc(dateStr);
    if (!instant) return '';
    return instant.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  if (isDateOnlyValue(dateStr)) return formatCalendarDate(dateStr);
  return formatSubmissionTime(dateStr);
}

var SERVICE_PRIORITY_STYLES = {
  standard: { label: 'Standard Priority', bg: '#e8f7ee', color: '#16a34a', border: '#b4d8b8', dot: '#16a34a' },
  elevated: { label: 'Elevated Priority', bg: '#e8f0fc', color: '#2563eb', border: '#b4c8e8', dot: '#2563eb' },
  high: { label: 'High Priority', bg: '#fef3e2', color: '#b7770d', border: '#e8d0a8', dot: '#b7770d' },
  critical: { label: 'Critical Priority', bg: '#fce8e8', color: '#c0392b', border: '#e8b4b4', dot: '#c0392b' }
};

function resolveServicePriority(serviceType, skipTraceData) {
  var s = String(serviceType || '').toLowerCase();
  if (s.indexOf('emergency') !== -1 || s.indexOf('rush trace') !== -1) return 'critical';
  if (s.indexOf('priority serve') !== -1 || s.indexOf('court-ready') !== -1) return 'high';
  if (s.indexOf('rush service') !== -1 || s.indexOf('enhanced trace') !== -1 || s.indexOf('business / agent') !== -1) return 'elevated';
  if (s.indexOf('standard') !== -1) return 'standard';
  var st = skipTraceData;
  if (typeof st === 'string') {
    try { st = JSON.parse(st); } catch (e) { st = null; }
  }
  if (st && st.serviceType) {
    var m = String(st.serviceType).toLowerCase();
    if (m.indexOf('process server') !== -1 || m.indexOf('critical') !== -1) return 'critical';
    if (m.indexOf('court') !== -1 || m.indexOf('affidavit') !== -1) return 'high';
    if (m.indexOf('deep') !== -1) return 'elevated';
    if (m.indexOf('standard') !== -1) return 'standard';
  }
  return 'standard';
}

function getServicePriorityBadge(serviceType, skipTraceData) {
  var key = resolveServicePriority(serviceType, skipTraceData);
  var p = SERVICE_PRIORITY_STYLES[key] || SERVICE_PRIORITY_STYLES.standard;
  return '<span class="status-badge" style="display:inline-flex;align-items:center;gap:5px;background:' + p.bg + ';color:' + p.color + ';border:1px solid ' + p.border + ';border-radius:20px;padding:4px 10px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;white-space:nowrap;">' +
    '<span style="width:5px;height:5px;border-radius:50%;background:' + p.dot + ';flex-shrink:0;"></span>' +
    escapeHtml(p.label) + '</span>';
}

function getRequestCaseNumber(r) {
  var st = parseJsonField(r.skip_trace_data);
  if (st && st.caseNumber) return st.caseNumber;
  return r.case_number || '';
}

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
  if (tab === 'invoices') loadInvoices();
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
        escapeHtml(getRequestCaseNumber(r)) +
        '</td>' +
        '<td>' +
        (r.deadline_date ? formatCalendarDate(r.deadline_date) : '') +
        '</td>' +
        '<td>' + getServicePriorityBadge(r.service_type, r.skip_trace_data) + '</td>' +
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

function parseJsonField(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

function classifyRequestService(serviceType) {
  var s = String(serviceType || '').toLowerCase();
  if (s.indexOf('skip trace') !== -1 || s.indexOf('enhanced trace') !== -1 ||
      s.indexOf('rush trace') !== -1 || s.indexOf('business / agent') !== -1 ||
      s.indexOf('court-ready') !== -1) return 'skip_trace';
  if (s.indexOf('service') !== -1 || s.indexOf('serve') !== -1 ||
      s.indexOf('emergency') !== -1 || s.indexOf('priority') !== -1) return 'process_serve';
  return 'general';
}

function vaVal(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function vaFieldRow(label, value) {
  var v = vaVal(value);
  if (!v) return '';
  return '<tr><td class="va-field-label">' + escapeHtml(label) + '</td><td class="va-field-value">' + escapeHtml(v) + '</td></tr>';
}

function vaSection(title, rowsHtml) {
  if (!rowsHtml || !String(rowsHtml).replace(/\s/g, '')) return '';
  return '<div class="detail-section va-detail-section"><h4 class="va-section-title">' + escapeHtml(title) + '</h4><table class="va-field-table"><tbody>' + rowsHtml + '</tbody></table></div>';
}

function vaCopyLine(label, value) {
  var v = vaVal(value);
  if (!v) return '';
  return label + ': ' + v;
}

function formatDefendantFullName(def) {
  if (!def) return '';
  if (def.firstName || def.lastName) {
    return [def.firstName, def.middleName, def.lastName].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  }
  return vaVal(def.name || def.defendantName);
}

function buildVaDefendantCard(def, index, isPrimary) {
  var name = formatDefendantFullName(def) || '—';
  var rows = '';
  rows += vaFieldRow('Full legal name', name);
  rows += vaFieldRow('Gender', def.gender);
  rows += vaFieldRow('Relationship to case', def.relationship);
  rows += vaFieldRow('Service address', def.address);
  rows += vaFieldRow('Address line 2', def.addressLine2);
  rows += vaFieldRow('City', def.city);
  rows += vaFieldRow('State', def.state);
  rows += vaFieldRow('ZIP', def.zip);
  rows += vaFieldRow('Country', def.country);
  rows += vaFieldRow('Date of birth', def.dob ? formatDate(def.dob) : '');
  rows += vaFieldRow('Phone', def.phone);
  rows += vaFieldRow('Known aliases', def.aliases);
  rows += vaFieldRow('Employer / workplace', def.employer);
  rows += vaFieldRow('Physical description', def.physical);
  rows += vaFieldRow('Notes', def.notes);
  return '<div class="va-defendant-card">' +
    '<div class="va-defendant-head">' +
    '<span class="va-defendant-num">' + index + '</span>' +
    '<span class="' + (isPrimary ? 'va-badge-primary' : 'va-badge-additional') + '">' + (isPrimary ? 'Primary' : 'Additional') + '</span>' +
    '<strong>' + escapeHtml(name) + '</strong></div>' +
    '<table class="va-field-table va-field-table--compact"><tbody>' + rows + '</tbody></table></div>';
}

function buildVaDefendantCopyBlock(def, index, isPrimary) {
  var lines = ['DEFENDANT #' + index + (isPrimary ? ' (PRIMARY)' : ' (ADDITIONAL)')];
  var fields = [
    ['Full legal name', formatDefendantFullName(def)],
    ['Gender', def.gender],
    ['Relationship', def.relationship],
    ['Service address', def.address],
    ['City', def.city],
    ['State', def.state],
    ['ZIP', def.zip],
    ['Country', def.country],
    ['DOB', def.dob ? formatDate(def.dob) : ''],
    ['Phone', def.phone],
    ['Aliases', def.aliases],
    ['Employer', def.employer],
    ['Physical description', def.physical],
    ['Notes', def.notes]
  ];
  fields.forEach(function (pair) {
    var line = vaCopyLine(pair[0], pair[1]);
    if (line) lines.push(line);
  });
  return lines.join('\n');
}

function buildVaDefendantsSection(r, copyLines) {
  var additional = parseJsonField(r.defendants_data);
  if (!Array.isArray(additional)) additional = [];
  var hasPrimary = !!vaVal(r.defendant_name);
  if (!hasPrimary && !additional.length) return { html: '', copy: '' };

  var primaryDef = {
    firstName: r.defendant_name,
    address: r.address_line1,
    addressLine2: r.address_line2,
    city: r.city,
    state: r.state,
    zip: r.zip
  };

  var html = '<div class="detail-section va-detail-section"><h4 class="va-section-title">Defendants to Serve (' + (hasPrimary ? 1 : 0) + additional.length + ')</h4><div class="va-defendants-wrap">';
  var copy = ['DEFENDANTS TO SERVE'];

  if (hasPrimary) {
    html += buildVaDefendantCard(primaryDef, 1, true);
    copy.push(buildVaDefendantCopyBlock(primaryDef, 1, true));
  }
  additional.forEach(function (def, i) {
    html += buildVaDefendantCard(def, (hasPrimary ? 2 : 1) + i, false);
    copy.push(buildVaDefendantCopyBlock(def, (hasPrimary ? 2 : 1) + i, false));
  });
  html += '</div></div>';
  copyLines.push(copy.join('\n\n'));
  return { html: html, copy: copy.join('\n\n') };
}

function formatInstructionsHtml(text) {
  var raw = vaVal(text);
  if (!raw) return '<p class="va-instructions-block">None</p>';
  if (raw.indexOf('---') === -1) {
    return '<div class="va-instructions-block">' + escapeHtml(raw) + '</div>';
  }
  var parts = raw.split(/\n*---\s*/);
  var html = '';
  parts.forEach(function (part, i) {
    part = part.trim();
    if (!part) return;
    var lines = part.split('\n');
    var title = lines[0].trim();
    var body = lines.slice(1).join('\n').trim();
    if (i === 0 && !body && title.indexOf('Skip Trace') === -1 && title.indexOf('Process serving') === -1) {
      html += '<div class="va-instructions-block">' + escapeHtml(part) + '</div>';
      return;
    }
    html += '<div class="va-instructions-subtitle">' + escapeHtml(title) + '</div>';
    html += '<div class="va-instructions-block">' + escapeHtml(body || title) + '</div>';
  });
  return html;
}

function buildSkipTraceAdminSection(rawData, copyLines) {
  var skipTraceData = parseJsonField(rawData);
  if (!skipTraceData || !(skipTraceData.firstName || skipTraceData.fullname)) return { html: '', copy: '' };

  if (!skipTraceData.firstName && skipTraceData.fullname) {
    var nameParts = skipTraceData.fullname.split(' ');
    skipTraceData.firstName = nameParts[0] || '';
    skipTraceData.lastName = nameParts.slice(1).join(' ') || '';
  }

  var subjectName = [skipTraceData.firstName, skipTraceData.middleName, skipTraceData.lastName].filter(Boolean).join(' ');

  var requesterRows = '';
  requesterRows += vaFieldRow('Requester name', skipTraceData.fullname);
  requesterRows += vaFieldRow('Company / firm', skipTraceData.company);
  requesterRows += vaFieldRow('Requester email', skipTraceData.email);
  requesterRows += vaFieldRow('Requester phone', skipTraceData.phone);
  requesterRows += vaFieldRow('Role / relationship', skipTraceData.role);
  requesterRows += vaFieldRow('State of jurisdiction', skipTraceData.jurisdiction);
  requesterRows += vaFieldRow('Selected service (dropdown)', skipTraceData.dropdownLabel);

  var subjectRows = '';
  subjectRows += vaFieldRow('Subject full name', subjectName);
  subjectRows += vaFieldRow('Aliases / maiden name', skipTraceData.aliases);
  subjectRows += vaFieldRow('Date of birth', skipTraceData.dob ? formatDate(skipTraceData.dob) : '');
  subjectRows += vaFieldRow('Last known address', skipTraceData.lastAddress);
  subjectRows += vaFieldRow('Last known phone', skipTraceData.lastPhone);
  subjectRows += vaFieldRow('Last known email', skipTraceData.lastEmail);
  subjectRows += vaFieldRow('Social media', skipTraceData.social);
  subjectRows += vaFieldRow('SSN (last 4)', skipTraceData.ssn ? '****' + skipTraceData.ssn : '');
  subjectRows += vaFieldRow('Driver\'s license', skipTraceData.dl);
  subjectRows += vaFieldRow('Vehicle', skipTraceData.vehicle);
  subjectRows += vaFieldRow('Known employer', skipTraceData.employer);

  var searchRows = '';
  searchRows += vaFieldRow('Intake service type', skipTraceData.serviceType);
  searchRows += vaFieldRow('Permissible purpose', skipTraceData.purpose);
  searchRows += vaFieldRow('Case / file number', skipTraceData.caseNumber);
  searchRows += vaFieldRow('Court / jurisdiction', skipTraceData.court);
  searchRows += vaFieldRow('Needed-by date', skipTraceData.deadline ? formatDate(skipTraceData.deadline) : '');
  searchRows += vaFieldRow('Rush request', skipTraceData.rush === 'yes' ? 'Yes — rush fees apply' : 'No');
  searchRows += vaFieldRow('Prior search attempted', skipTraceData.priorSearch === 'yes' ? 'Yes' : 'No');

  var html = vaSection('Skip Trace — Requester', requesterRows) +
    vaSection('Skip Trace — Subject (person to locate)', subjectRows) +
    vaSection('Skip Trace — Case & search details', searchRows);

  if (skipTraceData.notes) {
    html += '<div class="detail-section va-detail-section"><h4 class="va-section-title">Skip Trace — Notes</h4>' + formatInstructionsHtml(skipTraceData.notes) + '</div>';
  }
  html += '<div class="detail-section va-detail-section"><span class="va-fcra-badge">FCRA compliance certified</span></div>';

  if (skipTraceData.uploadedFiles && skipTraceData.uploadedFiles.length) {
    html += '<div class="detail-section va-detail-section"><h4 class="va-section-title">Skip Trace — Referenced files</h4><ul class="va-files-list">' +
      skipTraceData.uploadedFiles.map(function (f) { return '<li>📎 ' + escapeHtml(f) + '</li>'; }).join('') +
      '</ul></div>';
  }

  var copy = [
    'SKIP TRACE INTAKE',
    vaCopyLine('Requester', skipTraceData.fullname),
    vaCopyLine('Company', skipTraceData.company),
    vaCopyLine('Email', skipTraceData.email),
    vaCopyLine('Phone', skipTraceData.phone),
    vaCopyLine('Subject name', subjectName),
    vaCopyLine('DOB', skipTraceData.dob ? formatDate(skipTraceData.dob) : ''),
    vaCopyLine('Last known address', skipTraceData.lastAddress),
    vaCopyLine('Last known phone', skipTraceData.lastPhone),
    vaCopyLine('Purpose', skipTraceData.purpose),
    vaCopyLine('Case number', skipTraceData.caseNumber),
    vaCopyLine('Court', skipTraceData.court),
    vaCopyLine('Deadline', skipTraceData.deadline ? formatDate(skipTraceData.deadline) : ''),
    vaCopyLine('Rush', skipTraceData.rush === 'yes' ? 'Yes' : 'No'),
    vaCopyLine('Notes', skipTraceData.notes)
  ].filter(Boolean).join('\n');

  if (copyLines) copyLines.push(copy);
  return { html: html, copy: copy };
}

function buildRequestDetailView(r) {
  var copyLines = [];
  var serviceType = fixEncoding(r.service_type || '');
  var category = classifyRequestService(serviceType);
  var badgeClass = category === 'skip_trace' ? 'skip' : (category === 'process_serve' ? 'process' : '');

  copyLines.push('SERVICE REQUEST #' + (r.id || ''));
  copyLines.push('========================');
  copyLines.push(vaCopyLine('Service type', serviceType));
  copyLines.push(vaCopyLine('Submitted', formatDate(r.created_at)));
  copyLines.push('');

  var banner = '<div class="va-request-banner">' +
    '<span class="va-service-badge ' + badgeClass + '">' + escapeHtml(serviceType || 'Service Request') + '</span>' +
    '<span class="va-meta-chip">Submitted ' + formatDateColor(r.created_at) + '</span>' +
    '<span class="va-meta-chip">Email: <span class="email-status-badge ' + (r.email_sent === 1 ? 'success' : r.email_sent === 0 ? 'failed' : 'pending') + '">' + (r.email_sent === 1 ? 'Sent' : r.email_sent === 0 ? 'Failed' : 'Pending') + '</span></span>' +
    (r.multiple_defendants ? '<span class="va-meta-chip">Multiple defendants: Yes</span>' : '') +
    '</div>';

  var clientRows = '';
  clientRows += vaFieldRow('Client / firm name', r.client_name);
  clientRows += vaFieldRow('Contact name', r.contact_name);
  clientRows += vaFieldRow('Email', r.email);
  clientRows += vaFieldRow('Phone', r.phone);
  copyLines.push('CLIENT / FIRM');
  copyLines.push(vaCopyLine('Client / firm', r.client_name));
  copyLines.push(vaCopyLine('Contact', r.contact_name));
  copyLines.push(vaCopyLine('Email', r.email));
  copyLines.push(vaCopyLine('Phone', r.phone));
  copyLines.push('');

  var orderRows = '';
  orderRows += vaFieldRow('Service type', serviceType);
  orderRows += vaFieldRow('Deadline', r.deadline_date ? formatDate(r.deadline_date) : 'Not specified');
  orderRows += vaFieldRow('Case number', r.case_number);
  orderRows += vaFieldRow('Court / jurisdiction', r.court_jurisdiction);
  copyLines.push('ORDER DETAILS');
  copyLines.push(vaCopyLine('Service type', serviceType));
  copyLines.push(vaCopyLine('Deadline', r.deadline_date ? formatDate(r.deadline_date) : ''));
  copyLines.push(vaCopyLine('Case number', r.case_number));
  copyLines.push(vaCopyLine('Court', r.court_jurisdiction));
  copyLines.push('');

  var skipTrace = buildSkipTraceAdminSection(r.skip_trace_data, copyLines);
  var defendants = buildVaDefendantsSection(r, copyLines);

  var addressRows = '';
  addressRows += vaFieldRow('Address line 1', r.address_line1);
  addressRows += vaFieldRow('Address line 2', r.address_line2);
  addressRows += vaFieldRow('City', r.city);
  addressRows += vaFieldRow('State', r.state);
  addressRows += vaFieldRow('ZIP', r.zip);

  var html = banner + vaSection('Client / firm', clientRows) + vaSection('Order details', orderRows);

  if (category === 'skip_trace') {
    html += skipTrace.html;
    if (!skipTrace.html && defendants.html) html += defendants.html;
  } else {
    html += vaSection('Service address', addressRows);
    copyLines.push('SERVICE ADDRESS');
    copyLines.push(vaCopyLine('Address', r.address_line1));
    copyLines.push(vaCopyLine('Line 2', r.address_line2));
    copyLines.push(vaCopyLine('City', r.city));
    copyLines.push(vaCopyLine('State', r.state));
    copyLines.push(vaCopyLine('ZIP', r.zip));
    copyLines.push('');
    html += defendants.html;
    if (skipTrace.html) html += skipTrace.html;
  }

  if (category === 'skip_trace' && defendants.html) {
    html += defendants.html;
  }

  if (vaVal(r.special_instructions)) {
    html += '<div class="detail-section va-detail-section"><h4 class="va-section-title">Special instructions</h4>' + formatInstructionsHtml(r.special_instructions) + '</div>';
    copyLines.push('SPECIAL INSTRUCTIONS');
    copyLines.push(vaVal(r.special_instructions));
    copyLines.push('');
  }

  var files = parseJsonField(r.uploaded_files);
  if (files && files.length) {
    html += '<div class="detail-section va-detail-section"><h4 class="va-section-title">Uploaded documents</h4><ul class="va-files-list">' +
      files.map(function (f) {
        return '<li><a href="' + escapeHtml(f.url) + '" target="_blank" rel="noopener">' + escapeHtml(f.name) + '</a></li>';
      }).join('') + '</ul></div>';
    copyLines.push('UPLOADED FILES');
    files.forEach(function (f) { copyLines.push('- ' + f.name + ': ' + f.url); });
  }

  return { html: html, copyText: copyLines.filter(Boolean).join('\n') };
}

function buildContactDetailView(c) {
  var copyLines = ['CONTACT INQUIRY #' + (c.id || ''), '==================', ''];
  var name = vaVal((c.first_name || '') + ' ' + (c.last_name || ''));
  var contactRows = '';
  contactRows += vaFieldRow('Full name', name);
  contactRows += vaFieldRow('Company', c.company);
  contactRows += vaFieldRow('Email', c.email);
  contactRows += vaFieldRow('Phone', c.phone);
  copyLines.push('CONTACT');
  copyLines.push(vaCopyLine('Name', name));
  copyLines.push(vaCopyLine('Company', c.company));
  copyLines.push(vaCopyLine('Email', c.email));
  copyLines.push(vaCopyLine('Phone', c.phone));
  copyLines.push('');

  var caseRows = '';
  caseRows += vaFieldRow('Reason for contact', c.reason);
  caseRows += vaFieldRow('City / county', c.county);
  caseRows += vaFieldRow('State', c.state);
  caseRows += vaFieldRow('Urgency', c.urgency);
  copyLines.push('CASE INFO');
  copyLines.push(vaCopyLine('Reason', c.reason));
  copyLines.push(vaCopyLine('Location', c.county));
  copyLines.push(vaCopyLine('State', c.state));
  copyLines.push(vaCopyLine('Urgency', c.urgency));
  copyLines.push('');

  var skipTrace = buildSkipTraceAdminSection(c.skip_trace_data, copyLines);
  var html = vaSection('Contact information', contactRows) + vaSection('Inquiry details', caseRows);

  if (vaVal(c.case_details)) {
    html += '<div class="detail-section va-detail-section"><h4 class="va-section-title">Case details (client notes)</h4>' + formatInstructionsHtml(c.case_details) + '</div>';
    copyLines.push('CASE DETAILS');
    copyLines.push(vaVal(c.case_details));
    copyLines.push('');
  }

  html += skipTrace.html;
  html += '<div class="detail-section va-detail-section"><h4 class="va-section-title">Submission</h4><table class="va-field-table"><tbody>' +
    vaFieldRow('Submitted', formatDateColor(c.created_at)) +
    '<tr><td class="va-field-label">Email sent</td><td class="va-field-value"><span class="email-status-badge ' + (c.email_sent === 1 ? 'success' : c.email_sent === 0 ? 'failed' : 'pending') + '">' + (c.email_sent === 1 ? 'Sent' : c.email_sent === 0 ? 'Failed' : 'Pending') + '</span></td></tr>' +
    '</tbody></table></div>';

  return { html: html, copyText: copyLines.filter(Boolean).join('\n') };
}

function showDetailModal(title, bodyHtml, copyText) {
  document.getElementById('modal-detail-title').textContent = title;
  document.getElementById('modal-detail-body').innerHTML = bodyHtml;
  window._vaCopyText = copyText || '';
  var copyBtn = document.getElementById('va-copy-btn');
  if (copyBtn) copyBtn.style.display = copyText ? 'inline-block' : 'none';
  document.getElementById('detail-modal').style.display = 'flex';
}

function copyDetailToClipboard() {
  var text = window._vaCopyText || '';
  if (!text) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function () {
      alert('Copied to clipboard — ready to paste into your platform.');
    }).catch(function () {
      prompt('Copy this text:', text);
    });
  } else {
    prompt('Copy this text:', text);
  }
}

async function viewRequest(id) {
  try {
    const response = await fetch(`/api/admin/request/${id}`);
    const data = await response.json();
    const r = data.data;
    r.id = r.id || id;
    var view = buildRequestDetailView(r);
    showDetailModal('Request #' + id, view.html, view.copyText);
  } catch (err) {
    console.error('Error loading request:', err);
  }
}

async function viewContact(id) {
  try {
    const response = await fetch(`/api/admin/contact/${id}`);
    const data = await response.json();
    const c = data.data;
    c.id = c.id || id;
    var view = buildContactDetailView(c);
    showDetailModal('Contact #' + id, view.html, view.copyText);
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

function getDateColor(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = parseInstantUtc(dateStr) || parseCalendarDate(dateStr);
  if (!d) return '#666';
  const local = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((now - local) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return '#16a34a';
  if (diffDays === 1) return '#2563eb';
  if (diffDays === 2) return '#c0392b';
  return '#666';
}

function formatDateColor(dateStr) {
  if (!dateStr) return '<span style="color:#999;">—</span>';
  const color = getDateColor(dateStr);
  const formatted = formatSubmissionTime(dateStr);
  if (!formatted) return '<span style="color:#999;">—</span>';
  return '<span style="color:' + color + ';font-weight:500;" title="Shown in your local time">' + formatted + '</span>';
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

function formatInvoiceMoney(cents) {
  return '$' + ((parseInt(cents, 10) || 0) / 100).toFixed(2);
}

function invoiceStatusBadge(status) {
  var colors = { paid: '#16a34a', sent: '#2563eb', unpaid: '#c0392b' };
  var c = colors[status] || colors.unpaid;
  return '<span style="color:' + c + ';font-weight:600;font-size:11px;text-transform:uppercase;">' + escapeHtml(status || 'unpaid') + '</span>';
}

async function loadInvoices() {
  var tbody = document.getElementById('invoices-body');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#94a3b8;padding:24px;">Loading…</td></tr>';

  try {
    var resp = await fetch('/api/admin/invoices');
    var data = await resp.json();
    if (!data.success || !data.data || !data.data.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#94a3b8;padding:24px;">No invoices yet. <a href="quote-builder.html">Create one</a>.</td></tr>';
      return;
    }
    tbody.innerHTML = data.data.map(function (inv) {
      var payUrl = window.location.origin + '/invoice.html?number=' +
        encodeURIComponent(inv.invoice_number) + '&token=' + encodeURIComponent(inv.access_token || '');
      return '<tr>' +
        '<td><strong>' + escapeHtml(inv.invoice_number) + '</strong></td>' +
        '<td>' + escapeHtml(formatCalendarDate(inv.invoice_date || inv.created_at)) + '</td>' +
        '<td>' + escapeHtml(inv.client_email || '—') + '</td>' +
        '<td>' + escapeHtml(inv.case_number || '—') + '</td>' +
        '<td>' + formatInvoiceMoney(inv.total_cents) + '</td>' +
        '<td>' + invoiceStatusBadge(inv.status) + '</td>' +
        '<td class="td-actions">' +
          '<a href="quote-builder.html?id=' + inv.id + '" class="btn-table">Edit</a> ' +
          '<button type="button" class="btn-table" data-num="' + escapeHtml(inv.invoice_number) + '" data-tok="' + escapeHtml(inv.access_token || '') + '" onclick="copyInvoiceLinkBtn(this)">Copy Link</button>' +
        '</td></tr>';
    }).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="7" style="color:#c0392b;padding:24px;">Could not load invoices.</td></tr>';
  }
}

function copyInvoiceLinkBtn(btn) {
  var number = btn.getAttribute('data-num');
  var token = btn.getAttribute('data-tok');
  var url = window.location.origin + '/invoice.html?number=' + encodeURIComponent(number) + '&token=' + encodeURIComponent(token);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(function () { alert('Pay link copied.'); });
  } else {
    prompt('Copy this pay link:', url);
  }
}

function copyInvoiceLink(number, token) {
  copyInvoiceLinkBtn({ getAttribute: function (k) { return k === 'data-num' ? number : token; } });
}
