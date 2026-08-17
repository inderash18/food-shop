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
    <div className="flex h-screen bg-background font-sans text-gray-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-surface border-r border-border flex flex-col justify-between hidden md:flex shrink-0 z-20">
        <div className="p-6 flex flex-col h-full">
          <Link to="/" className="flex items-center gap-2 mb-10 pl-2">
             <div className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold text-lg">
               f
             </div>
            <span className="font-bold text-xl tracking-tight text-primary-500">foodislice</span>
          </Link>
          
          <nav className="space-y-1.5 flex-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-5 py-3.5 rounded-full transition-all duration-200 font-medium text-[15px]',
                    isActive
                      ? 'bg-primary-50 text-primary-500 border border-primary-100 shadow-sm'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
                  )
                }
              >
                <item.icon className="h-[18px] w-[18px]" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto">
            <div className="bg-gray-50 rounded-3xl p-5 text-gray-800 text-center relative overflow-hidden border border-gray-100">
               <div className="w-full h-32 bg-gray-200 rounded-2xl mb-4 overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=400&q=80" alt="Food Delivery" className="w-full h-full object-cover opacity-80" />
               </div>
               <h4 className="font-bold mb-2 text-sm text-gray-900">How to order food?</h4>
               <p className="text-xs text-gray-500 mb-4 leading-relaxed">Ordering food from our web app is a seamless and delightful experience designed to satisfy you effortlessly...</p>
               <div className="flex items-center justify-center gap-1.5">
                  <div className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center text-gray-400 text-[10px] cursor-pointer">&lt;</div>
                  <div className="w-5 h-5 rounded-full bg-primary-500 text-white flex items-center justify-center text-[10px] cursor-pointer">&gt;</div>
               </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-background">
        {/* Top Header */}
        <header className="h-[88px] px-8 flex items-center justify-between shrink-0 sticky top-0 z-10 bg-background/80 backdrop-blur-md">
          <div className="flex-1 flex justify-between items-center w-full max-w-[1600px] mx-auto gap-4">
            
            {/* Search and Filter */}
            <div className="flex items-center gap-3 w-full max-w-lg">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-[18px] w-[18px]" />
                <input 
                  type="text" 
                  placeholder="Search food" 
                  className="w-full pl-11 pr-4 py-3 bg-surface border border-gray-100 rounded-full outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all text-sm font-medium placeholder:text-gray-400 shadow-sm"
                />
              </div>
              <button className="bg-primary-500 text-white font-medium px-5 py-3 rounded-full hover:bg-primary-600 transition-colors shadow-sm flex items-center gap-2 text-sm shrink-0">
                Filter
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-5 ml-auto">
              <button className="text-gray-400 hover:text-gray-800 transition-colors relative">
                <Bell className="h-5 w-5" />
                <span className="absolute 1 top-0 right-0 h-1.5 w-1.5 rounded-full bg-red-500"></span>
              </button>

              <div className="flex items-center gap-2.5 pl-5 border-l border-gray-200 cursor-pointer" onClick={handleLogout}>
                <div className="h-9 w-9 rounded-full bg-gray-200 overflow-hidden border border-gray-100 shadow-sm">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=David" alt="User" className="h-full w-full object-cover" />
                </div>
                <span className="text-sm font-medium text-gray-700 hidden sm:block">David Brown</span>
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
