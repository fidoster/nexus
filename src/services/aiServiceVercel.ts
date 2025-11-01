/// <reference types="vite/client" />
/**
 * AI Service for Vercel Deployment
 * Calls Vercel serverless API route instead of direct AI APIs
 * API keys stored securely in Vercel environment variables
 */

interface AIResponse {
  model_name: string;
  content: string;
  error?: string;
}

export const generateAIResponses = async (query: string): Promise<AIResponse[]> => {
  try {
    console.log('🚀 Calling Vercel API route...');

    // In production (Vercel), use relative path
    // In development (localhost), use full localhost URL
    const apiUrl = import.meta.env.DEV
      ? 'http://localhost:5173/api/generate-responses'
      : '/api/generate-responses';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      // Try to get error details
      const contentType = response.headers.get('content-type');
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

      if (contentType?.includes('application/json')) {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } else {
        // HTML error page from Vercel
        const errorText = await response.text();
        console.error('Vercel returned HTML error:', errorText.substring(0, 500));
        errorMessage = `Vercel error (${response.status}). Check function logs in Vercel Dashboard.`;
      }

      throw new Error(errorMessage);
    }

    // Parse JSON response
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      const text = await response.text();
      console.error('Expected JSON but got:', text.substring(0, 500));
      throw new Error('Server returned invalid response format. Check Vercel function logs.');
    }

    const data = await response.json();
    console.log('✅ Vercel API returned', data.responses.length, 'responses');

    return data.responses;
  } catch (error: any) {
    console.error('❌ Error calling Vercel API:', error);

    // Return mock responses as fallback
    return [
      {
        model_name: 'GPT',
        content: `Error calling Vercel API: ${error.message}\n\nPlease ensure:\n1. Vercel serverless function is deployed\n2. Environment variables are set in Vercel Dashboard\n3. Application is properly configured\n\nFor local development, run: npm run dev\nFor production, deploy to Vercel with proper env vars.`
      },
      {
        model_name: 'Claude',
        content: 'API error. Configure Vercel environment variables to enable real responses.'
      },
      {
        model_name: 'Gemini',
        content: 'API error. Configure Vercel environment variables to enable real responses.'
      }
    ];
  }
};
