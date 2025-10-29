import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    setIsAdmin(profile?.role === 'admin');
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
            <h1 className="text-2xl font-bold text-indigo-600">Nexus Dashboard</h1>
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
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to your Dashboard
          </h2>
          <p className="text-gray-600">
            Logged in as: <span className="font-semibold">{user?.email}</span>
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="text-3xl mb-4">📝</div>
            <h3 className="text-xl font-semibold mb-2">Submit Query</h3>
            <p className="text-gray-600 mb-4">
              Submit a new query to get responses from multiple AI models.
            </p>
            <button className="text-indigo-600 hover:text-indigo-700 font-semibold">
              Coming soon →
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="text-3xl mb-4">⭐</div>
            <h3 className="text-xl font-semibold mb-2">Rate Responses</h3>
            <p className="text-gray-600 mb-4">
              View and rate anonymous responses from AI models.
            </p>
            <button className="text-indigo-600 hover:text-indigo-700 font-semibold">
              Coming soon →
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="text-3xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-2">My History</h3>
            <p className="text-gray-600 mb-4">
              View your query history and ratings you've submitted.
            </p>
            <button className="text-indigo-600 hover:text-indigo-700 font-semibold">
              Coming soon →
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
