import { useEffect } from 'react';
import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import { Home, UtensilsCrossed, ShoppingBag, User, Bell, LogOut, Utensils } from 'lucide-react';
import { useAuthStore } from '../../stores/auth';
import { useCart } from '../../hooks/useCart';
import { useSocket } from '../../hooks/useSocket';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../api/client';
import { cn } from '../../lib/format';
import { ToastContainer } from '../ui/Toast';

const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/menu', label: 'Menu', icon: UtensilsCrossed },
  { to: '/cart', label: 'Cart', icon: ShoppingBag },
  { to: '/orders', label: 'Orders', icon: Utensils },
  { to: '/profile', label: 'Profile', icon: User },
];

export function StudentLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const { cart } = useCart();
  useSocket();

  const { data: shop } = useQuery({
    queryKey: ['shop-settings'],
    queryFn: () => apiGet<{ settings: { shopName: string; shopStatus: string } }>('/api/settings/public'),
    staleTime: 60_000,
  });

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-xl bg-primary-600 text-white flex items-center justify-center">
              <UtensilsCrossed className="h-4 w-4" />
            </span>
            <span className="font-bold text-gray-900">{shop?.settings.shopName ?? 'Food Shop'}</span>
          </Link>
          <div className="flex items-center gap-1.5">
            {user && (
              <>
                <Link to="/notifications" className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-600" aria-label="Notifications">
                  <Bell className="h-5 w-5" />
                </Link>
                <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" aria-label="Logout">
                  <LogOut className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-5 pb-24 md:pb-10">
        <Outlet />
      </main>

      {cart.cartCount > 0 && (
        <Link
          to="/cart"
          className="fixed bottom-20 md:bottom-6 right-4 z-40 flex items-center gap-2 bg-primary-600 text-white rounded-full pl-4 pr-5 h-12 shadow-lg shadow-primary-600/30 hover:bg-primary-700"
        >
          <ShoppingBag className="h-5 w-5" />
          <span className="font-semibold">View Cart</span>
          <span className="bg-white/20 rounded-full px-2 py-0.5 text-sm font-bold">{cart.cartCount}</span>
        </Link>
      )}

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200 pb-safe">
        <div className="grid grid-cols-5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn('flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium', isActive ? 'text-primary-600' : 'text-gray-500')
              }
            >
              {({ isActive }) => (
                <>
                  <span className="relative">
                    <item.icon className="h-5 w-5" />
                    {item.to === '/cart' && cart.cartCount > 0 && (
                      <span className="absolute -top-1.5 -right-2 h-4 min-w-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1">
                        {cart.cartCount > 99 ? '99+' : cart.cartCount}
                      </span>
                    )}
                  </span>
                  <span className={cn('h-1 w-1 rounded-full', isActive ? 'bg-primary-600' : 'bg-transparent')} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <ToastContainer />
    </div>
  );
}
