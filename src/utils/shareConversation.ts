/**
 * Conversation Sharing Utilities
 * Functions for generating and managing shareable conversation links
 */

import { supabase } from '../lib/supabase';

/**
 * Generate a shareable link for a conversation
 * @param conversationId - The conversation ID to share
 * @returns The shareable URL
 */
export async function generateShareLink(conversationId: string): Promise<string> {
  try {
    // Generate a unique token
    const token = crypto.randomUUID();

    // Update conversation to make it public and add share token
    const { error } = await supabase
      .from('conversations')
      .update({
        is_public: true,
        share_token: token,
        shared_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    if (error) throw error;

    // Generate the shareable URL
    const shareUrl = `${window.location.origin}/shared/${token}`;
    return shareUrl;
  } catch (error) {
    console.error('Error generating share link:', error);
    throw new Error('Failed to generate share link');
  }
}

/**
 * Revoke sharing for a conversation
 * @param conversationId - The conversation ID to stop sharing
 */
export async function revokeShareLink(conversationId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('conversations')
      .update({
        is_public: false,
        share_token: null,
        shared_at: null,
      })
      .eq('id', conversationId);

    if (error) throw error;
  } catch (error) {
    console.error('Error revoking share link:', error);
    throw new Error('Failed to revoke share link');
  }
}

/**
 * Get shared conversation by token
 * @param token - The share token
 * @returns The conversation with queries and responses
 */
export async function getSharedConversation(token: string) {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        queries (
          id,
          content,
          status,
          created_at,
          responses (
            id,
            model_name,
            content,
            created_at,
            ratings (
              id,
              score
            )
          )
        )
      `)
      .eq('share_token', token)
      .eq('is_public', true)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Conversation not found or not shared');

    return data;
  } catch (error) {
    console.error('Error fetching shared conversation:', error);
    throw error;
  }
}

/**
 * Track a view of a shared conversation
 * @param conversationId - The conversation that was viewed
 * @param viewerId - Optional user ID if logged in
 */
export async function trackConversationView(
  conversationId: string,
  viewerId?: string
): Promise<void> {
  try {
    const { error } = await supabase.from('conversation_views').insert({
      conversation_id: conversationId,
      viewer_id: viewerId || null,
      viewer_ip: null, // Could be set from server-side
    });

    if (error) {
      console.warn('Failed to track conversation view:', error);
      // Don't throw - viewing should work even if tracking fails
    }
  } catch (error) {
    console.warn('Error tracking conversation view:', error);
  }
}

/**
 * Get view count for a conversation
 * @param conversationId - The conversation ID
 * @returns Number of views
 */
export async function getConversationViews(conversationId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('conversation_views')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conversationId);

    if (error) throw error;
    return data?.length || 0;
  } catch (error) {
    console.error('Error getting conversation views:', error);
    return 0;
  }
}

/**
 * Copy text to clipboard
 * @param text - Text to copy
 */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      textArea.remove();
    }
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    throw new Error('Failed to copy to clipboard');
  }
}
