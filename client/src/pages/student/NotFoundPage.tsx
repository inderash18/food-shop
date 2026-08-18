import { Link } from 'react-router-dom';
import { Compass, Home, ArrowLeft } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="max-w-md mx-auto text-center py-20 space-y-6">
      <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm border border-emerald-100">
        <span className="text-4xl font-black">404</span>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Dish Not On The Menu!</h1>
        <p className="text-xs text-gray-500 max-w-xs mx-auto">
          The page or dining route you are looking for does not exist or has been relocated.
        </p>
      </div>

      <div className="flex items-center justify-center gap-3 pt-2">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold text-xs rounded-xl transition-colors"
        >
          <Home className="w-4 h-4" /> Home Page
        </Link>
        <Link
          to="/menu"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-emerald transition-colors"
        >
          <Compass className="w-4 h-4" /> Explore Menu
        </Link>
      </div>
    </div>
  );
}
