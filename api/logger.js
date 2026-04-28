// Structured logging utility for Vercel deployment
// Provides performance tracking, structured JSON logs, and categorized logging

const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

const LOG_CATEGORIES = {
  PST_API: 'pst_api',
  EMAIL: 'email',
  BLOB: 'blob',
  DB: 'database',
  API: 'api',
  FORM: 'form',
  SERVER: 'server'
};

class Logger {
  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.isVercel = process.env.VERCEL === 'true';
  }

  formatMessage(level, category, message, data = {}) {
    const timestamp = new Date().toISOString();
    return JSON.stringify({
      timestamp,
      level,
      category,
      message,
      environment: this.environment,
      ...data
    });
  }

  log(level, category, message, data = {}) {
    const formatted = this.formatMessage(level, category, message, data);
    
    if (this.isVercel) {
      // Vercel structured output - logs go to stderr for proper handling
      process.stderr.write(formatted + '\n');
    } else {
      // Local development - human readable
      console.log(`[${level.toUpperCase()}] [${category}] ${message}`, Object.keys(data).length > 0 ? data : '');
    }
  }

  error(category, message, error = null, data = {}) {
    const errorData = error ? {
      ...data,
      errorMessage: error.message,
      errorStack: this.environment === 'development' ? error.stack : undefined
    } : data;
    
    this.log(LOG_LEVELS.ERROR, category, message, errorData);
  }

  warn(category, message, data = {}) {
    this.log(LOG_LEVELS.WARN, category, message, data);
  }

  info(category, message, data = {}) {
    this.log(LOG_LEVELS.INFO, category, message, data);
  }

  debug(category, message, data = {}) {
    if (this.environment === 'development') {
      this.log(LOG_LEVELS.DEBUG, category, message, data);
    }
  }
}

// Performance tracking utility
class PerformanceTracker {
  constructor() {
    this.performance = require('perf_hooks').performance;
  }

  startTimer(label) {
    const startTime = this.performance.now();
    return {
      label,
      startTime,
      end: () => {
        const endTime = this.performance.now();
        const duration = endTime - startTime;
        return {
          label,
          durationMs: Math.round(duration * 100) / 100,
          duration: `${Math.round(duration)}ms`
        };
      }
    };
  }

  async measureAsync(label, asyncFn) {
    const timer = this.startTimer(label);
    try {
      const result = await asyncFn();
      const timing = timer.end();
      logger.info(LOG_CATEGORIES.PERFORMANCE, `Completed: ${label}`, timing);
      return { success: true, result, timing };
    } catch (error) {
      const timing = timer.end();
      logger.error(LOG_CATEGORIES.PERFORMANCE, `Failed: ${label}`, error, timing);
      return { success: false, error, timing };
    }
  }

  measureSync(label, fn) {
    const timer = this.startTimer(label);
    try {
      const result = fn();
      const timing = timer.end();
      logger.info(LOG_CATEGORIES.PERFORMANCE, `Completed: ${label}`, timing);
      return { success: true, result, timing };
    } catch (error) {
      const timing = timer.end();
      logger.error(LOG_CATEGORIES.PERFORMANCE, `Failed: ${label}`, error, timing);
      return { success: false, error, timing };
    }
  }
}

// Create singleton instances
const logger = new Logger();
const perf = new PerformanceTracker();

// PST API specific logging helpers
const pstLogger = {
  tokenRequest: (dbsCode, success) => {
    logger.info(LOG_CATEGORIES.PST_API, `Token request ${success ? 'succeeded' : 'failed'} for DBS:${dbsCode}`, {
      dbsCode,
      success
    });
  },
  jobCreated: (jobNumber, caseNumber) => {
    logger.info(LOG_CATEGORIES.PST_API, `Job created`, { jobNumber, caseNumber });
  },
  jobFailed: (error, formData) => {
    logger.error(LOG_CATEGORIES.PST_API, `Job creation failed`, error, {
      caseNumber: formData.caseNumber,
      clientName: formData.clientName
    });
  },
  entityCreated: (entitySerialNumber, email) => {
    logger.info(LOG_CATEGORIES.PST_API, `Entity created`, { entitySerialNumber, email });
  },
  caseCreated: (caseSerialNumber, caseNumber) => {
    logger.info(LOG_CATEGORIES.PST_API, `Case created`, { caseSerialNumber, caseNumber });
  }
};

// Email logging helpers
const emailLogger = {
  sent: (to, templateType) => {
    logger.info(LOG_CATEGORIES.EMAIL, `Email sent`, { to, templateType });
  },
  failed: (error, to, templateType) => {
    logger.error(LOG_CATEGORIES.EMAIL, `Email failed`, error, { to, templateType });
  }
};

// Blob logging helpers
const blobLogger = {
  uploaded: (filename, size) => {
    logger.info(LOG_CATEGORIES.BLOB, `File uploaded`, { filename, size });
  },
  failed: (error, filename) => {
    logger.error(LOG_CATEGORIES.BLOB, `Upload failed`, error, { filename });
  }
};

// API request logging helpers
const apiLogger = {
  requestStart: (method, path) => {
    logger.debug(LOG_CATEGORIES.API, `Request started`, { method, path });
  },
  requestComplete: (method, path, statusCode, durationMs) => {
    logger.info(LOG_CATEGORIES.API, `Request completed`, { method, path, statusCode, durationMs });
  },
  requestFailed: (method, path, error) => {
    logger.error(LOG_CATEGORIES.API, `Request failed`, error, { method, path });
  }
};

module.exports = {
  logger,
  perf,
  pstLogger,
  emailLogger,
  blobLogger,
  apiLogger,
  LOG_CATEGORIES,
  LOG_LEVELS
};
