-- Add skip_trace_data JSONB column to contact_submissions
ALTER TABLE contact_submissions ADD COLUMN IF NOT EXISTS skip_trace_data JSONB;
