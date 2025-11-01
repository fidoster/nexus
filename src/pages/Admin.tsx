import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import ThemeToggle from '../components/ThemeToggle';
import Modal from '../components/Modal';
import { BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

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

type TabType = 'users' | 'api-keys' | 'settings' | 'models' | 'analytics' | 'advanced-analytics' | 'research-insights';

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

  // Enabled Models state
  const [enabledModels, setEnabledModels] = useState<{[key: string]: boolean}>({});

  // App Settings state
  const [requireRating, setRequireRating] = useState(true);

  // Pagination state for Detailed Evaluation Records
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50); // Increased from 10 to 50 for better performance
  const [totalRatings, setTotalRatings] = useState(0);

  // Date range filtering state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal state
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

  const loadAllUsers = useCallback(async () => {
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
  }, []);

  const loadAPIKeys = useCallback(() => {
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
  }, []);

  const checkAdminAccess = useCallback(async () => {
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
  }, [user, navigate, loadAllUsers, loadAPIKeys]);

  useEffect(() => {
    checkAdminAccess();
  }, [checkAdminAccess]);

  const loadSystemPrompts = useCallback(async () => {
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
  }, []);

  const loadEnabledModels = useCallback(async () => {
    try {
      // First ensure table is initialized
      await initializeEnabledModels();

      const { data, error } = await supabase
        .from('enabled_models')
        .select('model_name, is_enabled')
        .order('display_order', { ascending: true });

      if (error) throw error;

      const modelsMap: {[key: string]: boolean} = {};
      data?.forEach(model => {
        modelsMap[model.model_name] = model.is_enabled;
      });
      setEnabledModels(modelsMap);
      console.log('Loaded enabled models:', modelsMap);
    } catch (err) {
      console.error('Error loading enabled models:', err);
      // If table doesn't exist yet, set defaults in UI
      setEnabledModels({
        'GPT': true,
        'Claude': true,
        'Gemini': true,
        'DeepSeek': false,
        'Mistral': false,
        'Groq': false,
        'Perplexity': false
      });
      setModalConfig({
        isOpen: true,
        title: 'Warning',
        message: 'Could not load model settings. Please ensure the enabled_models table exists in Supabase.',
        type: 'warning',
        confirmText: 'OK',
        onConfirm: undefined
      });
    }
  }, []);

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
    if (activeTab === 'settings') {
      loadSystemPrompts();
      loadAppSettings();
    } else if (activeTab === 'models') {
      loadEnabledModels();
    }
  }, [activeTab, loadSystemPrompts, loadAppSettings, loadEnabledModels]);

  const saveAPIKey = (id: string, key: string) => {
    const updated = apiKeys.map(item =>
      item.id === id ? { ...item, key, isActive: key.length > 0 } : item
    );
    setAPIKeys(updated);
    localStorage.setItem('nexus_api_keys', JSON.stringify(updated));
    setModalConfig({
      isOpen: true,
      title: 'Success',
      message: 'API key saved successfully!',
      type: 'success',
      confirmText: 'OK',
      onConfirm: undefined
    });
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      await loadAllUsers();
      setModalConfig({
        isOpen: true,
        title: 'Success',
        message: `User role updated to ${newRole}`,
        type: 'success',
        confirmText: 'OK',
        onConfirm: undefined
      });
    } catch (err) {
      console.error('Error updating user role:', err);
      setModalConfig({
        isOpen: true,
        title: 'Error',
        message: 'Failed to update user role',
        type: 'error',
        confirmText: 'OK',
        onConfirm: undefined
      });
    }
  };

  const loadAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      // 🚀 PAGINATION: Fetch ratings with pagination for better performance
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage - 1;

      // Build query with optional date filtering
      let query = supabase
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
        `, { count: 'exact' }); // Get total count for pagination

      // Apply date range filter if set
      if (startDate) {
        query = query.gte('created_at', new Date(startDate).toISOString());
      }
      if (endDate) {
        // Add 1 day to include the entire end date
        const endDateTime = new Date(endDate);
        endDateTime.setDate(endDateTime.getDate() + 1);
        query = query.lt('created_at', endDateTime.toISOString());
      }

      const { data: allRatings, error: ratingsError, count } = await query
        .range(startIndex, endIndex) // Apply pagination
        .order('created_at', { ascending: false });

      if (ratingsError) throw ratingsError;

      // Store total count for pagination
      setTotalRatings(count || 0);

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
      setModalConfig({
        isOpen: true,
        title: 'Error',
        message: 'Failed to load analytics data',
        type: 'error',
        confirmText: 'OK',
        onConfirm: undefined
      });
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // 🚀 Reload analytics when pagination changes or tab switches to analytics
  useEffect(() => {
    if (activeTab === 'analytics' || activeTab === 'advanced-analytics') {
      loadAnalytics();
    }
  }, [activeTab, currentPage, itemsPerPage, startDate, endDate]);

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
      setModalConfig({
        isOpen: true,
        title: 'No Selection',
        message: 'Please select at least one evaluation to delete.',
        type: 'warning',
        confirmText: 'OK',
        onConfirm: undefined
      });
      return;
    }

    setModalConfig({
      isOpen: true,
      title: 'Delete Evaluations',
      message: `Delete ${selectedRatings.size} selected evaluation(s)? This cannot be undone.`,
      type: 'warning',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
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

          setModalConfig({
            isOpen: true,
            title: 'Success',
            message: `Deleted ${selectedRatings.size} evaluation(s) successfully!`,
            type: 'success',
            confirmText: 'OK',
            onConfirm: undefined
          });
          setSelectedRatings(new Set());
          await loadAnalytics();
        } catch (err: any) {
          console.error('Error deleting ratings:', err);
          setModalConfig({
            isOpen: true,
            title: 'Error',
            message: `Failed to delete evaluations.\n\n${err.message || 'Unknown error'}`,
            type: 'error',
            confirmText: 'OK',
            onConfirm: undefined
          });
        }
      }
    });
  };

  const deleteRating = async (ratingId: string) => {
    setModalConfig({
      isOpen: true,
      title: 'Delete Evaluation',
      message: 'Delete this evaluation? This cannot be undone.',
      type: 'warning',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
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

          setModalConfig({
            isOpen: true,
            title: 'Success',
            message: 'Evaluation deleted successfully!',
            type: 'success',
            confirmText: 'OK',
            onConfirm: undefined
          });
          await loadAnalytics();
        } catch (err: any) {
          console.error('Error deleting rating:', err);
          setModalConfig({
            isOpen: true,
            title: 'Error',
            message: `Failed to delete evaluation.\n\n${err.message || 'Unknown error'}`,
            type: 'error',
            confirmText: 'OK',
            onConfirm: undefined
          });
        }
      }
    });
  };

  const deleteAllEvaluations = async () => {
    setModalConfig({
      isOpen: true,
      title: 'WARNING: Delete All Data',
      message: 'This will permanently delete ALL queries, responses, and ratings. This action cannot be undone. Are you sure?',
      type: 'error',
      confirmText: 'Delete Everything',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          // Delete in order: ratings → responses → queries (due to foreign keys)
          const { error: ratingsError } = await supabase.from('ratings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          if (ratingsError) throw ratingsError;

          const { error: responsesError } = await supabase.from('responses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          if (responsesError) throw responsesError;

          const { error: queriesError } = await supabase.from('queries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          if (queriesError) throw queriesError;

          setModalConfig({
            isOpen: true,
            title: 'Success',
            message: 'All evaluation data has been deleted successfully!',
            type: 'success',
            confirmText: 'OK',
            onConfirm: undefined
          });
          setAnalyticsData(null); // Clear analytics display
        } catch (err) {
          console.error('Error deleting evaluations:', err);
          setModalConfig({
            isOpen: true,
            title: 'Error',
            message: 'Failed to delete evaluation data. Check console for details.',
            type: 'error',
            confirmText: 'OK',
            onConfirm: undefined
          });
        }
      }
    });
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
  // Enabled Models Functions
  const initializeEnabledModels = async () => {
    try {
      // Try to check if table exists by querying it
      const { data: existingData, error: queryError } = await supabase
        .from('enabled_models')
        .select('model_name')
        .limit(1);

      // If table doesn't exist or is empty, initialize it
      if (queryError || !existingData || existingData.length === 0) {
        console.log('Initializing enabled_models table...');

        // Insert default models
        const defaultModels = [
          { model_name: 'GPT', is_enabled: true, display_order: 1 },
          { model_name: 'Claude', is_enabled: true, display_order: 2 },
          { model_name: 'Gemini', is_enabled: true, display_order: 3 },
          { model_name: 'DeepSeek', is_enabled: false, display_order: 4 },
          { model_name: 'Mistral', is_enabled: false, display_order: 5 },
          { model_name: 'Groq', is_enabled: false, display_order: 6 },
          { model_name: 'Perplexity', is_enabled: false, display_order: 7 }
        ];

        const { error: insertError } = await supabase
          .from('enabled_models')
          .upsert(defaultModels, { onConflict: 'model_name' });

        if (insertError) {
          console.error('Error initializing models:', insertError);
          throw insertError;
        }

        console.log('✅ Enabled models initialized successfully');
      }
    } catch (err) {
      console.error('Error initializing enabled models:', err);
    }
  };

  const toggleModel = async (modelName: string) => {
    try {
      const newState = !enabledModels[modelName];

      // Optimistically update UI
      setEnabledModels(prev => ({
        ...prev,
        [modelName]: newState
      }));

      console.log(`Toggling ${modelName} to ${newState}...`);

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      // Call serverless function to update (avoids CORS issues)
      const response = await fetch('/api/toggle-model', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelName,
          isEnabled: newState,
          authToken: session.access_token
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update model');
      }

      console.log(`✅ ${modelName} ${newState ? 'enabled' : 'disabled'}`);
    } catch (err: any) {
      console.error('Error toggling model:', err);
      setModalConfig({
        isOpen: true,
        title: 'Error',
        message: `Failed to update ${modelName}: ${err.message}`,
        type: 'error',
        confirmText: 'OK',
        onConfirm: undefined
      });
      // Revert on error
      loadEnabledModels();
    }
  };

  // App Settings Functions
  const toggleRatingRequirement = async () => {
    try {
      const newValue = !requireRating;

      // Optimistically update UI
      setRequireRating(newValue);

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      // Call serverless function to update
      const response = await fetch('/api/update-app-setting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settingKey: 'require_rating_before_next_message',
          settingValue: newValue,
          authToken: session.access_token
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update setting');
      }

      console.log(`✅ Rating requirement ${newValue ? 'enabled' : 'disabled'}`);
    } catch (err: any) {
      console.error('Error toggling setting:', err);
      setModalConfig({
        isOpen: true,
        title: 'Error',
        message: `Failed to update setting: ${err.message}`,
        type: 'error',
        confirmText: 'OK',
        onConfirm: undefined
      });
      // Revert on error
      loadAppSettings();
    }
  };

  const createSystemPrompt = async () => {
    if (!newPrompt.name || !newPrompt.prompt_text) {
      setModalConfig({
        isOpen: true,
        title: 'Missing Information',
        message: 'Please fill in both name and prompt text',
        type: 'warning',
        confirmText: 'OK',
        onConfirm: undefined
      });
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

      setModalConfig({
        isOpen: true,
        title: 'Success',
        message: 'System prompt created successfully!',
        type: 'success',
        confirmText: 'OK',
        onConfirm: undefined
      });
      setNewPrompt({ name: '', prompt_text: '', max_tokens: 500, temperature: 0.7 });
      await loadSystemPrompts();
    } catch (err) {
      console.error('Error creating system prompt:', err);
      setModalConfig({
        isOpen: true,
        title: 'Error',
        message: 'Failed to create system prompt.',
        type: 'error',
        confirmText: 'OK',
        onConfirm: undefined
      });
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

      setModalConfig({
        isOpen: true,
        title: 'Success',
        message: 'System prompt updated successfully!',
        type: 'success',
        confirmText: 'OK',
        onConfirm: undefined
      });
      setEditingPrompt(null);
      await loadSystemPrompts();
    } catch (err) {
      console.error('Error updating system prompt:', err);
      setModalConfig({
        isOpen: true,
        title: 'Error',
        message: 'Failed to update system prompt.',
        type: 'error',
        confirmText: 'OK',
        onConfirm: undefined
      });
    }
  };

  const activateSystemPrompt = async (promptId: string) => {
    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      // Call serverless function to update (avoids CORS issues)
      const response = await fetch('/api/update-system-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          promptId,
          action: 'activate',
          authToken: session.access_token
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to activate prompt');
      }

      setModalConfig({
        isOpen: true,
        title: 'Success',
        message: 'System prompt activated!',
        type: 'success',
        confirmText: 'OK',
        onConfirm: undefined
      });
      await loadSystemPrompts();
    } catch (err: any) {
      console.error('Error activating system prompt:', err);
      setModalConfig({
        isOpen: true,
        title: 'Error',
        message: `Failed to activate system prompt: ${err.message}`,
        type: 'error',
        confirmText: 'OK',
        onConfirm: undefined
      });
    }
  };

  const deleteSystemPrompt = async (promptId: string) => {
    setModalConfig({
      isOpen: true,
      title: 'Delete System Prompt',
      message: 'Delete this system prompt?',
      type: 'warning',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          // Get auth token
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.access_token) {
            throw new Error('Not authenticated');
          }

          // Call serverless function to delete (avoids CORS issues)
          const response = await fetch('/api/update-system-prompt', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              promptId,
              action: 'delete',
              authToken: session.access_token
            })
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete prompt');
          }

          setModalConfig({
            isOpen: true,
            title: 'Success',
            message: 'System prompt deleted!',
            type: 'success',
            confirmText: 'OK',
            onConfirm: undefined
          });
          await loadSystemPrompts();
        } catch (err) {
          console.error('Error deleting system prompt:', err);
          setModalConfig({
            isOpen: true,
            title: 'Error',
            message: 'Failed to delete system prompt.',
            type: 'error',
            confirmText: 'OK',
            onConfirm: undefined
          });
        }
      }
    });
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
    <div className="h-screen bg-white dark:bg-gray-950 transition-colors relative overflow-y-auto scrollbar-thin">
      {/* Enhanced background - fixed positioning so it doesn't interfere with scroll */}
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 -z-10 pointer-events-none"></div>
      <div className="fixed top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-400/10 to-purple-400/10 dark:from-indigo-600/5 dark:to-purple-600/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
      <div className="fixed inset-0 bg-[linear-gradient(rgba(99,102,241,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:64px_64px] -z-10 pointer-events-none"></div>

      {/* Navigation */}
      <nav className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl shadow-sm border-b border-gray-200/50 dark:border-gray-800/50 transition-colors sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl blur opacity-50"></div>
                <div className="relative w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-xl">N</span>
                </div>
              </div>
              <div className="text-left">
                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">Nexus</h1>
                <p className="text-xs text-gray-500 dark:text-gray-500">Admin Panel</p>
              </div>
            </button>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="hidden sm:block px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all font-medium"
              >
                Dashboard
              </button>
              <button
                onClick={handleSignOut}
                className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/40 font-medium"
              >
                Sign Out
              </button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-full">
        {/* Welcome Section */}
        <div className="relative bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl rounded-3xl shadow-xl p-8 mb-8 border border-gray-200/50 dark:border-gray-800/50 transition-colors overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-full blur-2xl"></div>
          <div className="relative">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Welcome, Admin</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Manage users, configure settings, and analyze platform performance.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="relative bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl rounded-3xl shadow-xl mb-8 border border-gray-200/50 dark:border-gray-800/50 transition-colors overflow-hidden">
          <div className="border-b border-gray-200/50 dark:border-gray-800/50">
            <nav className="flex flex-wrap -mb-px">
              <button
                onClick={() => setActiveTab('users')}
                className={`px-6 py-4 text-sm font-semibold border-b-2 transition-all ${
                  activeTab === 'users'
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  User Management
                </span>
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-6 py-4 text-sm font-semibold border-b-2 transition-all ${
                  activeTab === 'analytics'
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Analytics & Research
                </span>
              </button>
              <button
                onClick={() => setActiveTab('advanced-analytics')}
                className={`px-6 py-4 text-sm font-semibold border-b-2 transition-all ${
                  activeTab === 'advanced-analytics'
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                  Advanced Analytics
                </span>
              </button>
              <button
                onClick={() => setActiveTab('research-insights')}
                className={`px-6 py-4 text-sm font-semibold border-b-2 transition-all ${
                  activeTab === 'research-insights'
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Research Insights
                </span>
              </button>
              <button
                onClick={() => setActiveTab('api-keys')}
                className={`px-6 py-4 text-sm font-semibold border-b-2 transition-all ${
                  activeTab === 'api-keys'
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  API Keys
                </span>
              </button>
              <button
                onClick={() => setActiveTab('models')}
                className={`px-6 py-4 text-sm font-semibold border-b-2 transition-all ${
                  activeTab === 'models'
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  AI Models
                </span>
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-6 py-4 text-sm font-semibold border-b-2 transition-all ${
                  activeTab === 'settings'
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </span>
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
                  Select which AI models to use for generating responses. Only enabled models will be used in evaluations.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { name: 'GPT', provider: 'OpenAI (GPT-4o-mini)', icon: '🤖', cost: '$0.15/1K' },
                    { name: 'Claude', provider: 'Anthropic (Claude 3.5 Haiku)', icon: '🧠', cost: '$0.25/1K' },
                    { name: 'Gemini', provider: 'Google (Gemini 1.5 Flash)', icon: '✨', cost: 'FREE' },
                    { name: 'DeepSeek', provider: 'DeepSeek (DeepSeek Chat)', icon: '🔬', cost: '$0.14/1K' },
                    { name: 'Mistral', provider: 'Mistral AI (Mistral Small)', icon: '🌪️', cost: '$0.20/1K' },
                    { name: 'Groq', provider: 'Groq (Llama 3.3 70B)', icon: '⚡', cost: '$0.59/1K' },
                    { name: 'Perplexity', provider: 'Perplexity (Sonar Small)', icon: '🔍', cost: '$0.20/1K' }
                  ].map((model) => (
                    <div key={model.name} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between hover:shadow-md transition-shadow bg-white dark:bg-gray-800">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{model.icon}</span>
                        <div>
                          <span className="font-semibold block text-gray-900 dark:text-white">{model.name}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 block">{model.provider}</span>
                          <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">{model.cost}</span>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={enabledModels[model.name] ?? false}
                          onChange={() => toggleModel(model.name)}
                        />
                        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>Note:</strong> Models will only work if their API keys are configured in Vercel Environment Variables. See the documentation for setup instructions.
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

                {/* Date Range Filter */}
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Date:</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <label htmlFor="startDate" className="text-sm text-gray-600 dark:text-gray-400">From:</label>
                      <input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          setCurrentPage(1); // Reset to first page when filtering
                        }}
                        className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label htmlFor="endDate" className="text-sm text-gray-600 dark:text-gray-400">To:</label>
                      <input
                        id="endDate"
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                          setEndDate(e.target.value);
                          setCurrentPage(1); // Reset to first page when filtering
                        }}
                        className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    {(startDate || endDate) && (
                      <button
                        onClick={() => {
                          setStartDate('');
                          setEndDate('');
                          setCurrentPage(1);
                        }}
                        className="px-3 py-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Clear
                      </button>
                    )}
                    {(startDate || endDate) && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Showing {totalRatings} result{totalRatings !== 1 ? 's' : ''}
                      </div>
                    )}
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
                            {getSortedRatings()
                              .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                              .map((rating: any) => (
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

                      {/* Pagination Controls */}
                      <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                          {/* Left: Items per page and info */}
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <label className="text-sm text-gray-600 dark:text-gray-400">Show:</label>
                              <select
                                value={itemsPerPage}
                                onChange={(e) => {
                                  setItemsPerPage(Number(e.target.value));
                                  setCurrentPage(1);
                                }}
                                className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                              >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                              </select>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalRatings)} to {Math.min(currentPage * itemsPerPage, totalRatings)} of {totalRatings} evaluations
                            </p>
                          </div>

                          {/* Right: Page navigation */}
                          <div className="flex items-center gap-2">
                            {/* First Page */}
                            <button
                              onClick={() => setCurrentPage(1)}
                              disabled={currentPage === 1}
                              className="px-3 py-1 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              title="First Page"
                            >
                              ««
                            </button>

                            {/* Previous Page */}
                            <button
                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                              disabled={currentPage === 1}
                              className="px-3 py-1 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              title="Previous Page"
                            >
                              «
                            </button>

                            {/* Page Numbers */}
                            {(() => {
                              const totalPages = Math.ceil(totalRatings / itemsPerPage);
                              const pages: number[] = [];

                              if (totalPages <= 5) {
                                // Show all pages if 5 or fewer
                                for (let i = 1; i <= totalPages; i++) pages.push(i);
                              } else {
                                // Show current page and 2 pages on each side
                                const start = Math.max(1, currentPage - 2);
                                const end = Math.min(totalPages, currentPage + 2);

                                for (let i = start; i <= end; i++) pages.push(i);

                                // Add first page if not included
                                if (start > 1) {
                                  pages.unshift(1);
                                  if (start > 2) pages.splice(1, 0, -1); // -1 represents ellipsis
                                }

                                // Add last page if not included
                                if (end < totalPages) {
                                  if (end < totalPages - 1) pages.push(-1); // -1 represents ellipsis
                                  pages.push(totalPages);
                                }
                              }

                              return pages.map((page, idx) =>
                                page === -1 ? (
                                  <span key={`ellipsis-${idx}`} className="px-3 py-1 text-sm text-gray-400 dark:text-gray-500">
                                    ...
                                  </span>
                                ) : (
                                  <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`px-3 py-1 text-sm font-medium rounded-lg border transition-colors ${
                                      currentPage === page
                                        ? 'bg-indigo-600 border-indigo-600 text-white'
                                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                                  >
                                    {page}
                                  </button>
                                )
                              );
                            })()}

                            {/* Next Page */}
                            <button
                              onClick={() => setCurrentPage(prev => Math.min(Math.ceil(getSortedRatings().length / itemsPerPage), prev + 1))}
                              disabled={currentPage >= Math.ceil(getSortedRatings().length / itemsPerPage)}
                              className="px-3 py-1 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              title="Next Page"
                            >
                              »
                            </button>

                            {/* Last Page */}
                            <button
                              onClick={() => setCurrentPage(Math.ceil(getSortedRatings().length / itemsPerPage))}
                              disabled={currentPage >= Math.ceil(getSortedRatings().length / itemsPerPage)}
                              className="px-3 py-1 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              title="Last Page"
                            >
                              »»
                            </button>
                          </div>
                        </div>

                        {/* Tip at bottom */}
                        <p className="mt-3 text-xs text-center text-gray-400 dark:text-gray-500">
                          💡 Tip: Click column headers to sort • Select rows to bulk delete
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Advanced Analytics Tab */}
            {activeTab === 'advanced-analytics' && (
              <div>
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Advanced Analytics</h3>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">Visual insights and data trends for research analysis</p>
                </div>

                {!analyticsData ? (
                  <div className="text-center py-12">
                    <button
                      onClick={loadAnalytics}
                      disabled={loadingAnalytics}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingAnalytics ? 'Loading Analytics...' : 'Load Advanced Analytics'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Bar Chart: Model Average Rankings */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800 shadow-lg">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">🏆 Model Performance Comparison</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Performance score across all evaluations • Higher bar = Better performance</p>
                      <ResponsiveContainer width="100%" height={450}>
                        <BarChart
                          data={(() => {
                            const models = Object.values(analyticsData.modelStats)
                              .map((model: any, index: number) => {
                                // Invert the rank: 1st place (1.0) becomes 3.0, 3rd place (3.0) becomes 1.0
                                const invertedScore = 4 - parseFloat(model.averageRank);
                                return {
                                  name: model.name.replace('models/', ''),
                                  'Performance Score': Number(invertedScore.toFixed(2)),
                                  'Average Rank': parseFloat(model.averageRank),
                                  'Total Evaluations': model.totalRatings,
                                  '1st Place': model.rankings[1],
                                  '2nd Place': model.rankings[2],
                                  '3rd Place': model.rankings[3],
                                  color: ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 6]
                                };
                              })
                              .sort((a, b) => b['Performance Score'] - a['Performance Score']);
                            return models;
                          })()}
                          margin={{ top: 20, right: 30, left: 80, bottom: 80 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" opacity={0.3} />
                          <XAxis
                            dataKey="name"
                            angle={-45}
                            textAnchor="end"
                            height={100}
                            tick={{ fill: '#6b7280', fontSize: 12 }}
                            className="dark:fill-gray-400"
                          />
                          <YAxis
                            domain={[0, 3]}
                            tick={{ fill: '#6b7280', fontSize: 12 }}
                            className="dark:fill-gray-400"
                            width={70}
                            label={{
                              value: 'Higher = Better',
                              angle: -90,
                              position: 'insideLeft',
                              fill: '#9ca3af',
                              style: { fontSize: 12 }
                            }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1f2937',
                              border: '1px solid #374151',
                              borderRadius: '8px',
                              color: '#fff',
                              padding: '12px'
                            }}
                            cursor={{ fill: 'rgba(79, 70, 229, 0.1)' }}
                            formatter={(value: any, name: string, props: any) => {
                              if (name === 'Performance Score') {
                                return [`${value} (Avg Rank: ${props.payload['Average Rank']})`, 'Performance'];
                              }
                              return [value, name];
                            }}
                          />
                          <Legend
                            wrapperStyle={{ paddingTop: '20px' }}
                            formatter={(value: string) => <span className="text-gray-700 dark:text-gray-300">{value}</span>}
                          />
                          <Bar
                            dataKey="Performance Score"
                            radius={[8, 8, 0, 0]}
                            maxBarSize={60}
                          >
                            {(() => {
                              const models = Object.values(analyticsData.modelStats);
                              const colors = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
                              return models.map((_: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={colors[index % 6]} />
                              ));
                            })()}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Pie Chart: Model Evaluation Distribution */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800 shadow-lg">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📊 Model Evaluation Distribution</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Total evaluations per model with performance highlights</p>

                      <ResponsiveContainer width="100%" height={450}>
                        <PieChart>
                          <Pie
                            data={(() => {
                              const modelData: { [key: string]: { total: number; firstPlace: number; secondPlace: number; thirdPlace: number } } = {};

                              analyticsData.allRatings?.forEach((rating: any) => {
                                const modelName = rating.responses?.model_name?.replace('models/', '') || 'Unknown';
                                const score = rating.score;

                                if (!modelData[modelName]) {
                                  modelData[modelName] = { total: 0, firstPlace: 0, secondPlace: 0, thirdPlace: 0 };
                                }

                                modelData[modelName].total++;
                                if (score === 1) modelData[modelName].firstPlace++;
                                if (score === 2) modelData[modelName].secondPlace++;
                                if (score === 3) modelData[modelName].thirdPlace++;
                              });

                              const colors = [
                                'rgba(79, 70, 229, 0.85)',    // Indigo
                                'rgba(6, 182, 212, 0.85)',    // Cyan
                                'rgba(16, 185, 129, 0.85)',   // Green
                                'rgba(245, 158, 11, 0.85)',   // Amber
                                'rgba(239, 68, 68, 0.85)',    // Red
                                'rgba(139, 92, 246, 0.85)',   // Purple
                                'rgba(236, 72, 153, 0.85)',   // Pink
                                'rgba(249, 115, 22, 0.85)'    // Orange
                              ];

                              return Object.entries(modelData)
                                .map(([name, data], index) => {
                                  let badge = '';
                                  if (data.firstPlace > 0) badge = ' 🥇';
                                  else if (data.secondPlace > 0) badge = ' 🥈';
                                  else if (data.thirdPlace > 0) badge = ' 🥉';

                                  return {
                                    name: name + badge,
                                    value: data.total,
                                    color: colors[index % colors.length],
                                    firstPlace: data.firstPlace,
                                    secondPlace: data.secondPlace,
                                    thirdPlace: data.thirdPlace
                                  };
                                })
                                .sort((a, b) => b.value - a.value);
                            })()}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }: any) => {
                              const percentText = (percent * 100).toFixed(1);
                              return `${name} (${percentText}%)`;
                            }}
                            outerRadius={140}
                            fill="#8884d8"
                            dataKey="value"
                            style={{ fontSize: '13px', fontWeight: '500' }}
                          >
                            {(() => {
                              const modelData: { [key: string]: { total: number } } = {};

                              analyticsData.allRatings?.forEach((rating: any) => {
                                const modelName = rating.responses?.model_name?.replace('models/', '') || 'Unknown';
                                if (!modelData[modelName]) {
                                  modelData[modelName] = { total: 0 };
                                }
                                modelData[modelName].total++;
                              });

                              const colors = [
                                'rgba(79, 70, 229, 0.85)',
                                'rgba(6, 182, 212, 0.85)',
                                'rgba(16, 185, 129, 0.85)',
                                'rgba(245, 158, 11, 0.85)',
                                'rgba(239, 68, 68, 0.85)',
                                'rgba(139, 92, 246, 0.85)',
                                'rgba(236, 72, 153, 0.85)',
                                'rgba(249, 115, 22, 0.85)'
                              ];

                              return Object.entries(modelData)
                                .sort(([, a], [, b]) => b.total - a.total)
                                .map(([_, __], index) => (
                                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                ));
                            })()}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1f2937',
                              border: '1px solid #374151',
                              borderRadius: '8px',
                              color: '#fff',
                              padding: '12px'
                            }}
                            content={({ payload }: any) => {
                              if (!payload || !payload[0]) return null;
                              const { name, value, firstPlace, secondPlace, thirdPlace } = payload[0].payload;
                              return (
                                <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl">
                                  <div className="font-semibold mb-2 text-white text-sm">{name}</div>
                                  <div className="font-bold mb-2 text-indigo-400">Total {value}</div>
                                  {firstPlace > 0 && <div className="text-yellow-400 text-sm">🥇 1st {firstPlace}</div>}
                                  {secondPlace > 0 && <div className="text-gray-300 text-sm">🥈 2nd {secondPlace}</div>}
                                  {thirdPlace > 0 && <div className="text-orange-400 text-sm">🥉 3rd {thirdPlace}</div>}
                                </div>
                              );
                            }}
                          />
                          <Legend
                            wrapperStyle={{ paddingTop: '30px' }}
                            formatter={(value: string) => <span className="text-gray-700 dark:text-gray-300 text-sm">{value}</span>}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Line Chart: Rankings Over Time */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800 shadow-lg">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📈 Ranking Trends Over Time</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Daily average rankings showing performance trends • Lower rank = Better performance</p>
                      <ResponsiveContainer width="100%" height={450}>
                        <LineChart
                          data={(() => {
                            const dailyData: { [key: string]: { sum: number; count: number } } = {};
                            analyticsData.allRatings?.forEach((rating: any) => {
                              const date = new Date(rating.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                              if (!dailyData[date]) {
                                dailyData[date] = { sum: 0, count: 0 };
                              }
                              dailyData[date].sum += rating.score || 0;
                              dailyData[date].count += 1;
                            });

                            return Object.entries(dailyData)
                              .map(([date, data]) => ({
                                date,
                                'Average Rank': Number((data.sum / data.count).toFixed(2)),
                                'Evaluations': data.count
                              }))
                              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                              .slice(-30); // Last 30 days
                          })()}
                          margin={{ top: 20, right: 30, left: 80, bottom: 60 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" opacity={0.3} />
                          <XAxis
                            dataKey="date"
                            tick={{ fill: '#6b7280', fontSize: 11 }}
                            className="dark:fill-gray-400"
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis
                            domain={[0, 3]}
                            tick={{ fill: '#6b7280', fontSize: 12 }}
                            className="dark:fill-gray-400"
                            width={70}
                            label={{
                              value: 'Lower = Better',
                              angle: -90,
                              position: 'insideLeft',
                              fill: '#6b7280',
                              style: { fontSize: 12 }
                            }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1f2937',
                              border: '1px solid #374151',
                              borderRadius: '8px',
                              color: '#fff',
                              padding: '12px'
                            }}
                          />
                          <Legend
                            wrapperStyle={{ paddingTop: '20px' }}
                            formatter={(value: string) => <span className="text-gray-700 dark:text-gray-300">{value}</span>}
                          />
                          <Line
                            type="monotone"
                            dataKey="Average Rank"
                            stroke="#4f46e5"
                            strokeWidth={3}
                            dot={{ fill: '#4f46e5', r: 5, strokeWidth: 2, stroke: '#fff' }}
                            activeDot={{ r: 7, strokeWidth: 2, stroke: '#fff' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Summary Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
                        <h5 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Total Evaluations</h5>
                        <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{analyticsData.allRatings?.length || 0}</p>
                      </div>
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                        <h5 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Average Rank</h5>
                        <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                          {analyticsData.allRatings?.length > 0
                            ? (analyticsData.allRatings.reduce((sum: number, r: any) => sum + (r.score || 0), 0) / analyticsData.allRatings.length).toFixed(2)
                            : '0.00'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Lower is better</p>
                      </div>
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20">
                        <h5 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Active Models</h5>
                        <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                          {new Set(analyticsData.allRatings?.map((r: any) => r.responses?.model_name).filter(Boolean)).size}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Research Insights Tab */}
            {activeTab === 'research-insights' && (
              <div>
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Research Insights</h3>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">Advanced metrics for deep dive analysis and research validation</p>
                </div>

                {!analyticsData ? (
                  <div className="text-center py-12">
                    <button
                      onClick={loadAnalytics}
                      disabled={loadingAnalytics}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingAnalytics ? 'Loading Insights...' : 'Load Research Insights'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Win Rate Matrix - Head to Head Comparison */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800 shadow-lg">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">🥊 Win Rate Matrix (Head-to-Head)</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Direct comparison showing which models outperform others in the same evaluations</p>

                      <div className="overflow-x-auto">
                        {(() => {
                          // Build head-to-head win rate matrix
                          const modelNames = new Set<string>();
                          const winMatrix: { [key: string]: { [key: string]: { wins: number; total: number } } } = {};

                          // Group ratings by query to compare models in same evaluation
                          const queriesMap: { [key: string]: any[] } = {};
                          analyticsData.allRatings?.forEach((rating: any) => {
                            const queryId = rating.responses?.query_id;
                            const modelName = rating.responses?.model_name?.replace('models/', '') || 'Unknown';
                            if (!queryId) return;

                            if (!queriesMap[queryId]) queriesMap[queryId] = [];
                            queriesMap[queryId].push({ model: modelName, score: rating.score });
                            modelNames.add(modelName);
                          });

                          // Calculate wins
                          Object.values(queriesMap).forEach((ratings: any[]) => {
                            ratings.forEach((r1: any) => {
                              ratings.forEach((r2: any) => {
                                if (r1.model === r2.model) return;

                                if (!winMatrix[r1.model]) winMatrix[r1.model] = {};
                                if (!winMatrix[r1.model][r2.model]) {
                                  winMatrix[r1.model][r2.model] = { wins: 0, total: 0 };
                                }

                                winMatrix[r1.model][r2.model].total++;
                                if (r1.score < r2.score) { // Lower score = better rank
                                  winMatrix[r1.model][r2.model].wins++;
                                }
                              });
                            });
                          });

                          const models = Array.from(modelNames).sort();

                          return (
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                              <thead>
                                <tr className="bg-gray-50 dark:bg-gray-900">
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-50 dark:bg-gray-900">
                                    vs →
                                  </th>
                                  {models.map(model => (
                                    <th key={model} className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                      {model.substring(0, 8)}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {models.map(model1 => (
                                  <tr key={model1} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-200 sticky left-0 bg-white dark:bg-gray-800">
                                      {model1.substring(0, 10)}
                                    </td>
                                    {models.map(model2 => {
                                      if (model1 === model2) {
                                        return (
                                          <td key={model2} className="px-4 py-3 text-center bg-gray-100 dark:bg-gray-700">
                                            <span className="text-gray-400 dark:text-gray-500">—</span>
                                          </td>
                                        );
                                      }

                                      const data = winMatrix[model1]?.[model2];
                                      if (!data || data.total === 0) {
                                        return (
                                          <td key={model2} className="px-4 py-3 text-center text-gray-400 dark:text-gray-500 text-sm">
                                            N/A
                                          </td>
                                        );
                                      }

                                      const winRate = ((data.wins / data.total) * 100).toFixed(0);
                                      const isGood = parseInt(winRate) >= 60;
                                      const isOk = parseInt(winRate) >= 40;

                                      return (
                                        <td key={model2} className="px-4 py-3 text-center">
                                          <div className={`inline-block px-2 py-1 rounded text-sm font-semibold ${
                                            isGood
                                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                              : isOk
                                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                          }`}>
                                            {winRate}%
                                          </div>
                                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            {data.wins}/{data.total}
                                          </div>
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          );
                        })()}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center italic">
                        💡 Green (≥60%) = Strong advantage | Yellow (40-59%) = Competitive | Red (&lt;40%) = Disadvantage
                      </p>
                    </div>

                    {/* User Engagement Over Time */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800 shadow-lg">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">👥 User Engagement Trends</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Daily active evaluators and engagement patterns</p>
                      <ResponsiveContainer width="100%" height={400}>
                        <LineChart
                          data={(() => {
                            const dailyUsers: { [key: string]: Set<string> } = {};
                            const dailyEvals: { [key: string]: number } = {};

                            analyticsData.allRatings?.forEach((rating: any) => {
                              const date = new Date(rating.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                              if (!dailyUsers[date]) {
                                dailyUsers[date] = new Set();
                                dailyEvals[date] = 0;
                              }

                              dailyUsers[date].add(rating.user_id);
                              dailyEvals[date]++;
                            });

                            return Object.keys(dailyUsers)
                              .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
                              .slice(-30)
                              .map(date => ({
                                date,
                                'Active Users': dailyUsers[date].size,
                                'Total Evaluations': dailyEvals[date]
                              }));
                          })()}
                          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" opacity={0.3} />
                          <XAxis
                            dataKey="date"
                            tick={{ fill: '#6b7280', fontSize: 11 }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis
                            tick={{ fill: '#6b7280', fontSize: 12 }}
                            label={{ value: 'Count', angle: -90, position: 'insideLeft', fill: '#6b7280' }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1f2937',
                              border: '1px solid #374151',
                              borderRadius: '8px',
                              color: '#fff'
                            }}
                          />
                          <Legend wrapperStyle={{ paddingTop: '20px' }} />
                          <Line type="monotone" dataKey="Active Users" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} />
                          <Line type="monotone" dataKey="Total Evaluations" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Query Complexity Analysis */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800 shadow-lg">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📝 Query Complexity vs Performance</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">How model rankings correlate with question complexity (word count)</p>
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart
                          data={(() => {
                            const complexityBuckets: { [key: string]: { sum: number; count: number; queries: Set<string> } } = {
                              'Short (1-10 words)': { sum: 0, count: 0, queries: new Set() },
                              'Medium (11-25 words)': { sum: 0, count: 0, queries: new Set() },
                              'Long (26-50 words)': { sum: 0, count: 0, queries: new Set() },
                              'Very Long (50+ words)': { sum: 0, count: 0, queries: new Set() }
                            };

                            analyticsData.allRatings?.forEach((rating: any) => {
                              const question = rating.responses?.queries?.question || '';
                              const wordCount = question.split(/\s+/).length;
                              const queryId = rating.responses?.query_id;

                              let bucket: string;
                              if (wordCount <= 10) bucket = 'Short (1-10 words)';
                              else if (wordCount <= 25) bucket = 'Medium (11-25 words)';
                              else if (wordCount <= 50) bucket = 'Long (26-50 words)';
                              else bucket = 'Very Long (50+ words)';

                              complexityBuckets[bucket].sum += rating.score || 0;
                              complexityBuckets[bucket].count++;
                              if (queryId) complexityBuckets[bucket].queries.add(queryId);
                            });

                            return Object.entries(complexityBuckets).map(([name, data]) => ({
                              name,
                              'Average Rank': data.count > 0 ? Number((data.sum / data.count).toFixed(2)) : 0,
                              'Unique Queries': data.queries.size,
                              'Total Ratings': data.count
                            }));
                          })()}
                          margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
                          <XAxis
                            dataKey="name"
                            tick={{ fill: '#6b7280', fontSize: 11 }}
                            angle={-15}
                            textAnchor="end"
                            height={100}
                          />
                          <YAxis
                            tick={{ fill: '#6b7280', fontSize: 12 }}
                            label={{ value: 'Avg Rank (Lower = Better)', angle: -90, position: 'insideLeft', fill: '#6b7280' }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1f2937',
                              border: '1px solid #374151',
                              borderRadius: '8px',
                              color: '#fff'
                            }}
                          />
                          <Legend wrapperStyle={{ paddingTop: '10px' }} />
                          <Bar dataKey="Average Rank" fill="#10b981" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Consensus Analysis */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800 shadow-lg">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">🤝 Consensus & Agreement Analysis</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Inter-rater reliability showing how often users agree on model rankings</p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Consensus Score */}
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6">
                          <h5 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Overall Consensus Score</h5>
                          {(() => {
                            // Calculate how often users agree on #1 choice
                            const queryRankings: { [key: string]: { [key: string]: number } } = {};

                            analyticsData.allRatings?.forEach((rating: any) => {
                              const queryId = rating.responses?.query_id;
                              const modelName = rating.responses?.model_name;
                              if (!queryId || !modelName) return;

                              if (!queryRankings[queryId]) queryRankings[queryId] = {};
                              if (rating.score === 1) {
                                queryRankings[queryId][modelName] = (queryRankings[queryId][modelName] || 0) + 1;
                              }
                            });

                            let consensusCount = 0;
                            let totalQueries = 0;

                            Object.values(queryRankings).forEach((rankings: any) => {
                              const votes = Object.values(rankings) as number[];
                              if (votes.length === 0) return;

                              const maxVotes = Math.max(...votes);
                              const totalVotes = votes.reduce((a: number, b: number) => a + b, 0);

                              if (totalVotes >= 2) { // Only count if multiple users rated
                                totalQueries++;
                                const agreement = maxVotes / totalVotes;
                                if (agreement >= 0.6) consensusCount++; // 60%+ agreement
                              }
                            });

                            const consensusRate = totalQueries > 0 ? ((consensusCount / totalQueries) * 100).toFixed(1) : '0.0';

                            return (
                              <>
                                <p className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">{consensusRate}%</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                  {consensusCount} of {totalQueries} queries with strong agreement (≥60%)
                                </p>
                              </>
                            );
                          })()}
                        </div>

                        {/* Agreement Distribution */}
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-6">
                          <h5 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Ranking Diversity</h5>
                          {(() => {
                            const uniqueRankings = new Set();
                            analyticsData.allRatings?.forEach((rating: any) => {
                              const key = `${rating.responses?.query_id}-${rating.responses?.model_name}-${rating.score}`;
                              uniqueRankings.add(key);
                            });

                            const diversity = analyticsData.allRatings?.length > 0
                              ? ((uniqueRankings.size / analyticsData.allRatings.length) * 100).toFixed(1)
                              : '0.0';

                            return (
                              <>
                                <p className="text-4xl font-bold text-green-600 dark:text-green-400">{diversity}%</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                  Unique ranking combinations vs total ratings
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
                                  Higher = More diverse opinions
                                </p>
                              </>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Agreement by Model */}
                      <div className="mt-6">
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Agreement by Model</h5>
                        <div className="space-y-2">
                          {(() => {
                            const modelAgreement: { [key: string]: { agree: number; total: number } } = {};

                            analyticsData.allRatings?.forEach((rating: any) => {
                              const modelName = rating.responses?.model_name?.replace('models/', '') || 'Unknown';
                              if (!modelAgreement[modelName]) {
                                modelAgreement[modelName] = { agree: 0, total: 0 };
                              }
                              modelAgreement[modelName].total++;
                            });

                            return Object.entries(modelAgreement)
                              .sort(([, a], [, b]) => b.total - a.total)
                              .slice(0, 5)
                              .map(([model, data]) => {
                                const agreePercent = data.total > 0 ? ((data.agree / data.total) * 100).toFixed(0) : '0';
                                return (
                                  <div key={model} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/30 rounded p-3">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{model}</span>
                                    <div className="flex items-center gap-3">
                                      <div className="w-32 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                        <div
                                          className="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full transition-all"
                                          style={{ width: `${Math.min(parseInt(agreePercent) || 0, 100)}%` }}
                                        ></div>
                                      </div>
                                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 w-12 text-right">
                                        {data.total}
                                      </span>
                                    </div>
                                  </div>
                                );
                              });
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Summary Insights Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
                        <h5 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Total Queries Evaluated</h5>
                        <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                          {new Set(analyticsData.allRatings?.map((r: any) => r.responses?.query_id).filter(Boolean)).size}
                        </p>
                      </div>
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20">
                        <h5 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Unique Evaluators</h5>
                        <p className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
                          {new Set(analyticsData.allRatings?.map((r: any) => r.user_id).filter(Boolean)).size}
                        </p>
                      </div>
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
                        <h5 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Avg Ratings per Query</h5>
                        <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                          {(() => {
                            const uniqueQueries = new Set(analyticsData.allRatings?.map((r: any) => r.responses?.query_id).filter(Boolean)).size;
                            return uniqueQueries > 0
                              ? (analyticsData.allRatings?.length / uniqueQueries).toFixed(1)
                              : '0.0';
                          })()}
                        </p>
                      </div>
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-900/20 dark:to-red-900/20">
                        <h5 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Data Quality Score</h5>
                        <p className="text-3xl font-bold text-rose-600 dark:text-rose-400">
                          {(() => {
                            const hasMultipleRatings = analyticsData.allRatings?.length >= 10;
                            const hasMultipleUsers = new Set(analyticsData.allRatings?.map((r: any) => r.user_id)).size >= 3;
                            const hasMultipleModels = new Set(analyticsData.allRatings?.map((r: any) => r.responses?.model_name)).size >= 2;

                            const score = (hasMultipleRatings ? 33 : 0) + (hasMultipleUsers ? 33 : 0) + (hasMultipleModels ? 34 : 0);
                            return `${score}%`;
                          })()}
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
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Settings</h3>

                {/* App Settings */}
                <div className="mb-8 border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800">
                  <h4 className="font-semibold mb-4 text-gray-900 dark:text-white text-lg">Rating Requirements</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Require rating before next message</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Users must rate responses before asking another question</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={requireRating}
                        onChange={toggleRatingRequirement}
                      />
                      <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                </div>

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
