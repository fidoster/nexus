/**
 * Vercel Serverless Function - Update System Prompt
 *
 * Handles activating/updating system prompts from Admin Panel
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
    const { promptId, action, authToken } = req.body;

    if (!promptId || !action || !authToken) {
      return res.status(400).json({ error: 'Missing required fields: promptId, action, authToken' });
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    // Handle different actions
    if (action === 'activate') {
      // Deactivate all prompts first
      await supabase
        .from('system_prompts')
        .update({ is_active: false });

      // Activate the selected prompt
      const { data, error } = await supabase
        .from('system_prompts')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', promptId)
        .select();

      if (error) {
        console.error('Error activating prompt:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ success: true, data });

    } else if (action === 'delete') {
      const { error } = await supabase
        .from('system_prompts')
        .delete()
        .eq('id', promptId);

      if (error) {
        console.error('Error deleting prompt:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ success: true });

    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (error: any) {
    console.error('API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
