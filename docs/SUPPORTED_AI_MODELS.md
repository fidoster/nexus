# Supported AI Models - Complete Guide

Nexus now supports **7 different AI providers** for comprehensive model evaluation!

## 🤖 Supported Models

| Provider | Model | Speed | Cost | Best For |
|----------|-------|-------|------|----------|
| **OpenAI** | GPT-4o-mini | Fast | $0.15/1M tokens | General purpose, reliable |
| **Anthropic** | Claude 3.5 Haiku | Fast | $0.25/1M tokens | Complex reasoning, long context |
| **Google** | Gemini 1.5 Flash | Very Fast | **FREE** | Free tier, multimodal |
| **DeepSeek** | DeepSeek Chat | Fast | $0.14/1M tokens | **Cheapest**, code-focused |
| **Mistral** | Mistral Small | Fast | $0.20/1M tokens | European AI, efficient |
| **Groq** | Llama 3.3 70B | **Blazing Fast** | $0.59/1M tokens | Speed matters, real-time |
| **Perplexity** | Sonar Small | Fast | $0.20/1M tokens | Search-augmented, factual |

---

## 📋 How to Add API Keys to Vercel

### Step 1: Get API Keys

**For each service you want to use:**

#### 1. OpenAI (GPT-4o-mini) - Recommended ✅
**Website:** https://platform.openai.com/api-keys
**Steps:**
1. Sign up / Log in
2. Click "Create new secret key"
3. Name it: "Nexus Production"
4. Copy key: `sk-proj-...`

**Pricing:** ~$0.15 per 1,000 evaluations
**Best for:** General-purpose, reliable responses

---

#### 2. Anthropic (Claude 3.5 Haiku) - Recommended ✅
**Website:** https://console.anthropic.com/settings/keys
**Steps:**
1. Sign up / Log in
2. Click "Create Key"
3. Name it: "Nexus Production"
4. Copy key: `sk-ant-...`

**Pricing:** ~$0.25 per 1,000 evaluations
**Best for:** Complex reasoning, long context, safety

---

#### 3. Google AI (Gemini 1.5 Flash) - FREE! ✅
**Website:** https://aistudio.google.com/app/apikey
**Steps:**
1. Sign in with Google account
2. Click "Create API key"
3. Copy key: `AIzaSy...`

**Pricing:** **FREE** (up to 1,500 requests/day)
**Best for:** Budget-conscious, multimodal

---

#### 4. DeepSeek (DeepSeek Chat) - CHEAPEST! ✅
**Website:** https://platform.deepseek.com/api-keys
**Steps:**
1. Sign up / Log in
2. Create API key
3. Copy key: `sk-...`

**Pricing:** ~$0.14 per 1,000 evaluations (cheapest!)
**Best for:** Code generation, math, logic
**Note:** Chinese AI startup, very cost-effective

---

#### 5. Mistral (Mistral Small)
**Website:** https://console.mistral.ai/api-keys
**Steps:**
1. Sign up / Log in
2. Create API key
3. Copy key: Starts with unique format

**Pricing:** ~$0.20 per 1,000 evaluations
**Best for:** European AI, GDPR compliant, multilingual
**Note:** French AI company, excellent for European users

---

#### 6. Groq (Llama 3.3 70B) - FASTEST! ⚡
**Website:** https://console.groq.com/keys
**Steps:**
1. Sign up / Log in
2. Create API key
3. Copy key: `gsk_...`

**Pricing:** ~$0.59 per 1,000 evaluations
**Best for:** When speed matters most
**Note:** Uses custom chips for blazing-fast inference (500+ tokens/sec!)

---

#### 7. Perplexity (Sonar Small)
**Website:** https://www.perplexity.ai/settings/api
**Steps:**
1. Sign up for Perplexity Pro
2. Go to API settings
3. Generate API key
4. Copy key: `pplx-...`

**Pricing:** ~$0.20 per 1,000 evaluations
**Best for:** Search-augmented responses, up-to-date info
**Note:** Searches the web, provides citations

---

## 🚀 Step 2: Add Keys to Vercel

### In Vercel Dashboard:

1. Go to: **Settings** → **Environment Variables**
2. Click **"Add New"**
3. Add these variables (only add the ones you want to use):

```
# Core Models (Recommended - add at least 3)
OPENAI_API_KEY=sk-proj-your-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here
GOOGLE_AI_API_KEY=AIzaSy-your-key-here

# Additional Models (Optional)
DEEPSEEK_API_KEY=sk-your-deepseek-key
MISTRAL_API_KEY=your-mistral-key
GROQ_API_KEY=gsk-your-groq-key
PERPLEXITY_API_KEY=pplx-your-key
```

4. **For each variable:**
   - Name: Exactly as shown above
   - Value: Your actual API key
   - Environments: ✅ Select ALL (Production, Preview, Development)
   - Click "Save"

5. **Redeploy** your application (usually automatic)

---

## 💰 Cost Comparison

### For 1,000 Student Evaluations (3 models each):

| Combination | Total Cost | Why Choose This? |
|-------------|-----------|------------------|
| **Budget** (Gemini + DeepSeek + Mistral) | **$0.34** | Cheapest option |
| **Recommended** (GPT + Claude + Gemini) | **$0.40** | Best balance |
| **Speed** (Groq + GPT + Claude) | **$0.99** | Fastest responses |
| **All 7 Models** | **$1.73** | Maximum diversity |

### Monthly Costs (assuming 10,000 evaluations/month):

- **Budget**: ~$3.40/month
- **Recommended**: ~$4.00/month
- **Speed**: ~$9.90/month
- **All 7**: ~$17.30/month

**💡 Tip:** Start with 3-4 models, expand later if needed.

---

## 🎯 Recommended Combinations

### For Research (Maximum Diversity):
```bash
OPENAI_API_KEY=...      # GPT-4o-mini
ANTHROPIC_API_KEY=...   # Claude
GOOGLE_AI_API_KEY=...   # Gemini
DEEPSEEK_API_KEY=...    # DeepSeek
```
**Why:** Covers US, Chinese, and European AI, different architectures

---

### For Budget (Minimal Cost):
```bash
GOOGLE_AI_API_KEY=...   # Gemini (FREE!)
DEEPSEEK_API_KEY=...    # DeepSeek (cheapest)
MISTRAL_API_KEY=...     # Mistral (efficient)
```
**Why:** Total cost ~$0.34 per 1,000 evaluations

---

### For Speed (Real-time):
```bash
GROQ_API_KEY=...        # Groq (500+ tokens/sec!)
OPENAI_API_KEY=...      # GPT (fast)
GOOGLE_AI_API_KEY=...   # Gemini (very fast)
```
**Why:** All optimized for low latency

---

### For Quality (Best Responses):
```bash
OPENAI_API_KEY=...      # GPT-4o-mini (reliable)
ANTHROPIC_API_KEY=...   # Claude 3.5 Haiku (smart)
MISTRAL_API_KEY=...     # Mistral Small (efficient)
```
**Why:** Highest quality, most reliable

---

## 🔧 How It Works

### When a student submits a query:

```
1. Nexus calls your Vercel serverless function
2. Function checks which API keys are available
3. For each available key:
   - Calls that AI provider's API
   - Gets response
   - Adds to comparison
4. If no key: Returns mock/demo response
5. Responses randomized and shown as Model A/B/C/etc
```

### What students see:
- **Model A**: [AI response]
- **Model B**: [AI response]
- **Model C**: [AI response]

They don't know which is GPT, Claude, DeepSeek, etc. - completely blind!

---

## 🌟 Model Characteristics

### OpenAI GPT-4o-mini
- ✅ Very reliable and consistent
- ✅ Good at following instructions
- ✅ Balanced cost/performance
- ✅ Wide knowledge base
- ❌ Can be verbose sometimes

### Anthropic Claude 3.5 Haiku
- ✅ Excellent reasoning capabilities
- ✅ Very safe and ethical
- ✅ Great for complex queries
- ✅ Long context window
- ❌ Slightly more expensive

### Google Gemini 1.5 Flash
- ✅ Completely FREE (with limits)
- ✅ Very fast responses
- ✅ Multimodal (can handle images)
- ✅ Good general knowledge
- ❌ Sometimes less detailed

### DeepSeek Chat
- ✅ CHEAPEST option
- ✅ Excellent at code/math
- ✅ Strong logical reasoning
- ✅ Good value for money
- ❌ Less known in West

### Mistral Small
- ✅ European AI (GDPR compliant)
- ✅ Efficient and fast
- ✅ Good multilingual support
- ✅ Cost-effective
- ❌ Smaller model = less nuanced

### Groq Llama 3.3 70B
- ✅ BLAZING FAST (500+ tokens/sec!)
- ✅ Great for real-time apps
- ✅ Large model (70B parameters)
- ✅ Open-source model (Llama)
- ❌ More expensive for speed

### Perplexity Sonar Small
- ✅ Web search integration
- ✅ Up-to-date information
- ✅ Provides citations
- ✅ Great for factual queries
- ❌ Requires Pro subscription

---

## 🛡️ Security & Privacy

### All API keys are:
- ✅ Stored on Vercel servers (not in user browsers)
- ✅ Never exposed to students
- ✅ Encrypted by Vercel
- ✅ Only accessible by your serverless function

### Students:
- ❌ Cannot see API keys
- ❌ Cannot extract keys from DevTools
- ❌ Cannot abuse your keys
- ✅ Just submit queries and get responses

---

## 📊 How to Choose

### Ask yourself:

**Budget most important?**
→ Use Gemini (FREE) + DeepSeek (cheapest) + Mistral

**Research quality most important?**
→ Use GPT + Claude + Gemini + DeepSeek (diversity)

**Speed most important?**
→ Use Groq + Gemini + GPT (all fast)

**Just testing?**
→ Start with GPT + Gemini (reliable + free)

**Maximum models for blind testing?**
→ Use all 7! (~$17/month for 10k evaluations)

---

## 🔄 Adding/Removing Models

### To add a new model:
1. Get API key from provider
2. Go to Vercel → Settings → Environment Variables
3. Add new variable (e.g., `DEEPSEEK_API_KEY`)
4. Redeploy (automatic)
5. ✅ Now students will see one more model in comparisons

### To remove a model:
1. Go to Vercel → Settings → Environment Variables
2. Delete the variable (e.g., `GROQ_API_KEY`)
3. Redeploy (automatic)
4. ✅ That model will show mock responses instead

### To change a model's API key:
1. Go to Vercel → Settings → Environment Variables
2. Click "Edit" on the variable
3. Update the value
4. Save
5. ✅ New key active immediately (or after redeploy)

---

## 🚨 Troubleshooting

### Problem: "Still getting mock responses"

**Solutions:**
1. Check environment variable name is EXACTLY right
   - ✅ `OPENAI_API_KEY` (correct)
   - ❌ `OPEN_AI_KEY` (wrong)
2. Verify key format:
   - OpenAI: `sk-proj-...` or `sk-...`
   - Anthropic: `sk-ant-...`
   - Google: `AIzaSy...`
   - DeepSeek: `sk-...`
   - Groq: `gsk_...`
   - Perplexity: `pplx-...`
3. Check API key has credits
4. Redeploy after adding keys

### Problem: "Error calling API"

**Solutions:**
1. Verify API key is valid (not expired/revoked)
2. Check you have credits on provider dashboard
3. Ensure you're not hitting rate limits
4. Check provider status page for outages

### Problem: "Some models work, others don't"

**Solution:**
- This is normal! Only models with valid API keys will work
- Others show mock responses
- Add more API keys to enable more models

---

## 💡 Pro Tips

### 1. Start Small
Don't add all 7 models at once. Start with 3-4:
- GPT (reliable)
- Claude (smart)
- Gemini (free)
- DeepSeek (cheap)

### 2. Set Usage Limits
On each provider dashboard, set monthly spending limits:
- Prevents surprise bills
- Get alerts when approaching limit

### 3. Monitor Costs
Check usage weekly:
- OpenAI: https://platform.openai.com/usage
- Anthropic: https://console.anthropic.com/settings/billing
- Others: Check their dashboards

### 4. Use Different Keys for Dev/Prod
- Development: Use separate keys with lower limits
- Production: Use keys with higher limits
- If dev key leaks, production isn't affected

### 5. Rotate Keys Quarterly
- Change API keys every 90 days
- Best practice for security
- Easy to do in Vercel Dashboard

---

## 📚 Additional Resources

- **Vercel Environment Variables:** https://vercel.com/docs/environment-variables
- **OpenAI Pricing:** https://openai.com/api/pricing/
- **Anthropic Pricing:** https://www.anthropic.com/pricing
- **Google AI Pricing:** https://ai.google.dev/pricing
- **DeepSeek Docs:** https://platform.deepseek.com/
- **Mistral Docs:** https://docs.mistral.ai/
- **Groq Docs:** https://console.groq.com/docs
- **Perplexity API:** https://docs.perplexity.ai/

---

## ✅ Quick Start Checklist

- [ ] Choose which models you want (recommend 3-4)
- [ ] Get API keys from those providers
- [ ] Add keys to Vercel Environment Variables
- [ ] Select all 3 environments for each
- [ ] Redeploy your application
- [ ] Test with a query
- [ ] Verify real responses (not mock)
- [ ] Set usage limits on provider dashboards
- [ ] Monitor costs weekly

---

## 🎓 Summary

**Nexus now supports 7 AI providers:**
1. OpenAI (GPT-4o-mini) - Reliable
2. Anthropic (Claude 3.5 Haiku) - Smart
3. Google (Gemini 1.5 Flash) - FREE
4. DeepSeek (DeepSeek Chat) - CHEAPEST
5. Mistral (Mistral Small) - European
6. Groq (Llama 3.3 70B) - FASTEST
7. Perplexity (Sonar Small) - Search-augmented

**Cost:** $0.34 - $1.73 per 1,000 evaluations (depending on which models you use)

**Setup:** Add API keys to Vercel Environment Variables

**Security:** Keys stay on server, students never see them

**Flexibility:** Enable/disable models anytime by adding/removing keys

---

**Ready to add more models? Follow the steps above and expand your AI evaluation platform!** 🚀
