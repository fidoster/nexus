/**
 * Vercel Serverless Function - Generate AI Responses
 *
 * This runs on Vercel's edge network, keeping API keys secure
 * Environment variables set in Vercel Dashboard are used here
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

interface SystemPrompt {
  prompt_text: string;
  max_tokens: number;
  temperature: number;
}

interface AIResponse {
  model_name: string;
  content: string;
  error?: string;
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
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenAI API error');
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'No response generated';
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
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Anthropic API error');
  }

  const data = await response.json();
  return data.content[0]?.text || 'No response generated';
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
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Google AI API error');
  }

  const data = await response.json();
  return data.candidates[0]?.content?.parts[0]?.text || 'No response generated';
}

// Call DeepSeek API
async function callDeepSeek(query: string, systemPrompt: SystemPrompt, apiKey: string): Promise<string> {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt.prompt_text },
        { role: 'user', content: query }
      ],
      max_tokens: systemPrompt.max_tokens,
      temperature: systemPrompt.temperature
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'DeepSeek API error');
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'No response generated';
}

// Call Mistral API
async function callMistral(query: string, systemPrompt: SystemPrompt, apiKey: string): Promise<string> {
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      messages: [
        { role: 'system', content: systemPrompt.prompt_text },
        { role: 'user', content: query }
      ],
      max_tokens: systemPrompt.max_tokens,
      temperature: systemPrompt.temperature
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Mistral API error');
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'No response generated';
}

// Call Groq API (Fast Llama models)
async function callGroq(query: string, systemPrompt: SystemPrompt, apiKey: string): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt.prompt_text },
        { role: 'user', content: query }
      ],
      max_tokens: systemPrompt.max_tokens,
      temperature: systemPrompt.temperature
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Groq API error');
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'No response generated';
}

// Call Perplexity API
async function callPerplexity(query: string, systemPrompt: SystemPrompt, apiKey: string): Promise<string> {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.1-sonar-small-128k-online',
      messages: [
        { role: 'system', content: systemPrompt.prompt_text },
        { role: 'user', content: query }
      ],
      max_tokens: systemPrompt.max_tokens,
      temperature: systemPrompt.temperature
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Perplexity API error');
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'No response generated';
}

// Mock response for missing API keys
function getMockResponse(modelName: string, query: string): string {
  return `This is a demo response from ${modelName}. To enable real AI responses, add API keys to Vercel environment variables.

Your question: "${query.substring(0, 100)}..."

To configure:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add: OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_AI_API_KEY
3. Redeploy your application

Demo response for testing purposes.`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query text is required' });
    }

    // Initialize Supabase client to get system prompt
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase configuration missing' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get active system prompt
    const { data: promptData } = await supabase
      .from('system_prompts')
      .select('prompt_text, max_tokens, temperature')
      .eq('is_active', true)
      .maybeSingle();

    const systemPrompt: SystemPrompt = promptData || {
      prompt_text: 'You are a helpful AI assistant. Provide clear, accurate, and concise responses.',
      max_tokens: 500,
      temperature: 0.7
    };

    // Get enabled models from database
    const { data: enabledModelsData } = await supabase
      .from('enabled_models')
      .select('model_name, is_enabled')
      .eq('is_enabled', true)
      .order('display_order', { ascending: true });

    // Create a set of enabled model names for quick lookup
    const enabledModelNames = new Set(
      enabledModelsData?.map(m => m.model_name) || ['GPT', 'Claude', 'Gemini']
    );

    // Get API keys from environment variables (set in Vercel Dashboard)
    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const googleKey = process.env.GOOGLE_AI_API_KEY;
    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    const mistralKey = process.env.MISTRAL_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;
    const perplexityKey = process.env.PERPLEXITY_API_KEY;

    const responses: AIResponse[] = [];

    // All available models
    const allModels = [
      { name: 'GPT', key: openaiKey, call: callOpenAI },
      { name: 'Claude', key: anthropicKey, call: callAnthropic },
      { name: 'Gemini', key: googleKey, call: callGoogleAI },
      { name: 'DeepSeek', key: deepseekKey, call: callDeepSeek },
      { name: 'Mistral', key: mistralKey, call: callMistral },
      { name: 'Groq', key: groqKey, call: callGroq },
      { name: 'Perplexity', key: perplexityKey, call: callPerplexity }
    ];

    // Filter to only use enabled models
    const models = allModels.filter(model => enabledModelNames.has(model.name));

    console.log(`Using ${models.length} enabled models:`, Array.from(enabledModelNames));

    for (const model of models) {
      if (model.key) {
        try {
          console.log(`Calling ${model.name} API...`);
          const content = await model.call(query, systemPrompt, model.key);
          responses.push({ model_name: model.name, content });
          console.log(`✅ ${model.name} response received`);
        } catch (error: any) {
          console.error(`❌ ${model.name} error:`, error.message);
          responses.push({
            model_name: model.name,
            content: getMockResponse(model.name, query),
            error: error.message
          });
        }
      } else {
        console.log(`ℹ️ ${model.name}: No API key, using mock`);
        responses.push({
          model_name: model.name,
          content: getMockResponse(model.name, query)
        });
      }
    }

    return res.status(200).json({ responses });
  } catch (error: any) {
    console.error('API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
