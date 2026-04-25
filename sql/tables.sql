-- Create tables for Prestige Serves form submissions

-- Contact form submissions (used by index.html and contact.html)
CREATE TABLE IF NOT EXISTS contact_submissions (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  company VARCHAR(200),
  email VARCHAR(255),
  phone VARCHAR(50),
  reason VARCHAR(100),
  county VARCHAR(100),
  state VARCHAR(50),
  case_details TEXT,
  urgency VARCHAR(50),
  consent BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Service request form submissions (request.html)
CREATE TABLE IF NOT EXISTS service_requests (
  id SERIAL PRIMARY KEY,
  client_name VARCHAR(200),
  contact_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),
  defendant_name VARCHAR(200),
  case_number VARCHAR(100),
  court_jurisdiction VARCHAR(200),
  multiple_defendants BOOLEAN DEFAULT false,
  service_type VARCHAR(100),
  deadline_date DATE,
  special_instructions TEXT,
  defendants_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
