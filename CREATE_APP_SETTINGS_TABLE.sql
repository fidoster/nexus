-- Create app_settings table for admin configurations
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default settings
INSERT INTO app_settings (setting_key, setting_value, description) VALUES
  ('require_rating_before_next_message', true, 'Require users to rate responses before sending next message')
ON CONFLICT (setting_key) DO NOTHING;

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view settings" ON app_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON app_settings;

-- Allow anyone to read settings
CREATE POLICY "Anyone can view settings"
  ON app_settings FOR SELECT
  USING (true);

-- Only admins can update settings
CREATE POLICY "Admins can update settings"
  ON app_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
