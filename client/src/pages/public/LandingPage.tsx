import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Utensils,
  QrCode,
  Sparkles,
  ArrowRight,
  Clock,
  MapPin,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Building,
  Zap,
  ShoppingBag,
  Ticket,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth';
import { formatINR } from '../../lib/format';

export function LandingPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="min-h-screen bg-background text-darkText flex flex-col antialiased selection:bg-teal-100 selection:text-teal-900">
      
      {/* ========================================================= */}
      {/* 1. TOP NAVBAR                                             */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-3xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-2xl bg-[#389C9A] text-white flex items-center justify-center font-bold text-xl shadow-teal group-hover:scale-105 transition-transform">
              f
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl tracking-tight text-darkText leading-none">
                foodislice
              </span>
              <span className="text-[10px] font-semibold text-[#389C9A] uppercase tracking-wider mt-0.5">
                Pre-Order & Express Pick
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-gray-600">
            <Link to="/menu" className="hover:text-[#389C9A] transition-colors">
              Food Menu
            </Link>
            <Link to="/orders" className="hover:text-[#389C9A] transition-colors">
              My Orders
            </Link>
            <Link to="/help" className="hover:text-[#389C9A] transition-colors">
              How It Works
            </Link>
          </nav>

          {/* Nav Actions */}
          <div className="flex items-center gap-2.5">
            {user ? (
              <Link
                to="/"
                className="px-4 py-2 rounded-xl bg-[#389C9A] hover:bg-[#2d817f] text-white font-semibold text-xs shadow-teal flex items-center gap-1.5 transition-transform active:scale-95"
              >
                Go to Menu <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-gray-700 hover:text-[#389C9A] hover:bg-teal-50/60 transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/menu"
                  className="px-4 py-2 rounded-xl bg-[#389C9A] hover:bg-[#2d817f] text-white font-semibold text-xs shadow-teal transition-transform active:scale-95 flex items-center gap-1"
                >
                  Order Now <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. HERO SECTION                                           */}
      {/* ========================================================= */}
      <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 px-4 sm:px-6 overflow-hidden">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          
          {/* Announcement Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 border border-teal-200/80 text-[#225353] text-xs font-medium shadow-3xs animate-in">
            <span className="flex h-2 w-2 rounded-full bg-[#389C9A] animate-ping"></span>
            <span>⚡ Food Pre-Order & Queue-Free Collection</span>
            <span className="text-gray-300">•</span>
            <span className="text-[#389C9A] font-semibold">Zero Billing Waiting</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-darkText tracking-tight leading-[1.12] max-w-4xl mx-auto">
            Skip the Queue.{' '}
            <span className="text-[#389C9A] underline decoration-[#FEDB71] decoration-wavy decoration-2 underline-offset-4">
              Enjoy Your Food.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base font-normal text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Pre-order your food online, pay in advance, and collect it without waiting at the billing counter.
          </p>

          {/* Primary Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/menu"
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#389C9A] hover:bg-[#2d817f] text-white font-semibold text-xs sm:text-sm shadow-teal flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
              <Utensils className="w-4 h-4" /> Order Now
            </Link>

            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-secondaryBg hover:bg-gray-100 text-darkText border border-gray-200/80 font-semibold text-xs sm:text-sm shadow-3xs flex items-center justify-center gap-2 transition-colors"
            >
              Login to Account
            </Link>
          </div>

          {/* Trust Highlights */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-gray-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#389C9A]" /> Skip Billing Counters
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#389C9A]" /> Express Counter 2 Pickup
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#389C9A]" /> Instant QR Token Pass
            </span>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. HOW IT WORKS (01 - 04)                                 */}
      {/* ========================================================= */}
      <section className="py-16 px-4 sm:px-6 bg-secondaryBg">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <span className="text-xs font-semibold text-[#389C9A] uppercase tracking-wider">
              Zero Queues. Zero Waiting.
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-darkText tracking-tight">
              How the Pre-Order Experience Works
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                step: '01',
                title: 'Choose your food',
                desc: 'Browse fresh meals, snacks, drinks, and combos on the live food menu.',
                icon: Utensils,
              },
              {
                step: '02',
                title: 'Place your pre-order',
                desc: 'Customize dishes, add chef notes, and review your order summary.',
                icon: ShoppingBag,
              },
              {
                step: '03',
                title: 'Pay online',
                desc: 'Pay safely before arriving and receive your unique Order Token (#A104).',
                icon: CreditCard,
              },
              {
                step: '04',
                title: 'Collect when ready',
                desc: 'Arrive at the counter, show your QR pass, and collect your food immediately.',
                icon: QrCode,
              },
            ].map((st) => (
              <div
                key={st.step}
                className="bg-white rounded-[26px] p-6 border border-gray-100 shadow-card space-y-3 relative group hover:border-teal-300 transition-colors"
              >
                <span className="text-3xl font-bold text-gray-300 group-hover:text-[#389C9A] transition-colors tabular-nums">
                  {st.step}
                </span>
                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-[#389C9A]">
                  <st.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-sm text-darkText">{st.title}</h3>
                <p className="text-xs font-normal text-gray-500 leading-relaxed">{st.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. WHY USE IT? (Queue Reduction Benefits)                 */}
      {/* ========================================================= */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <span className="text-xs font-semibold text-[#389C9A] uppercase tracking-wider">
              Designed For Busy Campuses
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-darkText tracking-tight">
              Why Pre-Order with foodislice?
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {[
              {
                title: 'Skip Billing Queues',
                desc: 'Order and confirm before reaching the counter. No standing in lines.',
              },
              {
                title: 'Save Time',
                desc: 'Complete payment online with instant transaction receipts.',
              },
              {
                title: 'No Crowding',
                desc: 'Reduce congestion and chaotic crowding around the billing desk.',
              },
              {
                title: 'Order Ready Alerts',
                desc: 'Know exactly when your food is ready for pickup with live status alerts.',
              },
              {
                title: 'Easy QR Collection',
                desc: 'Show your order number #A104 or QR code and collect in 10 seconds.',
              },
              {
                title: 'Fresh Preparation',
                desc: 'Chefs start cooking as soon as your pre-order is confirmed.',
              },
            ].map((b, idx) => (
              <div
                key={idx}
                className="p-5 bg-secondaryBg rounded-[24px] border border-gray-100 space-y-2 hover:border-teal-200 transition-colors"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-[#389C9A] mb-1"></div>
                <h3 className="font-semibold text-sm text-darkText">{b.title}</h3>
                <p className="text-xs font-normal text-gray-500 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 5. CALL TO ACTION BANNER                                  */}
      {/* ========================================================= */}
      <section className="py-16 px-4 sm:px-6 bg-secondaryBg">
        <div className="max-w-4xl mx-auto bg-[#389C9A] text-white rounded-[32px] p-8 sm:p-12 text-center space-y-6 shadow-teal relative overflow-hidden">
          <div className="space-y-2 relative z-10">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white">
              Order before you arrive. Skip the queue.
            </h2>
            <p className="text-xs sm:text-sm font-normal text-white/90 max-w-lg mx-auto leading-relaxed">
              Pre-order delicious meals in seconds and collect freshly cooked food at Counter 2.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 relative z-10">
            <Link
              to="/menu"
              className="w-full sm:w-auto px-8 py-3.5 bg-[#FEDB71] hover:bg-[#fedb71]/90 text-darkText font-semibold text-xs sm:text-sm rounded-2xl shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
              <Utensils className="w-4 h-4" /> Start Pre-Order Now
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-3.5 bg-white/15 hover:bg-white/20 text-white border border-white/25 font-semibold text-xs sm:text-sm rounded-2xl transition-colors flex items-center justify-center gap-1.5"
            >
              Login
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 6. MINIMAL FOOTER                                         */}
      {/* ========================================================= */}
      <footer className="mt-auto bg-white border-t border-gray-100 py-8 px-4 sm:px-6 text-xs text-gray-500 font-normal">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 foodislice • Food Pre-Order & Queue-Free Collection Platform.</p>
          <div className="flex items-center gap-4 font-medium">
            <Link to="/help" className="hover:text-[#389C9A]">Help & FAQ</Link>
            <Link to="/menu" className="hover:text-[#389C9A]">Food Menu</Link>
            <Link to="/orders" className="hover:text-[#389C9A]">My Orders</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
