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
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import ThemeToggle from '../components/ThemeToggle';
import { generateAIResponses } from '../services/aiServiceVercel';

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

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [queryText, setQueryText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentQuery, setCurrentQuery] = useState<Query | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [rankings, setRankings] = useState<{ [key: string]: number }>({});
  const [requireRating, setRequireRating] = useState(true);
  const [hasRated, setHasRated] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    loadHistory();
    loadAppSettings();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) return;
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    setIsAdmin(profile?.role === 'admin');
  };

  const loadHistory = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('conversations')
      .select(`
        *,
        queries(*)
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(20);
    if (data) {
      setConversations(data as Conversation[]);
    }
  };

  const loadAppSettings = async () => {
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
  };

  const loadQueryResponses = async (queryId: string) => {
    try {
      // Load responses for this query, ordered by creation time to maintain consistent display
      const { data: queryResponses, error } = await supabase
        .from('responses')
        .select('*')
        .eq('query_id', queryId)
        .order('created_at', { ascending: true }); // Keep consistent order

      if (error) throw error;

      if (queryResponses && queryResponses.length > 0) {
        // Don't randomize when loading from history - keep the original order
        // Assign anonymous labels in the order they were saved
        const anonymizedResponses = queryResponses.map((resp, index) => ({
          id: resp.id,
          model_name: resp.model_name,
          display_name: `Model ${String.fromCharCode(65 + index)}`,
          content: resp.content
        }));

        setResponses(anonymizedResponses);

        // Load existing rankings for this query
        if (user) {
          const { data: ratingsData } = await supabase
            .from('ratings')
            .select('response_id, ranking')
            .eq('user_id', user.id)
            .in('response_id', queryResponses.map(r => r.id));

          if (ratingsData) {
            const rankingsMap: { [key: string]: number } = {};
            ratingsData.forEach(rating => {
              rankingsMap[rating.response_id] = rating.ranking;
            });
            setRankings(rankingsMap);
          }
        }
      } else {
        setResponses([]);
        setRankings({});
      }
    } catch (err) {
      console.error('Error loading query responses:', err);
      setResponses([]);
      setRankings({});
    }
  };

  const handleSubmitQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !queryText.trim()) return;

    // Check if rating is required and user hasn't rated yet
    if (requireRating && responses.length > 0 && !hasRated) {
      alert('⚠️ Please rate the responses above before asking a new question.');
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
            title: queryText.trim().slice(0, 50) // Use first 50 chars as title
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
          content: queryText.trim(),
          status: 'pending'
        }])
        .select()
        .single();

      if (error) throw error;

      setCurrentQuery(data);
      setQueryText('');
      loadHistory();

      // Generate AI responses using real APIs or mock data
      try {
        console.log('🚀 Generating AI responses...');
        const aiResponses = await generateAIResponses(queryText.trim());
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

        setResponses(anonymizedResponses);
        setRankings({}); // Clear previous rankings
        setHasRated(false); // User needs to rate new responses
        console.log('✅ Responses displayed to user');
      } catch (err) {
        console.error('❌ Error generating responses:', err);
        alert('Failed to generate responses. Please try again.');
      }
    } catch (err) {
      console.error('Error submitting query:', err);
      alert('Failed to submit query');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewChat = () => {
    setCurrentQuery(null);
    setCurrentConversation(null);
    setResponses([]);
    setQueryText('');
    setRankings({});
    setHasRated(false);
  };

  const handleRankingSelect = async (responseId: string, rank: number) => {
    if (!user) return;

    // Toggle: if already selected, deselect it
    if (rankings[responseId] === rank) {
      const newRankings = { ...rankings };
      delete newRankings[responseId];
      setRankings(newRankings);

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

    // Check if this rank is already assigned to another response
    const responseWithThisRank = Object.entries(rankings).find(([_, r]) => r === rank);
    if (responseWithThisRank) {
      alert('This ranking has already been assigned to another model. Please deselect it first.');
      return;
    }

    // Assign the ranking
    setRankings({ ...rankings, [responseId]: rank });
    setHasRated(true); // Mark as rated

    // Save to database
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
    } catch (err) {
      console.error('Error saving rating:', err);
      alert('Failed to save rating. Please try again.');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 transition-colors">
      {/* Sidebar */}
      <div className={`${showHistory ? 'block' : 'hidden'} md:block w-64 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden`}>
        {/* Sidebar Header */}
        <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
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

        {/* History List - Scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-3">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase px-2 mb-2">
              Conversations
            </h3>
            {conversations.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 px-2">No conversations yet</p>
            ) : (
              <div className="space-y-1">
                {conversations.map((conversation) => {
                  const firstQuery = conversation.queries?.[0];
                  const messageCount = conversation.queries?.length || 0;
                  const title = conversation.title || firstQuery?.content.slice(0, 50) || 'New Chat';

                  return (
                    <button
                      key={conversation.id}
                      onClick={async () => {
                        setCurrentConversation(conversation);
                        setShowHistory(false);
                        // Load the last query's responses for this conversation
                        if (firstQuery) {
                          setCurrentQuery(firstQuery);
                          await loadQueryResponses(firstQuery.id);
                        }
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors group ${
                        currentConversation?.id === conversation.id ? 'bg-gray-200 dark:bg-gray-700' : ''
                      }`}
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
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Footer - Always Visible */}
        <div className="flex-shrink-0 p-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
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
            <ThemeToggle />
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto">
          {!currentQuery && responses.length === 0 ? (
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
            <div className="max-w-5xl mx-auto p-4 space-y-6">
              {/* User Query */}
              {currentQuery && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-medium">{user?.email?.[0].toUpperCase()}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900 dark:text-white">{currentQuery.content}</p>
                  </div>
                </div>
              )}

              {/* AI Responses */}
              {submitting && responses.length === 0 && (
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

              {responses.length > 0 && (
                <div className="space-y-6">
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                    {responses.length > 1
                      ? 'Rank the responses from best to worst. Models are anonymized for unbiased evaluation.'
                      : 'Review the AI response below. Model identity is anonymized for unbiased evaluation.'}
                  </p>
                  <div className={`grid gap-4 items-stretch ${
                    responses.length === 1
                      ? 'grid-cols-1'
                      : responses.length === 2
                      ? 'md:grid-cols-2'
                      : responses.length === 3
                      ? 'md:grid-cols-2 lg:grid-cols-3'
                      : responses.length === 4
                      ? 'md:grid-cols-2 lg:grid-cols-4'
                      : 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                  }`}>
                    {responses.map((response) => (
                      <div
                        key={response.id}
                        className={`bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border-2 transition-all flex flex-col h-full ${
                          rankings[response.id]
                            ? rankings[response.id] === 1
                              ? 'border-yellow-400 dark:border-yellow-500 shadow-lg shadow-yellow-500/30'
                              : rankings[response.id] === 2
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
                          {rankings[response.id] && (
                            <span className="text-xs font-bold px-2 py-1 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300">
                              {rankings[response.id] === 1 ? '1st' : rankings[response.id] === 2 ? '2nd' : '3rd'}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4 flex-1 overflow-y-auto whitespace-pre-wrap">
                          {response.content}
                        </div>
                        {responses.length > 1 && (
                          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Rank this response:</p>
                            <div className="flex gap-2">
                              {[...Array(Math.min(responses.length, 3))].map((_, index) => {
                                const rank = index + 1;
                                const rankLabels = ['1st Best', '2nd Best', '3rd Best', '4th', '5th', '6th', '7th'];
                                const rankColors = [
                                  { bg: 'bg-yellow-500', hover: 'hover:bg-yellow-100 dark:hover:bg-yellow-900', shadow: 'shadow-yellow-500/50' },
                                  { bg: 'bg-cyan-500', hover: 'hover:bg-cyan-100 dark:hover:bg-cyan-900', shadow: 'shadow-cyan-500/50' },
                                  { bg: 'bg-orange-500', hover: 'hover:bg-orange-100 dark:hover:bg-orange-900', shadow: 'shadow-orange-500/50' }
                                ];
                                const color = rankColors[index] || rankColors[2];

                                return (
                                  <button
                                    key={rank}
                                    onClick={() => handleRankingSelect(response.id, rank)}
                                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                      rankings[response.id] === rank
                                        ? `${color.bg} text-white shadow-lg ${color.shadow}`
                                        : `bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 ${color.hover}`
                                    }`}
                                  >
                                    {rankLabels[index]}
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
    </div>
  );
}
