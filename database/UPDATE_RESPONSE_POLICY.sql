-- Update RLS policy to allow system to insert AI responses
-- This is needed because responses are generated on behalf of queries
-- Run this in Supabase SQL Editor

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Admins and instructors can insert responses" ON responses;

-- Create new policy that allows insertion for any authenticated user's queries
-- This allows the system to insert AI responses when students submit queries
CREATE POLICY "Allow inserting responses for own queries"
  ON responses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM queries
      WHERE id = responses.query_id
      AND user_id = auth.uid()
    )
  );

-- Also allow admins/instructors to insert any responses
CREATE POLICY "Admins and instructors can insert any responses"
  ON responses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'instructor')
    )
  );
