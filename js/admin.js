// Admin Dashboard JavaScript

document.addEventListener('DOMContentLoaded', function() {
  // Check if logged in
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

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  
  document.querySelector(`[onclick="switchTab('${tab}')"]`).classList.add('active');
  document.getElementById(`tab-${tab}`).classList.add('active');
}

async function loadRequests() {
  try {
    const response = await fetch('/api/admin/requests');
    const data = await response.json();
    
    const today = new Date().toDateString();
    const requests = data.data || [];
    
    document.getElementById('requests-total').textContent = requests.length;
    document.getElementById('requests-today').textContent = requests.filter(r => new Date(r.created_at).toDateString() === today).length;
    document.getElementById('requests-emergency').textContent = requests.filter(r => r.service_type && r.service_type.includes('Emergency')).length;
    
    const tbody = document.getElementById('requests-body');
    tbody.innerHTML = requests.map(r => `
      <tr>
        <td>#${r.id}</td>
        <td>${formatDate(r.created_at)}</td>
        <td>${escapeHtml(r.client_name || '')}</td>
        <td>${escapeHtml(r.contact_name || '')}</td>
        <td>${escapeHtml(r.email || '')}</td>
        <td>${escapeHtml(r.phone || '')}</td>
        <td>${escapeHtml(r.service_type || '')}</td>
        <td><span class="status-badge">New</span></td>
        <td><button class="action-btn view" onclick="viewRequest(${r.id})">View</button></td>
      </tr>
    `).join('');
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
    
    const tbody = document.getElementById('contacts-body');
    tbody.innerHTML = contacts.map(c => `
      <tr>
        <td>#${c.id}</td>
        <td>${formatDate(c.created_at)}</td>
        <td>${escapeHtml((c.first_name || '') + ' ' + (c.last_name || ''))}</td>
        <td>${escapeHtml(c.company || '')}</td>
        <td>${escapeHtml(c.email || '')}</td>
        <td>${escapeHtml(c.phone || '')}</td>
        <td>${escapeHtml(c.reason || '')}</td>
        <td><span class="status-badge">${escapeHtml(c.urgency || '')}</span></td>
        <td><button class="action-btn view" onclick="viewContact(${c.id})">View</button></td>
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
        <p><strong>Service Type:</strong> ${escapeHtml(r.service_type || '')}</p>
        <p><strong>Deadline:</strong> ${r.deadline_date ? formatDate(r.deadline_date) : 'Not specified'}</p>
        <p><strong>Multiple Defendants:</strong> ${r.multiple_defendants ? 'Yes' : 'No'}</p>
      </div>
      ${r.defendants_data ? `
      <div class="detail-section">
        <h4>Additional Defendants</h4>
        <div class="highlight">
          ${JSON.parse(r.defendants_data).map((d, i) => `
            <p><strong>Defendant #${i+2}:</strong> ${escapeHtml(d.firstName || '')} ${escapeHtml(d.lastName || '')}</p>
            <p>Address: ${escapeHtml(d.address || '')}, ${escapeHtml(d.city || '')}</p>
          `).join('')}
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
      </div>
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
        <p><strong>Urgency:</strong> ${escapeHtml(c.urgency || '')}</p>
      </div>
      <div class="detail-section">
        <h4>Case Details</h4>
        <div class="highlight">
          <p>${escapeHtml(c.case_details || '')}</p>
        </div>
      </div>
      <div class="detail-section">
        <h4>Submission Info</h4>
        <p><strong>Submitted:</strong> ${formatDate(c.created_at)}</p>
      </div>
    `;
    
    document.getElementById('detail-modal').style.display = 'flex';
  } catch (err) {
    console.error('Error loading contact:', err);
  }
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
