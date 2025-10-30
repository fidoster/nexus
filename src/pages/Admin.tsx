import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import ThemeToggle from '../components/ThemeToggle';

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

interface SystemPrompt {
  id: string;
  name: string;
  prompt_text: string;
  max_tokens: number;
  temperature: number;
  is_active: boolean;
  created_at: string;
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
  const [selectedRatings, setSelectedRatings] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'created_at', direction: 'desc' });

  // System Prompt state
  const [systemPrompts, setSystemPrompts] = useState<SystemPrompt[]>([]);
  const [editingPrompt, setEditingPrompt] = useState<SystemPrompt | null>(null);
  const [newPrompt, setNewPrompt] = useState({
    name: '',
    prompt_text: '',
    max_tokens: 500,
    temperature: 0.7
  });

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  useEffect(() => {
    if (activeTab === 'settings') {
      loadSystemPrompts();
    }
  }, [activeTab]);

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
        { id: '1', service: 'OpenAI (GPT)', key: '', isActive: false },
        { id: '2', service: 'Anthropic (Claude)', key: '', isActive: false },
        { id: '3', service: 'Google (Gemini)', key: '', isActive: false },
        { id: '4', service: 'Meta (Llama)', key: '', isActive: false },
        { id: '5', service: 'Mistral AI', key: '', isActive: false },
        { id: '6', service: 'Perplexity', key: '', isActive: false },
        { id: '7', service: 'Cohere', key: '', isActive: false },
        { id: '8', service: 'DeepSeek', key: '', isActive: false },
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
          responses(
            id,
            model_name,
            content,
            queries(
              id,
              content,
              user_id
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (ratingsError) throw ratingsError;

      // Fetch user emails separately and map them
      const userIds = [...new Set(allRatings?.map((r: any) => r.responses?.queries?.user_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);

      // Create a map of user_id to email
      const userEmailMap = profiles?.reduce((acc: any, profile: any) => {
        acc[profile.id] = profile.email;
        return acc;
      }, {}) || {};

      // Attach emails to ratings
      allRatings?.forEach((rating: any) => {
        if (rating.responses?.queries) {
          rating.responses.queries.user_email = userEmailMap[rating.responses.queries.user_id];
        }
      });

      // Calculate model performance statistics
      const modelStats: any = {};
      allRatings?.forEach((rating: any) => {
        const modelName = rating.responses?.model_name;
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
        rating.responses?.queries?.user_email || 'N/A',
        `"${rating.responses?.queries?.content?.replace(/"/g, '""') || 'N/A'}"`,
        rating.responses?.model_name || 'N/A',
        rating.score,
        `"${rating.responses?.content?.substring(0, 50).replace(/"/g, '""') || 'N/A'}..."`,
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

  const toggleSelectRating = (ratingId: string) => {
    const newSelected = new Set(selectedRatings);
    if (newSelected.has(ratingId)) {
      newSelected.delete(ratingId);
    } else {
      newSelected.add(ratingId);
    }
    setSelectedRatings(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedRatings.size === analyticsData?.allRatings?.length) {
      setSelectedRatings(new Set());
    } else {
      const allIds = new Set<string>(analyticsData?.allRatings?.map((r: any) => r.id as string) || []);
      setSelectedRatings(allIds);
    }
  };

  const deleteSelectedRatings = async () => {
    if (selectedRatings.size === 0) {
      alert('Please select at least one evaluation to delete.');
      return;
    }

    if (!confirm(`Delete ${selectedRatings.size} selected evaluation(s)? This cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('ratings')
        .delete()
        .in('id', Array.from(selectedRatings))
        .select();

      if (error) {
        console.error('Delete error details:', error);
        throw new Error(`${error.message}\n\nThis might be due to missing permissions. Please ensure RLS policies allow admins to delete ratings.`);
      }

      alert(`✅ Deleted ${selectedRatings.size} evaluation(s) successfully!`);
      setSelectedRatings(new Set());
      await loadAnalytics();
    } catch (err: any) {
      console.error('Error deleting ratings:', err);
      alert(`❌ Failed to delete evaluations.\n\n${err.message || 'Unknown error'}`);
    }
  };

  const deleteRating = async (ratingId: string) => {
    if (!confirm('Delete this evaluation? This cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('ratings')
        .delete()
        .eq('id', ratingId)
        .select();

      if (error) {
        console.error('Delete error details:', error);
        throw new Error(`${error.message}\n\nThis might be due to missing permissions. Please ensure RLS policies allow admins to delete ratings.`);
      }

      alert('✅ Evaluation deleted successfully!');
      await loadAnalytics();
    } catch (err: any) {
      console.error('Error deleting rating:', err);
      alert(`❌ Failed to delete evaluation.\n\n${err.message || 'Unknown error'}`);
    }
  };

  const deleteAllEvaluations = async () => {
    if (!confirm('⚠️ WARNING: This will permanently delete ALL queries, responses, and ratings. This action cannot be undone. Are you sure?')) {
      return;
    }

    try {
      // Delete in order: ratings → responses → queries (due to foreign keys)
      const { error: ratingsError } = await supabase.from('ratings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (ratingsError) throw ratingsError;

      const { error: responsesError } = await supabase.from('responses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (responsesError) throw responsesError;

      const { error: queriesError } = await supabase.from('queries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (queriesError) throw queriesError;

      alert('✅ All evaluation data has been deleted successfully!');
      setAnalyticsData(null); // Clear analytics display
    } catch (err) {
      console.error('Error deleting evaluations:', err);
      alert('❌ Failed to delete evaluation data. Check console for details.');
    }
  };

  const sortData = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedRatings = () => {
    if (!analyticsData?.allRatings) return [];

    const sorted = [...analyticsData.allRatings].sort((a: any, b: any) => {
      let aVal, bVal;

      switch (sortConfig.key) {
        case 'student':
          aVal = a.responses?.queries?.user_email || '';
          bVal = b.responses?.queries?.user_email || '';
          break;
        case 'question':
          aVal = a.responses?.queries?.content || '';
          bVal = b.responses?.queries?.content || '';
          break;
        case 'model':
          aVal = a.responses?.model_name || '';
          bVal = b.responses?.model_name || '';
          break;
        case 'rank':
          aVal = a.score;
          bVal = b.score;
          break;
        case 'created_at':
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  };

  // Reserved for future use - delete query with cascade
  // const deleteQueryAndRelated = async (queryId: string) => {
  //   if (!confirm('Delete this query and all its responses/ratings?')) {
  //     return;
  //   }
  //
  //   try {
  //     // Responses and ratings will cascade delete due to foreign keys
  //     const { error } = await supabase
  //       .from('queries')
  //       .delete()
  //       .eq('id', queryId);
  //
  //     if (error) throw error;
  //
  //     alert('✅ Query deleted successfully!');
  //     await loadAnalytics(); // Reload data
  //   } catch (err) {
  //     console.error('Error deleting query:', err);
  //     alert('❌ Failed to delete query.');
  //   }
  // };

  // System Prompt Functions
  const loadSystemPrompts = async () => {
    try {
      const { data, error } = await supabase
        .from('system_prompts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSystemPrompts(data || []);
    } catch (err) {
      console.error('Error loading system prompts:', err);
    }
  };

  const createSystemPrompt = async () => {
    if (!newPrompt.name || !newPrompt.prompt_text) {
      alert('Please fill in both name and prompt text');
      return;
    }

    try {
      const { error } = await supabase
        .from('system_prompts')
        .insert({
          name: newPrompt.name,
          prompt_text: newPrompt.prompt_text,
          max_tokens: newPrompt.max_tokens,
          temperature: newPrompt.temperature,
          is_active: false,
          created_by: user?.id
        });

      if (error) throw error;

      alert('✅ System prompt created successfully!');
      setNewPrompt({ name: '', prompt_text: '', max_tokens: 500, temperature: 0.7 });
      await loadSystemPrompts();
    } catch (err) {
      console.error('Error creating system prompt:', err);
      alert('❌ Failed to create system prompt.');
    }
  };

  const updateSystemPrompt = async () => {
    if (!editingPrompt) return;

    try {
      const { error } = await supabase
        .from('system_prompts')
        .update({
          name: editingPrompt.name,
          prompt_text: editingPrompt.prompt_text,
          max_tokens: editingPrompt.max_tokens,
          temperature: editingPrompt.temperature,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingPrompt.id);

      if (error) throw error;

      alert('✅ System prompt updated successfully!');
      setEditingPrompt(null);
      await loadSystemPrompts();
    } catch (err) {
      console.error('Error updating system prompt:', err);
      alert('❌ Failed to update system prompt.');
    }
  };

  const activateSystemPrompt = async (promptId: string) => {
    try {
      const { error } = await supabase
        .from('system_prompts')
        .update({ is_active: true })
        .eq('id', promptId);

      if (error) throw error;

      alert('✅ System prompt activated!');
      await loadSystemPrompts();
    } catch (err) {
      console.error('Error activating system prompt:', err);
      alert('❌ Failed to activate system prompt.');
    }
  };

  const deleteSystemPrompt = async (promptId: string) => {
    if (!confirm('Delete this system prompt?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('system_prompts')
        .delete()
        .eq('id', promptId);

      if (error) throw error;

      alert('✅ System prompt deleted!');
      await loadSystemPrompts();
    } catch (err) {
      console.error('Error deleting system prompt:', err);
      alert('❌ Failed to delete system prompt.');
    }
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold text-red-600 dark:text-red-500">Nexus Admin Panel</h1>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                Dashboard
              </button>
              <ThemeToggle />
              <button
                onClick={handleSignOut}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-8 border border-gray-200 dark:border-gray-700 transition-colors">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome, Admin!</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage users, configure API keys, and control platform settings.
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-8 border border-gray-200 dark:border-gray-700 transition-colors">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('users')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'users'
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                👥 User Management
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'analytics'
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                📊 Analytics & Research
              </button>
              <button
                onClick={() => setActiveTab('api-keys')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'api-keys'
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                🔑 API Keys
              </button>
              <button
                onClick={() => setActiveTab('models')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'models'
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                🤖 AI Models
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'settings'
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
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
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">User Management</h3>
                {users.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">No users found or unable to load users.</p>
                    <button
                      onClick={loadAllUsers}
                      className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      Retry Loading Users
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Role</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Created</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {users.map((u) => (
                          <tr key={u.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{u.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                u.role === 'admin' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                                u.role === 'instructor' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' :
                                'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {new Date(u.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <select
                                value={u.role}
                                onChange={(e) => updateUserRole(u.id, e.target.value)}
                                disabled={u.id === user?.id}
                                className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm disabled:opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
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
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">API Keys Configuration</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Configure API keys for various AI model providers. These keys enable Nexus to fetch responses from different AI models.
                </p>
                <div className="space-y-6">
                  {apiKeys.map((item) => (
                    <div key={item.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{item.service}</h4>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            item.isActive ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
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
                          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
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
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">AI Models Configuration</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Select which AI models to use for generating responses. Models will only work if their API keys are configured.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { name: 'GPT', provider: 'OpenAI', icon: '🤖' },
                    { name: 'Claude', provider: 'Anthropic', icon: '🧠' },
                    { name: 'Gemini', provider: 'Google', icon: '✨' },
                    { name: 'Llama', provider: 'Meta', icon: '🦙' },
                    { name: 'Mistral', provider: 'Mistral AI', icon: '🌪️' },
                    { name: 'Perplexity', provider: 'Perplexity', icon: '🔍' },
                    { name: 'Cohere', provider: 'Cohere', icon: '🌐' },
                    { name: 'DeepSeek', provider: 'DeepSeek', icon: '🔬' }
                  ].map((model) => (
                    <div key={model.name} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between hover:shadow-md transition-shadow bg-white dark:bg-gray-800">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{model.icon}</span>
                        <div>
                          <span className="font-semibold block text-gray-900 dark:text-white">{model.name}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{model.provider}</span>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked={['GPT', 'Claude', 'Gemini'].includes(model.name)} />
                        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>Note:</strong> Currently using mock responses. Enable actual API integration by configuring API keys in the API Keys tab. You can select which models to include in evaluations.
                  </p>
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics & Research Data</h3>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Comprehensive insights into student evaluations and AI model performance</p>
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
                  <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <svg className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Analytics Data Loaded</h4>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">Click "Refresh Data" to load analytics</p>
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
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        🏆 Model Performance Rankings
                        <span className="text-sm font-normal text-gray-500 dark:text-gray-400">(Lower average rank = Better performance)</span>
                      </h4>
                      <div className="grid md:grid-cols-3 gap-4">
                        {Object.values(analyticsData.modelStats)
                          .sort((a: any, b: any) => parseFloat(a.averageRank) - parseFloat(b.averageRank))
                          .map((model: any, index: number) => (
                            <div key={model.name} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow dark:bg-gray-700">
                              <div className="flex items-center justify-between mb-3">
                                <h5 className="font-semibold text-gray-900 dark:text-white">{model.name}</h5>
                                {index === 0 && <span className="text-2xl">🥇</span>}
                                {index === 1 && <span className="text-2xl">🥈</span>}
                                {index === 2 && <span className="text-2xl">🥉</span>}
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600 dark:text-gray-300">Average Rank:</span>
                                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{model.averageRank}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-yellow-600 dark:text-yellow-400">🥇 1st Place:</span>
                                  <span className="font-semibold dark:text-gray-200">{model.rankings[1]}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-cyan-600 dark:text-cyan-400">🥈 2nd Place:</span>
                                  <span className="font-semibold dark:text-gray-200">{model.rankings[2]}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-orange-600 dark:text-orange-400">🥉 3rd Place:</span>
                                  <span className="font-semibold dark:text-gray-200">{model.rankings[3]}</span>
                                </div>
                                <div className="pt-2 border-t border-gray-200 dark:border-gray-600 flex justify-between text-sm">
                                  <span className="text-gray-600 dark:text-gray-300">Total Ratings:</span>
                                  <span className="font-bold dark:text-gray-200">{model.totalRatings}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Detailed Student Responses Table */}
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white">📋 Detailed Evaluation Records</h4>
                        <div className="flex items-center gap-2">
                          {selectedRatings.size > 0 && (
                            <>
                              <span className="text-sm text-gray-600 dark:text-gray-400">{selectedRatings.size} selected</span>
                              <button
                                onClick={deleteSelectedRatings}
                                className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1"
                              >
                                🗑️ Delete Selected
                              </button>
                            </>
                          )}
                          <button
                            onClick={deleteAllEvaluations}
                            className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1"
                            title="Delete all evaluation data"
                          >
                            🗑️ Delete All
                          </button>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                              <th className="px-4 py-3 text-left">
                                <input
                                  type="checkbox"
                                  checked={selectedRatings.size === analyticsData.allRatings?.length && analyticsData.allRatings?.length > 0}
                                  onChange={toggleSelectAll}
                                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                              </th>
                              <th
                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                onClick={() => sortData('student')}
                              >
                                Student {sortConfig.key === 'student' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                              </th>
                              <th
                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                onClick={() => sortData('question')}
                              >
                                Question {sortConfig.key === 'question' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                              </th>
                              <th
                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                onClick={() => sortData('model')}
                              >
                                Model {sortConfig.key === 'model' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                              </th>
                              <th
                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                onClick={() => sortData('rank')}
                              >
                                Rank {sortConfig.key === 'rank' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Response Preview</th>
                              <th
                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                onClick={() => sortData('created_at')}
                              >
                                Date {sortConfig.key === 'created_at' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {getSortedRatings().slice(0, 50).map((rating: any) => (
                              <tr key={rating.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${selectedRatings.has(rating.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                                <td className="px-4 py-3">
                                  <input
                                    type="checkbox"
                                    checked={selectedRatings.has(rating.id)}
                                    onChange={() => toggleSelectRating(rating.id)}
                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                  />
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-200">
                                  {rating.responses?.queries?.user_email?.split('@')[0] || 'N/A'}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate" title={rating.responses?.queries?.content}>
                                  {rating.responses?.queries?.content || 'N/A'}
                                </td>
                                <td className="px-4 py-3">
                                  <span className="px-2 py-1 text-xs font-semibold bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded">
                                    {rating.responses?.model_name || 'N/A'}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-1 text-xs font-semibold rounded ${
                                    rating.score === 1 ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                                    rating.score === 2 ? 'bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200' :
                                    'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200'
                                  }`}>
                                    {rating.score === 1 ? '🥇 1st' : rating.score === 2 ? '🥈 2nd' : '🥉 3rd'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate" title={rating.responses?.content}>
                                  {rating.responses?.content?.substring(0, 50) || 'N/A'}...
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                  {new Date(rating.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3">
                                  <button
                                    onClick={() => deleteRating(rating.id)}
                                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                                    title="Delete this evaluation"
                                  >
                                    🗑️
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {analyticsData.allRatings?.length > 50
                            ? `Showing first 50 of ${analyticsData.allRatings.length} evaluations`
                            : `Showing all ${analyticsData.allRatings?.length || 0} evaluations`}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          💡 Tip: Click column headers to sort • Select rows to bulk delete
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">System Prompt Management</h3>

                {/* Create New Prompt */}
                <div className="mb-8 border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800">
                  <h4 className="font-semibold mb-4 text-gray-900 dark:text-white text-lg">Create New System Prompt</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Prompt Name
                      </label>
                      <input
                        type="text"
                        value={newPrompt.name}
                        onChange={(e) => setNewPrompt({ ...newPrompt, name: e.target.value })}
                        placeholder="e.g., Short Responses, Academic Style, Technical Focus"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        System Prompt Text
                      </label>
                      <textarea
                        value={newPrompt.prompt_text}
                        onChange={(e) => setNewPrompt({ ...newPrompt, prompt_text: e.target.value })}
                        placeholder="Enter the system prompt that will guide AI responses. Include instructions for tone, length, style, etc."
                        rows={6}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Max Tokens (Response Length)
                        </label>
                        <input
                          type="number"
                          value={newPrompt.max_tokens}
                          onChange={(e) => setNewPrompt({ ...newPrompt, max_tokens: parseInt(e.target.value) })}
                          min={50}
                          max={2000}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">50-2000 tokens (~40-1600 words)</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Temperature (Creativity)
                        </label>
                        <input
                          type="number"
                          value={newPrompt.temperature}
                          onChange={(e) => setNewPrompt({ ...newPrompt, temperature: parseFloat(e.target.value) })}
                          min={0}
                          max={2}
                          step={0.1}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">0.0 = Focused, 2.0 = Creative</p>
                      </div>
                    </div>

                    <button
                      onClick={createSystemPrompt}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold"
                    >
                      Create Prompt
                    </button>
                  </div>
                </div>

                {/* Existing Prompts */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white text-lg">Existing System Prompts</h4>
                  {systemPrompts.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <p className="text-gray-600 dark:text-gray-400">No system prompts found. Create one above!</p>
                    </div>
                  ) : (
                    systemPrompts.map((prompt) => (
                      <div
                        key={prompt.id}
                        className={`border rounded-lg p-4 ${
                          prompt.is_active
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                        }`}
                      >
                        {editingPrompt?.id === prompt.id ? (
                          <div className="space-y-4">
                            <input
                              type="text"
                              value={editingPrompt.name}
                              onChange={(e) => setEditingPrompt({ ...editingPrompt, name: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                            />
                            <textarea
                              value={editingPrompt.prompt_text}
                              onChange={(e) => setEditingPrompt({ ...editingPrompt, prompt_text: e.target.value })}
                              rows={6}
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                            />
                            <div className="grid md:grid-cols-2 gap-4">
                              <input
                                type="number"
                                value={editingPrompt.max_tokens}
                                onChange={(e) => setEditingPrompt({ ...editingPrompt, max_tokens: parseInt(e.target.value) })}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                              />
                              <input
                                type="number"
                                value={editingPrompt.temperature}
                                onChange={(e) => setEditingPrompt({ ...editingPrompt, temperature: parseFloat(e.target.value) })}
                                step={0.1}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={updateSystemPrompt}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingPrompt(null)}
                                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h5 className="font-semibold text-lg text-gray-900 dark:text-white">{prompt.name}</h5>
                                  {prompt.is_active && (
                                    <span className="px-2 py-1 text-xs font-semibold bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full">
                                      ACTIVE
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-3">{prompt.prompt_text}</p>
                                <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                                  <span>Max Tokens: {prompt.max_tokens}</span>
                                  <span>Temperature: {prompt.temperature}</span>
                                  <span>Created: {new Date(prompt.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {!prompt.is_active && (
                                <button
                                  onClick={() => activateSystemPrompt(prompt.id)}
                                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                                >
                                  Activate
                                </button>
                              )}
                              <button
                                onClick={() => setEditingPrompt(prompt)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteSystemPrompt(prompt.id)}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                              >
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Info Box */}
                <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <h5 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">ℹ️ How System Prompts Work</h5>
                  <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                    <li>• System prompts control how AI models respond to student questions</li>
                    <li>• Only ONE prompt can be active at a time</li>
                    <li>• Use max_tokens to limit response length (prevents overly long answers)</li>
                    <li>• Temperature controls creativity: Lower = More focused, Higher = More creative</li>
                    <li>• Students will not see the system prompt, only the AI responses</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
