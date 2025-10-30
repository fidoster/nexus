# Complete Database Setup Guide

You're seeing console errors because two tables are missing. Let's fix both:

---

## ⚡ Quick Setup (5 minutes)

### Step 1: Create `enabled_models` table

You already did this! ✅

---

### Step 2: Create `system_prompts` table

This table controls how AI models respond (e.g., concise vs detailed answers).

**In Supabase SQL Editor, run this:**

```sql
-- Create the system_prompts table
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
DROP POLICY IF EXISTS "Admins can insert prompts" ON system_prompts;
DROP POLICY IF EXISTS "Admins can update prompts" ON system_prompts;
DROP POLICY IF EXISTS "Admins can delete prompts" ON system_prompts;
DROP POLICY IF EXISTS "Everyone can view active prompt" ON system_prompts;

-- Policy: Admins can view all prompts
CREATE POLICY "Admins can view all prompts"
  ON system_prompts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Anyone can view the active prompt
CREATE POLICY "Everyone can view active prompt"
  ON system_prompts FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Policy: Admins can insert prompts
CREATE POLICY "Admins can insert prompts"
  ON system_prompts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can update prompts
CREATE POLICY "Admins can update prompts"
  ON system_prompts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can delete prompts
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
  'Default System Prompt',
  'You are a helpful AI assistant answering student questions. Provide clear, accurate, and educational responses. Keep responses concise (under 500 tokens) and appropriate for an academic setting.',
  500,
  0.7,
  true,
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
);

-- Create function to ensure only one active prompt
CREATE OR REPLACE FUNCTION ensure_single_active_prompt()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
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
```

---

### Step 3: Wait for Vercel deployment

After you pushed to GitHub, Vercel is automatically deploying the new code.

**Check deployment status:**
1. Go to https://vercel.com/dashboard
2. Find your Nexus project
3. Wait for the deployment to finish (usually 1-2 minutes)
4. Look for "Ready" status with a green checkmark

---

### Step 4: Test it!

Once Vercel shows "Ready":

1. **Hard refresh your app** (Ctrl+Shift+R)
2. **Go to Admin Panel → AI Models**
3. **Enable ONLY GPT** (toggle off all others)
4. **Go to Dashboard**
5. **Submit a test query:** "What is 2+2?"
6. ✅ **You should see ONLY 1 response** (Model A - GPT)

---

## 🔍 How to Check Vercel Deployment

### In Vercel Dashboard:

1. Go to your project
2. Click on "Deployments"
3. Look at the top deployment:
   - 🟡 **Building...** → Wait a bit longer
   - 🟢 **Ready** → Good to test!
   - 🔴 **Error** → Check build logs

### What to Look For:

The most recent deployment should have commit message:
> "Implement model selection system: Only enabled models generate responses"

---

## ✅ Expected Results

### Before Vercel Deployment:
- ❌ All 7 models show responses
- ❌ Console logs: "Vercel API returned 7 responses"

### After Vercel Deployment:
- ✅ Only enabled models show responses
- ✅ Console logs: "Using 1 enabled models: ['GPT']"
- ✅ Console logs: "Vercel API returned 1 responses"

---

## 🧪 Full Test Checklist

After running the SQL and Vercel deploys:

- [ ] No console errors about "system_prompts table not found"
- [ ] Admin Panel → Settings tab loads without errors
- [ ] Admin Panel → AI Models tab shows all 7 models
- [ ] Toggling models saves (doesn't revert when switching tabs)
- [ ] Dashboard query with only GPT enabled shows 1 response
- [ ] Dashboard query with 3 models enabled shows 3 responses
- [ ] Console logs show correct number of enabled models

---

## 🚨 If It Still Shows 7 Models

### Check 1: Is Vercel deployed?

- Go to Vercel Dashboard
- Make sure latest deployment is "Ready"
- Check deployment time (should be within last few minutes)

### Check 2: Hard refresh the page

- Windows: **Ctrl + Shift + R**
- Mac: **Cmd + Shift + R**
- Or open in incognito/private window

### Check 3: Check console logs

After submitting a query, look for:

**Good (working):**
```
Using 1 enabled models: ['GPT']
Calling GPT API...
✅ Vercel API returned 1 responses
```

**Bad (not working):**
```
✅ Vercel API returned 7 responses
```

If you see "7 responses", the old code is still running. Wait for Vercel deployment to finish.

---

## 📊 Summary

**What you need to do:**

1. ✅ Run SQL for `enabled_models` (you did this!)
2. ⏳ Run SQL for `system_prompts` (copy from above)
3. ⏳ Wait for Vercel deployment to finish
4. ⏳ Hard refresh your app and test

**After this:**
- No more console errors
- Model toggles save properly
- Only enabled models generate responses
- System prompts work in Admin Panel

---

## 💡 Pro Tip

While waiting for Vercel deployment:
- Open Vercel Dashboard in another tab
- Watch for "Ready" status
- Usually takes 1-2 minutes
- You'll see a notification when it's ready

**Then immediately hard refresh your Nexus app and test!**
