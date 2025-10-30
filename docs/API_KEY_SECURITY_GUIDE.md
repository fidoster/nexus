# API Key Security Guide for Nexus

## ⚠️ CRITICAL: Why API Key Security Matters

**Your API keys give access to paid services (OpenAI, Anthropic, Google AI).**
- If exposed, anyone can steal them
- Attackers can rack up thousands of dollars in charges
- You are responsible for all API usage on your keys

## 🔒 Recommended Setup: Vercel Environment Variables

### Why This is the Safest Approach

**✅ Keys stay on the server** - Never sent to user's browser
**✅ Industry standard** - Used by all production SaaS apps
**✅ You control costs** - Users can't abuse your keys
**✅ Easy to manage** - Change keys without code changes
**✅ Free** - No additional cost on Vercel's free tier

### How It Works

```
User Browser (Client)
    ↓
    Calls: /api/generate-responses
    ↓
Vercel Serverless Function (Server)
    ↓ (API keys from environment variables)
    Calls: OpenAI/Anthropic/Google APIs
    ↓
    Returns responses to client
```

**Key Point:** API keys never leave the Vercel server. Users only talk to YOUR API, not directly to OpenAI/Claude/Gemini.

## 🚀 Setup Instructions

### Step 1: Deploy to Vercel

1. **Push your code to GitHub** (already done)
2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Click "Deploy"

### Step 2: Add Environment Variables in Vercel Dashboard

1. **Go to your project on Vercel**
2. **Settings → Environment Variables**
3. **Add these variables**:

```
# Required - Supabase credentials
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional - AI API Keys (add only the ones you want to use)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...
```

4. **Apply to all environments**: Production, Preview, Development
5. **Redeploy** your application

### Step 3: How to Get API Keys

#### OpenAI (GPT-4o-mini)
1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up or log in
3. Go to API Keys section
4. Create new key
5. Copy and save securely
6. **Pricing**: ~$0.15 per 1M input tokens

#### Anthropic (Claude 3.5 Haiku)
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in
3. Go to API Keys section
4. Create new key
5. Copy and save securely
6. **Pricing**: ~$0.25 per 1M input tokens

#### Google AI (Gemini 1.5 Flash)
1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Get API key
3. Copy and save securely
4. **Pricing**: Free tier available

### Step 4: Verify Security

After deployment, test that keys are secure:

1. **Open your deployed app**
2. **Open Browser DevTools** (F12)
3. **Go to Network tab**
4. **Submit a query**
5. **Check the requests**:
   - ✅ You should see a call to `/api/generate-responses`
   - ✅ You should NOT see calls to `api.openai.com` or `api.anthropic.com`
   - ✅ API keys should NOT appear anywhere in Network tab
   - ✅ Check Application → Local Storage → No API keys stored

## 🔐 Security Best Practices

### DO ✅

- Store API keys in Vercel Environment Variables
- Use Vercel serverless functions to call AI APIs
- Rotate API keys regularly
- Set usage limits on your API provider dashboards
- Monitor API usage for unusual patterns
- Use separate keys for development vs production

### DON'T ❌

- Never commit API keys to git
- Never store keys in localStorage or cookies
- Never expose keys in client-side JavaScript
- Never share keys publicly (Discord, GitHub Issues, etc.)
- Never use the same key across multiple projects

## 🛠️ Admin Panel API Key Management

### Current Implementation (For Reference Only)

The Admin Panel has an "API Keys" tab that stores keys in localStorage.

**⚠️ This is for REFERENCE/DEMO purposes only and should NOT be used in production.**

### Recommended Admin Workflow

**As the admin, you should:**

1. **Get API keys from providers** (OpenAI, Anthropic, Google)
2. **Add them to Vercel Environment Variables** (Settings → Environment Variables)
3. **Redeploy** your application
4. **Users can now use the app** without needing API keys
5. **You control costs** by monitoring usage on provider dashboards

**Users should:**
- Just use the app normally
- They never see or handle API keys
- They submit queries → get AI responses
- All API calls happen server-side

## 💰 Cost Management

### Expected Costs (per 1000 evaluations)

Assuming average query + response = 1000 tokens:

- **OpenAI (GPT-4o-mini)**: ~$0.15
- **Anthropic (Claude 3.5 Haiku)**: ~$0.25
- **Google (Gemini 1.5 Flash)**: Free tier covers it

**Total per 1000 evaluations**: ~$0.40

### Cost Protection Strategies

1. **Set usage limits** on provider dashboards:
   - OpenAI: Set monthly spending limit
   - Anthropic: Set usage notifications
   - Google: Use free tier quota

2. **Monitor usage**:
   - Check provider dashboards daily
   - Set up billing alerts
   - Review usage logs

3. **Rate limiting** (optional):
   - Add rate limits to your Vercel function
   - Example: 10 queries per user per hour

## 🔄 Rotating API Keys

**When to rotate:**
- Every 90 days (recommended)
- If key might be compromised
- When employee/collaborator leaves

**How to rotate:**
1. Generate new key on provider dashboard
2. Update Vercel environment variable
3. Redeploy (or just update, Vercel auto-refreshes)
4. Delete old key from provider
5. Monitor for any errors

## 🚨 If API Key is Compromised

**Immediate actions:**

1. **Revoke the key** on provider dashboard immediately
2. **Check usage** for unauthorized charges
3. **Generate new key**
4. **Update Vercel environment variables**
5. **File dispute** with provider if fraudulent charges
6. **Review access logs** to understand how it leaked

## 📊 Monitoring & Alerts

### Set up alerts on provider dashboards:

**OpenAI:**
- Settings → Limits → Set soft and hard limits
- Billing → Usage notifications

**Anthropic:**
- Usage → Set alerts for unusual patterns
- Billing → Spending notifications

**Google:**
- Cloud Console → Set quota alerts
- Billing → Budget alerts

## ❓ FAQ

### Q: Can users see my API keys?
**A:** No, if you use Vercel environment variables correctly. Keys stay on the server.

### Q: What if I don't add API keys?
**A:** The app will return mock/demo responses. Real AI responses require keys.

### Q: Can I use different keys for different users?
**A:** Not with this setup. All users share your keys. For multi-tenant, you'd need user-specific keys and per-user billing.

### Q: Is this free?
**A:** Vercel hosting is free. You pay for actual API usage to OpenAI/Claude/Gemini.

### Q: What happens if I run out of API credits?
**A:** API calls will fail. The app shows error messages. Top up credits on provider dashboard.

### Q: Can I disable certain models?
**A:** Yes, just don't add the API key for that model. The serverless function will return mock responses.

### Q: How do I track which users are causing high usage?
**A:** Add logging to the Vercel function to track user IDs and query counts.

## 📝 Summary

**For Production (Recommended):**
```
Store: Vercel Environment Variables
Security: ✅✅✅✅✅ (5/5) - Industry standard
Cost: Free (Vercel free tier)
Admin effort: Low (just set once)
User experience: Seamless
```

**Current Implementation (localStorage):**
```
Store: Browser localStorage
Security: ❌❌❌❌❌ (0/5) - Completely insecure
Cost: Free
Admin effort: High (each admin needs keys)
User experience: Poor (admins need to configure)
```

## ✅ Recommended: Switch to Vercel Environment Variables

Your app is already configured for this! Just:
1. Deploy to Vercel
2. Add environment variables
3. Done! Keys are secure.

---

**Need help?** Check the Vercel deployment guide: `docs/VERCEL_DEPLOYMENT_GUIDE.md`
