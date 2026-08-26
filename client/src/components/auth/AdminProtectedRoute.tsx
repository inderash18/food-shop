import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuthStore } from '../../stores/adminAuth';
import { Loader2, ShieldAlert } from 'lucide-react';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function AdminProtectedRoute({ children, allowedRoles }: AdminProtectedRouteProps) {
  const location = useLocation();
  const { adminUser, isLoading, isInitialized, adminAuthStatus, loadAdminMe } = useAdminAuthStore();

  useEffect(() => {
    if (!isInitialized) {
      loadAdminMe();
    }
  }, [isInitialized, loadAdminMe]);

  if (!isInitialized || isLoading || adminAuthStatus === 'loading') {
    return (
      <div className="min-h-screen bg-stone-900 flex flex-col items-center justify-center gap-4 text-stone-200">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-xs font-mono uppercase tracking-widest text-stone-400">Verifying Admin Privileges...</p>
      </div>
    );
  }

  // Not authenticated as admin -> redirect to dedicated /admin/login
  if (adminAuthStatus === 'unauthenticated' || !adminUser) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // Role validation
  if (allowedRoles && !allowedRoles.includes(adminUser.role)) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-6 text-stone-200">
        <div className="max-w-md w-full bg-stone-900 border border-stone-800 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Access Forbidden</h2>
          <p className="text-xs text-stone-400">
            Your role (<span className="font-mono text-amber-400">{adminUser.role}</span>) does not have permission to view this administrative resource.
          </p>
          <a
            href="/admin/login"
            className="inline-block px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl shadow transition-colors"
          >
            Switch Account
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
