// Form building and handling

function buildContactForm(containerId, formId) {
  const c = document.getElementById(containerId);
  if (!c) return;
  c.innerHTML = `
    <div class="form-row">
      <div class="form-group"><label>First Name <span class="req">(required)</span></label><input type="text" required></div>
      <div class="form-group"><label>Last Name <span class="req">(required)</span></label><input type="text" required></div>
    </div>
    <div class="form-group"><label>Firm / Company Name <span class="req">(required)</span></label><input type="text" required></div>
    <div class="form-group"><label>Email <span class="req">(required)</span></label><input type="email" required></div>
    <div class="form-group"><label>Phone <span class="req">(required)</span></label><input type="tel" required></div>
    <div class="form-group">
      <label>Reason for Contact</label>
      <select><option value="">Select an option</option><option>Process Serving</option><option>Skip Tracing</option><option>eFiling / eRecording</option><option>Legal Courier</option><option>General Inquiry</option></select>
    </div>
    <div class="form-group"><label>County / City</label><input type="text" placeholder="Los Angeles County"></div>
    <div class="form-group"><label>State</label><input type="text" placeholder="California"></div>
    <div class="form-group">
      <label>Brief Case Details</label>
      <div class="form-hint" style="margin-bottom:8px;">Please include service type, deadlines, number of parties, and any known address information.</div>
      <textarea rows="3"></textarea>
    </div>
    <div class="form-group">
      <label>Urgency Level <span class="req">(Subject to Approval)</span></label>
      <select><option value="">Select an option</option><option>Standard</option><option>Rush</option><option>Priority</option><option>Emergency</option></select>
    </div>
    <div class="form-checkbox">
      <input type="checkbox" id="${formId}-consent">
      <label for="${formId}-consent">I understand that submitting this form does not guarantee service and all requests are subject to review and availability.</label>
    </div>
    <button class="btn-navy" onclick="handleFormSubmit('${formId}-success')">Submit</button>
    <div class="form-success" id="${formId}-success">Thank you! We'll be in touch shortly.</div>
  `;
}

function handleFormSubmit(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('show');
}
