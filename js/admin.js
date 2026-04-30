// Admin Dashboard JavaScript

var REQUESTS_PAGE_SIZE = 10;
var allRequests = [];
var requestsPage = 1;
var selectedRequests = new Set();

var CONTACTS_PAGE_SIZE = 10;
var allContacts = [];
var contactsPage = 1;
var selectedContacts = new Set();

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
});

function handleLogout() {
  sessionStorage.removeItem('adminLoggedIn');
  window.location.href = 'admin.html';
}

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
  });
  document.querySelectorAll('.tab-content').forEach(function(content) {
    content.classList.toggle('active', content.id === 'tab-' + tab);
  });
}

function updateRequestStats(requests) {
  var today = new Date().toDateString();
  document.getElementById('requests-total').textContent = requests.length;
  document.getElementById('requests-today').textContent = requests.filter(function(r) {
    return new Date(r.created_at).toDateString() === today;
  }).length;
  document.getElementById('requests-emergency').textContent = requests.filter(function(r) {
    return r.service_type && r.service_type.includes('Emergency');
  }).length;
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
  var pages = Math.max(1, Math.ceil(allRequests.length / REQUESTS_PAGE_SIZE));
  if (page < 1) page = 1;
  if (page > pages) page = pages;
  requestsPage = page;
  renderRequestsTable();
}

function renderRequestsTable() {
  var tbody = document.getElementById('requests-body');
  if (!tbody) return;
  var total = allRequests.length;
  var pages = Math.max(1, Math.ceil(total / REQUESTS_PAGE_SIZE));
  if (requestsPage > pages) requestsPage = pages;
  if (requestsPage < 1) requestsPage = 1;
  var start = (requestsPage - 1) * REQUESTS_PAGE_SIZE;
  var slice = allRequests.slice(start, start + REQUESTS_PAGE_SIZE);
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
        formatDate(r.created_at) +
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
        escapeHtml(r.service_type || '') +
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
  renderRequestsPagination(total, requestsPage, REQUESTS_PAGE_SIZE);
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
    updateRequestStats(allRequests);
    var pages = Math.max(1, Math.ceil(allRequests.length / REQUESTS_PAGE_SIZE));
    if (requestsPage > pages) requestsPage = pages;
    renderRequestsTable();
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
    updateRequestStats(allRequests);
    var pages = Math.max(1, Math.ceil(allRequests.length / REQUESTS_PAGE_SIZE));
    if (requestsPage > pages) requestsPage = pages;
    renderRequestsTable();
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
    updateRequestStats(allRequests);
    renderRequestsTable();
  } catch (err) {
    console.error('Error loading requests:', err);
  }
}

async function loadContacts() {
  try {
    const response = await fetch('/api/admin/contacts');
    const data = await response.json();
    
    const today = new Date().toDateString();
    const contacts = data.data || [];
    
    document.getElementById('contacts-total').textContent = contacts.length;
    document.getElementById('contacts-today').textContent = contacts.filter(c => new Date(c.created_at).toDateString() === today).length;
    
    allContacts = contacts;
    contactsPage = 1;
    
    const tbody = document.getElementById('contacts-body');
    tbody.innerHTML = contacts.map(c => `
      <tr>
        <td><input type="checkbox" class="contact-checkbox" value="${c.id}"${selectedContacts.has(String(c.id)) ? ' checked' : ''} onchange="updateContactSelection(this)"></td>
        <td>#${c.id}</td>
        <td>${formatDate(c.created_at)}</td>
        <td>${escapeHtml((c.first_name || '') + ' ' + (c.last_name || ''))}</td>
        <td>${escapeHtml(c.company || '')}</td>
        <td>${escapeHtml(c.email || '')}</td>
        <td>${escapeHtml(c.phone || '')}</td>
        <td>${escapeHtml(c.reason || '')}</td>
        <td>${getUrgencyBadge(c.urgency)}</td>
        <td><span class="email-status-badge ${c.email_sent === 1 ? 'success' : c.email_sent === 0 ? 'failed' : 'pending'}">${c.email_sent === 1 ? 'Sent' : c.email_sent === 0 ? 'Failed' : 'Pending'}</span></td>
        <td><button class="action-btn view" onclick="viewContact(${c.id})">View</button> <button class="action-btn delete" onclick="deleteContactRow(${c.id})">Delete</button></td>
      </tr>
    `).join('');
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
        <p><strong>Service Type:</strong> ${escapeHtml((r.service_type || '').replace(/[^\x00-\x7F]/g, function(c) { return '&#' + c.charCodeAt(0) + ';'; }))}</p>
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
        <p><strong>Submitted:</strong> ${formatDate(r.created_at)}</p>
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
        <p><strong>Submitted:</strong> ${formatDate(c.created_at)}</p>
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
    document.getElementById('contacts-total').textContent = allContacts.length;
    renderContactsTable();
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
    document.getElementById('contacts-total').textContent = allContacts.length;
    renderContactsTable();
  } catch (err) {
    console.error(err);
    alert('Could not delete selected contacts');
  }
}

function renderContactsTable() {
  var tbody = document.getElementById('contacts-body');
  if (!tbody) return;
  tbody.innerHTML = allContacts
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
        formatDate(c.created_at) +
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

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
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
