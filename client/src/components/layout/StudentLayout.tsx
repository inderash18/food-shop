import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import { Home, UtensilsCrossed, ShoppingBag, User, Bell, LogOut, Utensils, Search, MessageSquare, Settings, Star } from 'lucide-react';
import { useAuthStore } from '../../stores/auth';
import { useCart } from '../../hooks/useCart';
import { useSocket } from '../../hooks/useSocket';
import { cn } from '../../lib/format';
import { ToastContainer } from '../ui/Toast';

const navItems = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/menu', label: 'Menu', icon: UtensilsCrossed },
  { to: '/orders', label: 'Food Order', icon: ShoppingBag },
  { to: '/reviews', label: 'Reviews', icon: Star },
  { to: '/settings', label: 'Setting', icon: Settings },
];

export function StudentLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const { cart } = useCart();
  useSocket();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col justify-between hidden md:flex shrink-0">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-2 mb-10">
            <span className="font-bold text-2xl tracking-tight">GoMeal<span className="text-yellow-400">.</span></span>
          </Link>
          
          <nav className="space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 font-medium',
                    isActive
                      ? 'bg-yellow-400 text-white shadow-md shadow-yellow-400/30'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="p-6">
          <div className="bg-yellow-400 rounded-3xl p-5 text-white relative overflow-hidden shadow-lg shadow-yellow-400/30">
            <div className="relative z-10">
              <h4 className="font-bold mb-1">Upgrade your Account to get more benefits</h4>
              <button className="mt-4 bg-white text-yellow-500 text-sm font-bold px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">
                Upgrade
              </button>
            </div>
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/20 rounded-full blur-xl -mr-10 -mt-10"></div>
            <div className="absolute bottom-0 right-0 w-16 h-16 bg-white/30 rounded-full -mr-5 -mb-5"></div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-20 bg-gray-50 px-8 flex items-center justify-between shrink-0">
          <div className="flex-1 flex justify-between items-center max-w-7xl mx-auto w-full">
            <div className="relative w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input 
                type="text" 
                placeholder="Search" 
                className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl outline-none focus:ring-2 focus:ring-yellow-400/50 transition-shadow text-sm font-medium placeholder:text-gray-400"
              />
            </div>

            <div className="flex items-center gap-6">
              <button className="bg-yellow-400 text-white font-semibold px-6 py-3 rounded-2xl hover:bg-yellow-500 transition-colors shadow-sm shadow-yellow-400/20">
                Add New Menu
              </button>

              <div className="flex items-center gap-4 text-gray-500">
                <button className="hover:text-gray-900 transition-colors relative">
                  <MessageSquare className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 border border-white"></span>
                </button>
                <button className="hover:text-gray-900 transition-colors relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 border border-white"></span>
                </button>
                <button className="hover:text-gray-900 transition-colors">
                  <Settings className="h-5 w-5" />
                </button>
              </div>

              <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                <div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden border-2 border-white shadow-sm cursor-pointer" onClick={handleLogout}>
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" className="h-full w-full object-cover" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto px-8 pb-10">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}
