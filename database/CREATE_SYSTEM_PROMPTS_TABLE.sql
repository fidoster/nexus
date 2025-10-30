-- =====================================================
-- CREATE SYSTEM PROMPTS TABLE
-- =====================================================
-- This table stores customizable system prompts that control AI response behavior
-- Run this in Supabase SQL Editor

-- Create the system_prompts table
CREATE TABLE IF NOT EXISTS system_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- e.g., "Default Prompt", "Short Responses", "Academic Style"
  prompt_text TEXT NOT NULL, -- The actual system prompt
  max_tokens INTEGER DEFAULT 500, -- Maximum response length
  temperature DECIMAL(3,2) DEFAULT 0.7, -- Creativity level (0.0 - 2.0)
  is_active BOOLEAN DEFAULT false, -- Only one prompt can be active at a time
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE system_prompts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can view all prompts" ON system_prompts;
DROP POLICY IF EXISTS "Admins can insert prompts" ON system_prompts;
DROP POLICY IF EXISTS "Admins can update prompts" ON system_prompts;
DROP POLICY IF EXISTS "Admins can delete prompts" ON system_prompts;
DROP POLICY IF EXISTS "Everyone can view active prompt" ON system_prompts;

-- Policy: Admins can view all prompts
CREATE POLICY "Admins can view all prompts"
  ON system_prompts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Anyone can view the active prompt
CREATE POLICY "Everyone can view active prompt"
  ON system_prompts FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Policy: Admins can insert prompts
CREATE POLICY "Admins can insert prompts"
  ON system_prompts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can update prompts
CREATE POLICY "Admins can update prompts"
  ON system_prompts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can delete prompts
CREATE POLICY "Admins can delete prompts"
  ON system_prompts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Insert default system prompt
INSERT INTO system_prompts (name, prompt_text, max_tokens, temperature, is_active, created_by)
VALUES (
  'Default System Prompt',
  'You are a helpful AI assistant answering student questions. Provide clear, accurate, and educational responses. Keep responses concise (under 500 tokens) and appropriate for an academic setting.',
  500,
  0.7,
  true,
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
);

-- Create function to ensure only one active prompt
CREATE OR REPLACE FUNCTION ensure_single_active_prompt()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    -- Deactivate all other prompts
    UPDATE system_prompts
    SET is_active = false
    WHERE id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS single_active_prompt_trigger ON system_prompts;
CREATE TRIGGER single_active_prompt_trigger
  AFTER INSERT OR UPDATE ON system_prompts
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION ensure_single_active_prompt();

-- Verify table was created
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'system_prompts'
ORDER BY ordinal_position;

-- View policies
SELECT
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'system_prompts'
ORDER BY cmd, policyname;

-- View the default prompt
SELECT * FROM system_prompts;
