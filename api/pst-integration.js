// PST API Integration for Prestige Serves
// This module handles all PST API communication

const { logger, perf, pstLogger, LOG_CATEGORIES } = require('./logger');

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
    logger.info(LOG_CATEGORIES.PST_API, 'PSTAPIClient initialized', {
      apiUsername: this.apiUsername,
      dbsCode: this.dbsCode,
      baseUrl: this.baseUrl
    });
  }

  async getToken() {
    const timer = perf.startTimer('pst_getToken');
    logger.info(LOG_CATEGORIES.PST_API, 'PST Token Request started', {
      dbsCode: this.dbsCode,
      baseUrl: this.baseUrl,
      isVercel: process.env.VERCEL === 'true'
    });

    if (cachedToken && tokenExpiry && Date.now() < tokenExpiry - 60000) {
      logger.info(LOG_CATEGORIES.PST_API, 'Using cached token');
      return cachedToken;
    }

    const params = new URLSearchParams({
      grant_type: 'password',
      apiusername: this.apiUsername,
      apipassword: this.apiPassword,
      dbscode: this.dbsCode
    });

    logger.info(LOG_CATEGORIES.PST_API, 'Making token request to PST API', {
      url: this.baseUrl + PST_API_CONFIG.tokenEndpoint
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

      logger.info(LOG_CATEGORIES.PST_API, 'PST Token Response received', {
        status: response.status,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(LOG_CATEGORIES.PST_API, 'PST Token Request failed', new Error(errorText), {
          status: response.status,
          error: errorText
        });
        throw new Error(`Token request failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      cachedToken = data.access_token;
      tokenExpiry = Date.now() + (data.expires_in * 1000);
      this.token = cachedToken;
      
      timer.end();
      logger.info(LOG_CATEGORIES.PST_API, 'PST Token obtained successfully', {
        expiresIn: data.expires_in,
        tokenPrefix: cachedToken.substring(0, 20) + '...'
      });
      
      return cachedToken;
    } catch (error) {
      timer.end();
      logger.error(LOG_CATEGORIES.PST_API, 'PST Token Error', error);
      throw error;
    }
  }

  async request(endpoint, options = {}) {
    const timer = perf.startTimer('pst_request');
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
    
    logger.info(LOG_CATEGORIES.PST_API, 'PST API Request', {
      method: options.method || 'GET',
      endpoint: endpoint,
      hasBody: !!options.body
    });

    try {
      const response = await fetch(url, config);

      if (response.status === 401 && cachedToken) {
        logger.warn(LOG_CATEGORIES.PST_API, 'PST Token expired, refreshing');
        cachedToken = null;
        tokenExpiry = null;
        return this.request(endpoint, options);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        timer.end();
        logger.info(LOG_CATEGORIES.PST_API, 'PST API Response received', {
          endpoint,
          status: response.status,
          isSuccess: data.IsSuccess,
          transactionName: data.TransactionName
        });
        return data;
      }

      timer.end();
      return response;
    } catch (error) {
      timer.end();
      logger.error(LOG_CATEGORIES.PST_API, 'PST API Request Error', error, { endpoint });
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

  logger.info(LOG_CATEGORIES.PST_API, 'getPSTClient called', {
    hasUsername: !!apiUsername,
    hasPassword: !!apiPassword,
    dbsCode,
    useTest,
    envVERCEL: process.env.VERCEL,
    nodeEnv: process.env.NODE_ENV
  });

  if (!apiUsername || !apiPassword) {
    logger.warn(LOG_CATEGORIES.PST_API, 'PST API credentials not configured. Set PST_API_USERNAME and PST_API_PASSWORD in environment.');
    return null;
  }

  const client = new PSTAPIClient(apiUsername, apiPassword, dbsCode, useTest);
  logger.info(LOG_CATEGORIES.PST_API, 'PST client created successfully');
  return client;
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
  
  logger.info(LOG_CATEGORIES.PST_API, 'findOrCreateEntity called', {
    email: entityData.EmailAddress,
    firmName: entityData.FirmName,
    isClient: entityData.IsClient,
    isAttorney: entityData.IsAttorney
  });
  
  try {
    if (entityData.EmailAddress) {
      logger.info(LOG_CATEGORIES.PST_API, 'Searching for existing entity by email');
      const searchResult = await pstClient.searchEntities({
        SearchText: entityData.EmailAddress,
        EntityType: entityData.IsClient ? 'Client' : entityData.IsAttorney ? 'Attorney' : undefined,
        ActiveOnly: true
      });

      logger.info(LOG_CATEGORIES.PST_API, 'Entity search completed', {
        isSuccess: searchResult.IsSuccess,
        foundCount: searchResult.Entities?.length || 0
      });

      if (searchResult.IsSuccess && searchResult.Entities && searchResult.Entities.length > 0) {
        logger.info(LOG_CATEGORIES.PST_API, 'Found existing entity', {
          serialNumber: searchResult.Entities[0].SerialNumber,
          firmName: searchResult.Entities[0].FirmName
        });
        return searchResult.Entities[0];
      }
    }

    logger.info(LOG_CATEGORIES.PST_API, 'Creating new entity in PST');
    const createResult = await pstClient.createEntity(entityData);
    
    logger.info(LOG_CATEGORIES.PST_API, 'Entity create completed', {
      isSuccess: createResult.IsSuccess,
      createdCount: createResult.Entities?.length || 0
    });
    
    if (createResult.IsSuccess && createResult.Entities && createResult.Entities.length > 0) {
      logger.info(LOG_CATEGORIES.PST_API, 'Entity created successfully', {
        serialNumber: createResult.Entities[0].SerialNumber,
        firmName: createResult.Entities[0].FirmName
      });
      return createResult.Entities[0];
    }

    logger.error(LOG_CATEGORIES.PST_API, 'Entity creation failed', null, { errors: createResult.TransactionErrors });
    return null;
  } catch (error) {
    logger.error(LOG_CATEGORIES.PST_API, 'findOrCreateEntity error', error);
    return null;
  }
}

// Helper: Find or create case
async function findOrCreateCase(pstClient, caseData) {
  if (!pstClient) return null;
  
  logger.info(LOG_CATEGORIES.PST_API, 'findOrCreateCase called', {
    caseNumber: caseData.CaseNumber,
    plaintiff: caseData.Plaintiff,
    defendant: caseData.Defendant,
    state: caseData.State,
    county: caseData.County
  });
  
  try {
    if (caseData.CaseNumber) {
      logger.info(LOG_CATEGORIES.PST_API, 'Searching for existing case by case number');
      const searchResult = await pstClient.searchCases({
        CaseNumber: caseData.CaseNumber
      });

      logger.info(LOG_CATEGORIES.PST_API, 'Case search completed', {
        isSuccess: searchResult.IsSuccess,
        foundCount: searchResult.Cases?.length || 0
      });

      if (searchResult.IsSuccess && searchResult.Cases && searchResult.Cases.length > 0) {
        logger.info(LOG_CATEGORIES.PST_API, 'Found existing case', {
          serialNumber: searchResult.Cases[0].SerialNumber,
          caseNumber: searchResult.Cases[0].CaseNumber
        });
        return searchResult.Cases[0];
      }
    }

    logger.info(LOG_CATEGORIES.PST_API, 'Creating new case in PST');
    const createResult = await pstClient.createCase(caseData);

    logger.info(LOG_CATEGORIES.PST_API, 'Case create completed', {
      isSuccess: createResult.IsSuccess,
      createdCount: createResult.Cases?.length || 0
    });
    
    if (createResult.IsSuccess && createResult.Cases && createResult.Cases.length > 0) {
      logger.info(LOG_CATEGORIES.PST_API, 'Case created successfully', {
        serialNumber: createResult.Cases[0].SerialNumber,
        caseNumber: createResult.Cases[0].CaseNumber
      });
      return createResult.Cases[0];
    }

    logger.error(LOG_CATEGORIES.PST_API, 'Case creation failed', null, { errors: createResult.TransactionErrors });
    return null;
  } catch (error) {
    logger.error(LOG_CATEGORIES.PST_API, 'findOrCreateCase error', error);
    return null;
  }
}

// Process contact form submission to PST
async function processContactFormToPST(formData) {
  const timer = perf.startTimer('processContactFormToPST');
  logger.info(LOG_CATEGORIES.PST_API, '========================================');
  logger.info(LOG_CATEGORIES.PST_API, 'processContactFormToPST STARTED', {
    firstName: formData.firstName,
    lastName: formData.lastName,
    email: formData.email,
    company: formData.company
  });

  const pstClient = getPSTClient();
  if (!pstClient) {
    timer.end();
    logger.warn(LOG_CATEGORIES.PST_API, 'PST client not configured, skipping PST contact submission');
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

    logger.info(LOG_CATEGORIES.PST_API, 'Creating/finding entity for contact form', entityData);
    const entity = await findOrCreateEntity(pstClient, entityData);
    
    timer.end();
    if (entity) {
      logger.info(LOG_CATEGORIES.PST_API, '========================================');
      logger.info(LOG_CATEGORIES.PST_API, 'Contact form SAVED TO PST SUCCESSFULLY', { 
        entitySerialNumber: entity.SerialNumber,
        firmName: entity.FirmName,
        email: entity.EmailAddress,
        formType: 'contact'
      });
      return { success: true, entitySerialNumber: entity.SerialNumber };
    }

    logger.warn(LOG_CATEGORIES.PST_API, 'Contact form FAILED TO SAVE - no entity returned');
    return { success: false, message: 'Failed to create entity in PST' };
  } catch (error) {
    timer.end();
    logger.error(LOG_CATEGORIES.PST_API, '========================================');
    logger.error(LOG_CATEGORIES.PST_API, 'processContactFormToPST FAILED', error);
    return { success: false, message: error.message };
  }
}

// Process service request form submission to PST
async function processServiceRequestToPST(formData) {
  const timer = perf.startTimer('processServiceRequestToPST');
  logger.info(LOG_CATEGORIES.PST_API, '========================================');
  logger.info(LOG_CATEGORIES.PST_API, 'processServiceRequestToPST STARTED', {
    clientName: formData.clientName,
    contactName: formData.contactName,
    email: formData.email,
    caseNumber: formData.caseNumber,
    defendantName: formData.defendantName,
    serviceType: formData.serviceType
  });

  const pstClient = getPSTClient();
  if (!pstClient) {
    timer.end();
    logger.warn(LOG_CATEGORIES.PST_API, 'PST client not configured, skipping PST service request');
    return { success: false, message: 'PST not configured' };
  }

  try {
    logger.info(LOG_CATEGORIES.PST_API, 'Step 1: Creating/finding attorney entity');
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
    logger.info(LOG_CATEGORIES.PST_API, 'Attorney entity result', { 
      serialNumber: attorneyEntity?.SerialNumber,
      firmName: attorneyEntity?.FirmName 
    });

    logger.info(LOG_CATEGORIES.PST_API, 'Step 2: Creating/finding client entity');
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
    logger.info(LOG_CATEGORIES.PST_API, 'Client entity result', { 
      serialNumber: clientEntity?.SerialNumber,
      firmName: clientEntity?.FirmName 
    });

    logger.info(LOG_CATEGORIES.PST_API, 'Step 3: Creating/finding case');
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
    logger.info(LOG_CATEGORIES.PST_API, 'Case result', { 
      serialNumber: caseData?.SerialNumber,
      caseNumber: caseData?.CaseNumber 
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

    logger.info(LOG_CATEGORIES.PST_API, 'Step 8: Creating job in PST', jobData);
    const jobResponse = await pstClient.createJob(jobData);

    if (jobResponse.IsSuccess && jobResponse.Jobs && jobResponse.Jobs.length > 0) {
      const jobNumber = jobResponse.Jobs[0].JobNumber;
      timer.end();
      logger.info(LOG_CATEGORIES.PST_API, '========================================');
      logger.info(LOG_CATEGORIES.PST_API, 'Service request SAVED TO PST SUCCESSFULLY', { 
        jobNumber,
        attorneySerialNumber: attorneyEntity?.SerialNumber,
        clientSerialNumber: clientEntity?.SerialNumber,
        caseSerialNumber: caseData?.SerialNumber,
        formType: 'service_request'
      });

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
      timer.end();
      logger.error(LOG_CATEGORIES.PST_API, '========================================');
      logger.error(LOG_CATEGORIES.PST_API, 'Job creation failed', null, { 
        errors: jobResponse.TransactionErrors,
        formData: {
          clientName: formData.clientName,
          caseNumber: formData.caseNumber,
          defendantName: formData.defendantName
        }
      });
      return {
        success: false,
        message: jobResponse.TransactionErrors?.[0]?.ErrorCodeDescription || 'Failed to create job in PST'
      };
    }
  } catch (error) {
    timer.end();
    logger.error(LOG_CATEGORIES.PST_API, '========================================');
    logger.error(LOG_CATEGORIES.PST_API, 'processServiceRequestToPST FAILED', error);
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
