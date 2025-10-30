-- Fix RLS policies for enabled_models table
-- This fixes the CORS/PATCH error when toggling models

-- First, drop existing policies
DROP POLICY IF EXISTS "Anyone can view enabled models" ON enabled_models;
DROP POLICY IF EXISTS "Admins can update enabled models" ON enabled_models;

-- Allow AUTHENTICATED users to view enabled models (needed for serverless function)
CREATE POLICY "Authenticated users can view enabled models"
  ON enabled_models FOR SELECT
  TO authenticated
  USING (true);

-- Allow ANONYMOUS users to view enabled models (needed for serverless function without auth)
CREATE POLICY "Anonymous users can view enabled models"
  ON enabled_models FOR SELECT
  TO anon
  USING (true);

-- Allow admins to update enabled models
CREATE POLICY "Admins can update enabled models"
  ON enabled_models FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Verify policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'enabled_models'
ORDER BY cmd, policyname;
