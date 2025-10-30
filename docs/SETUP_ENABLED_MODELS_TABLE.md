# Setting Up the Enabled Models Table

## 🎯 What This Does

This table controls which AI models are used in evaluations. When a student submits a query, the app will **only generate responses from enabled models**.

---

## 📝 Step 1: Create the Database Table

### In Supabase Dashboard:

1. **Go to your Supabase project**
   - Visit: https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click **"SQL Editor"** in the left sidebar
   - Click **"New Query"**

3. **Copy and paste this SQL**:

```sql
-- Create enabled_models table
CREATE TABLE IF NOT EXISTS enabled_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT UNIQUE NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default enabled models (GPT, Claude, Gemini as originally planned)
INSERT INTO enabled_models (model_name, is_enabled, display_order) VALUES
  ('GPT', true, 1),
  ('Claude', true, 2),
  ('Gemini', true, 3),
  ('DeepSeek', false, 4),
  ('Mistral', false, 5),
  ('Groq', false, 6),
  ('Perplexity', false, 7)
ON CONFLICT (model_name) DO NOTHING;

-- Enable RLS (Row Level Security)
ALTER TABLE enabled_models ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view enabled models
CREATE POLICY "Anyone can view enabled models"
  ON enabled_models FOR SELECT TO authenticated USING (true);

-- Only admins can update enabled models
CREATE POLICY "Admins can update enabled models"
  ON enabled_models FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

4. **Click "Run"** or press **Ctrl+Enter**

5. **Verify Success**:
   - You should see: **"Success. No rows returned"**
   - This means the table was created successfully

---

## ✅ Step 2: Verify the Table

### Check the table exists:

1. **Go to "Table Editor"** in Supabase
2. **Look for "enabled_models"** in the list
3. **Click on it** to see the data

You should see 7 rows:
- ✅ **GPT** - enabled (is_enabled = true)
- ✅ **Claude** - enabled (is_enabled = true)
- ✅ **Gemini** - enabled (is_enabled = true)
- ❌ **DeepSeek** - disabled (is_enabled = false)
- ❌ **Mistral** - disabled (is_enabled = false)
- ❌ **Groq** - disabled (is_enabled = false)
- ❌ **Perplexity** - disabled (is_enabled = false)

---

## 🚀 Step 3: How It Works

### In the Admin Panel:

1. **Go to Admin Panel** → **"AI Models"** tab
2. **You'll see all 7 models** with toggle switches
3. **Only 3 are enabled by default** (GPT, Claude, Gemini)
4. **Toggle any model** on/off
5. **Changes save automatically** to the database

### When a Student Submits a Query:

```
1. Student types query and clicks "Get Responses"
2. App calls your Vercel serverless function
3. Function checks database for enabled models
4. Function only calls APIs for ENABLED models
5. Student sees responses from enabled models only
```

**Example:**
- **If only GPT and Claude are enabled**: Student sees 2 responses (Model A, Model B)
- **If GPT, Claude, and Gemini are enabled**: Student sees 3 responses (Model A, B, C)
- **If all 7 are enabled**: Student sees 7 responses (Model A through G)

---

## 🔧 Managing Models

### Enable a Model:

1. **Admin Panel** → **AI Models** tab
2. **Toggle the model ON** (switch turns purple)
3. **Done!** Next query will include that model

### Disable a Model:

1. **Admin Panel** → **AI Models** tab
2. **Toggle the model OFF** (switch turns gray)
3. **Done!** Next query will exclude that model

### Important Notes:

- ✅ Changes take effect **immediately**
- ✅ No need to redeploy
- ✅ Models still need API keys in Vercel Environment Variables to work
- ✅ If a model is enabled but has no API key → shows mock response
- ✅ If a model is disabled → won't be called at all

---

## 💡 Recommended Setup

### For Testing (Free/Cheap):
```
✅ GPT - enabled
✅ Gemini - enabled (FREE!)
✅ DeepSeek - enabled (cheapest)
❌ Claude - disabled
❌ Mistral - disabled
❌ Groq - disabled
❌ Perplexity - disabled
```

### For Research (Maximum Diversity):
```
✅ GPT - enabled
✅ Claude - enabled
✅ Gemini - enabled
✅ DeepSeek - enabled
❌ Mistral - disabled (or enable for European perspective)
❌ Groq - disabled
❌ Perplexity - disabled
```

### For Quality (Best Responses):
```
✅ GPT - enabled
✅ Claude - enabled
✅ Gemini - enabled
❌ All others - disabled
```

### For Speed:
```
✅ Groq - enabled (500+ tokens/sec!)
✅ Gemini - enabled (very fast)
✅ GPT - enabled (fast)
❌ All others - disabled
```

---

## 🚨 Troubleshooting

### Problem: "Table doesn't exist" error in console

**Solution:**
1. Go back to Supabase SQL Editor
2. Run the SQL again
3. Check for any error messages
4. Make sure you're in the correct project

---

### Problem: Can't toggle models in Admin Panel

**Solution:**
1. Make sure you're logged in as admin
2. Check browser console for errors
3. Verify RLS policies were created correctly
4. Check that your `profiles` table has `role` column

---

### Problem: Still seeing all 7 models even though only 3 are enabled

**Solution:**
1. Check the database table - are only 3 models set to `is_enabled = true`?
2. Hard refresh your browser (Ctrl+Shift+R on Windows, Cmd+Shift+R on Mac)
3. Check Vercel deployment logs for errors
4. Make sure you deployed after the code changes

---

## 📊 Database Schema

### Table: `enabled_models`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Unique identifier |
| `model_name` | TEXT | Model name (GPT, Claude, etc.) |
| `is_enabled` | BOOLEAN | Whether model is enabled |
| `display_order` | INTEGER | Display order in UI |
| `created_at` | TIMESTAMPTZ | When row was created |
| `updated_at` | TIMESTAMPTZ | When row was last updated |

### RLS Policies:

1. **"Anyone can view enabled models"**
   - Allows all authenticated users to read the table
   - Needed so the serverless function can fetch enabled models

2. **"Admins can update enabled models"**
   - Only users with `role = 'admin'` can toggle models
   - Prevents regular users from changing model configuration

---

## ✅ Quick Checklist

After running the SQL, verify:

- [ ] Table `enabled_models` exists in Supabase
- [ ] Table has 7 rows (one for each model)
- [ ] GPT, Claude, Gemini are enabled by default
- [ ] RLS is enabled on the table
- [ ] You can see the models in Admin Panel → AI Models tab
- [ ] Toggling a model updates the database
- [ ] Submitting a query only returns responses from enabled models

---

## 🎓 Summary

**What you did:**
- Created a database table to store which AI models are enabled
- Set GPT, Claude, and Gemini as enabled by default
- Added security policies so only admins can change model settings

**What happens now:**
- Admin Panel shows all 7 models with toggle switches
- Only enabled models are used when generating responses
- You have full control over which AI providers to use

**Next step:**
- Go to Admin Panel → AI Models tab
- Verify you can see and toggle the models
- Submit a test query and verify you only see responses from enabled models

---

**That's it! Your model selection system is now fully functional.** 🚀
