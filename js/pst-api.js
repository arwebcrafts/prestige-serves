// PST API Client - Handles all communication with PST API

const PST_API_CONFIG = {
  testBaseUrl: 'https://testpstapi.dbsinfo.com',
  prodBaseUrl: 'https://pstapi.dbsinfo.com',
  tokenEndpoint: '/token',
  timeout: 30000
};

// Token storage (in-memory for server-side, would be session-based in production)
let cachedToken = null;
let tokenExpiry = null;

class PSTAPIClient {
  constructor(apiUsername, apiPassword, dbsCode, useTest = false) {
    this.apiUsername = apiUsername;
    this.apiPassword = apiPassword;
    this.dbsCode = dbsCode;
    this.baseUrl = useTest ? PST_API_CONFIG.testBaseUrl : PST_API_CONFIG.prodBaseUrl;
  }

  async getToken() {
    // Check if we have a valid cached token
    if (cachedToken && tokenExpiry && Date.now() < tokenExpiry - 60000) {
      return cachedToken;
    }

    const params = new URLSearchParams({
      grant_type: 'password',
      apiusername: this.apiUsername,
      apipassword: this.apiPassword,
      dbscode: this.dbsCode
    });

    const response = await fetch(this.baseUrl + PST_API_CONFIG.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': '*/*'
      },
      body: params.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Cache the token with expiry buffer (expires_in is in seconds)
    cachedToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000);
    
    return cachedToken;
  }

  async request(endpoint, options = {}) {
    const token = await this.getToken();
    
    const defaultHeaders = {
      'Authorization': `Bearer ${token}`,
      'Accept': '*/*',
      'Cache-Control': 'no-cache',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive'
    };

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    };

    const url = this.baseUrl + endpoint;
    const response = await fetch(url, config);

    // Handle unauthorized - token might be expired
    if (response.status === 401 && cachedToken) {
      cachedToken = null;
      tokenExpiry = null;
      return this.request(endpoint, options);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return data;
    }

    return response;
  }

  // ============ JOBS ============

  async searchJobs(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/jobs${queryString ? '?' + queryString : ''}`);
  }

  async getJob(jobNumber) {
    return this.request(`/jobs/${jobNumber}`);
  }

  async createJob(jobData) {
    return this.request('/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Job: jobData })
    });
  }

  async updateJob(jobData) {
    return this.request('/jobs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Job: jobData })
    });
  }

  async getJobComments(jobNumber) {
    return this.request(`/jobs/${jobNumber}/comments`);
  }

  async addJobComment(jobNumber, commentData) {
    return this.request(`/jobs/${jobNumber}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Comment: commentData })
    });
  }

  async getJobServeeDetails(jobNumber) {
    return this.request(`/jobs/${jobNumber}/ServeeDetails`);
  }

  async getJobAttachments(jobNumber) {
    return this.request(`/jobs/${jobNumber}/attachments`);
  }

  async getJobServers(jobNumber) {
    return this.request(`/jobs/${jobNumber}/servers`);
  }

  // ============ CASES ============

  async searchCases(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/cases${queryString ? '?' + queryString : ''}`);
  }

  async getCase(caseSerialNumber) {
    return this.request(`/cases/${caseSerialNumber}`);
  }

  async createCase(caseData) {
    return this.request('/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Case: caseData })
    });
  }

  async updateCase(caseData) {
    return this.request('/cases', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Case: caseData })
    });
  }

  async getCaseAttachments(caseSerialNumber) {
    return this.request(`/cases/${caseSerialNumber}/attachments`);
  }

  // ============ ENTITIES ============

  async searchEntities(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/entities${queryString ? '?' + queryString : ''}`);
  }

  async getEntity(entitySerialNumber) {
    return this.request(`/entities/${entitySerialNumber}`);
  }

  async createEntity(entityData) {
    return this.request('/entities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Entity: entityData })
    });
  }

  async updateEntity(entityData) {
    return this.request('/entities', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Entity: entityData })
    });
  }

  async getEntityContacts(entitySerialNumber) {
    return this.request(`/entities/${entitySerialNumber}/contacts`);
  }

  async createEntityContact(entitySerialNumber, contactData) {
    return this.request(`/entities/${entitySerialNumber}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Contact: contactData })
    });
  }

  async updateEntityContact(entitySerialNumber, contactData) {
    return this.request(`/entities/${entitySerialNumber}/contacts`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Contact: contactData })
    });
  }

  // ============ INVOICES ============

  async searchInvoices(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/invoices${queryString ? '?' + queryString : ''}`);
  }

  async getInvoice(invoiceNumber) {
    return this.request(`/invoices/${invoiceNumber}`);
  }

  async getInvoicePayments(invoiceNumber) {
    return this.request(`/invoices/${invoiceNumber}/payments`);
  }

  async getInvoiceLineItems(invoiceNumber) {
    return this.request(`/invoices/${invoiceNumber}/lineitems`);
  }

  // ============ OTHER ============

  async getCourt(courtSerialNumber) {
    return this.request(`/courts/${courtSerialNumber}`);
  }

  async searchTypesOfService(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/typesofservice${queryString ? '?' + queryString : ''}`);
  }

  async getTypeOfService(typeServiceSerialNumber) {
    return this.request(`/typesofservice/${typeServiceSerialNumber}`);
  }

  async getAttachment(attachmentId, includeFileBytes = false) {
    const params = new URLSearchParams({ IncludeAttachmentFileBytes: includeFileBytes }).toString();
    return this.request(`/attachments/${attachmentId}?${params}`);
  }

  // ============ DOCUMENTS ============

  async generateDocuments(params) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/documents/?${queryString}`);
  }

  // ============ REPORTS ============

  async getServerPayablesReport(params) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/reports/serverpayables?${queryString}`);
  }

  async getClassicServerPayReport(params) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/reports/classicserverpay?${queryString}`);
  }
}

// Helper functions for form data transformation

function transformContactFormToEntity(formData) {
  return {
    FirmName: formData.company || '',
    FirstName: formData.firstName || '',
    LastName: formData.lastName || '',
    Address1: '',
    City: formData.city || '',
    State: formData.state || '',
    Phone: formData.phone || '',
    EmailAddress: formData.email || '',
    IsClient: true,
    IsAttorney: false,
    IsServer: false,
    ClientActive: true,
    ServerActive: false
  };
}

function transformRequestFormToJob(formData, clientEntitySerial, attorneyEntitySerial, caseSerial, partyToBeServed, serveeDetails, jobServers) {
  const job = {
    AttorneySerialNumber: attorneyEntitySerial,
    ClientSerialNumber: clientEntitySerial,
    CaseSerialNumber: caseSerial,
    ClientReferenceNumber: formData.caseNumber || formData.clientReference || '',
    DocumentsToServe: formData.serviceType || '',
    ReceivedDateTime: new Date().toLocaleString(),
    Priority: mapServiceTypeToPriority(formData.serviceType),
    PartyToBeServed: partyToBeServed,
    CreateServeeDetails: serveeDetails,
    AddJobServers: jobServers,
    QueueDocumentOptions: {
      QueueFieldSheetOptions: {
        AttachPDF: true
      }
    }
  };

  if (formData.deadlineDate) {
    job.ExpireDate = formData.deadlineDate;
  }

  return job;
}

function mapServiceTypeToPriority(serviceType) {
  if (!serviceType) return 'Standard';
  
  const lower = serviceType.toLowerCase();
  if (lower.includes('emergency')) return 'PriorityService';
  if (lower.includes('rush')) return 'Rush';
  if (lower.includes('priority')) return 'PriorityService';
  return 'Standard';
}

function mapServiceTypeToTypeServiceSerial(serviceType) {
  // This would need to be configured based on actual PST type service serial numbers
  // For now, returning null - would need to be looked up or configured
  return null;
}

function transformDefendantToServeeDetail(defendant) {
  return {
    FirstName: defendant.firstName,
    LastName: defendant.lastName,
    Address1: defendant.address,
    City: defendant.city,
    State: defendant.state,
    Zip: defendant.zip || '',
    PartyType: 'NaturalPerson',
    IsActualService: true,
    ServiceDetails: {}
  };
}

function transformPartyToBeServed(defendant) {
  return {
    FirstName: defendant.firstName || defendant.defendantName?.split(' ')[0] || '',
    LastName: defendant.lastName || defendant.defendantName?.split(' ').slice(-1)[0] || '',
    AddressType: 'Home',
    Address1: defendant.address || defendant.addressLine1 || '',
    City: defendant.city || '',
    State: defendant.state || '',
    Zip: defendant.zip || ''
  };
}

function transformDefendantToJobServer(defendant, isDefault = false) {
  return {
    IsDefault: isDefault,
    Server: {
      FirmName: '',
      Address1: defendant.address,
      City: defendant.city,
      State: defendant.state,
      ServerActive: true,
      IsServer: true
    }
  };
}

// Main integration function for processing form submissions to PST
async function processFormSubmissionToPST(formType, formData) {
  const pstClient = getPSTClientFromConfig();
  
  try {
    switch (formType) {
      case 'contact':
        return await processContactForm(pstClient, formData);
      case 'request':
        return await processServiceRequest(pstClient, formData);
      default:
        throw new Error(`Unknown form type: ${formType}`);
    }
  } catch (error) {
    console.error('PST API Error:', error);
    throw error;
  }
}

async function processContactForm(pstClient, formData) {
  // 1. Create or find client entity
  let clientEntity = await findOrCreateEntity(pstClient, {
    FirmName: formData.company,
    FirstName: formData.firstName,
    LastName: formData.lastName,
    EmailAddress: formData.email,
    Phone: formData.phone,
    City: formData.city,
    State: formData.state,
    IsClient: true
  });

  return {
    success: true,
    entitySerialNumber: clientEntity.SerialNumber,
    message: 'Contact information saved to PST system'
  };
}

async function processServiceRequest(pstClient, formData) {
  // 1. Create or find attorney entity (using firm info as attorney)
  let attorneyEntity = await findOrCreateEntity(pstClient, {
    FirmName: formData.clientName || formData.company || '',
    FirstName: formData.contactName?.split(' ')[0] || '',
    LastName: formData.contactName?.split(' ').slice(-1)[0] || '',
    EmailAddress: formData.email,
    Phone: formData.phone,
    IsAttorney: true,
    IsClient: false
  });

  // 2. Create or find client entity
  let clientEntity = await findOrCreateEntity(pstClient, {
    FirmName: formData.clientName || formData.company || '',
    FirstName: formData.contactName?.split(' ')[0] || '',
    LastName: formData.contactName?.split(' ').slice(-1)[0] || '',
    EmailAddress: formData.email,
    Phone: formData.phone,
    IsClient: true,
    IsAttorney: false
  });

  // 3. Create or find case
  let caseData = await findOrCreateCase(pstClient, {
    CaseNumber: formData.caseNumber,
    State: formData.state,
    County: formData.county || '',
    Plaintiff: formData.clientName || formData.company || '',
    Defendant: formData.defendantName,
    TypeCourt: 'Circuit',
    ClientSerialNumber: clientEntity.SerialNumber,
    ClientReferenceNumber: formData.caseNumber
  });

  // 4. Create party to be served
  const partyToBeServed = {
    FirstName: formData.defendantName?.split(' ')[0] || '',
    LastName: formData.defendantName?.split(' ').slice(-1)[0] || '',
    AddressType: 'Home',
    Address1: formData.addressLine1 || '',
    City: formData.city || '',
    State: formData.state || '',
    Zip: formData.zip || ''
  };

  // 5. Create servee details
  const serveeDetails = [{
    FirstName: formData.defendantName?.split(' ')[0] || '',
    LastName: formData.defendantName?.split(' ').slice(-1)[0] || '',
    Address1: formData.addressLine1 || '',
    City: formData.city || '',
    State: formData.state || '',
    Zip: formData.zip || '',
    PartyType: 'NaturalPerson',
    IsActualService: true
  }];

  // 6. Handle multiple defendants if present
  const jobServers = [];
  if (formData.defendants && formData.defendants.length > 0) {
    // Add default server for first defendant
    jobServers.push({ IsDefault: true });
    
    // Add additional servee details for multiple defendants
    formData.defendants.forEach((def, index) => {
      serveeDetails.push({
        FirstName: def.firstName,
        LastName: def.lastName,
        Address1: def.address,
        City: def.city,
        State: def.state,
        Zip: def.zip || '',
        PartyType: 'NaturalPerson',
        IsActualService: true
      });
    });
  }

  // 7. Create job
  const jobData = {
    AttorneySerialNumber: attorneyEntity.SerialNumber,
    ClientSerialNumber: clientEntity.SerialNumber,
    CaseSerialNumber: caseData.SerialNumber,
    ClientReferenceNumber: formData.caseNumber || '',
    DocumentsToServe: formData.serviceType || '',
    ReceivedDateTime: new Date().toLocaleString(),
    Priority: mapServiceTypeToPriority(formData.serviceType),
    PartyToBeServed: partyToBeServed,
    CreateServeeDetails: serveeDetails,
    AddJobServers: jobServers,
    QueueDocumentOptions: {
      QueueFieldSheetOptions: {
        AttachPDF: true
      }
    }
  };

  if (formData.deadlineDate) {
    jobData.ExpireDate = formData.deadlineDate;
  }

  const jobResponse = await pstClient.createJob(jobData);

  if (jobResponse.IsSuccess) {
    const jobNumber = jobResponse.Jobs?.[0]?.JobNumber;
    
    // 8. Add special instructions as comment if provided
    if (formData.specialInstructions) {
      await pstClient.addJobComment(jobNumber, {
        CommentDateTime: new Date().toLocaleString(),
        CommentText: `Special Instructions: ${formData.specialInstructions}`,
        IsAttempt: false,
        IsStatusReport: true,
        IsReviewed: true
      });
    }

    return {
      success: true,
      jobNumber: jobNumber,
      message: `Service request created successfully. Job #${jobNumber}`
    };
  } else {
    throw new Error(jobResponse.TransactionErrors?.[0]?.ErrorCodeDescription || 'Failed to create job');
  }
}

async function findOrCreateEntity(pstClient, entityData) {
  // Try to find existing entity by email or name
  if (entityData.EmailAddress) {
    const searchResult = await pstClient.searchEntities({
      SearchText: entityData.EmailAddress,
      EntityType: entityData.IsClient ? 'Client' : entityData.IsAttorney ? 'Attorney' : undefined,
      ActiveOnly: true
    });

    if (searchResult.IsSuccess && searchResult.Entities && searchResult.Entities.length > 0) {
      return searchResult.Entities[0];
    }
  }

  // Create new entity
  const createResult = await pstClient.createEntity(entityData);
  
  if (createResult.IsSuccess && createResult.Entities && createResult.Entities.length > 0) {
    return createResult.Entities[0];
  }

  throw new Error(createResult.TransactionErrors?.[0]?.ErrorCodeDescription || 'Failed to create entity');
}

async function findOrCreateCase(pstClient, caseData) {
  // Try to find existing case by case number
  if (caseData.CaseNumber) {
    const searchResult = await pstClient.searchCases({
      CaseNumber: caseData.CaseNumber
    });

    if (searchResult.IsSuccess && searchResult.Cases && searchResult.Cases.length > 0) {
      return searchResult.Cases[0];
    }
  }

  // Create new case
  const createResult = await pstClient.createCase(caseData);

  if (createResult.IsSuccess && createResult.Cases && createResult.Cases.length > 0) {
    return createResult.Cases[0];
  }

  throw new Error(createResult.TransactionErrors?.[0]?.ErrorCodeDescription || 'Failed to create case');
}

function getPSTClientFromConfig() {
  // These would come from environment variables in production
  const apiUsername = process.env.PST_API_USERNAME || 'your-api-username';
  const apiPassword = process.env.PST_API_PASSWORD || 'your-api-password';
  const dbsCode = process.env.PST_DBS_CODE || 'DBD';
  const useTest = process.env.PST_USE_TEST_API === 'true';

  return new PSTAPIClient(apiUsername, apiPassword, dbsCode, useTest);
}

// Export for use in server
module.exports = {
  PSTAPIClient,
  processFormSubmissionToPST,
  transformContactFormToEntity,
  transformRequestFormToJob,
  findOrCreateEntity,
  findOrCreateCase,
  mapServiceTypeToPriority
};
