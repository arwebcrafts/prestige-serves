// Admin Dashboard — listings, detail view with per-field copy, CSV export, add/delete

let cachedRequests = [];
let cachedContacts = [];
let currentDetailType = '';
let currentDetailId = null;
let currentDetailPlainText = '';

document.addEventListener('DOMContentLoaded', function() {
  if (!sessionStorage.getItem('adminLoggedIn')) {
    window.location.href = 'admin.html';
    return;
  }
  loadRequests();
  loadContacts();
});

function handleLogout() {
  sessionStorage.removeItem('adminLoggedIn');
  window.location.href = 'admin.html';
}

function showToast(msg) {
  var el = document.getElementById('admin-toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(function() {
    el.classList.remove('show');
  }, 2200);
}

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
  });
  document.querySelectorAll('.tab-content').forEach(function(content) {
    content.classList.toggle('active', content.id === 'tab-' + tab);
  });
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  var div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function copyText(text) {
  var t = text === null || text === undefined ? '' : String(text);
  if (!t && t !== '0') {
    showToast('Nothing to copy');
    return;
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(t).then(function() {
      showToast('Copied to clipboard');
    }).catch(function() {
      fallbackCopy(t);
    });
  } else {
    fallbackCopy(t);
  }
}

function fallbackCopy(text) {
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    showToast('Copied to clipboard');
  } catch (e) {
    showToast('Copy not supported in this browser');
  }
  document.body.removeChild(ta);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  var date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function parseJsonSafe(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function detailFieldRow(label, value) {
  var raw = value === null || value === undefined ? '' : String(value);
  var enc = encodeURIComponent(raw);
  return (
    '<div class="detail-field-row">' +
      '<div class="detail-field-meta">' +
        '<span class="detail-field-label">' + escapeHtml(label) + '</span>' +
        '<button type="button" class="btn-copy" onclick="copyText(decodeURIComponent(this.getAttribute(\'data-v\')))" data-v="' + enc + '">Copy</button>' +
      '</div>' +
      '<div class="detail-field-value">' + escapeHtml(raw).replace(/\n/g, '<br>') + '</div>' +
    '</div>'
  );
}

async function loadRequests() {
  try {
    var response = await fetch('/api/admin/requests');
    var data = await response.json();
    var today = new Date().toDateString();
    var requests = data.data || [];
    cachedRequests = requests;

    document.getElementById('requests-total').textContent = requests.length;
    document.getElementById('requests-today').textContent = requests.filter(function(r) {
      return new Date(r.created_at).toDateString() === today;
    }).length;
    document.getElementById('requests-emergency').textContent = requests.filter(function(r) {
      return r.service_type && String(r.service_type).indexOf('Emergency') !== -1;
    }).length;

    var tbody = document.getElementById('requests-body');
    tbody.innerHTML = requests.map(function(r) {
      return (
        '<tr>' +
          '<td>#' + r.id + '</td>' +
          '<td>' + escapeHtml(formatDate(r.created_at)) + '</td>' +
          '<td>' + escapeHtml(r.client_name || '') + '</td>' +
          '<td>' + escapeHtml(r.contact_name || '') + '</td>' +
          '<td>' + escapeHtml(r.email || '') + '</td>' +
          '<td>' + escapeHtml(r.phone || '') + '</td>' +
          '<td>' + escapeHtml(r.service_type || '') + '</td>' +
          '<td><span class="status-badge">New</span></td>' +
          '<td class="td-actions">' +
            '<button type="button" class="action-btn view" onclick="viewRequest(' + r.id + ')">View</button>' +
            '<button type="button" class="action-btn danger" onclick="deleteRequestRow(' + r.id + ')">Delete</button>' +
          '</td>' +
        '</tr>'
      );
    }).join('');
  } catch (err) {
    console.error('Error loading requests:', err);
    showToast('Could not load requests');
  }
}

async function loadContacts() {
  try {
    var response = await fetch('/api/admin/contacts');
    var data = await response.json();
    var today = new Date().toDateString();
    var contacts = data.data || [];
    cachedContacts = contacts;

    document.getElementById('contacts-total').textContent = contacts.length;
    document.getElementById('contacts-today').textContent = contacts.filter(function(c) {
      return new Date(c.created_at).toDateString() === today;
    }).length;

    var tbody = document.getElementById('contacts-body');
    tbody.innerHTML = contacts.map(function(c) {
      var name = (c.first_name || '') + ' ' + (c.last_name || '');
      return (
        '<tr>' +
          '<td>#' + c.id + '</td>' +
          '<td>' + escapeHtml(formatDate(c.created_at)) + '</td>' +
          '<td>' + escapeHtml(name.trim()) + '</td>' +
          '<td>' + escapeHtml(c.company || '') + '</td>' +
          '<td>' + escapeHtml(c.email || '') + '</td>' +
          '<td>' + escapeHtml(c.phone || '') + '</td>' +
          '<td>' + escapeHtml(c.reason || '') + '</td>' +
          '<td><span class="status-badge">' + escapeHtml(c.urgency || '') + '</span></td>' +
          '<td class="td-actions">' +
            '<button type="button" class="action-btn view" onclick="viewContact(' + c.id + ')">View</button>' +
            '<button type="button" class="action-btn danger" onclick="deleteContactRow(' + c.id + ')">Delete</button>' +
          '</td>' +
        '</tr>'
      );
    }).join('');
  } catch (err) {
    console.error('Error loading contacts:', err);
    showToast('Could not load contacts');
  }
}

async function exportRequestsCsv() {
  try {
    var r = await fetch('/api/admin/requests?format=csv');
    if (!r.ok) throw new Error('export failed');
    var blob = await r.blob();
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'service_requests.csv';
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Download started');
  } catch (e) {
    showToast('Export failed');
  }
}

async function exportContactsCsv() {
  try {
    var r = await fetch('/api/admin/contacts?format=csv');
    if (!r.ok) throw new Error('export failed');
    var blob = await r.blob();
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'contact_submissions.csv';
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Download started');
  } catch (e) {
    showToast('Export failed');
  }
}

async function deleteRequestRow(id) {
  if (!confirm('Delete request #' + id + '? This cannot be undone.')) return;
  try {
    var r = await fetch('/api/admin/request/' + id, { method: 'DELETE' });
    if (!r.ok) throw new Error('delete failed');
    showToast('Request deleted');
    loadRequests();
  } catch (e) {
    showToast('Delete failed');
  }
}

async function deleteContactRow(id) {
  if (!confirm('Delete contact #' + id + '? This cannot be undone.')) return;
  try {
    var r = await fetch('/api/admin/contact/' + id, { method: 'DELETE' });
    if (!r.ok) throw new Error('delete failed');
    showToast('Contact deleted');
    loadContacts();
  } catch (e) {
    showToast('Delete failed');
  }
}

async function viewRequest(id) {
  try {
    var response = await fetch('/api/admin/request/' + id);
    var data = await response.json();
    var r = data.data;
    currentDetailType = 'request';
    currentDetailId = id;

    document.getElementById('modal-detail-title').textContent = 'Request #' + id;
    document.getElementById('modal-delete-btn').style.display = 'inline-block';

    var parts = [];
    parts.push('<div class="detail-section"><h4>Client</h4>');
    parts.push(detailFieldRow('Client name', r.client_name));
    parts.push(detailFieldRow('Contact name', r.contact_name));
    parts.push(detailFieldRow('Email', r.email));
    parts.push(detailFieldRow('Phone', r.phone));
    parts.push('</div>');

    parts.push('<div class="detail-section"><h4>Service address</h4>');
    parts.push(detailFieldRow('Line 1', r.address_line1));
    parts.push(detailFieldRow('Line 2', r.address_line2));
    parts.push(detailFieldRow('City', r.city));
    parts.push(detailFieldRow('State', r.state));
    parts.push(detailFieldRow('ZIP', r.zip));
    parts.push('</div>');

    parts.push('<div class="detail-section"><h4>Case</h4>');
    parts.push(detailFieldRow('Defendant', r.defendant_name));
    parts.push(detailFieldRow('Case number', r.case_number));
    parts.push(detailFieldRow('Court', r.court_jurisdiction));
    parts.push(detailFieldRow('Service type', r.service_type));
    parts.push(detailFieldRow('Deadline', r.deadline_date ? formatDate(r.deadline_date) : ''));
    parts.push(detailFieldRow('Multiple defendants', r.multiple_defendants ? 'Yes' : 'No'));
    parts.push('</div>');

    var defs = parseJsonSafe(r.defendants_data);
    if (defs && Array.isArray(defs) && defs.length) {
      parts.push('<div class="detail-section"><h4>Additional defendants</h4>');
      defs.forEach(function(d, i) {
        parts.push(detailFieldRow('Defendant #' + (i + 2), (d.firstName || '') + ' ' + (d.lastName || '')));
        parts.push(detailFieldRow('Address', (d.address || '') + ', ' + (d.city || '') + (d.state ? ', ' + d.state : '')));
      });
      parts.push('</div>');
    }

    parts.push('<div class="detail-section"><h4>Instructions</h4>');
    parts.push(detailFieldRow('Special instructions', r.special_instructions || 'None'));
    parts.push('</div>');

    parts.push('<div class="detail-section"><h4>Meta</h4>');
    parts.push(detailFieldRow('Submitted', formatDate(r.created_at)));
    parts.push('</div>');

    var files = parseJsonSafe(r.uploaded_files);
    if (files && Array.isArray(files) && files.length) {
      parts.push('<div class="detail-section"><h4>Files</h4>');
      files.forEach(function(f) {
        var line = (f.name || '') + ' — ' + (f.url || '');
        parts.push(
          '<div class="detail-field-row">' +
            '<div class="detail-field-meta"><span class="detail-field-label">File</span>' +
            '<button type="button" class="btn-copy" onclick="copyText(decodeURIComponent(this.getAttribute(\'data-v\')))" data-v="' +
            encodeURIComponent(f.url || '') + '">Copy URL</button></div>' +
            '<div class="detail-field-value"><a href="' + escapeHtml(f.url) + '" target="_blank" rel="noopener">' + escapeHtml(f.name || 'file') + '</a></div></div>'
        );
      });
      parts.push('</div>');
    }

    var html = parts.join('');
    document.getElementById('modal-detail-body').innerHTML = html;
    currentDetailPlainText = stripHtmlToText(html);
    document.getElementById('detail-modal').style.display = 'flex';
  } catch (err) {
    console.error('Error loading request:', err);
    showToast('Could not load request');
  }
}

function stripHtmlToText(html) {
  var d = document.createElement('div');
  d.innerHTML = html;
  return d.textContent || d.innerText || '';
}

async function viewContact(id) {
  try {
    var response = await fetch('/api/admin/contact/' + id);
    var data = await response.json();
    var c = data.data;
    currentDetailType = 'contact';
    currentDetailId = id;

    document.getElementById('modal-detail-title').textContent = 'Contact #' + id;
    document.getElementById('modal-delete-btn').style.display = 'inline-block';

    var parts = [];
    parts.push('<div class="detail-section"><h4>Contact</h4>');
    parts.push(detailFieldRow('First name', c.first_name));
    parts.push(detailFieldRow('Last name', c.last_name));
    parts.push(detailFieldRow('Company', c.company));
    parts.push(detailFieldRow('Email', c.email));
    parts.push(detailFieldRow('Phone', c.phone));
    parts.push('</div>');

    parts.push('<div class="detail-section"><h4>Case</h4>');
    parts.push(detailFieldRow('Reason', c.reason));
    parts.push(detailFieldRow('City / county', c.county));
    parts.push(detailFieldRow('State', c.state));
    parts.push(detailFieldRow('Urgency', c.urgency));
    parts.push('</div>');

    parts.push('<div class="detail-section"><h4>Case details</h4>');
    parts.push(detailFieldRow('Details', c.case_details || ''));
    parts.push('</div>');

    parts.push('<div class="detail-section"><h4>Meta</h4>');
    parts.push(detailFieldRow('Consent', c.consent ? 'Yes' : 'No'));
    parts.push(detailFieldRow('Submitted', formatDate(c.created_at)));
    parts.push('</div>');

    var html = parts.join('');
    document.getElementById('modal-detail-body').innerHTML = html;
    currentDetailPlainText = stripHtmlToText(html);
    document.getElementById('detail-modal').style.display = 'flex';
  } catch (err) {
    console.error('Error loading contact:', err);
    showToast('Could not load contact');
  }
}

function copyDetailAll() {
  copyText(currentDetailPlainText);
}

function closeDetailModal() {
  document.getElementById('detail-modal').style.display = 'none';
  document.getElementById('modal-delete-btn').style.display = 'none';
  currentDetailType = '';
  currentDetailId = null;
  currentDetailPlainText = '';
}

async function deleteCurrentDetail() {
  if (!currentDetailId || !currentDetailType) return;
  if (!confirm('Delete this record permanently?')) return;
  var type = currentDetailType;
  var path = type === 'request' ? '/api/admin/request/' : '/api/admin/contact/';
  try {
    var r = await fetch(path + currentDetailId, { method: 'DELETE' });
    if (!r.ok) throw new Error('delete failed');
    showToast('Deleted');
    closeDetailModal();
    if (type === 'request') loadRequests();
    else loadContacts();
  } catch (e) {
    showToast('Delete failed');
  }
}

function openAddRequestModal() {
  ['ar-client_name', 'ar-contact_name', 'ar-email', 'ar-phone', 'ar-address_line1', 'ar-address_line2', 'ar-city', 'ar-state', 'ar-zip', 'ar-defendant_name', 'ar-case_number', 'ar-court_jurisdiction', 'ar-service_type', 'ar-deadline_date', 'ar-special_instructions'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('add-request-modal').style.display = 'flex';
}

function closeAddRequestModal() {
  document.getElementById('add-request-modal').style.display = 'none';
}

async function submitAddRequest() {
  var body = {
    client_name: document.getElementById('ar-client_name').value.trim(),
    contact_name: document.getElementById('ar-contact_name').value.trim(),
    email: document.getElementById('ar-email').value.trim(),
    phone: document.getElementById('ar-phone').value.trim(),
    address_line1: document.getElementById('ar-address_line1').value.trim(),
    address_line2: document.getElementById('ar-address_line2').value.trim(),
    city: document.getElementById('ar-city').value.trim(),
    state: document.getElementById('ar-state').value.trim(),
    zip: document.getElementById('ar-zip').value.trim(),
    defendant_name: document.getElementById('ar-defendant_name').value.trim(),
    case_number: document.getElementById('ar-case_number').value.trim(),
    court_jurisdiction: document.getElementById('ar-court_jurisdiction').value.trim(),
    service_type: document.getElementById('ar-service_type').value.trim(),
    deadline_date: document.getElementById('ar-deadline_date').value || null,
    special_instructions: document.getElementById('ar-special_instructions').value.trim(),
    multiple_defendants: false,
    defendants_data: null,
    uploaded_files: null
  };
  if (!body.client_name && !body.email) {
    showToast('Enter at least client or email');
    return;
  }
  try {
    var r = await fetch('/api/admin/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error('save failed');
    showToast('Request added');
    closeAddRequestModal();
    loadRequests();
  } catch (e) {
    showToast('Save failed');
  }
}

function openAddContactModal() {
  ['ac-first_name', 'ac-last_name', 'ac-company', 'ac-email', 'ac-phone', 'ac-reason', 'ac-county', 'ac-state', 'ac-urgency', 'ac-case_details'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('ac-consent').checked = false;
  document.getElementById('add-contact-modal').style.display = 'flex';
}

function closeAddContactModal() {
  document.getElementById('add-contact-modal').style.display = 'none';
}

async function submitAddContact() {
  var body = {
    first_name: document.getElementById('ac-first_name').value.trim(),
    last_name: document.getElementById('ac-last_name').value.trim(),
    company: document.getElementById('ac-company').value.trim(),
    email: document.getElementById('ac-email').value.trim(),
    phone: document.getElementById('ac-phone').value.trim(),
    reason: document.getElementById('ac-reason').value.trim(),
    county: document.getElementById('ac-county').value.trim(),
    state: document.getElementById('ac-state').value.trim(),
    urgency: document.getElementById('ac-urgency').value.trim(),
    case_details: document.getElementById('ac-case_details').value.trim(),
    consent: document.getElementById('ac-consent').checked
  };
  if (!body.email) {
    showToast('Email is recommended');
  }
  try {
    var r = await fetch('/api/admin/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error('save failed');
    showToast('Contact added');
    closeAddContactModal();
    loadContacts();
  } catch (e) {
    showToast('Save failed');
  }
}
