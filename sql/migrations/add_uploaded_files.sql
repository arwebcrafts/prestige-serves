-- Migration: Add uploaded_files column to service_requests table
-- Run this if you already have the service_requests table

ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS uploaded_files JSONB;
