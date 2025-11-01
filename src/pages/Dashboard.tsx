/**
 * Student Dashboard - Anonymous AI Model Evaluation
 *
 * Users see responses labeled as "Model A", "Model B", "Model C" (randomized order)
 * Users rank responses: 1st Best, 2nd Best, 3rd Best
 * Actual model names (GPT, Claude, Gemini) are stored in backend for admin viewing
 * This ensures blind, unbiased evaluation of AI model performance
 */

import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import ThemeToggle from '../components/ThemeToggle';
import Modal from '../components/Modal';
import ConversationSearch from '../components/ConversationSearch';
import NotificationCenter from '../components/NotificationCenter';
import { generateAIResponses } from '../services/aiServiceVercel';
import { sanitizeInput } from '../utils/sanitize';
import { useConversations } from '../hooks/useConversations';

interface Conversation {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  queries?: Query[];
}

interface Query {
  id: string;
  content: string;
  status: string;
  created_at: string;
  conversation_id?: string;
}

interface Response {
  id: string;
  model_name: string; // Actual model name (stored for admin)
  display_name: string; // Anonymous name shown to user (Model A, B, C)
  content: string;
  ranking?: number; // 1 = best, 2 = second, 3 = third
}

interface MessageGroup {
  query: Query;
  responses: Response[];
  rankings: { [key: string]: number };
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [queryText, setQueryText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [messageGroups, setMessageGroups] = useState<MessageGroup[]>([]); // All messages in current conversation
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [requireRating, setRequireRating] = useState(true);
  const [hasRated, setHasRated] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 🚀 SWR: Automatic caching and revalidation for conversations
  const { conversations, mutate: refreshConversations } = useConversations(user?.id);

  // Filter conversations based on search term
  const filteredConversations = conversations?.filter((conversation) => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();

    // Search in conversation title
    if (conversation.title?.toLowerCase().includes(searchLower)) {
      return true;
    }

    // Search in query content (if queries are loaded)
    const conversationWithQueries = conversation as any;
    if (conversationWithQueries.queries) {
      return conversationWithQueries.queries.some((query: any) =>
        query.content.toLowerCase().includes(searchLower)
      );
    }

    return false;
  }) || [];
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: undefined
  });

  const checkAdminStatus = useCallback(async () => {
    if (!user) return;
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    setIsAdmin(profile?.role === 'admin');
  }, [user]);

  // 🚀 SWR replaces loadHistory - conversations are automatically cached and updated
  // refreshConversations() can be called to manually trigger a refresh

  const loadAppSettings = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'require_rating_before_next_message')
        .single();

      if (data) {
        setRequireRating(data.setting_value);
      }
    } catch (err) {
      console.log('App settings not found, using defaults');
    }
  }, []);

  useEffect(() => {
    checkAdminStatus();
    loadAppSettings();
    // SWR automatically loads and caches conversations
  }, [checkAdminStatus, loadAppSettings]);

  const loadConversationMessages = async (conversationId: string) => {
    try {
      // Load all queries in this conversation
      const { data: queries, error: queriesError } = await supabase
        .from('queries')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (queriesError) throw queriesError;

      if (!queries || queries.length === 0) {
        setMessageGroups([]);
        return;
      }

      // Load responses and rankings for all queries
      const groups: MessageGroup[] = [];

      for (const query of queries) {
        const { data: queryResponses } = await supabase
          .from('responses')
          .select('*')
          .eq('query_id', query.id)
          .order('created_at', { ascending: true });

        if (queryResponses && queryResponses.length > 0) {
          // Anonymize responses
          const anonymizedResponses = queryResponses.map((resp, index) => ({
            id: resp.id,
            model_name: resp.model_name,
            display_name: `Model ${String.fromCharCode(65 + index)}`,
            content: resp.content
          }));

          // Load rankings for this query
          let rankingsMap: { [key: string]: number } = {};
          if (user) {
            const { data: ratingsData } = await supabase
              .from('ratings')
              .select('response_id, score')
              .eq('user_id', user.id)
              .in('response_id', queryResponses.map(r => r.id));

            if (ratingsData) {
              ratingsData.forEach(rating => {
                rankingsMap[rating.response_id] = rating.score;
              });
            }
          }

          groups.push({
            query,
            responses: anonymizedResponses,
            rankings: rankingsMap
          });
        }
      }

      setMessageGroups(groups);

      // Check if the last message has been rated
      if (groups.length > 0) {
        const lastGroup = groups[groups.length - 1];
        const hasAnyRanking = Object.keys(lastGroup.rankings).length > 0;
        setHasRated(hasAnyRanking);
      }
    } catch (err) {
      console.error('Error loading conversation messages:', err);
      setMessageGroups([]);
    }
  };

  const handleSubmitQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !queryText.trim()) return;

    // Sanitize user input to prevent XSS
    const sanitizedQuery = sanitizeInput(queryText.trim());

    if (!sanitizedQuery) {
      setModalConfig({
        isOpen: true,
        title: 'Invalid Input',
        message: 'Please enter a valid question.',
        type: 'error',
        confirmText: 'OK',
        onConfirm: undefined
      });
      return;
    }

    // Check if rating is required and user hasn't rated yet
    if (requireRating && messageGroups.length > 0 && !hasRated) {
      setModalConfig({
        isOpen: true,
        title: 'Rating Required',
        message: 'Please rate the responses above before asking a new question.',
        type: 'warning',
        confirmText: 'OK',
        onConfirm: undefined
      });
      return;
    }

    setSubmitting(true);
    try {
      let conversationId = currentConversation?.id;

      // Create new conversation if none exists
      if (!conversationId) {
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert([{
            user_id: user.id,
            title: sanitizedQuery.slice(0, 50) // Use first 50 chars as title
          }])
          .select()
          .single();

        if (convError) throw convError;
        conversationId = newConv.id;
        setCurrentConversation(newConv);
      } else {
        // Update conversation timestamp
        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversationId);
      }

      // Create query within conversation
      const { data, error } = await supabase
        .from('queries')
        .insert([{
          user_id: user.id,
          conversation_id: conversationId,
          content: sanitizedQuery,
          status: 'pending'
        }])
        .select()
        .single();

      if (error) throw error;

      setQueryText('');
      refreshConversations(); // 🚀 SWR: Refresh conversation list

      // Generate AI responses using real APIs or mock data
      try {
        console.log('🚀 Generating AI responses...');
        const aiResponses = await generateAIResponses(sanitizedQuery);
        console.log('✅ Received responses:', aiResponses.length);

        // Save responses to database
        const responsesToInsert = aiResponses.map(resp => ({
          query_id: data.id,
          model_name: resp.model_name,
          content: resp.content
        }));

        const { data: savedResponses, error: responseError } = await supabase
          .from('responses')
          .insert(responsesToInsert)
          .select();

        if (responseError) throw responseError;

        // Randomize order and assign anonymous labels for display
        const shuffled = [...savedResponses].sort(() => Math.random() - 0.5);
        const anonymizedResponses = shuffled.map((resp, index) => ({
          id: resp.id,
          model_name: resp.model_name, // Keep actual name for database operations
          display_name: `Model ${String.fromCharCode(65 + index)}`, // A, B, C
          content: resp.content
        }));

        // Add new message group to the conversation
        const newGroup: MessageGroup = {
          query: data,
          responses: anonymizedResponses,
          rankings: {}
        };

        setMessageGroups([...messageGroups, newGroup]);
        setHasRated(false); // User needs to rate new responses
        console.log('✅ Responses displayed to user');
      } catch (err) {
        console.error('❌ Error generating responses:', err);
        setModalConfig({
          isOpen: true,
          title: 'Error',
          message: 'Failed to generate responses. Please try again.',
          type: 'error',
          confirmText: 'OK',
          onConfirm: undefined
        });
      }
    } catch (err) {
      console.error('Error submitting query:', err);
      setModalConfig({
        isOpen: true,
        title: 'Error',
        message: 'Failed to submit query. Please try again.',
        type: 'error',
        confirmText: 'OK',
        onConfirm: undefined
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewChat = () => {
    setCurrentConversation(null);
    setMessageGroups([]);
    setQueryText('');
    setHasRated(false);
  };

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent clicking conversation when clicking delete

    setModalConfig({
      isOpen: true,
      title: 'Delete Conversation',
      message: 'Are you sure you want to delete this conversation? This will also delete all messages and responses.',
      type: 'warning',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('conversations')
            .delete()
            .eq('id', conversationId);

          if (error) throw error;

          // If we're deleting the current conversation, clear the view
          if (currentConversation?.id === conversationId) {
            handleNewChat();
          }

          // Reload the conversation list
          refreshConversations(); // 🚀 SWR: Refresh conversation list
          console.log('✅ Conversation deleted successfully');
        } catch (err) {
          console.error('Error deleting conversation:', err);
          setModalConfig({
            isOpen: true,
            title: 'Error',
            message: 'Failed to delete conversation. Please try again.',
            type: 'error',
            confirmText: 'OK',
            onConfirm: undefined
          });
        }
      }
    });
  };

  const handleRankingSelect = async (groupIndex: number, responseId: string, rank: number) => {
    if (!user) return;

    const group = messageGroups[groupIndex];
    const currentRankings = group.rankings;

    // Toggle: if already selected, deselect it
    if (currentRankings[responseId] === rank) {
      const newRankings = { ...currentRankings };
      delete newRankings[responseId];

      // Update message groups
      const updatedGroups = [...messageGroups];
      updatedGroups[groupIndex] = { ...group, rankings: newRankings };
      setMessageGroups(updatedGroups);

      // Delete from database
      try {
        await supabase
          .from('ratings')
          .delete()
          .eq('response_id', responseId)
          .eq('user_id', user.id);
      } catch (err) {
        console.error('Error deleting rating:', err);
      }
      return;
    }

    // Check if this rank is already assigned to another response in this group
    const responseWithThisRank = Object.entries(currentRankings).find(([_, r]) => r === rank);
    if (responseWithThisRank) {
      setModalConfig({
        isOpen: true,
        title: 'Ranking Conflict',
        message: 'This ranking has already been assigned to another model. Please deselect it first.',
        type: 'warning',
        confirmText: 'OK',
        onConfirm: undefined
      });
      return;
    }

    // Prepare the new rankings
    const newRankings = { ...currentRankings, [responseId]: rank };
    const updatedGroups = [...messageGroups];
    updatedGroups[groupIndex] = { ...group, rankings: newRankings };

    // Save to database first
    try {
      // Use upsert to handle if user changes their ranking
      await supabase
        .from('ratings')
        .upsert({
          response_id: responseId,
          user_id: user.id,
          score: rank, // 1 = best, 2 = second, 3 = third
          feedback: null
        }, {
          onConflict: 'response_id,user_id'
        });

      console.log(`Saved ranking: Response ${responseId} ranked as #${rank}`);

      // Only update state after successful database save
      setMessageGroups(updatedGroups);

      // If this is the last message group, mark as rated
      if (groupIndex === messageGroups.length - 1) {
        setHasRated(true);
      }
    } catch (err) {
      console.error('Error saving rating:', err);
      setModalConfig({
        isOpen: true,
        title: 'Error',
        message: 'Failed to save rating. Please try again.',
        type: 'error',
        confirmText: 'OK',
        onConfirm: undefined
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 transition-colors overflow-hidden">
      {/* Sidebar */}
      <div className={`${showHistory ? 'block' : 'hidden'} md:block w-64 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 relative h-full`}>
        {/* Sidebar Header */}
        <div className="absolute top-0 left-0 right-0 p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 z-10">
          <button
            onClick={handleNewChat}
            className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all shadow-md flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>
        </div>

        {/* History List - Scrollable with padding for header and footer */}
        <div className="absolute top-[73px] bottom-[130px] left-0 right-0 overflow-y-auto overflow-x-hidden scrollbar-thin">
          <div className="p-3">
            {/* Search Bar */}
            <div className="mb-3">
              <ConversationSearch
                onSearch={setSearchTerm}
                placeholder="Search conversations..."
                debounceMs={300}
              />
            </div>

            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase px-2 mb-2">
              Conversations {searchTerm && `(${filteredConversations.length})`}
            </h3>
            {!conversations || conversations.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 px-2">No conversations yet</p>
            ) : filteredConversations.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 px-2">No matching conversations</p>
            ) : (
              <div className="space-y-1">
                {filteredConversations.map((conversation) => {
                  const firstQuery = (conversation as any).queries?.[0];
                  const messageCount = (conversation as any).queries?.length || 0;
                  // Use first query content as title, not the stored title field
                  const title = firstQuery?.content.slice(0, 50) || 'New Chat';

                  return (
                    <div
                      key={conversation.id}
                      className={`relative group/item rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                        currentConversation?.id === conversation.id ? 'bg-gray-200 dark:bg-gray-700' : ''
                      }`}
                    >
                      <button
                        onClick={async () => {
                          setCurrentConversation(conversation);
                          setShowHistory(false);
                          // Load all messages in this conversation
                          await loadConversationMessages(conversation.id);
                        }}
                        className="w-full text-left px-3 py-2 pr-10"
                      >
                        <p className="text-sm text-gray-700 dark:text-gray-300 truncate font-medium">
                          {title}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {messageCount} message{messageCount !== 1 ? 's' : ''}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(conversation.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                      </button>
                      {/* Delete button - shown on hover */}
                      <button
                        onClick={(e) => handleDeleteConversation(conversation.id, e)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md opacity-0 group-hover/item:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-all"
                        title="Delete conversation"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Footer - Always Visible */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 space-y-2 z-10">
          {isAdmin && (
            <button
              onClick={() => navigate('/admin')}
              className="w-full px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Admin Panel
            </button>
          )}
          <button
            onClick={() => navigate('/profile')}
            className="w-full px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Profile Settings
          </button>
          <button
            onClick={handleSignOut}
            className="w-full px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-14 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg blur opacity-50"></div>
                <div className="relative w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-sm">N</span>
                </div>
              </div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">Nexus</h1>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {user?.email?.split('@')[0]}
            </div>
            <NotificationCenter />
            <ThemeToggle />
          </div>
        </div>

        {/* Email Verification Banner */}
        {user && !user.email_confirmed_at && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 px-4 py-3">
            <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Please verify your email address
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-0.5">
                    Check your inbox for a verification link from Nexus
                  </p>
                </div>
              </div>
              <button
                onClick={async () => {
                  try {
                    const { error } = await supabase.auth.resend({
                      type: 'signup',
                      email: user.email!,
                    });
                    if (error) throw error;
                    setModalConfig({
                      isOpen: true,
                      title: 'Verification Email Sent',
                      message: 'Please check your inbox for the verification link.',
                      type: 'success',
                      confirmText: 'OK',
                      onConfirm: () => setModalConfig({ ...modalConfig, isOpen: false })
                    });
                  } catch (error: any) {
                    setModalConfig({
                      isOpen: true,
                      title: 'Error',
                      message: error.message || 'Failed to resend verification email',
                      type: 'error',
                      confirmText: 'OK',
                      onConfirm: () => setModalConfig({ ...modalConfig, isOpen: false })
                    });
                  }
                }}
                className="px-4 py-1.5 bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600 text-white text-sm font-medium rounded-lg transition-colors flex-shrink-0"
              >
                Resend Verification
              </button>
            </div>
          </div>
        )}

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {messageGroups.length === 0 && !submitting ? (
            /* Welcome Screen */
            <div className="h-full flex items-center justify-center p-4">
              <div className="text-center max-w-2xl">
                <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-purple-600 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                  Welcome to Nexus
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8">
                  Compare responses from multiple AI models side by side. Submit your question below to get started.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <div className="text-2xl mb-2">💡</div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Ask Anything</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Get responses from multiple AI models</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <div className="text-2xl mb-2">🔍</div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Compare Models</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">See how different AIs respond</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <div className="text-2xl mb-2">🏆</div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Rank & Evaluate</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Anonymous blind evaluation of AI models</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Chat Messages */
            <div className="max-w-5xl mx-auto p-4 space-y-8">
              {/* All Message Groups in Conversation */}
              {messageGroups.map((group, groupIndex) => (
                <div key={group.query.id} className="space-y-4">
                  {/* User Query */}
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-medium">{user?.email?.[0].toUpperCase()}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-900 dark:text-white">{group.query.content}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(group.query.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* AI Responses for this query */}
                  {group.responses.length > 0 && (
                    <div className="space-y-4 ml-12">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {group.responses.length > 1
                          ? 'Rank the responses from best to worst. Models are anonymized for unbiased evaluation.'
                          : 'Review the AI response below. Model identity is anonymized for unbiased evaluation.'}
                      </p>
                      <div className={`grid gap-4 items-stretch ${
                        group.responses.length === 1
                          ? 'grid-cols-1'
                          : group.responses.length === 2
                          ? 'md:grid-cols-2'
                          : group.responses.length === 3
                          ? 'md:grid-cols-2 lg:grid-cols-3'
                          : group.responses.length === 4
                          ? 'md:grid-cols-2 lg:grid-cols-4'
                          : 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                      }`}>
                        {group.responses.map((response) => (
                          <div
                            key={response.id}
                            className={`bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border-2 transition-all flex flex-col h-full ${
                              group.rankings[response.id]
                                ? group.rankings[response.id] === 1
                                  ? 'border-yellow-400 dark:border-yellow-500 shadow-lg shadow-yellow-500/30'
                                  : group.rankings[response.id] === 2
                                  ? 'border-cyan-400 dark:border-cyan-500 shadow-lg shadow-cyan-500/30'
                                  : 'border-orange-400 dark:border-orange-600 shadow-lg shadow-orange-500/30'
                                : 'border-gray-200 dark:border-gray-700'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                  <span className="text-white text-sm font-bold">{response.display_name.split(' ')[1]}</span>
                                </div>
                                <h4 className="font-semibold text-gray-900 dark:text-white">{response.display_name}</h4>
                              </div>
                              {group.rankings[response.id] && (() => {
                                const rankIndex = group.rankings[response.id] - 1;
                                const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣'];
                                const badgeColors = [
                                  { bg: 'bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20', ring: 'ring-yellow-400 dark:ring-yellow-500' }, // Gold
                                  { bg: 'bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-700/30 dark:to-slate-700/30', ring: 'ring-gray-400 dark:ring-gray-500' }, // Silver
                                  { bg: 'bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-900/20 dark:to-amber-900/20', ring: 'ring-orange-400 dark:ring-orange-500' }, // Bronze
                                  { bg: 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20', ring: 'ring-blue-400 dark:ring-blue-500' }, // 4th
                                  { bg: 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20', ring: 'ring-emerald-400 dark:ring-emerald-500' }, // 5th
                                  { bg: 'bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20', ring: 'ring-violet-400 dark:ring-violet-500' } // 6th
                                ];
                                const color = badgeColors[rankIndex];
                                return (
                                  <span className={`flex items-center gap-1 text-lg font-bold px-2 py-1 rounded-lg ${color.bg} ring-2 ${color.ring}`}>
                                    {medals[rankIndex]}
                                  </span>
                                );
                              })()}
                            </div>
                            <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4 flex-1 overflow-y-auto whitespace-pre-wrap">
                              {response.content}
                            </div>
                            {group.responses.length > 1 && (
                              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 text-center">Rank this response:</p>
                                <div className="flex flex-wrap justify-center gap-2">
                                  {[...Array(group.responses.length)].map((_, index) => {
                                    const rank = index + 1;
                                    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣'];
                                    const medalLabels = ['1st Place', '2nd Place', '3rd Place', '4th Place', '5th Place', '6th Place'];
                                    const rankText = ['1st', '2nd', '3rd', '4th', '5th', '6th'];
                                    const isSelected = group.rankings[response.id] === rank;

                                    // Medal-matching colors
                                    const colors = [
                                      { bg: 'bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20', ring: 'ring-yellow-400 dark:ring-yellow-500', text: 'text-yellow-700 dark:text-yellow-300' }, // Gold
                                      { bg: 'bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-700/30 dark:to-slate-700/30', ring: 'ring-gray-400 dark:ring-gray-500', text: 'text-gray-700 dark:text-gray-300' }, // Silver
                                      { bg: 'bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-900/20 dark:to-amber-900/20', ring: 'ring-orange-400 dark:ring-orange-500', text: 'text-orange-700 dark:text-orange-300' }, // Bronze
                                      { bg: 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20', ring: 'ring-blue-400 dark:ring-blue-500', text: 'text-blue-700 dark:text-blue-300' }, // 4th - Blue
                                      { bg: 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20', ring: 'ring-emerald-400 dark:ring-emerald-500', text: 'text-emerald-700 dark:text-emerald-300' }, // 5th - Green
                                      { bg: 'bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20', ring: 'ring-violet-400 dark:ring-violet-500', text: 'text-violet-700 dark:text-violet-300' } // 6th - Purple
                                    ];
                                    const color = colors[index];

                                    return (
                                      <button
                                        key={rank}
                                        onClick={() => handleRankingSelect(groupIndex, response.id, rank)}
                                        className={`group relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all ${
                                          isSelected
                                            ? `${color.bg} ring-2 ${color.ring}`
                                            : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                                        }`}
                                        title={medalLabels[index]}
                                      >
                                        <span className="text-xl">
                                          {medals[index]}
                                        </span>
                                        <span className={`text-[10px] font-medium whitespace-nowrap ${
                                          isSelected
                                            ? color.text
                                            : 'text-gray-600 dark:text-gray-400'
                                        }`}>
                                          {rankText[index]}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Loading indicator for new message */}
              {submitting && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-600 dark:text-gray-400">Generating responses from AI models...</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <form onSubmit={handleSubmitQuery} className="max-w-4xl mx-auto">
            <div className="relative flex items-end">
              <textarea
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder="Enter your question to receive anonymous AI responses for evaluation..."
                rows={3}
                className="w-full px-4 py-3 pr-14 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              <button
                type="submit"
                disabled={submitting || !queryText.trim()}
                className="absolute right-3 bottom-3 p-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:from-gray-300 disabled:to-gray-300 dark:disabled:from-gray-700 dark:disabled:to-gray-700 text-white rounded-lg transition-all disabled:cursor-not-allowed shadow-md"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              All AI model identities are hidden to ensure unbiased evaluation
            </p>
          </form>
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        onConfirm={modalConfig.onConfirm}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
      />
    </div>
  );
}
