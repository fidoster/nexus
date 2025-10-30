import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';
import ThemeToggle from '../components/ThemeToggle';

export default function Home() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors relative overflow-hidden">
      {/* Subtle background texture/pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 dark:from-indigo-500/10 dark:via-purple-500/10 dark:to-pink-500/10"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.05),transparent_50%)] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.15),transparent_50%)]"></div>

      {/* Navigation */}
      <nav className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm border-b border-gray-200/50 dark:border-gray-700/50 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">N</span>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Nexus</h1>
            </div>
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <Link
                    to="/dashboard"
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="hidden sm:block px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md"
                  >
                    Sign Up
                  </Link>
                </>
              )}
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        {/* Hero Section */}
        <div className="text-center mb-16 sm:mb-24">
          <div className="inline-block mb-6 px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full border border-indigo-200 dark:border-indigo-800">
            <span className="text-indigo-600 dark:text-indigo-400 text-sm font-semibold">Educational AI Evaluation Platform</span>
          </div>

          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
            Evaluate AI Models
            <br />
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Blindly & Fairly</span>
          </h2>

          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Submit queries, receive anonymous responses from multiple AI models, and provide unbiased ratings to advance AI research.
          </p>

          {!user && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="group px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all text-lg font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:scale-105"
              >
                Get Started
                <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
              </Link>
              <Link
                to="/login"
                className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600 rounded-xl hover:border-indigo-500 dark:hover:border-indigo-500 transition-all text-lg font-semibold hover:scale-105"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {/* Feature 1 */}
          <div className="group relative bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md hover:shadow-xl border border-gray-200 dark:border-gray-700 transition-all hover:scale-105 hover:-translate-y-1">
            <div className="absolute -top-4 -left-4 w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg rotate-3 group-hover:rotate-6 transition-transform">
              <span className="text-3xl">🎯</span>
            </div>
            <div className="mt-6">
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Submit Queries</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Ask any question and receive responses from multiple state-of-the-art AI models simultaneously.
              </p>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="group relative bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md hover:shadow-xl border border-gray-200 dark:border-gray-700 transition-all hover:scale-105 hover:-translate-y-1">
            <div className="absolute -top-4 -left-4 w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg rotate-3 group-hover:rotate-6 transition-transform">
              <span className="text-3xl">⭐</span>
            </div>
            <div className="mt-6">
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Blind Evaluation</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Rate responses without bias. Models are anonymized as A, B, C to ensure fair evaluation.
              </p>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="group relative bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md hover:shadow-xl border border-gray-200 dark:border-gray-700 transition-all hover:scale-105 hover:-translate-y-1">
            <div className="absolute -top-4 -left-4 w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl flex items-center justify-center shadow-lg rotate-3 group-hover:rotate-6 transition-transform">
              <span className="text-3xl">📊</span>
            </div>
            <div className="mt-6">
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Research Analytics</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Access comprehensive analytics and insights to understand AI model performance patterns.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        {!user && (
          <div className="mt-20 text-center">
            <div className="inline-block bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-800 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-8 sm:p-12 shadow-lg">
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Ready to contribute to AI research?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-xl mx-auto">
                Join our platform and help create unbiased evaluations of AI models.
              </p>
              <Link
                to="/signup"
                className="inline-block px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all text-lg font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40"
              >
                Create Free Account
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
