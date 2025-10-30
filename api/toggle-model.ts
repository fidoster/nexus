/**
 * Vercel Serverless Function - Toggle AI Model
 *
 * Handles enabling/disabling AI models in the database
 * Avoids CORS issues by running server-side
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { modelName, isEnabled, authToken } = req.body;

    if (!modelName || typeof isEnabled !== 'boolean') {
      return res.status(400).json({ error: 'Missing required fields: modelName, isEnabled' });
    }

    if (!authToken) {
      return res.status(401).json({ error: 'Unauthorized: No auth token provided' });
    }

    // Get Supabase credentials from environment
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase configuration missing' });
    }

    // Create Supabase client with user's auth token
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      }
    });

    // Verify user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    // Update the model
    const { data, error } = await supabase
      .from('enabled_models')
      .update({
        is_enabled: isEnabled,
        updated_at: new Date().toISOString()
      })
      .eq('model_name', modelName)
      .select();

    if (error) {
      console.error('Error updating model:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      success: true,
      modelName,
      isEnabled,
      data
    });

  } catch (error: any) {
    console.error('API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
