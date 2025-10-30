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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 transition-colors">
      <nav className="bg-white dark:bg-gray-800 shadow-sm transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">Nexus</h1>
            <div className="flex items-center gap-3">
              <ThemeToggle />
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
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
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
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Welcome to Nexus
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto px-4">
            An educational platform for evaluating and comparing responses from multiple AI models.
            Submit queries, receive anonymous responses, and rate them to help improve AI evaluation.
          </p>
          {!user && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center px-4">
              <Link
                to="/signup"
                className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-lg font-semibold text-center"
              >
                Get Started
              </Link>
              <Link
                to="/login"
                className="px-8 py-3 bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 border-2 border-indigo-600 dark:border-indigo-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-gray-600 transition-colors text-lg font-semibold text-center"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>

        <div className="mt-12 sm:mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 transition-colors">
            <div className="text-3xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Submit Queries</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Ask questions and receive responses from multiple AI models anonymously.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 transition-colors">
            <div className="text-3xl mb-4">⭐</div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Rate Responses</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Evaluate and provide feedback on AI responses without knowing which model generated them.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 transition-colors">
            <div className="text-3xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Compare Models</h3>
            <p className="text-gray-600 dark:text-gray-300">
              See how different AI models perform based on anonymous ratings from students.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
