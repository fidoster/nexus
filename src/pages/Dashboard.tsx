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
import { generateAIResponses } from '../services/aiService';

interface Query {
  id: string;
  content: string;
  status: string;
  created_at: string;
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
  const [history, setHistory] = useState<Query[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [rankings, setRankings] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    checkAdminStatus();
    loadHistory();
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
      .from('queries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setHistory(data);
  };

  const handleSubmitQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !queryText.trim()) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('queries')
        .insert([{
          user_id: user.id,
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
    setResponses([]);
    setQueryText('');
    setRankings({});
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
      <div className={`${showHistory ? 'block' : 'hidden'} md:block w-64 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={handleNewChat}
            className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-3">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase px-2 mb-2">
            Recent Chats
          </h3>
          {history.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 px-2">No chats yet</p>
          ) : (
            <div className="space-y-1">
              {history.map((query) => (
                <button
                  key={query.id}
                  onClick={() => {
                    setCurrentQuery(query);
                    setShowHistory(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors group"
                >
                  <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                    {query.content.slice(0, 50)}...
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(query.created_at).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
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
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Nexus</h1>
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
                    Rank the responses from best to worst. Models are anonymized for unbiased evaluation.
                  </p>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {responses.map((response) => (
                      <div
                        key={response.id}
                        className={`bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border-2 transition-all ${
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
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4">{response.content}</p>
                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Rank this response:</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleRankingSelect(response.id, 1)}
                              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                rankings[response.id] === 1
                                  ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/50'
                                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-yellow-100 dark:hover:bg-yellow-900'
                              }`}
                            >
                              1st Best
                            </button>
                            <button
                              onClick={() => handleRankingSelect(response.id, 2)}
                              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                rankings[response.id] === 2
                                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/50'
                                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-cyan-100 dark:hover:bg-cyan-900'
                              }`}
                            >
                              2nd Best
                            </button>
                            <button
                              onClick={() => handleRankingSelect(response.id, 3)}
                              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                rankings[response.id] === 3
                                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/50'
                                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-orange-100 dark:hover:bg-orange-900'
                              }`}
                            >
                              3rd Best
                            </button>
                          </div>
                        </div>
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
                className="w-full px-4 py-3 pr-14 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              <button
                type="submit"
                disabled={submitting || !queryText.trim()}
                className="absolute right-3 bottom-3 p-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
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
