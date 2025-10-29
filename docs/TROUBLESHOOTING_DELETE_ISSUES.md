# Troubleshooting: Delete Operations Not Working in Admin Panel

## Problem
When deleting evaluation records from the Admin Panel, the delete operation appears to fail silently or shows an error. The records don't get removed and the total count doesn't update.

## Root Cause
This issue is caused by missing or incorrect **Row Level Security (RLS) policies** in Supabase for the `ratings` table. RLS policies control who can SELECT, INSERT, UPDATE, and DELETE data.

## Solution

### Step 1: Run the Fix Script in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open and run the file: `database/FIX_DELETE_POLICIES.sql`

This script will:
- Add DELETE policies for both users and admins
- Add SELECT policies to ensure analytics can load data
- Verify the policies are created correctly

### Step 2: Verify Policies Were Created

After running the script, you should see these policies:

```sql
-- For ratings table:
- "Users can view own ratings" (SELECT)
- "Admins can view all ratings" (SELECT)
- "Users can delete own ratings" (DELETE)
- "Admins can delete any ratings" (DELETE)
```

### Step 3: Test the Delete Functionality

1. Log in as an admin user (admin@nexus.com)
2. Go to Admin Panel → Analytics & Research tab
3. Click "Refresh Data" to load evaluation records
4. Try deleting a single record (🗑️ icon)
5. Try selecting multiple records and clicking "Delete Selected"

## How to Check Current Policies

Run this query in Supabase SQL Editor to see current policies:

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('ratings', 'responses', 'queries')
ORDER BY tablename, cmd, policyname;
```

## Expected Behavior After Fix

✅ **Working Delete Operations:**
- Individual delete (🗑️ icon) removes the record immediately
- Bulk delete removes all selected records
- Total evaluation count updates correctly
- Analytics data refreshes to show remaining records
- No error messages appear

❌ **Before Fix (Broken):**
- Delete appears to do nothing
- Records remain visible after delete attempt
- Total count stays the same
- May show permission error in console

## Additional Notes

### Why This Happens
Supabase's RLS is a security feature that prevents unauthorized data access. By default, RLS blocks all operations unless explicitly allowed by policies. If DELETE policies are missing, even admins can't delete data.

### Future Prevention
When creating new tables in Supabase, always create policies for:
- SELECT (who can read data)
- INSERT (who can create data)
- UPDATE (who can modify data)
- DELETE (who can remove data)

### Related Files
- `database/FIX_DELETE_POLICIES.sql` - SQL script to fix policies
- `database/ENABLE_RLS.sql` - Original RLS setup (profiles only)
- `src/pages/Admin.tsx` - Admin panel with delete functions (lines 267-321)

## Testing Checklist

After applying the fix, verify:

- [ ] Individual record delete works
- [ ] Bulk delete works for selected records
- [ ] Total evaluation count updates after delete
- [ ] Analytics data refreshes correctly
- [ ] No console errors appear
- [ ] Delete operations work for admin users
- [ ] Regular students cannot delete others' ratings

## Getting Help

If delete still doesn't work after applying the fix:

1. Check browser console for error messages
2. Check Supabase logs: Dashboard → Logs → SQL Editor
3. Verify you're logged in as an admin (role = 'admin')
4. Verify RLS is enabled: `SELECT * FROM pg_tables WHERE tablename = 'ratings'`
5. Check the GitHub issues: https://github.com/fidoster/nexus/issues
