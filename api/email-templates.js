// Beautiful Email Templates for Prestige Serves

export function buildContactEmailHtml(data) {
  const { firstName, lastName, company, email, phone, reason, county, state, caseDetails, serviceType, urgency, skipTraceData } = data;
  
  // Build Skip Trace section if present
  let skipTraceSection = '';
  if (skipTraceData && (skipTraceData.firstName || skipTraceData.fullname || (skipTraceData.defendants && skipTraceData.defendants.length))) {
    const st = skipTraceData;
    skipTraceSection = `
                      <tr>
                        <td style="padding:25px;background-color:#fef3f2;">
                          <p style="margin:0 0 15px 0;font-size:14px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:1px;">Skip Trace Intake Data</p>
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            ${st.serviceType ? `
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Service Type</td>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;font-weight:600;">${st.serviceType}</td>
                            </tr>` : ''}
                            ${st.firstName || st.fullname ? `
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Subject Name</td>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">${st.firstName || ''} ${st.lastName || ''} ${st.fullname || ''}</td>
                            </tr>` : ''}
                            ${st.middleName ? `
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Middle Name</td>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">${st.middleName}</td>
                            </tr>` : ''}
                            ${st.aliases ? `
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Aliases / Maiden Name</td>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">${st.aliases}</td>
                            </tr>` : ''}
                            ${st.dob ? `
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Date of Birth</td>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">${st.dob}</td>
                            </tr>` : ''}
                            ${st.lastPhone ? `
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Last Known Phone</td>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">${st.lastPhone}</td>
                            </tr>` : ''}
                            ${st.lastAddress ? `
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Last Known Address</td>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">${st.lastAddress}</td>
                            </tr>` : ''}
                            ${st.lastEmail ? `
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Last Known Email</td>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">${st.lastEmail}</td>
                            </tr>` : ''}
                            ${st.social ? `
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Social Media</td>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">${st.social}</td>
                            </tr>` : ''}
                            ${st.ssn ? `
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">SSN (Last 4)</td>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">****${st.ssn}</td>
                            </tr>` : ''}
                            ${st.dl ? `
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Driver's License</td>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">${st.dl}</td>
                            </tr>` : ''}
                            ${st.vehicle ? `
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Vehicle</td>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">${st.vehicle}</td>
                            </tr>` : ''}
                            ${st.employer ? `
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Known Employer</td>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">${st.employer}</td>
                            </tr>` : ''}
                            ${st.purpose ? `
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Purpose</td>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">${st.purpose}</td>
                            </tr>` : ''}
                            ${st.caseNumber ? `
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Case / File Number</td>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">${st.caseNumber}</td>
                            </tr>` : ''}
                            ${st.court ? `
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Court / Jurisdiction</td>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">${st.court}</td>
                            </tr>` : ''}
                            ${st.deadline ? `
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Deadline</td>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">${st.deadline}</td>
                            </tr>` : ''}
                            ${st.rush ? `
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Rush Request</td>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#dc2626;text-align:right;font-weight:600;">${st.rush === 'yes' ? 'Yes — rush fees apply' : 'No'}</td>
                            </tr>` : ''}
                            ${st.priorSearch ? `
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Prior Search Attempted</td>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">${st.priorSearch === 'yes' ? 'Yes' : 'No'}</td>
                            </tr>` : ''}
                            ${st.role ? `
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Role / Relationship</td>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">${st.role}</td>
                            </tr>` : ''}
                            ${st.jurisdiction ? `
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">State of Jurisdiction</td>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">${st.jurisdiction}</td>
                            </tr>` : ''}
                            ${st.notes ? `
                            <tr>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:12px;color:#94a3b8;text-transform:uppercase;">Additional Notes</td>
                              <td style="padding:8px 0;border-bottom:1px solid #fecaca;font-size:14px;color:#333333;text-align:right;">${st.notes}</td>
                            </tr>` : ''}
                            ${st.uploadedFiles && st.uploadedFiles.length ? `
                            <tr>
                              <td style="padding:8px 0;font-size:12px;color:#94a3b8;text-transform:uppercase;">Uploaded Files</td>
                              <td style="padding:8px 0;font-size:14px;color:#333333;text-align:right;">${st.uploadedFiles.join(', ')}</td>
                            </tr>` : ''}
                            ${st.fcraCertified ? `
                            <tr>
                              <td style="padding:8px 0;font-size:12px;color:#94a3b8;text-transform:uppercase;">FCRA Certified</td>
                              <td style="padding:8px 0;font-size:14px;color:#16a34a;text-align:right;font-weight:600;">✓ Yes</td>
                            </tr>` : ''}
                            ${st.defendants && st.defendants.length ? `
                            <tr>
                              <td colspan="2" style="padding:12px 0 4px 0;font-size:12px;color:#94a3b8;text-transform:uppercase;">Additional Defendants</td>
                            </tr>
                            <tr>
                              <td colspan="2" style="padding:0 0 8px 0;">
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#fff;border-radius:4px;overflow:hidden;border:1px solid #fecaca;">
                                  <tr style="background-color:#dc2626;">
                                    <td style="padding:6px 12px;font-size:10px;color:#fff;font-weight:600;">#</td>
                                    <td style="padding:6px 12px;font-size:10px;color:#fff;font-weight:600;">Name</td>
                                    <td style="padding:6px 12px;font-size:10px;color:#fff;font-weight:600;">Address</td>
                                    <td style="padding:6px 12px;font-size:10px;color:#fff;font-weight:600;">City</td>
                                    <td style="padding:6px 12px;font-size:10px;color:#fff;font-weight:600;">State</td>
                                  </tr>
                                  ${st.defendants.map(function(def, i) {
                                    return '<tr style="border-bottom:1px solid #fecaca;"><td style="padding:7px 12px;font-size:12px;color:#94a3b8;">' + (i + 2) + '</td><td style="padding:7px 12px;font-size:13px;color:#333;">' + (def.firstName || '') + ' ' + (def.middleName || '') + ' ' + (def.lastName || '') + '</td><td style="padding:7px 12px;font-size:12px;color:#555;">' + (def.address || 'N/A') + '</td><td style="padding:7px 12px;font-size:12px;color:#555;">' + (def.city || 'N/A') + '</td><td style="padding:7px 12px;font-size:12px;color:#555;">' + (def.state || 'N/A') + '</td></tr>';
                                  }).join('')}
                                </table>
                              </td>
                            </tr>` : ''}
                          </table>
                        </td>
                      </tr>`;
  }
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Contact</title>
</head>
<body style="margin:0;padding:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background-color:#f4f4f4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f4;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a3a5c 0%,#2c5282 100%);padding:40px 40px 30px 40px;text-align:center;">
              <h1 style="margin:0;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:1px;">PRESTIGE SERVES</h1>
              <p style="margin:10px 0 0 0;font-size:14px;color:rgba(255,255,255,0.8);letter-spacing:2px;text-transform:uppercase;">Professional Process Serving</p>
            </td>
          </tr>
          <!-- Badge -->
          <tr>
            <td style="padding:30px 40px 20px 40px;text-align:center;">
              <span style="display:inline-block;background-color:#e8f5e9;color:#2e7d32;font-size:12px;font-weight:600;padding:8px 20px;border-radius:20px;text-transform:uppercase;letter-spacing:1px;">📬 New Contact Inquiry</span>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:20px 40px;">
              <h2 style="margin:0 0 20px 0;font-size:24px;font-weight:600;color:#1a3a5c;">Hello,</h2>
              <p style="margin:0 0 25px 0;font-size:16px;line-height:1.6;color:#555555;">You have received a new contact inquiry. Review the details below and respond promptly.</p>
            </td>
          </tr>
          <!-- Details Card -->
          <tr>
            <td style="padding:0 40px 30px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
                <tr>
                  <td style="padding:25px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;">
                          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Contact Name</span>
                          <p style="margin:5px 0 0 0;font-size:16px;color:#1a3a5c;font-weight:600;">${firstName} ${lastName}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;">
                          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Company</span>
                          <p style="margin:5px 0 0 0;font-size:16px;color:#333333;">${company || 'N/A'}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;">
                          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Email Address</span>
                          <p style="margin:5px 0 0 0;font-size:16px;color:#2563eb;"><a href="mailto:${email}" style="color:#2563eb;text-decoration:none;">${email}</a></p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;">
                          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Phone Number</span>
                          <p style="margin:5px 0 0 0;font-size:16px;color:#333333;"><a href="tel:${phone}" style="color:#333333;text-decoration:none;">${phone || 'N/A'}</a></p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;">
                          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Reason for Contact</span>
                          <p style="margin:5px 0 0 0;font-size:16px;color:#2563eb;font-weight:600;">${reason || 'General Inquiry'}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;">
                          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Location</span>
                          <p style="margin:5px 0 0 0;font-size:16px;color:#333333;">${county || ''} ${state || ''}</p>
                        </td>
                      </tr>
                      ${serviceType ? `
                      <tr>
                        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;">
                          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Service Type</span>
                          <p style="margin:5px 0 0 0;font-size:16px;color:#2563eb;font-weight:600;">${serviceType}</p>
                        </td>
                      </tr>
                      ` : ''}
                      ${urgency ? `
                      <tr>
                        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;">
                          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Urgency</span>
                          <p style="margin:5px 0 0 0;font-size:16px;color:#dc2626;font-weight:600;">${urgency}</p>
                        </td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding:12px 0;">
                          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Message</span>
                          <p style="margin:5px 0 0 0;font-size:15px;line-height:1.6;color:#555555;">${caseDetails || 'No message provided'}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ${skipTraceSection}
              </table>
            </td>
          </tr>
          <!-- CTA Button -->
          <tr>
            <td style="padding:0 40px 30px 40px;text-align:center;">
              <a href="mailto:${email}" style="display:inline-block;background:linear-gradient(135deg,#1a3a5c 0%,#2c5282 100%);color:#ffffff;font-size:15px;font-weight:600;padding:16px 40px;border-radius:8px;text-decoration:none;letter-spacing:0.5px;">Reply to ${firstName}</a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;padding:30px 40px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:13px;color:#94a3b8;text-align:center;line-height:1.6;">
                Prestige Serves LLC<br>
                1240 S Corning Street, Los Angeles, CA 90035<br>
                Phone: 609-240-5665 | Email: <a href="mailto:prestigervesllc@gmail.com" style="color:#94a3b8;">prestigervesllc@gmail.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildServiceRequestEmailHtml(data) {
  const { clientName, contactName, email, phone, addressLine1, addressLine2, city, state, zip, defendantName, caseNumber, courtJurisdiction, serviceType, deadlineDate, specialInstructions, defendantsData } = data;
  
  let defendantsHtml = '';
  if (defendantsData && defendantsData.length > 0) {
    const defRows = defendantsData.map((def, i) => `
      <tr>
        <td style="padding:10px 15px;border:1px solid #e2e8f0;font-size:14px;color:#555555;">${i + 2}</td>
        <td style="padding:10px 15px;border:1px solid #e2e8f0;font-size:14px;color:#333333;">${def.firstName} ${def.lastName || ''}</td>
        <td style="padding:10px 15px;border:1px solid #e2e8f0;font-size:14px;color:#555555;">${def.address || 'N/A'}</td>
        <td style="padding:10px 15px;border:1px solid #e2e8f0;font-size:14px;color:#555555;">${def.city || 'N/A'}</td>
      </tr>
    `).join('');
    
    defendantsHtml = `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;">
          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Additional Defendants</span>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:10px;background-color:#f8fafc;border-radius:6px;overflow:hidden;">
            <tr style="background-color:#1a3a5c;">
              <td style="padding:10px 15px;font-size:12px;color:#ffffff;font-weight:600;">#</td>
              <td style="padding:10px 15px;font-size:12px;color:#ffffff;font-weight:600;">Name</td>
              <td style="padding:10px 15px;font-size:12px;color:#ffffff;font-weight:600;">Address</td>
              <td style="padding:10px 15px;font-size:12px;color:#ffffff;font-weight:600;">City</td>
            </tr>
            ${defRows}
          </table>
        </td>
      </tr>
    `;
  }
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Service Request</title>
</head>
<body style="margin:0;padding:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background-color:#f4f4f4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f4;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a3a5c 0%,#2c5282 100%);padding:40px 40px 30px 40px;text-align:center;">
              <h1 style="margin:0;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:1px;">PRESTIGE SERVES</h1>
              <p style="margin:10px 0 0 0;font-size:14px;color:rgba(255,255,255,0.8);letter-spacing:2px;text-transform:uppercase;">Professional Process Serving</p>
            </td>
          </tr>
          <!-- Badge -->
          <tr>
            <td style="padding:30px 40px 20px 40px;text-align:center;">
              <span style="display:inline-block;background-color:#fff3e0;color:#e65100;font-size:12px;font-weight:600;padding:8px 20px;border-radius:20px;text-transform:uppercase;letter-spacing:1px;">📋 New Service Request</span>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:20px 40px;">
              <h2 style="margin:0 0 20px 0;font-size:24px;font-weight:600;color:#1a3a5c;">New Service Request</h2>
              <p style="margin:0 0 25px 0;font-size:16px;line-height:1.6;color:#555555;">A new service request has been submitted. Review the details below and proceed with assignment.</p>
            </td>
          </tr>
          <!-- Client Info Card -->
          <tr>
            <td style="padding:0 40px 20px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
                <tr>
                  <td style="padding:20px 25px;border-bottom:1px solid #e2e8f0;">
                    <span style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">👤 Client Information</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 25px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding:8px 0;">
                          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Client / Firm</span>
                          <p style="margin:4px 0 0 0;font-size:15px;color:#1a3a5c;font-weight:600;">${clientName}</p>
                        </td>
                        <td style="padding:8px 0;">
                          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Contact Person</span>
                          <p style="margin:4px 0 0 0;font-size:15px;color:#333333;">${contactName}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;">
                          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Email</span>
                          <p style="margin:4px 0 0 0;font-size:15px;"><a href="mailto:${email}" style="color:#2563eb;text-decoration:none;">${email}</a></p>
                        </td>
                        <td style="padding:8px 0;">
                          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Phone</span>
                          <p style="margin:4px 0 0 0;font-size:15px;"><a href="tel:${phone}" style="color:#333333;text-decoration:none;">${phone}</a></p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Service Details Card -->
          <tr>
            <td style="padding:0 40px 20px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
                <tr>
                  <td style="padding:20px 25px;border-bottom:1px solid #e2e8f0;">
                    <span style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">📍 Service Details</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 25px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">
                          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Service Address</span>
                          <p style="margin:5px 0 0 0;font-size:15px;line-height:1.5;color:#333333;">${addressLine1}${addressLine2 ? '<br>' + addressLine2 : ''}<br>${city}, ${state} ${zip}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">
                          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Defendant / Recipient</span>
                          <p style="margin:5px 0 0 0;font-size:15px;color:#333333;font-weight:600;">${defendantName}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">
                          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Case Number</span>
                          <p style="margin:5px 0 0 0;font-size:15px;color:#333333;">${caseNumber || 'N/A'}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">
                          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Court / Jurisdiction</span>
                          <p style="margin:5px 0 0 0;font-size:15px;color:#333333;">${courtJurisdiction || 'N/A'}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">
                          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Service Type</span>
                          <p style="margin:5px 0 0 0;font-size:15px;color:#2563eb;font-weight:600;">${serviceType}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;">
                          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Deadline</span>
                          <p style="margin:5px 0 0 0;font-size:15px;color:#dc2626;font-weight:600;">${deadlineDate || 'Not specified'}</p>
                        </td>
                      </tr>
                      ${specialInstructions ? `
                      <tr>
                        <td style="padding:10px 0;">
                          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Special Instructions</span>
                          <p style="margin:5px 0 0 0;font-size:14px;line-height:1.5;color:#555555;">${specialInstructions}</p>
                        </td>
                      </tr>
                      ` : ''}
                      ${defendantsHtml}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;padding:30px 40px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:13px;color:#94a3b8;text-align:center;line-height:1.6;">
                Prestige Serves LLC<br>
                1240 S Corning Street, Los Angeles, CA 90035<br>
                Phone: 609-240-5665 | Email: <a href="mailto:prestigervesllc@gmail.com" style="color:#94a3b8;">prestigervesllc@gmail.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
