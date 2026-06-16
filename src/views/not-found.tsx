import { Link } from "react-router-dom";
export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
      <h1 className="text-6xl font-bold text-gray-200 dark:text-gray-700 mb-4">404</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6">Page not found</p>
      <Link to="/" className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Go Home</Link>
    </div>
  );
}
