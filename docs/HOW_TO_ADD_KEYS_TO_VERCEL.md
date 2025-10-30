# How to Add API Keys to Vercel Environment Variables

## 🎯 Step-by-Step Guide

### Prerequisites
- ✅ Your code is pushed to GitHub (already done!)
- ✅ You have a Vercel account (free at vercel.com)
- ✅ You have API keys from OpenAI/Anthropic/Google

---

## 📝 Step 1: Deploy Your App to Vercel

### Option A: First Time Deployment

1. **Go to Vercel**
   - Visit: https://vercel.com
   - Click **"Sign Up"** or **"Log In"**
   - Sign in with GitHub

2. **Import Your Repository**
   - Click **"Add New..."** → **"Project"**
   - Find your repository: **"nexus"**
   - Click **"Import"**

3. **Configure Project** (usually auto-detected)
   - Framework Preset: **Vite**
   - Root Directory: **"./"** (leave as is)
   - Build Command: **npm run build** (auto-detected)
   - Output Directory: **dist** (auto-detected)

4. **Don't Deploy Yet!**
   - Click **"Environment Variables"** (expand section)
   - This is where you'll add API keys
   - See Step 2 below

### Option B: Already Deployed

1. **Go to your Vercel Dashboard**
   - Visit: https://vercel.com/dashboard

2. **Select your project**
   - Click on **"nexus"** (or whatever you named it)

3. **Go to Settings**
   - Click **"Settings"** tab at the top

4. **Navigate to Environment Variables**
   - In the left sidebar, click **"Environment Variables"**

---

## 🔑 Step 2: Add Environment Variables

### Required Variables

You need to add these environment variables:

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
OPENAI_API_KEY (optional but recommended)
ANTHROPIC_API_KEY (optional)
GOOGLE_AI_API_KEY (optional)
```

### How to Add Each Variable

For **each** environment variable:

1. **Click "Add New"** or the **"+"** button

2. **Fill in the form:**

   **Name (Key):** `VITE_SUPABASE_URL`

   **Value:** `https://your-project.supabase.co` (your actual Supabase URL)

   **Environment:** Select **ALL** (Production, Preview, Development)
   - ✅ Production
   - ✅ Preview
   - ✅ Development

3. **Click "Save"**

4. **Repeat for all variables**

### Example Screenshots (what you'll see):

```
┌─────────────────────────────────────────┐
│  Add Environment Variable               │
├─────────────────────────────────────────┤
│  Name (Key)                             │
│  ┌─────────────────────────────────┐   │
│  │ VITE_SUPABASE_URL               │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Value                                  │
│  ┌─────────────────────────────────┐   │
│  │ https://abc.supabase.co         │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Environments                           │
│  ☑ Production                          │
│  ☑ Preview                             │
│  ☑ Development                         │
│                                         │
│  [Cancel]  [Save]                      │
└─────────────────────────────────────────┘
```

---

## 📋 Complete List of Variables to Add

### 1. Supabase URL (Required)

```
Name:  VITE_SUPABASE_URL
Value: https://your-project-id.supabase.co
```

**Where to find it:**
- Go to your Supabase Dashboard
- Select your project
- Settings → API
- Copy "Project URL"

---

### 2. Supabase Anon Key (Required)

```
Name:  VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Where to find it:**
- Go to your Supabase Dashboard
- Select your project
- Settings → API
- Copy "anon public" key

---

### 3. OpenAI API Key (Optional but Recommended)

```
Name:  OPENAI_API_KEY
Value: sk-proj-...
```

**Where to get it:**
- Go to: https://platform.openai.com/api-keys
- Click "Create new secret key"
- Name it: "Nexus Production"
- Copy the key (you'll only see it once!)
- Paste into Vercel

**Cost:** ~$0.15 per 1,000 evaluations

---

### 4. Anthropic API Key (Optional)

```
Name:  ANTHROPIC_API_KEY
Value: sk-ant-...
```

**Where to get it:**
- Go to: https://console.anthropic.com/settings/keys
- Click "Create Key"
- Name it: "Nexus Production"
- Copy the key
- Paste into Vercel

**Cost:** ~$0.25 per 1,000 evaluations

---

### 5. Google AI API Key (Optional)

```
Name:  GOOGLE_AI_API_KEY
Value: AIzaSy...
```

**Where to get it:**
- Go to: https://aistudio.google.com/app/apikey
- Click "Create API key"
- Copy the key
- Paste into Vercel

**Cost:** Free tier available

---

## 🚀 Step 3: Deploy (or Redeploy)

### If This is First Time Deployment:

1. **After adding all environment variables**
2. **Click "Deploy"**
3. **Wait 1-2 minutes**
4. **Your app is live!** 🎉

### If Already Deployed:

**Option A: Automatic (Recommended)**
- Vercel automatically redeploys when you save environment variables
- Wait 1-2 minutes
- Your app updates automatically

**Option B: Manual Redeploy**
1. Go to **"Deployments"** tab
2. Click **"..."** (three dots) on the latest deployment
3. Click **"Redeploy"**
4. Click **"Redeploy"** to confirm

---

## ✅ Step 4: Verify It Works

### Test Your Deployed App:

1. **Open your deployed URL**
   - Something like: `https://nexus-abc123.vercel.app`

2. **Sign up / Log in**

3. **Submit a test query**
   - Example: "What is artificial intelligence?"

4. **Check the responses:**
   - ✅ You should see **real** AI responses (not mock)
   - ✅ Different models (GPT, Claude, Gemini)
   - ✅ Relevant answers to your question

### Verify Security:

1. **Open Browser DevTools** (F12)

2. **Go to "Application" tab → "Local Storage"**
   - ✅ You should **NOT** see any API keys
   - ✅ Keys are not stored in browser

3. **Go to "Network" tab**
   - ✅ You should see calls to `/api/generate-responses`
   - ✅ You should **NOT** see calls to `api.openai.com` directly
   - ✅ Click on a request → Headers → No API keys visible

4. **If you see the above:** ✅ **Your keys are secure!**

---

## 🔧 Troubleshooting

### Problem: "Still getting mock responses"

**Solution:**

1. **Check environment variables are set:**
   - Vercel Dashboard → Settings → Environment Variables
   - Verify all variables are there
   - Check for typos in variable names

2. **Verify you redeployed:**
   - Changes to env vars require a redeploy
   - Check Deployments tab → Latest should be after you added vars

3. **Check API keys are valid:**
   - Test keys on provider dashboards
   - Ensure they're not expired or revoked

4. **Check browser console:**
   - F12 → Console tab
   - Look for error messages
   - Share errors if you need help

---

### Problem: "Environment variable not showing up"

**Solution:**

1. **Make sure you selected all environments:**
   - ✅ Production
   - ✅ Preview
   - ✅ Development

2. **Redeploy after adding variables**

3. **Clear browser cache:**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

---

### Problem: "API calls failing"

**Solution:**

1. **Check API key format:**
   - OpenAI: Should start with `sk-proj-` or `sk-`
   - Anthropic: Should start with `sk-ant-`
   - Google: Should start with `AIzaSy`

2. **Check API credits:**
   - Go to provider dashboard
   - Verify you have available credits
   - Add payment method if needed

3. **Check rate limits:**
   - Some APIs have rate limits
   - Wait a few minutes and try again

---

## 💡 Pro Tips

### 1. Keep Keys Secure

- ❌ Never commit keys to git
- ❌ Never share keys publicly
- ❌ Never screenshot keys
- ✅ Only store in Vercel Dashboard
- ✅ Rotate keys every 90 days

### 2. Set Usage Limits

**On OpenAI Dashboard:**
- Settings → Limits → Set monthly spending limit
- Example: $10/month

**On Anthropic Dashboard:**
- Usage → Set usage alerts
- Get notified if spending is high

### 3. Monitor Usage

**Check regularly:**
- OpenAI: https://platform.openai.com/usage
- Anthropic: https://console.anthropic.com/settings/billing
- Google: https://aistudio.google.com/app/apikey

### 4. Use Different Keys for Dev/Prod

**For better security:**

**Development** (your .env.local file):
```
OPENAI_API_KEY=sk-dev-key-here
```

**Production** (Vercel Dashboard):
```
OPENAI_API_KEY=sk-prod-key-here
```

This way, if dev key leaks, production isn't affected.

---

## 📸 Visual Guide

### Where to Find Environment Variables in Vercel:

```
Vercel Dashboard
    └─ Your Project (nexus)
        └─ Settings (top tab)
            └─ Environment Variables (left sidebar)
                └─ Add New (button)
```

### What the Form Looks Like:

```
┌──────────────────────────────────────┐
│ Environment Variables                │
├──────────────────────────────────────┤
│                                      │
│ [+ Add New]                         │
│                                      │
│ ┌────────────────────────────────┐ │
│ │ Name: OPENAI_API_KEY           │ │
│ │ Value: sk-proj-***             │ │
│ │ Environments:                  │ │
│ │   ☑ Production                │ │
│ │   ☑ Preview                   │ │
│ │   ☑ Development               │ │
│ │                                │ │
│ │ [Cancel]  [Save]              │ │
│ └────────────────────────────────┘ │
│                                      │
│ Existing Variables:                 │
│ • VITE_SUPABASE_URL     [Edit]     │
│ • VITE_SUPABASE_ANON_KEY [Edit]    │
│ • OPENAI_API_KEY        [Edit]     │
└──────────────────────────────────────┘
```

---

## 📋 Quick Checklist

Before deployment, verify you have:

- [ ] Vercel account created
- [ ] GitHub repository connected to Vercel
- [ ] Supabase URL copied
- [ ] Supabase Anon Key copied
- [ ] OpenAI API Key obtained (optional)
- [ ] Anthropic API Key obtained (optional)
- [ ] Google AI API Key obtained (optional)

During deployment:

- [ ] Added VITE_SUPABASE_URL to Vercel
- [ ] Added VITE_SUPABASE_ANON_KEY to Vercel
- [ ] Added OPENAI_API_KEY to Vercel (if using)
- [ ] Added ANTHROPIC_API_KEY to Vercel (if using)
- [ ] Added GOOGLE_AI_API_KEY to Vercel (if using)
- [ ] Selected all environments for each variable
- [ ] Deployed or redeployed application

After deployment:

- [ ] Tested app with real query
- [ ] Verified real AI responses (not mock)
- [ ] Checked DevTools - no keys visible
- [ ] Set usage limits on provider dashboards
- [ ] Bookmarked provider usage dashboards

---

## 🎓 Summary

**To add API keys to Vercel:**

1. Go to **Vercel Dashboard** → **Your Project**
2. Click **Settings** → **Environment Variables**
3. Click **Add New** for each variable
4. Enter **Name** and **Value**
5. Select **All Environments**
6. Click **Save**
7. **Redeploy** (usually automatic)
8. **Test** your deployed app

**That's it!** Your API keys are now secure on Vercel's servers, and all users can benefit from real AI responses. 🚀

---

## ❓ Still Need Help?

If you're stuck, check:
- Vercel Docs: https://vercel.com/docs/environment-variables
- Or share your error messages and I can help debug!
