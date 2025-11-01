/**
 * Custom SWR Hook for Conversations
 * Provides automatic caching, revalidation, and optimistic updates
 */

import useSWR from 'swr';
import { supabase } from '../lib/supabase';

interface Conversation {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Fetcher function for SWR
 */
const fetchConversations = async (userId: string): Promise<Conversation[]> => {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      queries (
        id,
        content,
        created_at
      )
    `)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return data || [];
};

/**
 * Hook to fetch and cache conversations with SWR
 *
 * Benefits:
 * - Automatic caching with 60s deduplication
 * - Revalidates on window focus
 * - Optimistic UI updates
 * - Error retry with exponential backoff
 *
 * @param userId - User ID to fetch conversations for
 * @returns { conversations, isLoading, isError, mutate }
 */
export function useConversations(userId: string | undefined) {
  const { data, error, mutate } = useSWR(
    userId ? ['conversations', userId] : null, // Key includes userId for proper caching
    () => fetchConversations(userId!),
    {
      revalidateOnFocus: true,        // Refresh when user returns to tab
      revalidateOnReconnect: true,    // Refresh when connection restored
      dedupingInterval: 60000,        // Dedupe requests within 60s
      focusThrottleInterval: 5000,    // Throttle focus revalidation to 5s
      errorRetryCount: 3,             // Retry 3 times on error
      errorRetryInterval: 1000,       // Wait 1s between retries
      shouldRetryOnError: true,
      onError: (err) => {
        console.error('Error fetching conversations:', err);
      },
    }
  );

  return {
    conversations: data,
    isLoading: !error && !data,
    isError: error,
    mutate, // Expose mutate for manual revalidation or optimistic updates
  };
}

/**
 * Hook to fetch a single conversation with its messages
 */
export function useConversation(conversationId: string | undefined) {
  const { data, error, mutate } = useSWR(
    conversationId ? ['conversation', conversationId] : null,
    async () => {
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
              created_at
            )
          )
        `)
        .eq('id', conversationId)
        .single();

      if (error) throw error;
      return data;
    },
    {
      revalidateOnFocus: false, // Don't revalidate single conversation on focus
      dedupingInterval: 30000,  // 30s deduplication
    }
  );

  return {
    conversation: data,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}
