# Vercel Deployment Guide - Secure API Key Setup

## 🎯 Why Vercel is Perfect for Your Use Case

✅ **Built-in Environment Variables** - Store API keys securely
✅ **Serverless Functions** - No backend server needed
✅ **Free Tier** - Perfect for educational projects
✅ **Auto HTTPS** - Secure by default
✅ **Git Integration** - Auto-deploy on push
✅ **Fast Edge Network** - Global CDN included

## 📋 Prerequisites

- GitHub account (for repo)
- Vercel account (free - https://vercel.com)
- OpenAI API key (and optionally Anthropic, Google AI)

## 🚀 Quick Deployment (10 minutes)

### Step 1: Install Vercel Package

```bash
cd C:\Users\Novaf\Desktop\nexus
npm install @vercel/node
```

### Step 2: Update to Use Vercel API Service

Replace the current `aiService.ts` with the Vercel version:

```bash
# Backup current service
mv src/services/aiService.ts src/services/aiService.old.ts

# Use Vercel service
cp src/services/aiServiceVercel.ts src/services/aiService.ts
```

Or manually update `src/services/aiService.ts` by replacing all content with the content from `src/services/aiServiceVercel.ts`.

### Step 3: Push to GitHub

```bash
git add -A
git commit -m "Add Vercel serverless API support"
git push origin main
```

### Step 4: Deploy to Vercel

#### Option A: Via Vercel Website (Easiest)

1. Go to [vercel.com](https://vercel.com)
2. Click **"Add New Project"**
3. Import your GitHub repository: `fidoster/nexus`
4. Click **"Deploy"**

That's it! Vercel will automatically:
- Detect it's a Vite project
- Build with `npm run build`
- Deploy to a `.vercel.app` URL

#### Option B: Via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: nexus
# - Directory: ./
# - Build command: npm run build
# - Output directory: dist
```

### Step 5: Add Environment Variables in Vercel

**Critical Step** - Add your API keys securely:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your project (nexus)
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

#### Required Variables:

| Variable | Value | Environment |
|----------|-------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key | Production, Preview, Development |
| `OPENAI_API_KEY` | `sk-proj-your-key` | Production |
| `ANTHROPIC_API_KEY` | `sk-ant-your-key` | Production (optional) |
| `GOOGLE_AI_API_KEY` | Your Google AI key | Production (optional) |

**Important:**
- Click **"Production"** for live deployment
- DO NOT check "Preview" or "Development" for API keys (security)
- Use separate API keys for production vs development

#### How to Add Each Variable:

1. Click **"Add New"**
2. Enter **Name**: `OPENAI_API_KEY`
3. Enter **Value**: `sk-proj-your-actual-key`
4. Select **Environment**: Production
5. Click **"Save"**
6. Repeat for other variables

### Step 6: Redeploy

After adding environment variables:

1. Go to **Deployments** tab
2. Click **"..."** on latest deployment
3. Click **"Redeploy"**

Or via CLI:
```bash
vercel --prod
```

### Step 7: Test Your Deployment

1. Visit your Vercel URL: `https://nexus-xxx.vercel.app`
2. Login to your app
3. Go to Dashboard
4. Submit a question
5. Open browser console (F12)
6. Check logs:
   - Should see: `🚀 Calling Vercel API route...`
   - Should see: `✅ Vercel API returned 3 responses`
7. Verify you get **real AI responses** (not mock)

## 📁 File Structure for Vercel

```
nexus/
├── api/                          # Vercel Serverless Functions
│   └── generate-responses.ts     # API route for AI calls
├── src/
│   └── services/
│       ├── aiService.ts          # Points to Vercel API (use aiServiceVercel.ts)
│       ├── aiServiceVercel.ts    # Vercel-compatible service
│       └── aiService.old.ts      # Backup of original
├── vercel.json                   # Vercel configuration
└── package.json                  # Updated with @vercel/node
```

## 🔧 How It Works

### Architecture:

```
┌─────────────┐      ┌──────────────────┐      ┌──────────────┐
│   Browser   │─────▶│ Vercel Function  │─────▶│  OpenAI API  │
│  (React)    │      │  /api/generate   │      │              │
└─────────────┘      └──────────────────┘      └──────────────┘
                              ▲
                              │
                       Environment Variables
                       (API keys stored here)
```

### Request Flow:

1. User submits question in Dashboard
2. `aiService.ts` calls `/api/generate-responses`
3. Vercel serverless function receives request
4. Function reads API keys from environment variables
5. Function loads active system prompt from Supabase
6. Function calls OpenAI/Claude/Gemini APIs
7. Responses returned to browser
8. **API keys never exposed to browser** ✅

## 🔐 Security Benefits

✅ **API Keys on Server** - Never sent to browser
✅ **Environment Variables** - Encrypted by Vercel
✅ **HTTPS by Default** - All connections secure
✅ **No localStorage** - Keys not visible in DevTools
✅ **Audit Logs** - Vercel tracks all deployments
✅ **Easy Rotation** - Update env vars without code changes

## 💰 Cost Breakdown

### Vercel Pricing (Hobby Plan - FREE):

| Resource | Limit | Cost |
|----------|-------|------|
| Bandwidth | 100 GB/month | Free |
| Serverless Executions | 100 GB-Hrs | Free |
| Build Time | 6,000 minutes | Free |
| Deployments | Unlimited | Free |

### AI API Costs (Typical Educational Use):

| Provider | Model | Cost per 1M tokens | 100 questions (~20K tokens) |
|----------|-------|-------------------|----------------------------|
| OpenAI | GPT-4o-mini | Input: $0.15, Output: $0.60 | ~$0.02 |
| Anthropic | Claude 3.5 Haiku | Input: $0.25, Output: $1.25 | ~$0.03 |
| Google | Gemini 1.5 Flash | Input: $0.075, Output: $0.30 | ~$0.01 |

**For 20 students, 10 questions each = ~$0.40/month** 💸

**Totally feasible for educational research!**

## 🧪 Local Development

### Run locally with Vercel Dev Server:

```bash
# Install Vercel CLI
npm install -g vercel

# Run dev server (simulates Vercel environment)
vercel dev

# Or use regular Vite dev
npm run dev
```

### Create `.env.local` for local development:

```bash
# .env.local (DO NOT COMMIT)
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=sk-proj-dev-key
ANTHROPIC_API_KEY=sk-ant-dev-key
GOOGLE_AI_API_KEY=your-google-key
```

**Important:** Use separate API keys for development!

## 🚨 Troubleshooting

### "Environment variables not found"

**Solution:**
1. Verify variables are added in Vercel Dashboard
2. Check spelling (exact match required)
3. Redeploy after adding variables
4. Clear browser cache

### "API route not found" (404)

**Solution:**
1. Verify `vercel.json` is in root directory
2. Check `api/` folder exists with `generate-responses.ts`
3. Ensure `@vercel/node` is installed
4. Redeploy project

### "CORS errors"

**Solution:**
- Already handled in `api/generate-responses.ts`
- Check headers are set correctly
- Verify Vercel deployment completed

### "OpenAI API error"

**Solution:**
1. Verify API key is correct
2. Check OpenAI account has credits
3. Ensure key hasn't expired
4. Check usage limits in OpenAI dashboard

### "Deployment failed"

**Solution:**
```bash
# Check build locally first
npm run build

# If build succeeds, check Vercel logs
vercel logs

# Redeploy
vercel --prod
```

## 📊 Monitoring Usage

### OpenAI Dashboard:
1. Go to [platform.openai.com/usage](https://platform.openai.com/usage)
2. View usage by day
3. Set spending limits: Settings → Billing → Usage limits

### Vercel Analytics:
1. Go to your project in Vercel Dashboard
2. Click **Analytics** tab
3. View serverless function invocations
4. Monitor bandwidth usage

## 🔄 Updating API Keys

### To rotate keys (recommended every 3-6 months):

1. Generate new key in OpenAI dashboard
2. Go to Vercel Dashboard → Settings → Environment Variables
3. Click on `OPENAI_API_KEY`
4. Click **"Edit"**
5. Paste new key
6. Click **"Save"**
7. Redeploy (Deployments → ... → Redeploy)

**No code changes needed!** ✨

## ✅ Deployment Checklist

Before going live, verify:

- [ ] Pushed latest code to GitHub
- [ ] Vercel project created and linked
- [ ] All environment variables added
- [ ] `VITE_SUPABASE_URL` set
- [ ] `VITE_SUPABASE_ANON_KEY` set
- [ ] `OPENAI_API_KEY` set (production only)
- [ ] Optional: `ANTHROPIC_API_KEY` set
- [ ] Optional: `GOOGLE_AI_API_KEY` set
- [ ] Redeployed after adding env vars
- [ ] Tested with real question
- [ ] Verified real AI responses (not mock)
- [ ] Checked browser console for errors
- [ ] Verified API keys not visible in browser
- [ ] Set OpenAI usage limits
- [ ] Documented deployment for team

## 🎓 Best Practices

### ✅ DO:

1. **Use Production Environment** for API keys
2. **Set Usage Limits** in OpenAI dashboard
3. **Monitor Costs** weekly
4. **Rotate Keys** every 3-6 months
5. **Use .env.local** for local dev (gitignored)
6. **Test Locally** before deploying
7. **Check Logs** in Vercel dashboard
8. **Set Budget Alerts** in OpenAI

### ❌ DON'T:

1. **Don't commit** `.env` or `.env.local` files
2. **Don't use** production keys locally
3. **Don't share** deployment URLs publicly (yet)
4. **Don't skip** environment variable setup
5. **Don't forget** to redeploy after env changes
6. **Don't ignore** usage monitoring
7. **Don't use** expired API keys

## 🚀 Advanced: Custom Domain

Once working, add a custom domain:

1. Buy domain (e.g., from Namecheap, GoDaddy)
2. Vercel Dashboard → Settings → Domains
3. Click **"Add"**
4. Enter your domain: `nexus-research.com`
5. Follow DNS configuration instructions
6. Wait for DNS propagation (~24 hours)
7. HTTPS automatically configured! 🎉

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Environment Variables Guide](https://vercel.com/docs/concepts/projects/environment-variables)
- [Vercel Serverless Functions](https://vercel.com/docs/serverless-functions/introduction)
- [OpenAI API Best Practices](https://platform.openai.com/docs/guides/production-best-practices)

## 🎉 You're All Set!

Your Nexus platform is now:
- ✅ Deployed on Vercel
- ✅ API keys secure
- ✅ Auto-deploys on git push
- ✅ HTTPS enabled
- ✅ Production-ready
- ✅ Cost-effective

**Share your Vercel URL with students and start collecting AI evaluation data!** 🎓

---

## Quick Commands Reference

```bash
# Deploy to Vercel
vercel --prod

# Run locally
npm run dev

# View logs
vercel logs

# List deployments
vercel ls

# Check domains
vercel domains ls

# Pull env vars locally (for team)
vercel env pull .env.local
```
