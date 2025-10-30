# Secure API Key Setup Guide

## 🔒 Why This Matters

**Current Problem:**
- API keys stored in browser localStorage (INSECURE ❌)
- Anyone can inspect browser and steal keys
- Keys exposed to client-side code

**Secure Solution:**
- API keys stored in Supabase secrets (SECURE ✅)
- Backend Edge Function makes API calls
- Keys never exposed to browser
- Professional, production-ready setup

## 📋 Setup Methods

We provide **TWO** secure methods. Choose based on your needs:

### Method 1: Supabase Edge Functions (Recommended)
✅ Most secure
✅ Serverless, auto-scaling
✅ Built into Supabase
✅ Easy deployment

### Method 2: Environment Variables (.env)
✅ Traditional approach
✅ Works with any backend
✅ Good for Node.js servers
⚠️ Requires separate backend

---

## Method 1: Supabase Edge Functions Setup

### Step 1: Install Supabase CLI

**Windows:**
```powershell
# Install via Scoop
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Mac/Linux:**
```bash
# Install via Homebrew
brew install supabase/tap/supabase
```

**Alternative (All Platforms):**
```bash
# Install via npm
npm install -g supabase
```

Verify installation:
```bash
supabase --version
```

### Step 2: Login to Supabase

```bash
supabase login
```

This will open your browser to authenticate.

### Step 3: Link Your Project

```bash
cd C:\Users\Novaf\Desktop\nexus
supabase link --project-ref YOUR_PROJECT_REF
```

**Find your project ref:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Open your project
3. Settings → General → Project ID (copy this)

### Step 4: Deploy the Edge Function

```bash
supabase functions deploy generate-ai-responses
```

### Step 5: Add API Keys as Secrets

**OpenAI (Required for GPT):**
```bash
supabase secrets set OPENAI_API_KEY=sk-proj-your-actual-key-here
```

**Anthropic (Optional for Claude):**
```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
```

**Google AI (Optional for Gemini):**
```bash
supabase secrets set GOOGLE_AI_API_KEY=your-google-ai-key-here
```

### Step 6: Redeploy After Setting Secrets

```bash
supabase functions deploy generate-ai-responses
```

### Step 7: Get Your Edge Function URL

After deployment, you'll see:
```
Deployed Function: generate-ai-responses
URL: https://your-project.supabase.co/functions/v1/generate-ai-responses
```

Copy this URL!

### Step 8: Update Frontend Code

Open `src/services/aiService.ts` and replace the entire content with:

```typescript
import { supabase } from '../lib/supabase';

interface AIResponse {
  model_name: string;
  content: string;
  error?: string;
}

export const generateAIResponses = async (query: string): Promise<AIResponse[]> => {
  try {
    // Get Supabase URL from environment
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    // Call Edge Function
    const response = await fetch(
      `${supabaseUrl}/functions/v1/generate-ai-responses`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({ query })
      }
    );

    if (!response.ok) {
      throw new Error('Failed to generate responses');
    }

    const data = await response.json();
    return data.responses;
  } catch (error) {
    console.error('Error calling Edge Function:', error);
    throw error;
  }
};
```

### Step 9: Remove Old Admin Panel API Key Storage

The Admin Panel API Keys tab is now for display/documentation only. Remove localStorage storage:

Open `src/pages/Admin.tsx` and update the API Keys section to show instructions instead.

### Step 10: Test

1. Go to Dashboard
2. Submit a question
3. Check browser console for logs
4. Verify you get real API responses (not mock)

---

## Method 2: Environment Variables (.env) Setup

### Step 1: Create .env File

Create `.env` in your project root:

```bash
# DO NOT COMMIT THIS FILE TO GIT!
# Add .env to .gitignore

# Supabase Configuration (Already set)
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key

# AI API Keys (SECURE - Server Side Only)
OPENAI_API_KEY=sk-proj-your-actual-key-here
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
GOOGLE_AI_API_KEY=your-google-ai-key-here
```

### Step 2: Update .gitignore

```bash
# Add to .gitignore
.env
.env.local
.env.production
```

### Step 3: Create Backend API

You'll need a separate Node.js backend. Example using Express:

**backend/server.js:**
```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post('/api/generate-responses', async (req, res) => {
  const { query, systemPrompt } = req.body;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt.prompt_text },
        { role: 'user', content: query }
      ],
      max_tokens: systemPrompt.max_tokens,
      temperature: systemPrompt.temperature
    });

    res.json({
      content: completion.choices[0].message.content
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001, () => {
  console.log('Backend running on http://localhost:3001');
});
```

### Step 4: Deploy Backend

Deploy to:
- **Heroku** (Easy, free tier)
- **Railway** (Modern, easy)
- **DigitalOcean** (More control)
- **Vercel** (Serverless functions)

---

## 🔐 Security Best Practices

### ✅ DO:
- Use Supabase Edge Functions or backend API
- Store keys in secrets/environment variables
- Add `.env` to `.gitignore`
- Never commit API keys to Git
- Rotate keys regularly
- Use Row Level Security (RLS) in Supabase
- Validate user authentication before API calls

### ❌ DON'T:
- Store API keys in localStorage
- Commit `.env` files to GitHub
- Hardcode API keys in frontend code
- Share API keys in chat/email
- Use production keys for testing
- Expose keys in client-side code

---

## 📊 Cost Comparison

### Current (Insecure) Approach:
- 💰 Cost: $0 (but insecure)
- ⚠️ Risk: HIGH - Keys can be stolen

### Secure Approach:
- 💰 Cost: Same as before (API usage only)
- ✅ Risk: LOW - Keys are protected
- 🎉 Bonus: Professional, production-ready

### Edge Function Costs:
- Free tier: 500,000 invocations/month
- Beyond: $2 per 1M invocations
- For educational use: **Essentially FREE**

---

## 🧪 Testing Your Setup

### Test Edge Function Locally:
```bash
supabase functions serve generate-ai-responses
```

### Test with curl:
```bash
curl -i --location --request POST \
  'http://localhost:54321/functions/v1/generate-ai-responses' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"query":"What is AI?"}'
```

### Test in Production:
```bash
curl -i --location --request POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/generate-ai-responses' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"query":"What is AI?"}'
```

---

## 🚨 Troubleshooting

### "Function not found"
```bash
# List deployed functions
supabase functions list

# Redeploy
supabase functions deploy generate-ai-responses
```

### "Secrets not working"
```bash
# List secrets
supabase secrets list

# Set secrets again
supabase secrets set OPENAI_API_KEY=your-key

# Redeploy function
supabase functions deploy generate-ai-responses
```

### "CORS errors"
- Check if Edge Function has CORS headers (already included)
- Verify Supabase URL in environment variables

### "Authentication failed"
- Ensure user is logged in
- Check Supabase session is valid
- Verify RLS policies allow access

---

## 📚 Additional Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Managing Secrets](https://supabase.com/docs/guides/functions/secrets)
- [OpenAI API Best Practices](https://platform.openai.com/docs/guides/production-best-practices)
- [Environment Variables Guide](https://vitejs.dev/guide/env-and-mode.html)

---

## ✅ Checklist

Use this checklist to ensure secure setup:

- [ ] Supabase CLI installed
- [ ] Logged into Supabase
- [ ] Project linked
- [ ] Edge Function deployed
- [ ] API keys added as secrets
- [ ] Function redeployed after secrets
- [ ] Frontend updated to call Edge Function
- [ ] Removed localStorage API key storage
- [ ] `.env` added to `.gitignore` (if using)
- [ ] Tested with real API calls
- [ ] Verified keys not exposed in browser
- [ ] Documented setup for team

---

## 🎯 Next Steps

After completing this setup:

1. **Remove localStorage API keys** - No longer needed
2. **Update Admin Panel** - Show Edge Function status instead
3. **Monitor usage** - Check Supabase dashboard for function invocations
4. **Set up alerts** - Monitor API costs in OpenAI dashboard
5. **Add rate limiting** - Prevent abuse of your Edge Function

Your API keys are now secure! 🎉
