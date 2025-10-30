-- Fix RLS policy for system_prompts so serverless function can read active prompt
-- The serverless function needs to read the active prompt without authentication

-- Drop the existing "Everyone can view active prompt" policy
DROP POLICY IF EXISTS "Everyone can view active prompt" ON system_prompts;

-- Create new policy that allows both authenticated and anonymous users to read active prompt
CREATE POLICY "Anyone can view active prompt"
  ON system_prompts FOR SELECT
  USING (is_active = true);

-- This allows:
-- 1. Authenticated users (students in dashboard) to read active prompt
-- 2. Anonymous requests (serverless function) to read active prompt
-- But ONLY the active prompt, not all prompts
