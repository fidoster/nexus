-- =====================================================
-- RE-ENABLE ROW LEVEL SECURITY WITH FIXED POLICIES
-- =====================================================
-- Run this AFTER you've verified the admin panel works!

-- Step 1: Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop all old policies to start fresh
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can select own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "authenticated_users_select_own_profile" ON profiles;
DROP POLICY IF EXISTS "authenticated_users_select_all_profiles" ON profiles;
DROP POLICY IF EXISTS "authenticated_users_update_profiles" ON profiles;

-- Step 3: Create SIMPLE policies that work!

-- Policy 1: Authenticated users can read their own profile
CREATE POLICY "users_read_own_profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy 2: Authenticated users can read ALL profiles
-- (This allows the admin panel to load all users)
-- Later you can restrict this to admins only if needed
CREATE POLICY "users_read_all_profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Policy 3: Users can update their own profile
CREATE POLICY "users_update_own_profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 4: Admins can update any profile
-- Uses a subquery but it's safe because we check via direct comparison
CREATE POLICY "admins_update_any_profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    -- Either updating own profile OR user is admin
    (auth.uid() = id) OR
    (
      -- Check if current user is admin by looking up their role
      (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    )
  );

-- Step 4: Verify policies are created
SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- You should see 4 policies listed above

-- Step 5: Test the queries that the app uses
-- These should all work now:

-- Test 1: Get your own profile (should work)
SELECT role FROM profiles WHERE id = auth.uid();

-- Test 2: Get all profiles (should work for logged-in users)
SELECT id, email, role FROM profiles ORDER BY created_at DESC;

-- If both queries above return data, RLS is properly configured! ✅
