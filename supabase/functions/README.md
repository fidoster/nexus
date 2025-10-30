# Supabase Edge Functions

This directory contains Edge Functions for secure server-side operations.

## Functions

### `generate-ai-responses`

Securely handles AI API calls with API keys stored in Supabase secrets.

**Purpose:**
- Keeps API keys secure (never exposed to browser)
- Makes API calls to OpenAI, Anthropic, and Google AI
- Uses active system prompt from database
- Returns responses to client

**Deployment:**

```bash
# Deploy function
supabase functions deploy generate-ai-responses

# Set API keys as secrets
supabase secrets set OPENAI_API_KEY=sk-proj-xxx
supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxx
supabase secrets set GOOGLE_AI_API_KEY=xxx

# Redeploy after setting secrets
supabase functions deploy generate-ai-responses
```

**Usage:**

```typescript
const response = await fetch(
  'https://YOUR_PROJECT.supabase.co/functions/v1/generate-ai-responses',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_SESSION_TOKEN',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: 'What is AI?' })
  }
);

const data = await response.json();
// data.responses: Array of { model_name, content, error? }
```

**Testing Locally:**

```bash
# Start local Edge Function server
supabase functions serve generate-ai-responses

# Test with curl
curl -i --location --request POST \
  'http://localhost:54321/functions/v1/generate-ai-responses' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"query":"What is AI?"}'
```

## Documentation

See [docs/SECURE_API_KEY_SETUP.md](../../docs/SECURE_API_KEY_SETUP.md) for complete setup instructions.
