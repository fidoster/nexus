import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type TabType = 'submit' | 'rate' | 'history';

interface Query {
  id: string;
  content: string;
  status: string;
  created_at: string;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('submit');
  const [queryText, setQueryText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [myQueries, setMyQueries] = useState<Query[]>([]);

  useEffect(() => {
    checkAdminStatus();
    loadMyQueries();
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

  const loadMyQueries = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('queries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setMyQueries(data);
    }
  };

  const handleSubmitQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !queryText.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('queries')
        .insert([
          {
            user_id: user.id,
            content: queryText.trim(),
            status: 'pending'
          }
        ]);

      if (error) throw error;

      setQueryText('');
      loadMyQueries();
      setActiveTab('history');
      alert('Query submitted successfully! AI responses will be generated shortly.');
    } catch (err) {
      console.error('Error submitting query:', err);
      alert('Failed to submit query. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold text-indigo-600">Nexus</h1>
            <div className="flex gap-3">
              {isAdmin && (
                <button
                  onClick={() => navigate('/admin')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Admin Panel
                </button>
              )}
              <button
                onClick={handleSignOut}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome, {user?.email?.split('@')[0]}!
          </h2>
          <p className="text-gray-600">
            Submit queries, rate AI responses, and explore different models' capabilities.
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('submit')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'submit'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📝 Submit Query
              </button>
              <button
                onClick={() => setActiveTab('rate')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'rate'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                ⭐ Rate Responses
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'history'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📊 My History
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Submit Query Tab */}
            {activeTab === 'submit' && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Submit a New Query</h3>
                <p className="text-gray-600 mb-6">
                  Ask a question and receive responses from multiple AI models. All responses will be anonymous - you won't know which model generated which response.
                </p>
                <form onSubmit={handleSubmitQuery} className="space-y-4">
                  <div>
                    <label htmlFor="query" className="block text-sm font-medium text-gray-700 mb-2">
                      Your Question
                    </label>
                    <textarea
                      id="query"
                      value={queryText}
                      onChange={(e) => setQueryText(e.target.value)}
                      rows={6}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                      placeholder="e.g., Explain quantum computing in simple terms..."
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      type="submit"
                      disabled={submitting || !queryText.trim()}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                    >
                      {submitting ? 'Submitting...' : 'Submit Query'}
                    </button>
                    {queryText.trim() && (
                      <span className="text-sm text-gray-500">
                        {queryText.trim().split(/\s+/).length} words
                      </span>
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* Rate Responses Tab */}
            {activeTab === 'rate' && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Rate AI Responses</h3>
                <p className="text-gray-600 mb-6">
                  View and rate responses from AI models. Help improve the evaluation by providing honest ratings.
                </p>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                  <div className="text-6xl mb-4">⭐</div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">No Responses to Rate Yet</h4>
                  <p className="text-gray-600">
                    Submit a query first, and you'll be able to rate the AI responses here once they're generated.
                  </p>
                  <button
                    onClick={() => setActiveTab('submit')}
                    className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Submit Your First Query
                  </button>
                </div>
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">My Query History</h3>
                <p className="text-gray-600 mb-6">
                  View all your submitted queries and their status.
                </p>
                {myQueries.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                    <div className="text-6xl mb-4">📊</div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">No Queries Yet</h4>
                    <p className="text-gray-600">
                      You haven't submitted any queries yet. Start by submitting your first question!
                    </p>
                    <button
                      onClick={() => setActiveTab('submit')}
                      className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      Submit Your First Query
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myQueries.map((query) => (
                      <div key={query.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-gray-900 flex-1">{query.content}</p>
                          <span className={`ml-4 px-3 py-1 text-xs font-semibold rounded-full ${
                            query.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {query.status === 'completed' ? 'Completed' : 'Pending'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <span>{new Date(query.created_at).toLocaleString()}</span>
                          {query.status === 'completed' && (
                            <button
                              onClick={() => setActiveTab('rate')}
                              className="text-indigo-600 hover:text-indigo-700 font-semibold"
                            >
                              View Responses →
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
