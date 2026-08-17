import { useEffect } from 'react';
import { Outlet, Link, NavLink, useNavigate, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  ChefHat,
  Package,
  Tags,
  Boxes,
  Users,
  CreditCard,
  BarChart3,
  FileDown,
  ScrollText,
  Settings,
  TicketPercent,
  LogOut,
  UtensilsCrossed,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth';
import { useSocket } from '../../hooks/useSocket';
import { cn } from '../../lib/format';
import { ToastContainer } from '../ui/Toast';

const navGroups = [
  {
    title: 'Manage',
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/admin/orders', label: 'Orders', icon: ClipboardList },
      { to: '/admin/kitchen', label: 'Kitchen', icon: ChefHat },
    ],
  },
  {
    title: 'Catalog',
    items: [
      { to: '/admin/products', label: 'Products', icon: Package },
      { to: '/admin/categories', label: 'Categories', icon: Tags },
      { to: '/admin/inventory', label: 'Inventory', icon: Boxes },
      { to: '/admin/coupons', label: 'Coupons', icon: TicketPercent },
    ],
  },
  {
    title: 'Business',
    items: [
      { to: '/admin/users', label: 'Users', icon: Users },
      { to: '/admin/payments', label: 'Payments', icon: CreditCard },
      { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/admin/reports', label: 'Reports', icon: FileDown },
    ],
  },
  {
    title: 'System',
    items: [
      { to: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
      { to: '/admin/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export function AdminLayout() {
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  useSocket();

  if (!initialized) {
    return <div className="h-screen w-screen flex items-center justify-center bg-gray-50 text-gray-500">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'STUDENT') {
    return <Navigate to="/" replace />;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-white border-r border-gray-200 sticky top-0 h-screen">
        <div className="h-14 flex items-center gap-2 px-5 border-b border-gray-100">
          <span className="h-8 w-8 rounded-xl bg-primary-600 text-white flex items-center justify-center">
            <UtensilsCrossed className="h-4 w-4" />
          </span>
          <div>
            <p className="font-bold text-gray-900 leading-none">Food Shop</p>
            <p className="text-xs text-gray-500 mt-0.5">Admin Panel</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {navGroups.map((group) => (
            <div key={group.title}>
              <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{group.title}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'
                      )
                    }
                  >
                    <item.icon className="h-4.5 w-4.5 h-5 w-5" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-gray-100 p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="h-9 w-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
              {user?.name?.charAt(0) ?? 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.role}</p>
            </div>
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-600" aria-label="Logout">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 h-14 flex items-center justify-between">
          <Link to="/" className="font-bold text-gray-900">
            Food Shop Admin
          </Link>
          <button onClick={handleLogout} className="p-2 text-gray-500" aria-label="Logout">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
        <main className="flex-1 p-4 md:p-6 pb-24 lg:pb-8">
          <Outlet />
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}
