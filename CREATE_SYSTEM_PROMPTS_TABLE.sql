-- Create system_prompts table for Admin Panel
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS system_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  max_tokens INTEGER DEFAULT 500,
  temperature DECIMAL(3,2) DEFAULT 0.7,
  is_active BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE system_prompts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can view all prompts" ON system_prompts;
DROP POLICY IF EXISTS "Everyone can view active prompt" ON system_prompts;
DROP POLICY IF EXISTS "Admins can insert prompts" ON system_prompts;
DROP POLICY IF EXISTS "Admins can update prompts" ON system_prompts;
DROP POLICY IF EXISTS "Admins can delete prompts" ON system_prompts;

-- Allow admins to view all prompts
CREATE POLICY "Admins can view all prompts"
  ON system_prompts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow anyone to view the active prompt (for API to use)
CREATE POLICY "Everyone can view active prompt"
  ON system_prompts FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Allow admins to insert prompts
CREATE POLICY "Admins can insert prompts"
  ON system_prompts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow admins to update prompts
CREATE POLICY "Admins can update prompts"
  ON system_prompts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow admins to delete prompts
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
  'Default Educational Assistant',
  'You are a helpful educational AI assistant. Provide clear, accurate, and concise responses that help students learn. When explaining concepts, break them down into understandable parts. Be encouraging and supportive in your tone.',
  500,
  0.7,
  true,
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
);

-- Create function to ensure only one active prompt at a time
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
