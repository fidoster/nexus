// Supabase Edge Function for secure AI API calls
// This function runs on Supabase servers, keeping API keys secure
// Deploy with: supabase functions deploy generate-ai-responses

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SystemPrompt {
  prompt_text: string
  max_tokens: number
  temperature: number
}

interface AIResponse {
  model_name: string
  content: string
  error?: string
}

// Call OpenAI API
async function callOpenAI(query: string, systemPrompt: SystemPrompt, apiKey: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt.prompt_text },
        { role: 'user', content: query }
      ],
      max_tokens: systemPrompt.max_tokens,
      temperature: systemPrompt.temperature
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'OpenAI API error')
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || 'No response generated'
}

// Call Anthropic API
async function callAnthropic(query: string, systemPrompt: SystemPrompt, apiKey: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: systemPrompt.max_tokens,
      temperature: systemPrompt.temperature,
      system: systemPrompt.prompt_text,
      messages: [{ role: 'user', content: query }]
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Anthropic API error')
  }

  const data = await response.json()
  return data.content[0]?.text || 'No response generated'
}

// Call Google AI API
async function callGoogleAI(query: string, systemPrompt: SystemPrompt, apiKey: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `${systemPrompt.prompt_text}\n\nUser query: ${query}` }]
        }],
        generationConfig: {
          temperature: systemPrompt.temperature,
          maxOutputTokens: systemPrompt.max_tokens,
        }
      })
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Google AI API error')
  }

  const data = await response.json()
  return data.candidates[0]?.content?.parts[0]?.text || 'No response generated'
}

// Mock response for missing API keys
function getMockResponse(modelName: string, query: string): string {
  return `This is a demo response from ${modelName}. To enable real AI responses, configure API keys in Supabase secrets.

Your question: "${query.substring(0, 100)}..."

Configure API keys:
1. Go to Supabase Dashboard → Project Settings → Edge Functions → Secrets
2. Add secrets: OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_AI_API_KEY
3. Redeploy this Edge Function`
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get request body
    const { query } = await req.json()

    if (!query || typeof query !== 'string') {
      throw new Error('Query text is required')
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get active system prompt
    const { data: promptData, error: promptError } = await supabase
      .from('system_prompts')
      .select('prompt_text, max_tokens, temperature')
      .eq('is_active', true)
      .maybeSingle()

    const systemPrompt: SystemPrompt = promptData || {
      prompt_text: 'You are a helpful AI assistant. Provide clear, accurate, and concise responses.',
      max_tokens: 500,
      temperature: 0.7
    }

    // Get API keys from Supabase secrets (set via Dashboard)
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    const googleKey = Deno.env.get('GOOGLE_AI_API_KEY')

    const responses: AIResponse[] = []

    // Process each model
    const models = [
      { name: 'GPT', key: openaiKey, call: callOpenAI },
      { name: 'Claude', key: anthropicKey, call: callAnthropic },
      { name: 'Gemini', key: googleKey, call: callGoogleAI }
    ]

    for (const model of models) {
      if (model.key) {
        try {
          console.log(`Calling ${model.name} API...`)
          const content = await model.call(query, systemPrompt, model.key)
          responses.push({ model_name: model.name, content })
          console.log(`✅ ${model.name} response received`)
        } catch (error: any) {
          console.error(`❌ ${model.name} error:`, error.message)
          responses.push({
            model_name: model.name,
            content: getMockResponse(model.name, query),
            error: error.message
          })
        }
      } else {
        console.log(`ℹ️ ${model.name}: No API key, using mock`)
        responses.push({
          model_name: model.name,
          content: getMockResponse(model.name, query)
        })
      }
    }

    return new Response(
      JSON.stringify({ responses }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Edge Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
