-- Quotes / invoices for custom billing with Stripe checkout

CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  invoice_number VARCHAR(20) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'unpaid',
  invoice_date DATE,
  due_date DATE,
  case_number VARCHAR(100),
  bill_to JSONB DEFAULT '{}',
  service_details JSONB DEFAULT '{}',
  line_items JSONB DEFAULT '[]',
  subtotal_cents INTEGER DEFAULT 0,
  tax_pct NUMERIC(6,2) DEFAULT 0,
  tax_cents INTEGER DEFAULT 0,
  discount_cents INTEGER DEFAULT 0,
  stripe_fee_enabled BOOLEAN DEFAULT false,
  stripe_fee_cents INTEGER DEFAULT 0,
  total_cents INTEGER DEFAULT 0,
  notes TEXT,
  client_email VARCHAR(255),
  access_token VARCHAR(64) NOT NULL,
  stripe_checkout_session_id TEXT,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices (invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices (status);
CREATE INDEX IF NOT EXISTS idx_invoices_token ON invoices (access_token);
