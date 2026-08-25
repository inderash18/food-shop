import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Lock, User, AlertTriangle, Loader2, ArrowRight } from 'lucide-react';
import { useAdminAuthStore } from '../../stores/adminAuth';
import { toast } from '../../components/ui/Toast';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginAdmin, isLoading, error, clearError } = useAdminAuthStore();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const from = (location.state as any)?.from?.pathname || '/admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);

    if (!identifier.trim() || !password.trim()) {
      setLocalError('Please provide both Administrator ID and Password.');
      return;
    }

    try {
      const admin = await loginAdmin(identifier.trim(), password);
      toast.success(`Welcome, ${admin.name}! Authenticated as ${admin.role}.`);
      navigate(from, { replace: true });
    } catch (err: any) {
      setLocalError(err.message || 'Administrator authentication failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 flex items-center justify-center p-4 antialiased text-stone-100 selection:bg-amber-500 selection:text-stone-950">
      <div className="w-full max-w-md">
        
        {/* Portal Shield Brand */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-2xl backdrop-blur-sm">
            <Shield className="w-7 h-7 text-amber-400" />
          </div>
          <div className="space-y-1">
            <span className="inline-block px-3 py-0.5 text-[10px] font-mono uppercase tracking-widest text-amber-400 bg-amber-500/10 rounded-full border border-amber-500/20 font-bold">
              Restricted Area
            </span>
            <h1 className="text-2xl font-black tracking-tight text-white uppercase">ADMIN PORTAL</h1>
            <p className="text-xs text-stone-400 font-normal">
              Secure Management Access & Payment Operations
            </p>
          </div>
        </div>

        {/* Login Box */}
        <div className="bg-stone-900/90 backdrop-blur-md border border-stone-800 rounded-3xl p-7 shadow-2xl space-y-5">
          
          {(error || localError) && (
            <div className="p-3.5 bg-rose-950/40 border border-rose-800/60 rounded-2xl text-rose-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold">Authentication Refused</p>
                <p className="text-rose-400/90 text-[11px] leading-relaxed">{localError || error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-stone-400">
                Admin Username / ID / Email
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="admin@college.local or ADMIN001"
                  required
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 bg-stone-950/60 border border-stone-800 rounded-xl text-xs font-mono text-white placeholder:text-stone-600 focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/50 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-stone-400">
                Secure Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-stone-950/60 border border-stone-800 rounded-xl text-xs font-mono text-white placeholder:text-stone-600 focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/50 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-stone-950" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>SIGN IN TO ADMIN PORTAL</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-3 border-t border-stone-800/80 text-center space-y-2">
            <p className="text-[11px] text-stone-500 font-mono">
              Demo Admin: <span className="text-stone-300">admin@college.local</span> • <span className="text-stone-300">College@123</span>
            </p>
            <p className="text-[10px] text-stone-600">
              Authorized personnel only. All access attempts are recorded.
            </p>
          </div>
        </div>

        {/* Link back to student shop */}
        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-xs text-stone-500 hover:text-stone-300 font-medium transition-colors"
          >
            ← Return to Food Shop
          </a>
        </div>
      </div>
    </div>
  );
}
