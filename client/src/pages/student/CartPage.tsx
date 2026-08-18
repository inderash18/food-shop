import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Utensils,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ChevronLeft,
  MapPin,
  Tag,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { useCart } from '../../hooks/useCart';
import { formatINR } from '../../lib/format';
import { ProductImage } from '../../components/ProductImage';
import { toast } from '../../components/ui/Toast';
import { cn } from '../../lib/utils';

export function CartPage() {
  const navigate = useNavigate();
  const { cart, updateQuantity, removeItem, clearCart, itemCount, subtotal } = useCart();
  const [cookingNotes, setCookingNotes] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountPercent: number } | null>(null);

  const hasItems = itemCount > 0;

  // Coupon Logic
  const discount = appliedCoupon ? (subtotal * appliedCoupon.discountPercent) / 100 : 0;
  const grandTotal = Math.max(0, subtotal - discount);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    if (couponCode.trim().toUpperCase() === 'CAMPUS20') {
      setAppliedCoupon({ code: 'CAMPUS20', discountPercent: 20 });
      toast.success('20% Student Discount applied!');
    } else if (couponCode.trim().toUpperCase() === 'FIRST50') {
      setAppliedCoupon({ code: 'FIRST50', discountPercent: 50 });
      toast.success('50% Welcome Discount applied!');
    } else {
      toast.error('Invalid coupon code.');
    }
  };

  if (!hasItems) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-[28px] border border-gray-100 text-center space-y-4 shadow-card">
        <div className="w-16 h-16 rounded-full bg-teal-50 text-[#389C9A] flex items-center justify-center mx-auto">
          <Utensils className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-darkText">Your Pre-Order is Empty</h2>
          <p className="text-xs font-normal text-gray-500">
            Browse the food menu and add your favorite meals to skip billing lines.
          </p>
        </div>
        <Link
          to="/menu"
          className="inline-flex items-center gap-1.5 px-6 py-3 bg-[#389C9A] hover:bg-[#2d817f] text-white font-semibold text-xs rounded-2xl shadow-teal transition-transform active:scale-95"
        >
          Explore Food Menu <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24 antialiased">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/menu')}
          className="p-2 rounded-2xl bg-secondaryBg hover:bg-gray-100 text-darkText transition-colors shadow-3xs flex items-center gap-1 text-xs font-semibold"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Menu
        </button>

        <h1 className="text-base font-bold text-darkText">My Pre-Order ({itemCount} items)</h1>

        <button
          onClick={clearCart}
          className="text-xs text-rose-500 hover:text-rose-700 font-semibold hover:underline"
        >
          Clear All
        </button>
      </div>

      {/* Pickup Station Notification */}
      <div className="p-4 bg-teal-50 border border-teal-200/60 rounded-[22px] flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#389C9A] text-white flex items-center justify-center shrink-0">
          <MapPin className="w-4 h-4" />
        </div>
        <div className="text-xs">
          <p className="font-semibold text-darkText">Express Counter Collection</p>
          <p className="text-gray-600 font-normal mt-0.5">
            Your food will be prepared fresh and waiting at <strong className="font-semibold">Counter 2 - Express Pick</strong>.
          </p>
        </div>
      </div>

      {/* Itemized Food List */}
      <div className="bg-white rounded-[28px] border border-gray-100 p-5 sm:p-6 shadow-card space-y-4">
        <div className="divide-y divide-gray-100">
          {cart.items.map((item) => (
            <div key={item.productId} className="py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 bg-secondaryBg">
                  <ProductImage src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1">
                    <span className={cn('w-2 h-2 rounded-full', item.isVeg ? 'bg-[#389C9A]' : 'bg-rose-600')} />
                    <h3 className="text-xs font-semibold text-darkText truncate">{item.name}</h3>
                  </div>
                  <p className="text-xs font-bold text-[#389C9A] tabular-nums">{formatINR(item.price)} each</p>
                </div>
              </div>

              {/* Stepper Controls & Delete */}
              <div className="flex items-center gap-2.5 shrink-0">
                <div className="flex items-center gap-1 bg-secondaryBg border border-gray-200 rounded-xl p-1 shadow-3xs">
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    className="w-6 h-6 rounded-lg bg-white text-darkText flex items-center justify-center hover:bg-gray-100"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-5 text-center text-xs font-semibold text-darkText tabular-nums">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    className="w-6 h-6 rounded-lg bg-[#389C9A] text-white flex items-center justify-center shadow-3xs hover:bg-[#2d817f]"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <button
                  onClick={() => removeItem(item.productId)}
                  className="p-2 rounded-xl text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cooking Notes for Chef */}
      <div className="bg-white rounded-[28px] border border-gray-100 p-5 shadow-card space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-darkText">
          Cooking Instructions / Chef Notes (Optional)
        </label>
        <input
          type="text"
          value={cookingNotes}
          onChange={(e) => setCookingNotes(e.target.value)}
          placeholder="e.g. Less spicy, keep sauce separate, extra hot..."
          className="w-full px-4 py-3 bg-secondaryBg rounded-2xl text-xs font-normal text-darkText placeholder:text-gray-400 border border-transparent focus:bg-white focus:border-[#389C9A] focus:outline-none transition-all"
        />
      </div>

      {/* Coupon Box */}
      <form onSubmit={handleApplyCoupon} className="bg-white rounded-[28px] border border-gray-100 p-4 shadow-card flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder="Enter promo code (CAMPUS20)..."
            className="w-full pl-10 pr-3 py-2.5 bg-secondaryBg rounded-xl text-xs font-medium text-darkText placeholder:text-gray-400 border border-transparent focus:bg-white focus:border-[#389C9A] focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="px-5 py-2.5 bg-[#FEDB71] hover:bg-[#F5CA38] text-stone-950 font-bold text-xs rounded-xl shadow-3xs transition-transform active:scale-95 border border-amber-300"
        >
          Apply
        </button>
      </form>

      {/* Cost Summary & Confirm Checkout */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/90 dark:border-stone-800 p-6 shadow-card space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-950 dark:text-white">
          Payment Summary
        </h2>

        <div className="space-y-2 text-xs text-stone-600 dark:text-stone-400 border-y border-stone-100 dark:border-stone-800 py-3">
          <div className="flex justify-between">
            <span className="font-normal">Pre-Order Subtotal ({itemCount} items)</span>
            <span className="font-semibold text-stone-950 dark:text-white tabular-nums">{formatINR(subtotal)}</span>
          </div>

          {discount > 0 && (
            <div className="flex justify-between text-amber-700 dark:text-amber-400 font-bold">
              <span>Coupon Discount ({appliedCoupon?.code})</span>
              <span className="tabular-nums">-{formatINR(discount)}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span className="font-normal">Express Pickup Fee</span>
            <span className="font-bold text-amber-700 dark:text-amber-400">FREE (₹0)</span>
          </div>

          <div className="flex justify-between text-base font-bold text-stone-950 dark:text-white pt-2 border-t border-stone-100 dark:border-stone-800">
            <span>Total Payable</span>
            <span className="tabular-nums">{formatINR(grandTotal)}</span>
          </div>
        </div>

        <Link
          to="/checkout"
          state={{ notes: cookingNotes, coupon: appliedCoupon?.code }}
          className="w-full py-4 bg-[#FEDB71] hover:bg-[#F5CA38] text-stone-950 font-bold text-sm rounded-xl shadow-3xs flex items-center justify-center gap-2 transition-transform active:scale-98 text-center border border-amber-300"
        >
          <span>Proceed to Checkout</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
