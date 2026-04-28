// PST API Integration for Prestige Serves
// This module handles all PST API communication

const PST_API_CONFIG = {
  testBaseUrl: 'https://testpstapi.dbsinfo.com',
  prodBaseUrl: 'https://pstapi.dbsinfo.com',
  tokenEndpoint: '/token',
  timeout: 30000
};

// Token cache
let cachedToken = null;
let tokenExpiry = null;

class PSTAPIClient {
  constructor(apiUsername, apiPassword, dbsCode, useTest = false) {
    this.apiUsername = apiUsername;
    this.apiPassword = apiPassword;
    this.dbsCode = dbsCode;
    this.baseUrl = useTest ? PST_API_CONFIG.testBaseUrl : PST_API_CONFIG.prodBaseUrl;
    this.token = null;
  }

  async getToken() {
    if (cachedToken && tokenExpiry && Date.now() < tokenExpiry - 60000) {
      return cachedToken;
    }

    const params = new URLSearchParams({
      grant_type: 'password',
      apiusername: this.apiUsername,
      apipassword: this.apiPassword,
      dbscode: this.dbsCode
    });

    try {
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
      
      cachedToken = data.token;
      tokenExpiry = Date.now() + (data.expires_in * 1000);
      this.token = cachedToken;
      
      return cachedToken;
    } catch (error) {
      console.error('PST Token Error:', error);
      throw error;
    }
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
    
    try {
      const response = await fetch(url, config);

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
    } catch (error) {
      console.error('PST API Request Error:', error);
      throw error;
    }
  }

  // ============ JOBS ============

  async searchJobs(params = {}) {
    const queryString = new URLSearchParams(
      Object.entries(params).reduce((acc, [key, val]) => {
        if (val !== undefined && val !== null && val !== '') acc.push([key, val]);
        return acc;
      }, [])
    ).toString();
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
    const queryString = new URLSearchParams(
      Object.entries(params).reduce((acc, [key, val]) => {
        if (val !== undefined && val !== null && val !== '') acc.push([key, val]);
        return acc;
      }, [])
    ).toString();
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
    const queryString = new URLSearchParams(
      Object.entries(params).reduce((acc, [key, val]) => {
        if (val !== undefined && val !== null && val !== '') acc.push([key, val]);
        return acc;
      }, [])
    ).toString();
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
    const queryString = new URLSearchParams(
      Object.entries(params).reduce((acc, [key, val]) => {
        if (val !== undefined && val !== null && val !== '') acc.push([key, val]);
        return acc;
      }, [])
    ).toString();
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

  async generateDocuments(params) {
    const queryString = new URLSearchParams(
      Object.entries(params).reduce((acc, [key, val]) => {
        if (val !== undefined && val !== null) acc.push([key, val]);
        return acc;
      }, [])
    ).toString();
    return this.request(`/documents/?${queryString}`);
  }

  async getServerPayablesReport(params) {
    const queryString = new URLSearchParams(
      Object.entries(params).reduce((acc, [key, val]) => {
        if (val !== undefined && val !== null && val !== '') acc.push([key, val]);
        return acc;
      }, [])
    ).toString();
    return this.request(`/reports/serverpayables?${queryString}`);
  }

  async getClassicServerPayReport(params) {
    const queryString = new URLSearchParams(
      Object.entries(params).reduce((acc, [key, val]) => {
        if (val !== undefined && val !== null && val !== '') acc.push([key, val]);
        return acc;
      }, [])
    ).toString();
    return this.request(`/reports/classicserverpay?${queryString}`);
  }
}

// Get PST Client from environment configuration
function getPSTClient() {
  const apiUsername = process.env.PST_API_USERNAME;
  const apiPassword = process.env.PST_API_PASSWORD;
  const dbsCode = process.env.PST_DBS_CODE || 'DBD';
  const useTest = process.env.PST_USE_TEST_API === 'true';

  if (!apiUsername || !apiPassword) {
    console.warn('PST API credentials not configured. Set PST_API_USERNAME and PST_API_PASSWORD in environment.');
    return null;
  }

  return new PSTAPIClient(apiUsername, apiPassword, dbsCode, useTest);
}

// Helper: Map service type to priority
function mapServiceTypeToPriority(serviceType) {
  if (!serviceType) return 'Standard';
  const lower = serviceType.toLowerCase();
  if (lower.includes('emergency')) return 'PriorityService';
  if (lower.includes('rush')) return 'Rush';
  if (lower.includes('priority')) return 'PriorityService';
  return 'Standard';
}

// Helper: Find or create entity
async function findOrCreateEntity(pstClient, entityData) {
  if (!pstClient) return null;
  
  try {
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

    const createResult = await pstClient.createEntity(entityData);
    
    if (createResult.IsSuccess && createResult.Entities && createResult.Entities.length > 0) {
      return createResult.Entities[0];
    }

    console.error('Entity creation failed:', createResult.TransactionErrors);
    return null;
  } catch (error) {
    console.error('findOrCreateEntity error:', error);
    return null;
  }
}

// Helper: Find or create case
async function findOrCreateCase(pstClient, caseData) {
  if (!pstClient) return null;
  
  try {
    if (caseData.CaseNumber) {
      const searchResult = await pstClient.searchCases({
        CaseNumber: caseData.CaseNumber
      });

      if (searchResult.IsSuccess && searchResult.Cases && searchResult.Cases.length > 0) {
        return searchResult.Cases[0];
      }
    }

    const createResult = await pstClient.createCase(caseData);

    if (createResult.IsSuccess && createResult.Cases && createResult.Cases.length > 0) {
      return createResult.Cases[0];
    }

    console.error('Case creation failed:', createResult.TransactionErrors);
    return null;
  } catch (error) {
    console.error('findOrCreateCase error:', error);
    return null;
  }
}

// Process contact form submission to PST
async function processContactFormToPST(formData) {
  const pstClient = getPSTClient();
  if (!pstClient) {
    console.log('PST client not configured, skipping PST submission');
    return { success: false, message: 'PST not configured' };
  }

  try {
    const entityData = {
      FirmName: formData.company || '',
      FirstName: formData.firstName || '',
      LastName: formData.lastName || '',
      EmailAddress: formData.email || '',
      Phone: formData.phone || '',
      City: formData.city || '',
      State: formData.state || '',
      IsClient: true,
      IsAttorney: false,
      IsServer: false,
      ClientActive: true,
      ServerActive: false
    };

    const entity = await findOrCreateEntity(pstClient, entityData);
    
    if (entity) {
      console.log(`Contact saved to PST: Entity #${entity.SerialNumber}`);
      return { success: true, entitySerialNumber: entity.SerialNumber };
    }

    return { success: false, message: 'Failed to create entity in PST' };
  } catch (error) {
    console.error('processContactFormToPST error:', error);
    return { success: false, message: error.message };
  }
}

// Process service request form submission to PST
async function processServiceRequestToPST(formData) {
  const pstClient = getPSTClient();
  if (!pstClient) {
    console.log('PST client not configured, skipping PST submission');
    return { success: false, message: 'PST not configured' };
  }

  try {
    // 1. Create or find attorney entity
    const attorneyEntity = await findOrCreateEntity(pstClient, {
      FirmName: formData.clientName || formData.company || '',
      FirstName: formData.contactName?.split(' ')[0] || '',
      LastName: formData.contactName?.split(' ').slice(-1)[0] || '',
      EmailAddress: formData.email,
      Phone: formData.phone,
      IsAttorney: true,
      IsClient: false
    });

    // 2. Create or find client entity
    const clientEntity = await findOrCreateEntity(pstClient, {
      FirmName: formData.clientName || formData.company || '',
      FirstName: formData.contactName?.split(' ')[0] || '',
      LastName: formData.contactName?.split(' ').slice(-1)[0] || '',
      EmailAddress: formData.email,
      Phone: formData.phone,
      IsClient: true,
      IsAttorney: false
    });

    // 3. Create or find case
    const caseData = await findOrCreateCase(pstClient, {
      CaseNumber: formData.caseNumber || '',
      State: formData.state || 'CA',
      County: formData.county || '',
      Plaintiff: formData.clientName || formData.company || '',
      Defendant: formData.defendantName || '',
      TypeCourt: 'Circuit',
      ClientSerialNumber: clientEntity?.SerialNumber,
      ClientReferenceNumber: formData.caseNumber || ''
    });

    // 4. Build party to be served
    const firstName = formData.defendantName?.split(' ')[0] || '';
    const lastName = formData.defendantName?.split(' ').slice(-1)[0] || '';
    
    const partyToBeServed = {
      FirstName: firstName,
      LastName: lastName,
      AddressType: 'Home',
      Address1: formData.addressLine1 || '',
      City: formData.city || '',
      State: formData.state || '',
      Zip: formData.zip || ''
    };

    // 5. Build servee details
    const serveeDetails = [{
      FirstName: firstName,
      LastName: lastName,
      Address1: formData.addressLine1 || '',
      City: formData.city || '',
      State: formData.state || '',
      Zip: formData.zip || '',
      PartyType: 'NaturalPerson',
      IsActualService: true
    }];

    // 6. Handle multiple defendants
    let defendants = [];
    if (formData.defendantsData) {
      try {
        defendants = typeof formData.defendantsData === 'string' ? JSON.parse(formData.defendantsData) : formData.defendantsData;
      } catch (e) {
        defendants = [];
      }
    }

    if (defendants.length > 0) {
      defendants.forEach(def => {
        const defFirstName = def.firstName || def.defendantName?.split(' ')[0] || '';
        const defLastName = def.lastName || def.defendantName?.split(' ').slice(-1)[0] || '';
        
        serveeDetails.push({
          FirstName: defFirstName,
          LastName: defLastName,
          Address1: def.address || '',
          City: def.city || '',
          State: def.state || '',
          Zip: def.zip || '',
          PartyType: 'NaturalPerson',
          IsActualService: true
        });
      });
    }

    // 7. Build job servers
    const jobServers = defendants.length > 0 ? [{ IsDefault: true }] : [];

    // 8. Create job
    const jobData = {
      AttorneySerialNumber: attorneyEntity?.SerialNumber,
      ClientSerialNumber: clientEntity?.SerialNumber,
      CaseSerialNumber: caseData?.SerialNumber,
      ClientReferenceNumber: formData.caseNumber || '',
      DocumentsToServe: formData.serviceType || '',
      ReceivedDateTime: new Date().toLocaleString(),
      Priority: mapServiceTypeToPriority(formData.serviceType),
      PartyToBeServed: partyToBeServed,
      CreateServeeDetails: serveeDetails,
      AddJobServers: jobServers.length > 0 ? jobServers : undefined,
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

    if (jobResponse.IsSuccess && jobResponse.Jobs && jobResponse.Jobs.length > 0) {
      const jobNumber = jobResponse.Jobs[0].JobNumber;
      console.log(`Job created in PST: #${jobNumber}`);

      // Add special instructions as comment if provided
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
        message: `Service request created in PST. Job #${jobNumber}`
      };
    } else {
      console.error('Job creation failed:', jobResponse.TransactionErrors);
      return {
        success: false,
        message: jobResponse.TransactionErrors?.[0]?.ErrorCodeDescription || 'Failed to create job in PST'
      };
    }
  } catch (error) {
    console.error('processServiceRequestToPST error:', error);
    return { success: false, message: error.message };
  }
}

module.exports = {
  PSTAPIClient,
  getPSTClient,
  processContactFormToPST,
  processServiceRequestToPST,
  findOrCreateEntity,
  findOrCreateCase,
  mapServiceTypeToPriority
};
