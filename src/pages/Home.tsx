import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Home() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold text-indigo-600">Nexus</h1>
            <div className="flex gap-4">
              {user ? (
                <>
                  <Link
                    to="/dashboard"
                    className="px-4 py-2 text-gray-700 hover:text-indigo-600 transition-colors"
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
                    className="px-4 py-2 text-gray-700 hover:text-indigo-600 transition-colors"
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Welcome to Nexus
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            An educational platform for evaluating and comparing responses from multiple AI models.
            Submit queries, receive anonymous responses, and rate them to help improve AI evaluation.
          </p>
          {!user && (
            <div className="flex gap-4 justify-center">
              <Link
                to="/signup"
                className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-lg font-semibold"
              >
                Get Started
              </Link>
              <Link
                to="/login"
                className="px-8 py-3 bg-white text-indigo-600 border-2 border-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors text-lg font-semibold"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>

        <div className="mt-20 grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="text-3xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold mb-2">Submit Queries</h3>
            <p className="text-gray-600">
              Ask questions and receive responses from multiple AI models anonymously.
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="text-3xl mb-4">⭐</div>
            <h3 className="text-xl font-semibold mb-2">Rate Responses</h3>
            <p className="text-gray-600">
              Evaluate and provide feedback on AI responses without knowing which model generated them.
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="text-3xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-2">Compare Models</h3>
            <p className="text-gray-600">
              See how different AI models perform based on anonymous ratings from students.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
