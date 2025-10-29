import { Link } from 'react-router-dom';

export default function AccessDenied() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
          <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">Access Denied</h1>

        <p className="text-gray-600 mb-6">
          You don't have permission to access this area. This page requires administrator privileges.
        </p>

        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
          <p className="text-sm text-yellow-800">
            <span className="font-semibold">Admin access required.</span><br/>
            If you believe you should have access, please contact your system administrator.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            to="/dashboard"
            className="block w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
          >
            Go to Dashboard
          </Link>
          <Link
            to="/"
            className="block w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
          >
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
