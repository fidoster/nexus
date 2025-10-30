/**
 * AI Service - Handles API calls to different LLM providers
 * Uses API keys from localStorage and active system prompt from database
 */

import { supabase } from '../lib/supabase';

interface APIKey {
  service: string;
  key: string;
  isActive: boolean;
}

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

// Mock responses for when API keys are not available
const getMockResponse = (modelName: string, query: string): string => {
  const mockResponses: { [key: string]: string } = {
    'GPT': `This is a demo response from GPT (OpenAI). To get real responses, add your OpenAI API key in the Admin Panel.

Your question: "${query.substring(0, 50)}..."

This is placeholder text demonstrating the response format.`,
    'Claude': `This is a demo response from Claude (Anthropic). To get real responses, add your Anthropic API key in the Admin Panel.

Your question: "${query.substring(0, 50)}..."

This is placeholder text demonstrating the response format.`,
    'Gemini': `This is a demo response from Gemini (Google). To get real responses, add your Google AI API key in the Admin Panel.

Your question: "${query.substring(0, 50)}..."

This is placeholder text demonstrating the response format.`,
    'Llama': `This is a demo response from Llama (Meta). To get real responses, configure Llama API access in the Admin Panel.

Your question: "${query.substring(0, 50)}..."

This is placeholder text demonstrating the response format.`
  };

  return mockResponses[modelName] || `Demo response from ${modelName}. Configure API key for real responses.`;
};

// Load API keys from localStorage
const loadAPIKeys = (): APIKey[] => {
  const stored = localStorage.getItem('nexus_api_keys');
  return stored ? JSON.parse(stored) : [];
};

// Get active system prompt from database
const getActiveSystemPrompt = async (): Promise<SystemPrompt | null> => {
  try {
    const { data, error } = await supabase
      .from('system_prompts')
      .select('prompt_text, max_tokens, temperature')
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) {
      // Return default prompt if none active
      return {
        prompt_text: 'You are a helpful AI assistant. Provide clear, accurate, and concise responses.',
        max_tokens: 500,
        temperature: 0.7
      };
    }

    return data;
  } catch (err) {
    console.error('Error loading system prompt:', err);
    return {
      prompt_text: 'You are a helpful AI assistant. Provide clear, accurate, and concise responses.',
      max_tokens: 500,
      temperature: 0.7
    };
  }
};

// Call OpenAI API (GPT)
const callOpenAI = async (query: string, systemPrompt: SystemPrompt, apiKey: string): Promise<string> => {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Using gpt-4o-mini for cost efficiency
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
  } catch (error: any) {
    console.error('OpenAI API error:', error);
    throw error;
  }
};

// Call Anthropic API (Claude)
const callAnthropic = async (query: string, systemPrompt: SystemPrompt, apiKey: string): Promise<string> => {
  try {
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
        messages: [
          { role: 'user', content: query }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Anthropic API error');
    }

    const data = await response.json();
    return data.content[0]?.text || 'No response generated';
  } catch (error: any) {
    console.error('Anthropic API error:', error);
    throw error;
  }
};

// Call Google AI API (Gemini)
const callGoogleAI = async (query: string, systemPrompt: SystemPrompt, apiKey: string): Promise<string> => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${systemPrompt.prompt_text}\n\nUser query: ${query}`
            }]
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
  } catch (error: any) {
    console.error('Google AI API error:', error);
    throw error;
  }
};

// Main function to generate responses from multiple models
export const generateAIResponses = async (query: string): Promise<AIResponse[]> => {
  const apiKeys = loadAPIKeys();
  const systemPrompt = await getActiveSystemPrompt();

  if (!systemPrompt) {
    throw new Error('Failed to load system prompt');
  }

  // Define which models to query (only those with API keys)
  const modelsToQuery = [
    { name: 'GPT', service: 'OpenAI (GPT)', apiCall: callOpenAI },
    { name: 'Claude', service: 'Anthropic (Claude)', apiCall: callAnthropic },
    { name: 'Gemini', service: 'Google (Gemini)', apiCall: callGoogleAI }
  ];

  const responses: AIResponse[] = [];

  // Process each model
  for (const model of modelsToQuery) {
    const apiKeyObj = apiKeys.find(k => k.service === model.service && k.isActive);

    if (apiKeyObj && apiKeyObj.key) {
      // Real API call
      try {
        console.log(`Calling ${model.name} API...`);
        const content = await model.apiCall(query, systemPrompt, apiKeyObj.key);
        responses.push({
          model_name: model.name,
          content
        });
        console.log(`✅ ${model.name} response received`);
      } catch (error: any) {
        console.error(`❌ ${model.name} API call failed:`, error);
        responses.push({
          model_name: model.name,
          content: getMockResponse(model.name, query),
          error: `API Error: ${error.message}`
        });
      }
    } else {
      // Mock response
      console.log(`ℹ️ ${model.name}: No API key, using mock response`);
      responses.push({
        model_name: model.name,
        content: getMockResponse(model.name, query)
      });
    }
  }

  return responses;
};
