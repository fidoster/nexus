/**
 * Shared Conversation View
 * Public read-only view of a shared conversation
 */

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getSharedConversation, trackConversationView } from '../utils/shareConversation';
import ThemeToggle from '../components/ThemeToggle';

interface SharedConversationData {
  id: string;
  title: string | null;
  created_at: string;
  queries: Array<{
    id: string;
    content: string;
    created_at: string;
    responses: Array<{
      id: string;
      model_name: string;
      content: string;
      created_at: string;
      ratings: Array<{
        id: string;
        score: number;
      }>;
    }>;
  }>;
}

export default function SharedConversation() {
  const { token } = useParams<{ token: string }>();
  const { user } = useAuth();
  const [conversation, setConversation] = useState<SharedConversationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) {
      loadConversation();
    }
  }, [token]);

  const loadConversation = async () => {
    if (!token) return;

    try {
      const data = await getSharedConversation(token);
      setConversation(data);

      // Track the view
      await trackConversationView(data.id, user?.id);
    } catch (err: any) {
      setError(err.message || 'Failed to load shared conversation');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading shared conversation...</p>
        </div>
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Conversation Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error || 'This conversation may have been removed or the link is invalid.'}
          </p>
          <Link
            to="/"
            className="inline-block px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  const firstQuery = conversation.queries?.[0];
  const title = firstQuery?.content.slice(0, 100) || conversation.title || 'Shared Conversation';

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors">
      {/* Enhanced background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950"></div>
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 dark:from-indigo-600/10 dark:to-purple-600/10 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg blur opacity-50"></div>
                  <div className="relative w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-sm">N</span>
                  </div>
                </div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Nexus
                </h1>
              </Link>
              <span className="text-sm text-gray-500 dark:text-gray-400">| Shared Conversation</span>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              {!user && (
                <Link
                  to="/signup"
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold"
                >
                  Sign Up
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-5xl mx-auto px-4 py-8">
          {/* Title */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{title}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Shared on {new Date(conversation.created_at).toLocaleDateString()}
            </p>
          </div>

          {/* Read-only conversation view */}
          <div className="space-y-8">
            {conversation.queries.map((query) => (
              <div key={query.id} className="space-y-4">
                {/* User Query */}
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-medium">U</span>
                  </div>
                  <div className="flex-1 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-4 border border-gray-200/50 dark:border-gray-700/50">
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{query.content}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {new Date(query.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* AI Responses */}
                {query.responses.length > 0 && (
                  <div className="ml-12 space-y-4">
                    <div className={`grid gap-4 ${
                      query.responses.length === 1
                        ? 'grid-cols-1'
                        : query.responses.length === 2
                        ? 'md:grid-cols-2'
                        : 'md:grid-cols-2 lg:grid-cols-3'
                    }`}>
                      {query.responses.map((response, index) => {
                        const avgScore = response.ratings.length > 0
                          ? response.ratings.reduce((sum, r) => sum + r.score, 0) / response.ratings.length
                          : null;

                        return (
                          <div
                            key={response.id}
                            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-4 border border-gray-200/50 dark:border-gray-700/50"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                  <span className="text-white text-xs font-bold">{String.fromCharCode(65 + index)}</span>
                                </div>
                                <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm">Model {String.fromCharCode(65 + index)}</span>
                              </div>
                              {avgScore && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  Avg: {avgScore.toFixed(1)}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{response.content}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* CTA */}
          {!user && (
            <div className="mt-12 text-center bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-8 border border-indigo-200/50 dark:border-indigo-800/50">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Want to try this yourself?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Compare responses from multiple AI models and make your own evaluations
              </p>
              <Link
                to="/signup"
                className="inline-block px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold"
              >
                Get Started Free
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
