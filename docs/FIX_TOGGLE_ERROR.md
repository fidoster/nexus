# Fix: Model Toggle CORS Error

## The Error You're Seeing

```
Access to fetch at 'https://...supabase.co/rest/v1/enabled_models?model_name=eq.Gemini'
has been blocked by CORS policy: Method PATCH is not allowed
```

## The Problem

The Row Level Security (RLS) policies on the `enabled_models` table are too restrictive. They need to allow PATCH requests from admins.

---

## ⚡ Quick Fix (30 seconds)

### In Supabase SQL Editor:

**Copy and paste this:**

```sql
-- Fix RLS policies for enabled_models table

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view enabled models" ON enabled_models;
DROP POLICY IF EXISTS "Admins can update enabled models" ON enabled_models;

-- Allow AUTHENTICATED users to view enabled models
CREATE POLICY "Authenticated users can view enabled models"
  ON enabled_models FOR SELECT
  TO authenticated
  USING (true);

-- Allow ANONYMOUS users to view enabled models (for serverless function)
CREATE POLICY "Anonymous users can view enabled models"
  ON enabled_models FOR SELECT
  TO anon
  USING (true);

-- Allow admins to update enabled models (with both USING and WITH CHECK)
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
```

**Click Run** (or press Ctrl+Enter)

---

## ✅ Test It

1. **Hard refresh your app** (Ctrl+Shift+R)
2. **Go to Admin Panel → AI Models**
3. **Toggle a model** (e.g., disable Gemini)
4. **Check console** - should see:
   ```
   Toggling Gemini to false...
   ✅ Gemini disabled
   ```
5. **No CORS errors!**

---

## 🧪 Full Test: Only Enabled Models

Now test the complete flow:

1. **Admin Panel → AI Models**
2. **Enable ONLY GPT** (disable all 6 others)
3. **Go to Dashboard**
4. **Submit query:** "What is 2+2?"
5. ✅ **You should see only 1 response** (Model A - GPT)

**Check console logs:**
```
Using 1 enabled models: ['GPT']
Calling GPT API...
✅ GPT response received
✅ Vercel API returned 1 responses
```

---

## 📊 What This Fixed

**Before:**
- ❌ CORS error when toggling models
- ❌ Toggles don't save
- ❌ Policy was missing `WITH CHECK` clause

**After:**
- ✅ Admins can toggle models without errors
- ✅ Changes save to database
- ✅ Anonymous users can read (for serverless function)
- ✅ Only authenticated admins can update

---

## 🚨 If You Still See Errors

### Error: "permission denied for table enabled_models"

**Solution:** Make sure you're logged in as admin
- Check: Admin Panel → Users
- Your account should have `role: 'admin'`

### Error: Still seeing CORS error

**Solution:**
1. Make sure you ran the SQL above
2. Hard refresh the page (Ctrl+Shift+R)
3. Clear browser cache
4. Try in incognito/private window

### Error: Toggles revert when switching tabs

**Solution:**
1. Check browser console for errors
2. Verify policies exist: In Supabase, go to Table Editor → enabled_models → Policies tab
3. Should see 3 policies (2 for SELECT, 1 for UPDATE)

---

## 💡 Summary

The issue was that the UPDATE policy didn't have the `WITH CHECK` clause, which is required for PATCH requests in Supabase.

**Key changes:**
- Added `WITH CHECK` to UPDATE policy
- Added separate policy for anonymous read access
- Now toggles work perfectly!

**Run the SQL above and you're done!** 🚀
