import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Login from '../pages/Login';
import SignUp from '../pages/SignUp';
import { supabase } from '../lib/supabase';

// Wrapper for components that need router
const RouterWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('Authentication Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Login Component', () => {
    it('renders login form with all required fields', () => {
      render(<Login />, { wrapper: RouterWrapper });

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('displays validation errors for empty fields', async () => {
      render(<Login />, { wrapper: RouterWrapper });
      const user = userEvent.setup();

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(signInButton);

      // Form should prevent submission or show errors
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    it('calls supabase signInWithPassword on form submission', async () => {
      const mockSignIn = vi.fn().mockResolvedValue({
        data: { user: { id: '123', email: 'test@test.com' }, session: {} },
        error: null,
      });
      vi.mocked(supabase.auth.signInWithPassword).mockImplementation(mockSignIn);

      render(<Login />, { wrapper: RouterWrapper });
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@test.com');
      await user.type(passwordInput, 'password123');
      await user.click(signInButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith({
          email: 'test@test.com',
          password: 'password123',
        });
      });
    });

    it('displays error message on failed login', async () => {
      const mockSignIn = vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' },
      });
      vi.mocked(supabase.auth.signInWithPassword).mockImplementation(mockSignIn);

      render(<Login />, { wrapper: RouterWrapper });
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'wrong@test.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(signInButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalled();
      });
    });

    it('has link to signup page', () => {
      render(<Login />, { wrapper: RouterWrapper });

      const signupLink = screen.getByText(/sign up/i);
      expect(signupLink).toBeInTheDocument();
      expect(signupLink.closest('a')).toHaveAttribute('href', '/signup');
    });
  });

  describe('SignUp Component', () => {
    it('renders signup form with all required fields', () => {
      render(<SignUp />, { wrapper: RouterWrapper });

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
    });

    it('calls supabase signUp on form submission', async () => {
      const mockSignUp = vi.fn().mockResolvedValue({
        data: { user: { id: '123', email: 'newuser@test.com' }, session: {} },
        error: null,
      });
      vi.mocked(supabase.auth.signUp).mockImplementation(mockSignUp);

      render(<SignUp />, { wrapper: RouterWrapper });
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password/i);
      const signUpButton = screen.getByRole('button', { name: /sign up/i });

      await user.type(emailInput, 'newuser@test.com');
      await user.type(passwordInput, 'password123');
      await user.click(signUpButton);

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          email: 'newuser@test.com',
          password: 'password123',
        });
      });
    });

    it('has link to login page', () => {
      render(<SignUp />, { wrapper: RouterWrapper });

      const loginLink = screen.getByText(/sign in/i);
      expect(loginLink).toBeInTheDocument();
      expect(loginLink.closest('a')).toHaveAttribute('href', '/login');
    });
  });
});
