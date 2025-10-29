-- =====================================================
-- FIX DELETE POLICIES FOR RATINGS TABLE
-- =====================================================
-- This allows admins to delete ratings from the admin panel
-- Run this in Supabase SQL Editor

-- First, check current policies on ratings table
SELECT
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'ratings';

-- Drop any existing delete policies
DROP POLICY IF EXISTS "Users can delete own ratings" ON ratings;
DROP POLICY IF EXISTS "Admins can delete any ratings" ON ratings;

-- Create policy: Users can delete their own ratings
CREATE POLICY "Users can delete own ratings"
  ON ratings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policy: Admins can delete any ratings
CREATE POLICY "Admins can delete any ratings"
  ON ratings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Also add SELECT policy if missing (needed for loadAnalytics)
DROP POLICY IF EXISTS "Admins can view all ratings" ON ratings;
DROP POLICY IF EXISTS "Users can view own ratings" ON ratings;

CREATE POLICY "Users can view own ratings"
  ON ratings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all ratings"
  ON ratings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Verify policies are created
SELECT
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'ratings'
ORDER BY cmd, policyname;

-- You should see DELETE and SELECT policies for both users and admins
