# Quick Fix: Model Selection Not Saving

## The Problem

- Model toggles revert when switching tabs
- All 7 models show responses even when only 1 is enabled

## The Cause

The `enabled_models` table doesn't exist in your Supabase database yet.

---

## ⚡ Quick Fix (2 minutes)

### Step 1: Open Supabase SQL Editor

1. Go to: https://supabase.com/dashboard
2. Select your Nexus project
3. Click **"SQL Editor"** in left sidebar
4. Click **"New Query"**

### Step 2: Run This SQL

**Copy and paste this entire block:**

```sql
-- Create the table
CREATE TABLE IF NOT EXISTS enabled_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT UNIQUE NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add the 7 models
INSERT INTO enabled_models (model_name, is_enabled, display_order) VALUES
  ('GPT', true, 1),
  ('Claude', true, 2),
  ('Gemini', true, 3),
  ('DeepSeek', false, 4),
  ('Mistral', false, 5),
  ('Groq', false, 6),
  ('Perplexity', false, 7)
ON CONFLICT (model_name) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE enabled_models ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read
CREATE POLICY "Anyone can view enabled models"
  ON enabled_models FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can update
CREATE POLICY "Admins can update enabled models"
  ON enabled_models FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### Step 3: Click "Run" (or press Ctrl+Enter)

You should see: **"Success. No rows returned"**

### Step 4: Verify

1. Go to **"Table Editor"** in Supabase
2. Find **"enabled_models"** table
3. You should see 7 rows with model names

---

## ✅ Test It

1. **Refresh your Nexus app** (hard refresh: Ctrl+Shift+R)
2. **Go to Admin Panel** → **AI Models tab**
3. **Toggle a model** (e.g., disable Claude)
4. **Switch to another tab** (e.g., Analytics)
5. **Come back to AI Models tab**
6. ✅ **Your changes should be saved!**

---

## 🧪 Test Model Filtering

Now test that only enabled models generate responses:

1. **Go to Admin Panel** → **AI Models**
2. **Enable ONLY GPT** (disable all others)
3. **Go to Dashboard**
4. **Submit a test query** (e.g., "What is 2+2?")
5. ✅ **You should see only 1 response** (Model A - GPT)

If you see multiple responses:
- Check browser console (F12) for errors
- Make sure you hard-refreshed the page
- Verify the `enabled_models` table has correct data in Supabase

---

## 📊 How to Check What's Enabled

In Supabase Table Editor → `enabled_models`:

- ✅ `is_enabled = true` → Model is enabled
- ❌ `is_enabled = false` → Model is disabled

---

## 🔧 If It Still Doesn't Work

### Check 1: Is the table created?

In Supabase, go to **Table Editor** → Look for `enabled_models`

- ❌ **Not there?** → Run the SQL again
- ✅ **It's there** → Continue to Check 2

### Check 2: Are there 7 rows?

Click on `enabled_models` table:

- ❌ **0 rows?** → Run the INSERT part of the SQL again
- ✅ **7 rows** → Continue to Check 3

### Check 3: Can you toggle in Admin Panel?

1. Open browser console (F12)
2. Go to Admin Panel → AI Models
3. Toggle a model
4. Look for errors in console

**If you see "relation enabled_models does not exist":**
- The table wasn't created properly
- Run the SQL again in Supabase

**If you see "permission denied" or "RLS" error:**
- Make sure you're logged in as admin
- Check that RLS policies were created (run the full SQL again)

### Check 4: Are responses filtered?

1. Enable only GPT in Admin Panel
2. Open browser console (F12)
3. Submit a query in Dashboard
4. Look for console logs like: `"Using 1 enabled models: ['GPT']"`

**If you see "Using 7 enabled models":**
- The serverless function isn't reading from database correctly
- Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in Vercel environment variables
- Redeploy on Vercel after making code changes

---

## 🚀 Summary

**What you need to do:**

1. ✅ Run the SQL in Supabase (creates `enabled_models` table)
2. ✅ Hard refresh your app
3. ✅ Test toggling models in Admin Panel
4. ✅ Test that only enabled models generate responses

**After this:**
- Model toggles will save permanently
- Only enabled models will generate responses
- You have full control over which AI providers to use

---

## 💡 Pro Tips

**To use only 1 model (e.g., GPT):**
1. Admin Panel → AI Models
2. Enable only GPT
3. Disable all others
4. Submit a query → see only 1 response

**To test multiple models:**
1. Enable GPT, Claude, and Gemini
2. Submit a query → see 3 responses (A, B, C)

**To save money:**
1. Enable only free/cheap models (Gemini is FREE)
2. Disable expensive models (Claude, Groq)

**Remember:** Models need API keys in Vercel Environment Variables to work. Without API keys, they show mock responses.
