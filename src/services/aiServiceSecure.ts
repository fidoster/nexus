/**
 * Secure AI Service - Calls Supabase Edge Function
 * API keys stored securely in Supabase secrets, not in browser
 *
 * To use this secure version:
 * 1. Deploy Edge Function (see docs/SECURE_API_KEY_SETUP.md)
 * 2. Replace aiService.ts with this file
 * 3. Rename this file to aiService.ts
 */

import { supabase } from '../lib/supabase';

interface AIResponse {
  model_name: string;
  content: string;
  error?: string;
}

export const generateAIResponses = async (query: string): Promise<AIResponse[]> => {
  try {
    console.log('🚀 Calling Supabase Edge Function...');

    // Get current session
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('User not authenticated');
    }

    // Get Supabase URL from environment
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    if (!supabaseUrl) {
      throw new Error('Supabase URL not configured');
    }

    // Call Edge Function with authentication
    const response = await fetch(
      `${supabaseUrl}/functions/v1/generate-ai-responses`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ query })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate responses');
    }

    const data = await response.json();
    console.log('✅ Edge Function returned', data.responses.length, 'responses');

    return data.responses;
  } catch (error: any) {
    console.error('❌ Error calling Edge Function:', error);

    // Return mock responses as fallback
    return [
      {
        model_name: 'GPT',
        content: `Error calling Edge Function: ${error.message}\n\nPlease ensure:\n1. Edge Function is deployed\n2. API keys are set in Supabase secrets\n3. You are authenticated\n\nSee docs/SECURE_API_KEY_SETUP.md for setup instructions.`
      },
      {
        model_name: 'Claude',
        content: 'Edge Function error. Configure Edge Function to enable real responses.'
      },
      {
        model_name: 'Gemini',
        content: 'Edge Function error. Configure Edge Function to enable real responses.'
      }
    ];
  }
};
