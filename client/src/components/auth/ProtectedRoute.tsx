import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const authStatus = useAuthStore((s) => s.authStatus);
  const location = useLocation();

  // Show loading spinner while authentication is being verified
  if (!initialized || authStatus === 'loading') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 gap-3">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="text-xs text-stone-500 font-medium tracking-wide">Restoring session...</p>
      </div>
    );
  }

  // Only redirect after session verification has completed and returned unauthenticated
  if (authStatus === 'unauthenticated' || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
