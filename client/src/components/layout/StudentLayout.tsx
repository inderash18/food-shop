import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  UtensilsCrossed,
  ShoppingBag,
  Heart,
  User,
  Search,
  Bell,
  MapPin,
  ChevronDown,
  ArrowLeft,
  Sparkles,
  Settings,
  HelpCircle,
  LogOut,
  Menu as MenuIcon,
  X,
  CreditCard,
  CheckCircle2,
  SlidersHorizontal,
  Compass,
  Armchair,
  Ticket,
  Layers,
  Utensils,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth';
import { useCart } from '../../hooks/useCart';
import { useWishlistStore } from '../../stores/wishlist';
import { useAddressStore, CampusAddress } from '../../stores/addresses';
import { useSocket } from '../../hooks/useSocket';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../api/client';
import { ToastContainer, toast } from '../ui/Toast';
import { UserAvatar } from '../ui/UserAvatar';
import { BrandLogo } from '../ui/BrandLogo';
import { formatINR } from '../../lib/format';
import { cn } from '../../lib/utils';

export function StudentLayout({ children }: { children?: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const { cart, itemCount } = useCart();
  const wishlistCount = useWishlistStore((s) => s.items.length);
  const { addresses, getDefault, setDefault } = useAddressStore();
  const defaultAddress = getDefault();
  useSocket();

  // State for dropdowns & modals
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileDrawerOpen(false);
    setProfileDropdownOpen(false);
    setLocationModalOpen(false);
  }, [location.pathname]);

  // Unread notifications query
  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => apiGet<{ unread: number }>('/api/notifications/unread-count'),
    enabled: !!user,
    refetchInterval: user ? 30_000 : false,
  });
  const unreadCount = unreadData?.unread ?? 0;

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch {
      navigate('/login');
    }
  };

  const isHome = location.pathname === '/';
  const isMenu = location.pathname === '/menu';
  const isCart = location.pathname === '/cart';
  const isOrders = location.pathname === '/orders';
  const isWishlist = location.pathname === '/wishlist';
  const isProfile = location.pathname === '/profile';
  const isSearch = location.pathname === '/search';
  const isNotifications = location.pathname === '/notifications';
  const isCheckout =
    location.pathname === '/checkout' ||
    location.pathname === '/payment' ||
    location.pathname === '/order-confirmation';

  // Get Page Title for secondary mobile headers
  const getPageTitle = () => {
    if (isCart) return 'Your Cart';
    if (isOrders) return 'My Orders';
    if (isWishlist) return 'My Wishlist';
    if (isProfile) return 'My Profile';
    if (isNotifications) return 'Notifications';
    if (location.pathname === '/addresses') return 'Delivery Addresses';
    if (location.pathname === '/payment-methods') return 'Payment Methods';
    if (location.pathname.startsWith('/settings')) return 'Settings';
    if (location.pathname === '/help') return 'Help & Support';
    if (location.pathname === '/search') return 'Search Dishes';
    if (location.pathname === '/checkout') return 'Checkout';
    if (location.pathname === '/payment') return 'Payment';
    if (location.pathname === '/order-confirmation') return 'Order Status';
    return '';
  };

  const pageTitle = getPageTitle();

  return (
    <div className="min-h-screen bg-[#FFFDF9] font-sans text-stone-900 flex flex-col antialiased selection:bg-[#FEDB71] selection:text-amber-950">
      
      {/* ========================================================================= */}
      {/* 1. DESKTOP TOP NAVBAR (Crisp Pure White & Warm Yellow SaaS Bar)           */}
      {/* ========================================================================= */}
      <header className="hidden md:block sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-amber-100 transition-colors">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
          
          {/* Brand Logo */}
          <Link to="/" className="shrink-0">
            <BrandLogo size="md" />
          </Link>

          {/* Primary SaaS Navigation Links */}
          <nav className="flex items-center gap-1">
            {[
              { to: '/', label: 'Overview', icon: Home },
              { to: '/menu', label: 'Food Menu', icon: Utensils },
              { to: '/orders', label: 'My Orders', icon: Ticket },
              { to: '/settings', label: 'Settings', icon: Settings },
              { to: '/help', label: 'Help', icon: HelpCircle },
            ].map((nav) => (
              <NavLink
                key={nav.to}
                to={nav.to}
                end={nav.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'px-3.5 py-2 rounded-xl text-xs transition-all flex items-center gap-2',
                    isActive
                      ? 'bg-[#FEDB71] text-amber-950 font-bold border border-amber-300 shadow-3xs'
                      : 'text-stone-600 hover:text-amber-950 hover:bg-amber-50/60 font-medium'
                  )
                }
              >
                <nav.icon className="h-4 w-4" />
                <span>{nav.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Right Action Icons & User Dropdown */}
          <div className="flex items-center gap-2.5 shrink-0">
            
            {/* Notification Bell */}
            <Link
              to="/notifications"
              className="w-9 h-9 rounded-xl bg-amber-50/40 border border-amber-200/60 flex items-center justify-center text-amber-900 hover:bg-amber-100/60 transition-all relative shadow-3xs"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#F59E0B] ring-2 ring-white"></span>
              )}
            </Link>

            {/* Cart Button */}
            <Link
              to="/cart"
              className="h-9 px-3 rounded-xl bg-[#FEDB71] hover:bg-[#F5CA38] border border-amber-300 text-amber-950 flex items-center gap-2 font-bold shadow-3xs transition-transform active:scale-95"
              title="View Cart"
            >
              <ShoppingBag className="h-4 w-4 text-amber-950" />
              <span className="text-xs font-bold tabular-nums">
                {cart.cartCount > 0 ? `${cart.cartCount} items` : 'Bag'}
              </span>
            </Link>

            {/* User Profile Avatar & Dropdown */}
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setProfileDropdownOpen((v) => !v)}
                  className="flex items-center gap-2 p-1 rounded-xl hover:bg-amber-50/60 border border-transparent hover:border-amber-200 transition-all"
                >
                  <UserAvatar user={user} size="sm" />
                  <ChevronDown
                    className={cn(
                      'w-3.5 h-3.5 text-stone-400 transition-transform duration-200',
                      profileDropdownOpen && 'rotate-180'
                    )}
                  />
                </button>

                {/* Dropdown Menu Card */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-card border border-amber-200/80 py-2 z-50 animate-in">
                    <div className="px-4 py-2.5 border-b border-amber-100">
                      <p className="text-xs font-bold text-amber-950 truncate">{user.name}</p>
                      <p className="text-[11px] text-stone-500 truncate">{user.email}</p>
                      <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider bg-[#FEDB71] text-amber-950 px-2 py-0.5 rounded-md border border-amber-300">
                        {user.role} • {user.studentId}
                      </span>
                    </div>

                    <div className="py-1">
                      <Link
                        to="/profile"
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-stone-700 hover:bg-amber-50 transition-colors"
                      >
                        <User className="h-4 w-4 text-amber-600" />
                        <span>My Profile</span>
                      </Link>

                      <Link
                        to="/orders"
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-stone-700 hover:bg-amber-50 transition-colors"
                      >
                        <Ticket className="h-4 w-4 text-amber-600" />
                        <span>Pre-Orders & Passes</span>
                      </Link>

                      <Link
                        to="/settings"
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-stone-700 hover:bg-amber-50 transition-colors"
                      >
                        <Settings className="h-4 w-4 text-amber-600" />
                        <span>Account Settings</span>
                      </Link>
                    </div>

                    <div className="pt-1 border-t border-amber-100">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-stone-700 hover:bg-amber-50 transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#FEDB71] hover:bg-[#F5CA38] text-amber-950 border border-amber-300 shadow-3xs transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MOBILE APP TOP BAR (Clean White & Yellow Bar with NO Black)            */}
      {/* ========================================================================= */}
      <header className="md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-amber-100 shrink-0">
        {isHome || isMenu ? (
          /* Home & Menu Clean Header */
          <div className="px-4 h-14 flex items-center justify-between gap-3">
            {/* Logo */}
            <Link to="/" className="shrink-0">
              <BrandLogo size="sm" />
            </Link>

            {/* Actions: Cart + Notifications + User Avatar */}
            <div className="flex items-center gap-2">
              <Link
                to="/cart"
                className="w-8 h-8 rounded-xl bg-[#FEDB71] text-amber-950 flex items-center justify-center relative hover:bg-[#F5CA38] border border-amber-300 transition-colors shadow-3xs"
                title="Cart"
              >
                <ShoppingBag className="w-4 h-4" />
                {cart.cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#F59E0B] text-white text-[9px] font-bold h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center ring-2 ring-white tabular-nums">
                    {cart.cartCount}
                  </span>
                )}
              </Link>

              <Link
                to="/notifications"
                className="w-8 h-8 rounded-xl bg-amber-50/60 border border-amber-200/60 flex items-center justify-center text-amber-900 relative hover:bg-amber-100/60 transition-colors shadow-3xs"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#F59E0B] ring-2 ring-white"></span>
                )}
              </Link>

              <Link to="/profile" className="hover:scale-105 transition-transform">
                <UserAvatar user={user} size="sm" />
              </Link>
            </div>
          </div>
        ) : (
          /* Subpage Header */
          <div className="px-4 h-14 flex items-center justify-between gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 rounded-xl bg-amber-50 hover:bg-amber-100 flex items-center justify-center text-amber-950 active:scale-95 transition-transform shadow-3xs border border-amber-200/60"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-sm font-bold text-amber-950 flex-1 text-center truncate">
              {pageTitle || 'foodislice'}
            </h1>
            <Link to="/profile" className="hover:scale-105 transition-transform">
              <UserAvatar user={user} size="sm" />
            </Link>
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* 3. MOBILE SLIDE-OVER DRAWER / HAMBURGER MENU                              */}
      {/* ========================================================================= */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs animate-in fade-in"
            onClick={() => setMobileDrawerOpen(false)}
          ></div>

          {/* Drawer Content */}
          <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl z-10 flex flex-col p-5 overflow-y-auto animate-in slide-in-from-left duration-200">
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-800 to-teal-500 text-white flex items-center justify-center font-black text-sm">
                  f
                </div>
                <span className="font-extrabold text-lg text-gray-900">foodislice</span>
              </Link>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* User Profile Card */}
            {user ? (
              <Link
                to="/profile"
                className="my-4 p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex items-center gap-3"
              >
                <div className="h-10 w-10 rounded-xl bg-white border border-emerald-200 overflow-hidden shrink-0">
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name || 'User'}`}
                    alt="User"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-xs text-gray-900 truncate">{user.name}</p>
                  <p className="text-[10px] text-gray-500 truncate">{user.studentId}</p>
                  <span className="text-[9px] font-bold text-emerald-700">View profile →</span>
                </div>
              </Link>
            ) : (
              <div className="my-4 p-3 bg-gray-50 rounded-2xl text-center space-y-2">
                <p className="text-xs font-bold text-gray-800">Welcome to Campus Dining</p>
                <Link
                  to="/login"
                  className="block w-full py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl"
                >
                  Log In / Register
                </Link>
              </div>
            )}

            {/* Drawer Navigation Links */}
            <nav className="space-y-1 flex-1">
              {[
                { to: '/', label: 'Home Page', icon: Home },
                { to: '/menu', label: 'Explore Food Menu', icon: Compass },
                { to: '/orders', label: 'My Orders & Tracking', icon: ShoppingBag },
                { to: '/wishlist', label: 'Saved Wishlist', icon: Heart, badge: wishlistCount },
                { to: '/addresses', label: 'Delivery Addresses', icon: MapPin },
                { to: '/payment-methods', label: 'Payment Methods & Wallet', icon: CreditCard },
                { to: '/settings', label: 'App Settings', icon: Settings },
                { to: '/help', label: 'Help & Support', icon: HelpCircle },
              ].map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors',
                      isActive
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )
                  }
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge ? (
                    <span className="bg-emerald-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                      {item.badge}
                    </span>
                  ) : null}
                </NavLink>
              ))}
            </nav>

            {/* Logout Action */}
            {user && (
              <div className="pt-4 border-t border-gray-100">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log Out Account</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. LOCATION PICKER MODAL (Campus Delivery Spots)                          */}
      {/* ========================================================================= */}
      {locationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-3xl p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div>
                <h3 className="font-extrabold text-base text-gray-900">Select Delivery Location</h3>
                <p className="text-xs text-gray-500">Pick where you want your food delivered</p>
              </div>
              <button
                onClick={() => setLocationModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Addresses List */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  onClick={() => {
                    setDefault(addr.id);
                    setLocationModalOpen(false);
                    toast.success(`Delivery set to ${addr.building}`);
                  }}
                  className={cn(
                    'p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all',
                    addr.isDefault
                      ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-200/60'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  )}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
                      addr.isDefault ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
                    )}
                  >
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-gray-900">{addr.building}</span>
                      {addr.isDefault && (
                        <span className="text-[9px] font-black bg-emerald-600 text-white px-1.5 py-0.2 rounded-full uppercase">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 truncate mt-0.5">{addr.roomNumber}</p>
                    <p className="text-[11px] text-gray-400">{addr.contactPhone}</p>
                  </div>
                </div>
              ))}
            </div>

            <Link
              to="/addresses"
              onClick={() => setLocationModalOpen(false)}
              className="block w-full py-2.5 text-center text-xs font-extrabold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors"
            >
              + Manage / Add New Address
            </Link>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MAIN SCROLLABLE CONTENT                                                */}
      {/* ========================================================================= */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-4 sm:py-6 pb-28 md:pb-12">
        {children ?? <Outlet />}
      </main>

      {/* ========================================================================= */}
      {/* 6. FLOATING CART CTA (Mobile Only)                                        */}
      {/* ========================================================================= */}
      {cart.cartCount > 0 && !isCart && !isCheckout && (
        <div className="md:hidden fixed bottom-[calc(env(safe-area-inset-bottom)+4.25rem)] left-3 right-3 z-40 animate-in">
          <Link
            to="/cart"
            className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 hover:from-emerald-900 hover:to-teal-900 text-white px-4 py-3.5 rounded-2xl shadow-[0_10px_25px_-5px_rgba(4,120,87,0.45)] border border-emerald-500/20 flex items-center justify-between font-bold active:scale-[0.98] transition-all"
          >
            <div className="flex flex-col">
              <span className="text-[11px] font-extrabold tracking-wider uppercase text-emerald-200">
                {cart.cartCount} {cart.cartCount === 1 ? 'ITEM' : 'ITEMS'} IN CART
              </span>
              <span className="text-base font-black text-white leading-tight">
                {formatINR(cart.subtotal)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-extrabold bg-white/15 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-emerald-50 border border-white/10 shadow-xs">
              View Cart <ShoppingBag className="h-3.5 w-3.5" />
            </div>
          </Link>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. DEDICATED MOBILE BOTTOM NAVIGATION BAR (1-Hand Optimized)             */}
      {/* ========================================================================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/98 backdrop-blur-lg border-t border-gray-100/90 z-40 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_25px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-around h-[58px] px-2">
          {[
            { to: '/menu', label: 'Menu', icon: Utensils },
            { to: '/search', label: 'Search', icon: Search },
            { to: '/cart', label: 'My Order', icon: ShoppingBag, badge: itemCount || null },
            { to: '/orders', label: 'Orders', icon: Ticket },
            { to: '/profile', label: 'Profile', icon: User },
          ].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-150 relative select-none',
                  isActive
                    ? 'text-amber-700 font-bold'
                    : 'text-stone-400 hover:text-amber-900 font-medium'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <item.icon
                      className={cn(
                        'h-5 w-5 transition-transform duration-200',
                        isActive ? 'text-amber-600 scale-105' : 'text-stone-400'
                      )}
                      strokeWidth={isActive ? 2.4 : 1.7}
                    />
                    {item.badge ? (
                      <span className="absolute -top-1.5 -right-2 bg-[#F59E0B] text-white text-[9px] font-bold h-3.5 min-w-[14px] px-1 rounded-full flex items-center justify-center ring-2 ring-white tabular-nums">
                        {item.badge}
                      </span>
                    ) : null}
                  </div>
                  <span
                    className={cn(
                      'text-[10px] tracking-tight transition-colors',
                      isActive ? 'text-amber-900 font-bold' : 'text-stone-400 font-medium'
                    )}
                  >
                    {item.label}
                  </span>
                  {isActive && (
                    <div className="absolute top-0 w-8 h-[2.5px] bg-[#FEDB71] rounded-b-full"></div>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Global Toast Container */}
      <ToastContainer />
    </div>
  );
}
