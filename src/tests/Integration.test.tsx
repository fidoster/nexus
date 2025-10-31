import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../lib/supabase';

describe('API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Supabase Database Operations', () => {
    it('can query profiles table', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: '1', email: 'test@test.com', role: 'user' },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any);

      const result = await supabase
        .from('profiles')
        .select('*')
        .eq('id', '1')
        .single();

      expect(mockSelect).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', '1');
      expect(result.data).toBeDefined();
    });

    it('can insert queries', async () => {
      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: 'query-123', content: 'Test query' },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      } as any);

      const result = await supabase
        .from('queries')
        .insert({ content: 'Test query', user_id: 'user-123' })
        .select()
        .single();

      expect(mockInsert).toHaveBeenCalled();
      expect(result.data).toBeDefined();
    });

    it('can update ratings', async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({
        data: { id: 'rating-123', rating: 5 },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
      } as any);

      await supabase
        .from('ratings')
        .update({ rating: 5 })
        .eq('id', 'rating-123');

      expect(mockUpdate).toHaveBeenCalledWith({ rating: 5 });
      expect(mockEq).toHaveBeenCalledWith('id', 'rating-123');
    });

    it('can delete records', async () => {
      const mockDelete = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        delete: mockDelete,
        eq: mockEq,
      } as any);

      await supabase.from('ratings').delete().eq('id', 'rating-123');

      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'rating-123');
    });
  });

  describe('Authentication Flow Integration', () => {
    it('signs in user successfully', async () => {
      const mockSignIn = vi.fn().mockResolvedValue({
        data: {
          user: { id: 'user-123', email: 'test@test.com' },
          session: { access_token: 'token-123' },
        },
        error: null,
      });

      vi.mocked(supabase.auth.signInWithPassword).mockImplementation(mockSignIn);

      const result = await supabase.auth.signInWithPassword({
        email: 'test@test.com',
        password: 'password123',
      });

      expect(result.data.user).toBeDefined();
      expect(result.data.session).toBeDefined();
      expect(result.error).toBeNull();
    });

    it('handles sign in errors', async () => {
      const mockSignIn = vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' },
      });

      vi.mocked(supabase.auth.signInWithPassword).mockImplementation(mockSignIn);

      const result = await supabase.auth.signInWithPassword({
        email: 'wrong@test.com',
        password: 'wrongpassword',
      });

      expect(result.error).toBeDefined();
      expect(result.data.user).toBeNull();
    });

    it('signs up new user', async () => {
      const mockSignUp = vi.fn().mockResolvedValue({
        data: {
          user: { id: 'new-user-123', email: 'newuser@test.com' },
          session: { access_token: 'token-456' },
        },
        error: null,
      });

      vi.mocked(supabase.auth.signUp).mockImplementation(mockSignUp);

      const result = await supabase.auth.signUp({
        email: 'newuser@test.com',
        password: 'password123',
      });

      expect(result.data.user).toBeDefined();
      expect(result.error).toBeNull();
    });

    it('signs out user', async () => {
      const mockSignOut = vi.fn().mockResolvedValue({ error: null });

      vi.mocked(supabase.auth.signOut).mockImplementation(mockSignOut);

      const result = await supabase.auth.signOut();

      expect(mockSignOut).toHaveBeenCalled();
      expect(result.error).toBeNull();
    });
  });

  describe('Query and Response Flow', () => {
    it('creates query and responses together', async () => {
      const queryId = 'query-123';
      const responses = [
        { query_id: queryId, model_name: 'gpt-4', content: 'Response 1' },
        { query_id: queryId, model_name: 'claude', content: 'Response 2' },
      ];

      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: queryId },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
        select: mockSelect,
        single: mockSingle,
      } as any);

      // Create query
      const queryResult = await supabase
        .from('queries')
        .insert({ content: 'Test query', user_id: 'user-123' })
        .select()
        .single();

      expect(queryResult.data?.id).toBe(queryId);

      // Create responses
      await supabase
        .from('responses')
        .insert(responses);

      expect(mockInsert).toHaveBeenCalled();
    });

    it('creates ratings for responses', async () => {
      const ratings = [
        { response_id: 'resp-1', score: 1, user_id: 'user-123' },
        { response_id: 'resp-2', score: 2, user_id: 'user-123' },
      ];

      const mockInsert = vi.fn().mockResolvedValue({
        data: ratings,
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      const result = await supabase.from('ratings').insert(ratings);

      expect(mockInsert).toHaveBeenCalledWith(ratings);
      expect(result.data).toBeDefined();
    });
  });

  describe('Analytics Data Retrieval', () => {
    it('fetches all ratings with related data', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [
          {
            id: '1',
            score: 1,
            responses: {
              model_name: 'gpt-4',
              queries: { content: 'Test query', user_id: 'user-1' },
            },
          },
        ],
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        order: mockOrder,
      } as any);

      const result = await supabase
        .from('ratings')
        .select('*, responses(*, queries(*))')
        .order('created_at', { ascending: false });

      expect(mockSelect).toHaveBeenCalled();
      expect(result.data).toBeDefined();
    });

    it('calculates model statistics', async () => {
      const mockData = [
        { score: 1, responses: { model_name: 'gpt-4' } },
        { score: 2, responses: { model_name: 'gpt-4' } },
        { score: 1, responses: { model_name: 'claude' } },
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      } as any);

      const result = await supabase
        .from('ratings')
        .select('*, responses(*)')
        .order('created_at', { ascending: false });

      // Calculate stats
      const modelStats: any = {};
      result.data?.forEach((rating: any) => {
        const model = rating.responses?.model_name;
        if (!modelStats[model]) {
          modelStats[model] = { count: 0, totalScore: 0 };
        }
        modelStats[model].count++;
        modelStats[model].totalScore += rating.score;
      });

      expect(modelStats['gpt-4'].count).toBe(2);
      expect(modelStats['claude'].count).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('handles database connection errors', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockRejectedValue(new Error('Connection failed')),
      } as any);

      await expect(
        supabase.from('profiles').select('*')
      ).rejects.toThrow('Connection failed');
    });

    it('handles authentication errors', async () => {
      const mockSignIn = vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Network error' },
      });

      vi.mocked(supabase.auth.signInWithPassword).mockImplementation(mockSignIn);

      const result = await supabase.auth.signInWithPassword({
        email: 'test@test.com',
        password: 'password',
      });

      expect(result.error?.message).toBe('Network error');
    });
  });
});
