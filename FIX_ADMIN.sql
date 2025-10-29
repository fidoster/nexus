-- =====================================================
-- DIRECT FIX FOR YOUR ADMIN USER
-- =====================================================
-- Run this in Supabase SQL Editor NOW!

-- Step 1: Check if profile exists
SELECT id, email, role FROM profiles WHERE id = '2d604d9f-e7ea-4512-a666-9b946110a9d4';

-- Step 2: Delete and recreate to ensure it's fresh
DELETE FROM profiles WHERE id = '2d604d9f-e7ea-4512-a666-9b946110a9d4';

-- Step 3: Insert your admin profile
INSERT INTO profiles (id, email, role)
VALUES ('2d604d9f-e7ea-4512-a666-9b946110a9d4', 'admin@nexus.com', 'admin');

-- Step 4: Verify it worked
SELECT id, email, role, created_at FROM profiles WHERE email = 'admin@nexus.com';

-- You should see one row with role = 'admin'

-- Step 5: Test the query that's failing (this simulates what the app does)
-- This should return { role: 'admin' }
SELECT role FROM profiles WHERE id = '2d604d9f-e7ea-4512-a666-9b946110a9d4';
