# API Integration Changelog

## Version 1.1.0 - Skip Trace Intake Integration

**Date:** April 29, 2026

### Overview
Added a complete skip trace intake modal on the contact/home form triggered when a user selects a skip trace service type. All captured intake data is saved to the local database and synced to the PST system.

### Changes

#### Skip Trace Intake Modal
- Auto-opens when user selects any skip trace service type (Standard Skip Trace, Enhanced Trace, Rush Trace, Business/Agent Verification, Court-Ready Skip Trace Report)
- Intake form captures comprehensive subject information and is required before the main contact form can be submitted
- Modal captures:
  - Subject name, DOB, last known phone/address/email
  - Middle name, aliases, social security number
  - Driver's license, vehicle information (make/model/color/plate)
  - Employer name/position/address
  - Service type, rush request, prior search attempted
  - State of jurisdiction, case/file number, court name
  - Purpose of trace and notes
  - 5 FCRA compliance certifications
  - Supporting documents (file upload with drag-and-drop)
  - Role selection (Attorney/Process Server/Client/Investigator/Other)

#### Database Changes
- `contact_submissions` table stores `skip_trace_data` as JSONB alongside form submission
- `urgency` field derived from rush selection ('High' or 'Standard') saved to `contact_submissions.urgency`
- `skip_trace_data.uploadedFiles` array stores uploaded file names and timestamps

#### Dashboard Integration
- Skip trace data displayed in contact submission detail modal on `dashboard.html`
- Color-coded service type badge, rush/prior search toggles, uploaded files list
- Full subject details, SSN (masked), vehicle, employer, FCRA compliance displayed

#### Email Integration
- All skip trace fields rendered in contact email templates (branded HTML)
- Service type, rush request, prior search, jurisdiction, uploaded files shown
- SSN masked display, vehicle/employer details included
- FCRA certification checkboxes displayed
- Role selection shown with optional text

### Related Commits
- `333ef71` - Add Section 05 Supporting Documents with file upload to skip trace modal
- `81ea5a1` - Enhance dashboard skip trace display
- `4e5b642` - Enhance all contact email templates: add all skip trace fields
- `5779991` - Save and display uploaded file names in skipTraceData, dashboard, and email
- `d5113dd` - Fix duplicate FCRA section in email-templates.js

---

## Version 1.0.0 - PST API Integration

**Date:** April 28, 2026

**Overview:**
Integrated the PST (Process Serving Technology) Customer API into the Prestige Serves LLC website. This integration allows all contact and service request form submissions to be automatically saved to the PST system as Jobs, Cases, and Entities.

---

## Files Created

### 1. `api/pst-integration.js`

**Purpose:** Core PST API client module handling all communication with the PST API.

**Key Components:**

#### PSTAPIClient Class
- Manages OAuth token authentication with caching
- Provides methods for all PST API endpoints:
  - **Jobs:** searchJobs, getJob, createJob, updateJob, getJobComments, addJobComment, getJobServeeDetails, getJobAttachments, getJobServers
  - **Cases:** searchCases, getCase, createCase, updateCase, getCaseAttachments
  - **Entities:** searchEntities, getEntity, createEntity, updateEntity, getEntityContacts, createEntityContact, updateEntityContact
  - **Invoices:** searchInvoices, getInvoice, getInvoicePayments, getInvoiceLineItems
  - **Other:** getCourt, searchTypesOfService, getTypeOfService, getAttachment, generateDocuments, getServerPayablesReport, getClassicServerPayReport

#### Helper Functions
- `getPSTClient()` - Creates PST client from environment configuration
- `mapServiceTypeToPriority()` - Maps service type string to PST priority enum (Standard, Rush, PriorityService)
- `findOrCreateEntity()` - Searches for existing entity by email, creates if not found
- `findOrCreateCase()` - Searches for existing case by number, creates if not found

#### Form Processing Functions
- `processContactFormToPST(formData)` - Transforms contact form data to Entity and saves to PST as Client
- `processServiceRequestToPST(formData)` - Creates complete Job structure:
  - Creates/finds Attorney Entity
  - Creates/finds Client Entity
  - Creates/finds Case
  - Creates PartyToBeServed
  - Creates ServeeDetails (supports multiple defendants)
  - Creates Job with all related data
  - Adds special instructions as Job Comment

---

## Files Modified

### 1. `server.js`

**Changes:**

**Added Import:**
```javascript
const { processContactFormToPST, processServiceRequestToPST } = require('./api/pst-integration');
```

**Updated `/api/contact` endpoint (POST):**
- After saving contact to local database, calls `processContactFormToPST()`
- Returns `pstSync` status in response
- Logs entity creation confirmation

**Updated `/api/request` endpoint (POST):**
- After saving service request to local database, calls `processServiceRequestToPST()`
- Returns `pstSync` status and `pstJobNumber` in response
- Handles both multipart and JSON form submissions

---

### 2. `.env.local`

**Added Configuration:**
```
# PST API Configuration
PST_API_USERNAME=your-api-username
PST_API_PASSWORD=your-api-password
PST_DBS_CODE=DBD
PST_USE_TEST_API=true
```

---

## API Endpoints Used

### Authentication
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/token` | POST | OAuth token request with username, password, dbscode |

### Jobs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/jobs` | GET | Search jobs with filters |
| `/jobs/{jobNumber}` | GET | Get single job details |
| `/jobs` | POST | Create new job |
| `/jobs` | PUT | Update existing job |
| `/jobs/{jobNumber}/comments` | GET | Get job comments |
| `/jobs/{jobNumber}/comments` | POST | Add comment to job |

### Cases
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/cases` | GET | Search cases |
| `/cases/{caseSerialNumber}` | GET | Get case details |
| `/cases` | POST | Create new case |

### Entities
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/entities` | GET | Search entities |
| `/entities` | POST | Create new entity |

---

## Data Flow

### Contact Form Submission
```
User submits contact form
    ↓
server.js: /api/contact (POST)
    ↓
1. Save to local database (contact_submissions table)
    ↓
2. processContactFormToPST()
    ↓
   a. Transform form data to Entity format
   b. findOrCreateEntity() - search by email, create if not exists
   c. Return Entity SerialNumber
    ↓
Response: { success: true, pstSync: true/false }
```

### Service Request Form Submission
```
User submits service request
    ↓
server.js: /api/request (POST)
    ↓
1. Upload files to Vercel Blob (if multipart)
    ↓
2. Save to local database (service_requests table)
    ↓
3. processServiceRequestToPST()
    ↓
   a. Transform contact/attorney data → findOrCreateEntity (Attorney)
   b. Transform client data → findOrCreateEntity (Client)
   c. Transform case data → findOrCreateCase
   d. Build PartyToBeServed from defendant info
   e. Build ServeeDetails array (handle multiple defendants)
   f. Build JobServers array
   g. createJob() with full job data
   h. If special instructions exist → addJobComment()
    ↓
Response: { success: true, pstSync: true/false, pstJobNumber: "2024000001" }
```

---

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PST_API_USERNAME` | PST API username | Yes |
| `PST_API_PASSWORD` | PST API password | Yes |
| `PST_DBS_CODE` | 3-character DBS code (default: DBD) | No |
| `PST_USE_TEST_API` | Use test API (true/false) | No |

### API Base URLs
- **Test API:** `https://testpstapi.dbsinfo.com`
- **Production API:** `https://pstapi.dbsinfo.com`

---

## Error Handling

- If PST credentials are not configured, forms still save to local database
- PST API errors are logged but don't fail the form submission
- Token expiration automatically triggers re-authentication
- Entity/Case creation failures return error details in transaction

---

## Notes

1. **Token Caching:** Tokens are cached in memory with expiry handling (refreshed 60 seconds before expiration)

2. **Multiple Defendants:** Service request form supports up to 10 additional defendants. Each defendant is added as a separate ServeeDetail in the PST job.

3. **Service Types Mapping:**
   - "Emergency" → PriorityService
   - "Rush" → Rush
   - "Priority" → PriorityService
   - Default → Standard

4. **Graceful Degradation:** If PST API is unavailable or misconfigured, the system continues to work with local database storage only.

---

## Future Enhancements

Potential additions for future versions:
- Upload attachments to PST job
- Generate documents (affidavits, field sheets) via PST API
- Sync job status updates back from PST
- Server payables report integration
- Invoice status synchronization
