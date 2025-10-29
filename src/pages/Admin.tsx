import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface UserProfile {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

interface APIKey {
  id: string;
  service: string;
  key: string;
  isActive: boolean;
}

type TabType = 'users' | 'api-keys' | 'settings' | 'models' | 'analytics';

export default function Admin() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [apiKeys, setAPIKeys] = useState<APIKey[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  const checkAdminAccess = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      console.log('Admin check - Profile data:', data);
      console.log('Admin check - Error:', error);

      if (error || !data || data.role !== 'admin') {
        navigate('/access-denied', { replace: true });
        return;
      }

      // Load initial data
      await loadAllUsers();
      loadAPIKeys();
    } catch (err) {
      console.error('Error checking admin access:', err);
      navigate('/access-denied', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const loadAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('Users data:', data);
      console.log('Users error:', error);

      if (error) {
        console.error('Error loading users:', error);
        return;
      }
      setUsers(data || []);
    } catch (err) {
      console.error('Error in loadAllUsers:', err);
    }
  };

  const loadAPIKeys = () => {
    // For now, load from localStorage (later we'll use Supabase)
    const stored = localStorage.getItem('nexus_api_keys');
    if (stored) {
      setAPIKeys(JSON.parse(stored));
    } else {
      // Default empty keys
      setAPIKeys([
        { id: '1', service: 'OpenAI', key: '', isActive: false },
        { id: '2', service: 'Anthropic (Claude)', key: '', isActive: false },
        { id: '3', service: 'Google (Gemini)', key: '', isActive: false },
        { id: '4', service: 'Meta (Llama)', key: '', isActive: false },
      ]);
    }
  };

  const saveAPIKey = (id: string, key: string) => {
    const updated = apiKeys.map(item =>
      item.id === id ? { ...item, key, isActive: key.length > 0 } : item
    );
    setAPIKeys(updated);
    localStorage.setItem('nexus_api_keys', JSON.stringify(updated));
    alert('API key saved successfully!');
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      await loadAllUsers();
      alert(`User role updated to ${newRole}`);
    } catch (err) {
      console.error('Error updating user role:', err);
      alert('Failed to update user role');
    }
  };

  const loadAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      // Fetch comprehensive analytics data
      const { data: allRatings, error: ratingsError } = await supabase
        .from('ratings')
        .select(`
          *,
          response:responses(
            id,
            model_name,
            content,
            query:queries(
              id,
              content,
              user:profiles(email)
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (ratingsError) throw ratingsError;

      // Calculate model performance statistics
      const modelStats: any = {};
      allRatings?.forEach((rating: any) => {
        const modelName = rating.response?.model_name;
        if (!modelName) return;

        if (!modelStats[modelName]) {
          modelStats[modelName] = {
            name: modelName,
            rankings: { 1: 0, 2: 0, 3: 0 },
            totalRatings: 0,
            averageRank: 0
          };
        }

        modelStats[modelName].rankings[rating.score]++;
        modelStats[modelName].totalRatings++;
      });

      // Calculate average rankings
      Object.keys(modelStats).forEach(model => {
        const stats = modelStats[model];
        const weightedSum = stats.rankings[1] * 1 + stats.rankings[2] * 2 + stats.rankings[3] * 3;
        stats.averageRank = stats.totalRatings > 0 ? (weightedSum / stats.totalRatings).toFixed(2) : 0;
      });

      setAnalyticsData({
        allRatings,
        modelStats,
        totalEvaluations: allRatings?.length || 0
      });
    } catch (err) {
      console.error('Error loading analytics:', err);
      alert('Failed to load analytics data');
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const exportToCSV = () => {
    if (!analyticsData?.allRatings) return;

    const csvRows = [
      ['Student Email', 'Question', 'Model', 'Rank', 'Response Preview', 'Rated At'].join(',')
    ];

    analyticsData.allRatings.forEach((rating: any) => {
      const row = [
        rating.response?.query?.user?.email || 'N/A',
        `"${rating.response?.query?.content?.replace(/"/g, '""') || 'N/A'}"`,
        rating.response?.model_name || 'N/A',
        rating.score,
        `"${rating.response?.content?.substring(0, 50).replace(/"/g, '""') || 'N/A'}..."`,
        new Date(rating.created_at).toLocaleString()
      ].join(',');
      csvRows.push(row);
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold text-red-600">Nexus Admin Panel</h1>
            <div className="flex gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 text-gray-700 hover:text-indigo-600 transition-colors"
              >
                Dashboard
              </button>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome, Admin!</h2>
          <p className="text-gray-600">
            Manage users, configure API keys, and control platform settings.
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('users')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'users'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                👥 User Management
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'analytics'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📊 Analytics & Research
              </button>
              <button
                onClick={() => setActiveTab('api-keys')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'api-keys'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🔑 API Keys
              </button>
              <button
                onClick={() => setActiveTab('models')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'models'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🤖 AI Models
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'settings'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                ⚙️ Settings
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Users Tab */}
            {activeTab === 'users' && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">User Management</h3>
                {users.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No users found or unable to load users.</p>
                    <button
                      onClick={loadAllUsers}
                      className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      Retry Loading Users
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((u) => (
                          <tr key={u.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{u.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                u.role === 'admin' ? 'bg-red-100 text-red-800' :
                                u.role === 'instructor' ? 'bg-blue-100 text-blue-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(u.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <select
                                value={u.role}
                                onChange={(e) => updateUserRole(u.id, e.target.value)}
                                disabled={u.id === user?.id}
                                className="border border-gray-300 rounded px-2 py-1 text-sm disabled:opacity-50"
                              >
                                <option value="student">Student</option>
                                <option value="instructor">Instructor</option>
                                <option value="admin">Admin</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* API Keys Tab */}
            {activeTab === 'api-keys' && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">API Keys Configuration</h3>
                <p className="text-gray-600 mb-6">
                  Configure API keys for various AI model providers. These keys enable Nexus to fetch responses from different AI models.
                </p>
                <div className="space-y-6">
                  {apiKeys.map((item) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <h4 className="text-lg font-semibold">{item.service}</h4>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            item.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {item.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <input
                          type="password"
                          value={item.key}
                          onChange={(e) => {
                            const updated = apiKeys.map(k =>
                              k.id === item.id ? { ...k, key: e.target.value } : k
                            );
                            setAPIKeys(updated);
                          }}
                          placeholder="Enter API key"
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <button
                          onClick={() => saveAPIKey(item.id, item.key)}
                          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Models Tab */}
            {activeTab === 'models' && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">AI Models Configuration</h3>
                <p className="text-gray-600 mb-6">
                  Select which AI models to use for generating responses. Models will only work if their API keys are configured.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  {['GPT (OpenAI)', 'Claude (Anthropic)', 'Gemini (Google)', 'Llama (Meta)'].map((model) => (
                    <div key={model} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                      <span className="font-medium">{model}</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Analytics & Research Data</h3>
                    <p className="text-gray-600 mt-1">Comprehensive insights into student evaluations and AI model performance</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={loadAnalytics}
                      disabled={loadingAnalytics}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition-colors flex items-center gap-2"
                    >
                      {loadingAnalytics ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Loading...
                        </>
                      ) : (
                        <>
                          🔄 Refresh Data
                        </>
                      )}
                    </button>
                    <button
                      onClick={exportToCSV}
                      disabled={!analyticsData}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors flex items-center gap-2"
                    >
                      📥 Export CSV
                    </button>
                  </div>
                </div>

                {!analyticsData ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">No Analytics Data Loaded</h4>
                    <p className="text-gray-600 mb-4">Click "Refresh Data" to load analytics</p>
                    <button
                      onClick={loadAnalytics}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      Load Analytics
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-blue-600">Total Evaluations</p>
                            <p className="text-3xl font-bold text-blue-900 mt-1">{analyticsData.totalEvaluations}</p>
                          </div>
                          <div className="text-4xl">📊</div>
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-green-600">Active Students</p>
                            <p className="text-3xl font-bold text-green-900 mt-1">
                              {new Set(analyticsData.allRatings?.map((r: any) => r.user_id)).size}
                            </p>
                          </div>
                          <div className="text-4xl">👥</div>
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-purple-600">Models Tested</p>
                            <p className="text-3xl font-bold text-purple-900 mt-1">
                              {Object.keys(analyticsData.modelStats).length}
                            </p>
                          </div>
                          <div className="text-4xl">🤖</div>
                        </div>
                      </div>
                    </div>

                    {/* Model Performance Comparison */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                      <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        🏆 Model Performance Rankings
                        <span className="text-sm font-normal text-gray-500">(Lower average rank = Better performance)</span>
                      </h4>
                      <div className="grid md:grid-cols-3 gap-4">
                        {Object.values(analyticsData.modelStats)
                          .sort((a: any, b: any) => parseFloat(a.averageRank) - parseFloat(b.averageRank))
                          .map((model: any, index: number) => (
                            <div key={model.name} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                              <div className="flex items-center justify-between mb-3">
                                <h5 className="font-semibold text-gray-900">{model.name}</h5>
                                {index === 0 && <span className="text-2xl">🥇</span>}
                                {index === 1 && <span className="text-2xl">🥈</span>}
                                {index === 2 && <span className="text-2xl">🥉</span>}
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">Average Rank:</span>
                                  <span className="font-bold text-indigo-600">{model.averageRank}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-yellow-600">🥇 1st Place:</span>
                                  <span className="font-semibold">{model.rankings[1]}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-cyan-600">🥈 2nd Place:</span>
                                  <span className="font-semibold">{model.rankings[2]}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-orange-600">🥉 3rd Place:</span>
                                  <span className="font-semibold">{model.rankings[3]}</span>
                                </div>
                                <div className="pt-2 border-t border-gray-200 flex justify-between text-sm">
                                  <span className="text-gray-600">Total Ratings:</span>
                                  <span className="font-bold">{model.totalRatings}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Detailed Student Responses Table */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                      <h4 className="text-lg font-bold text-gray-900 mb-4">📋 Detailed Evaluation Records</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Question</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Response Preview</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {analyticsData.allRatings?.slice(0, 50).map((rating: any, idx: number) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {rating.response?.query?.user?.email?.split('@')[0] || 'N/A'}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                                  {rating.response?.query?.content || 'N/A'}
                                </td>
                                <td className="px-4 py-3">
                                  <span className="px-2 py-1 text-xs font-semibold bg-indigo-100 text-indigo-800 rounded">
                                    {rating.response?.model_name || 'N/A'}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-1 text-xs font-semibold rounded ${
                                    rating.score === 1 ? 'bg-yellow-100 text-yellow-800' :
                                    rating.score === 2 ? 'bg-cyan-100 text-cyan-800' :
                                    'bg-orange-100 text-orange-800'
                                  }`}>
                                    {rating.score === 1 ? '🥇 1st' : rating.score === 2 ? '🥈 2nd' : '🥉 3rd'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                                  {rating.response?.content?.substring(0, 50) || 'N/A'}...
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                                  {new Date(rating.created_at).toLocaleDateString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {analyticsData.allRatings?.length > 50 && (
                        <p className="text-sm text-gray-500 mt-4 text-center">
                          Showing first 50 of {analyticsData.allRatings.length} evaluations. Export CSV for complete data.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Platform Settings</h3>
                <div className="space-y-6">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Maximum Responses per Query</h4>
                    <p className="text-sm text-gray-600 mb-3">How many AI models should respond to each query</p>
                    <input
                      type="number"
                      defaultValue={3}
                      min={1}
                      max={10}
                      className="w-32 px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Allow Anonymous Submissions</h4>
                    <p className="text-sm text-gray-600 mb-3">Allow students to submit queries anonymously</p>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Response Time Limit</h4>
                    <p className="text-sm text-gray-600 mb-3">Maximum time to wait for AI responses (seconds)</p>
                    <input
                      type="number"
                      defaultValue={30}
                      min={10}
                      max={120}
                      className="w-32 px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <button className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                    Save Settings
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
