import { Outlet, Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const { cart } = useCart();
  useSocket();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-background font-sans text-gray-900 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-surface border-r border-border flex-col justify-between hidden md:flex shrink-0 z-20">
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
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-background relative">
        {/* Top Header */}
        <header className="h-16 md:h-[88px] px-4 md:px-8 flex items-center justify-between shrink-0 sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-100 md:border-none shadow-sm md:shadow-none">
          <div className="flex-1 flex justify-between items-center w-full max-w-[1600px] mx-auto gap-4">
            
            {/* Mobile Header (Location) */}
            <div className="flex md:hidden flex-col justify-center">
              <div className="flex items-center gap-1.5 text-gray-900 font-bold text-lg">
                <span className="text-primary-500">📍</span> College Campus <span className="text-[10px] text-gray-400">▼</span>
              </div>
              <span className="text-[11px] text-gray-500 font-medium">Main Hostel Building, Block A</span>
            </div>

            {/* Desktop Brand */}
            <Link to="/" className="hidden md:flex items-center gap-2 mr-8">
               <div className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold text-lg">
                 f
               </div>
              <span className="font-bold text-xl tracking-tight text-primary-500">foodislice</span>
            </Link>

            {/* Search and Filter (Desktop only) */}
            <div className="hidden md:flex items-center gap-3 w-full max-w-lg">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-[18px] w-[18px]" />
                <input 
                  type="text" 
                  placeholder="Search for restaurants and food" 
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all text-sm font-medium placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3 md:gap-5 ml-auto">
              {/* Profile Icon Mobile */}
              <Link to="/settings" className="md:hidden w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 shadow-sm overflow-hidden">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'User'}`} alt="User" className="h-full w-full object-cover" />
              </Link>

              <Link to="/cart" className="hidden md:flex text-gray-600 hover:text-gray-900 transition-colors relative items-center justify-center">
                <ShoppingBag className="h-5 w-5" />
                {cart.cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-primary-500 text-white flex items-center justify-center text-xs font-bold border-2 border-white">
                    {cart.cartCount}
                  </span>
                )}
              </Link>

              <button className="text-gray-400 hover:text-gray-800 transition-colors relative hidden md:block">
                <Bell className="h-5 w-5" />
                <span className="absolute top-0 right-0 h-1.5 w-1.5 rounded-full bg-red-500"></span>
              </button>

              <div className="hidden md:flex items-center gap-2.5 pl-4 border-l border-gray-200 cursor-pointer" onClick={handleLogout}>
                <div className="h-9 w-9 rounded-full bg-gray-200 overflow-hidden border border-gray-100 shadow-sm">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'User'}`} alt="User" className="h-full w-full object-cover" />
                </div>
                <span className="text-sm font-medium text-gray-700">{user?.name || 'Student'}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto bg-[#f8f9fa] md:bg-white pb-32 md:pb-10">
          <div className="max-w-7xl mx-auto w-full pt-2 md:pt-4 md:px-8">
            <Outlet />
          </div>
        </main>
        
        {/* Floating Cart CTA (Mobile Only) */}
        {cart.cartCount > 0 && location.pathname !== '/cart' && location.pathname !== '/checkout' && (
          <div className="md:hidden fixed bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] left-4 right-4 z-40">
            <Link to="/cart" className="bg-[#60b246] hover:bg-[#539e3d] text-white p-4 rounded-xl shadow-lg flex items-center justify-between font-bold">
              <div className="flex flex-col">
                <span className="text-sm">{cart.cartCount} item{cart.cartCount > 1 ? 's' : ''}</span>
                <span className="text-[11px] opacity-90">Extra charges may apply</span>
              </div>
              <div className="flex items-center gap-2 text-[15px]">
                View Cart <ShoppingBag className="h-4 w-4" />
              </div>
            </Link>
          </div>
        )}

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-around h-[60px] px-2">
            {[
              { to: '/', label: 'Swiggy', icon: Home },
              { to: '/menu', label: 'Search', icon: Search },
              { to: '/orders', label: 'Orders', icon: Utensils },
              { to: '/settings', label: 'Profile', icon: User },
            ].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors',
                    isActive ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={cn("h-[22px] w-[22px]", isActive ? "fill-gray-900 text-gray-900" : "")} strokeWidth={isActive ? 2.5 : 2} />
                    <span className={cn("text-[10px] font-bold tracking-tight", isActive ? "text-gray-900" : "")}>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>

      <ToastContainer />
    </div>
  );
}
