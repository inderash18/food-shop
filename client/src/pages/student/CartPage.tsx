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
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-amber-100 text-center space-y-4 shadow-card">
        <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
          <Utensils className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-amber-950">Your Pre-Order is Empty</h2>
          <p className="text-xs font-normal text-stone-500">
            Browse the food menu and add your favorite meals to skip billing lines.
          </p>
        </div>
        <Link
          to="/menu"
          className="inline-flex items-center gap-1.5 px-6 py-3 bg-[#FEDB71] hover:bg-[#F5CA38] text-amber-950 font-bold text-xs rounded-2xl shadow-3xs transition-transform active:scale-95 border border-amber-300"
        >
          Explore Food Menu <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-28 antialiased px-1 sm:px-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/menu')}
          className="p-2 rounded-2xl bg-amber-50/70 hover:bg-amber-100/60 text-amber-950 transition-colors border border-amber-200/60 flex items-center gap-1 text-xs font-semibold"
        >
          <ChevronLeft className="w-4 h-4 text-amber-700" /> Back to Menu
        </button>

        <h1 className="text-base font-bold text-amber-950">Your Cart ({itemCount} {itemCount === 1 ? 'item' : 'items'})</h1>

        <button
          onClick={clearCart}
          className="text-xs text-rose-600 hover:text-rose-700 font-semibold hover:underline"
        >
          Clear All
        </button>
      </div>

      {/* Pickup Station Notification */}
      <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#FEDB71] text-amber-950 border border-amber-300 flex items-center justify-center shrink-0 font-bold">
          <MapPin className="w-4 h-4 text-amber-900" />
        </div>
        <div className="text-xs">
          <p className="font-bold text-amber-950">Express Counter Pre-Order Pickup</p>
          <p className="text-stone-600 font-normal mt-0.5">
            Your food will be prepared fresh and ready at <strong className="font-semibold text-amber-950">Counter 2 - Express Pick</strong>.
          </p>
        </div>
      </div>

      {/* Itemized Food List */}
      <div className="bg-white rounded-3xl border border-amber-100 p-4 sm:p-6 shadow-card space-y-4">
        <div className="divide-y divide-amber-100/80">
          {cart.items.map((item) => {
            const itemSubtotal = item.price * item.quantity;
            return (
              <div key={item.productId} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 bg-amber-50 border border-amber-100">
                    <ProductImage src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 space-y-1 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={cn('w-2 h-2 rounded-full shrink-0', item.isVeg ? 'bg-emerald-600' : 'bg-rose-600')} />
                      <h3 className="text-xs font-bold text-amber-950 truncate">{item.name}</h3>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-medium text-stone-500">{formatINR(item.price)} × {item.quantity}</span>
                      <span className="text-stone-300">•</span>
                      <span className="font-bold text-amber-950 tabular-nums">{formatINR(itemSubtotal)}</span>
                    </div>
                    {item.instructions && (
                      <p className="text-[11px] font-normal text-stone-500 italic truncate">Note: {item.instructions}</p>
                    )}
                  </div>
                </div>

                {/* Stepper Controls & Subtotal & Delete */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-amber-50">
                  <div className="text-xs font-bold text-amber-950 tabular-nums sm:hidden">
                    {formatINR(itemSubtotal)}
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-xl p-1 shadow-3xs">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="w-7 h-7 rounded-lg bg-white text-amber-950 flex items-center justify-center hover:bg-amber-100 border border-amber-200/60 transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-amber-950 tabular-nums">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="w-7 h-7 rounded-lg bg-[#FEDB71] text-amber-950 flex items-center justify-center shadow-3xs hover:bg-[#F5CA38] border border-amber-300 transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeItem(item.productId)}
                      className="p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Remove item"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cooking Notes for Chef */}
      <div className="bg-white rounded-3xl border border-amber-100 p-5 shadow-card space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-amber-950">
          Cooking Instructions / Chef Notes (Optional)
        </label>
        <input
          type="text"
          value={cookingNotes}
          onChange={(e) => setCookingNotes(e.target.value)}
          placeholder="e.g. Less spicy, keep sauce separate, extra hot..."
          className="w-full px-4 py-3 bg-amber-50/30 rounded-2xl text-xs font-normal text-amber-950 placeholder:text-stone-400 border border-amber-200 focus:bg-white focus:border-amber-400 focus:outline-none transition-all"
        />
      </div>

      {/* Coupon Box */}
      <form onSubmit={handleApplyCoupon} className="bg-white rounded-3xl border border-amber-100 p-4 shadow-card flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder="Enter promo code (CAMPUS20)..."
            className="w-full pl-10 pr-3 py-2.5 bg-amber-50/30 rounded-xl text-xs font-medium text-amber-950 placeholder:text-stone-400 border border-amber-200 focus:bg-white focus:border-amber-400 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="px-5 py-2.5 bg-[#FEDB71] hover:bg-[#F5CA38] text-amber-950 font-bold text-xs rounded-xl shadow-3xs transition-transform active:scale-95 border border-amber-300 shrink-0"
        >
          Apply
        </button>
      </form>

      {/* Payment Summary */}
      <div className="bg-white rounded-3xl border border-amber-100 p-6 shadow-card space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-amber-950">
          Order Summary
        </h2>

        <div className="space-y-2.5 text-xs text-stone-600 border-y border-amber-100/80 py-3.5">
          <div className="flex justify-between">
            <span className="font-normal">Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
            <span className="font-bold text-amber-950 tabular-nums">{formatINR(subtotal)}</span>
          </div>

          {discount > 0 && (
            <div className="flex justify-between text-amber-800 font-bold">
              <span>Coupon Discount ({appliedCoupon?.code})</span>
              <span className="tabular-nums">-{formatINR(discount)}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span className="font-normal">Taxes & Express Pickup Fee</span>
            <span className="font-bold text-amber-800">₹0 (FREE)</span>
          </div>

          <div className="flex justify-between text-base font-bold text-amber-950 pt-2 border-t border-amber-100">
            <span>TOTAL</span>
            <span className="tabular-nums text-lg text-amber-950">{formatINR(grandTotal)}</span>
          </div>
        </div>

        <Link
          to="/checkout"
          state={{ notes: cookingNotes, coupon: appliedCoupon?.code }}
          className="w-full py-4 bg-[#FEDB71] hover:bg-[#F5CA38] text-amber-950 font-bold text-sm rounded-2xl shadow-3xs flex items-center justify-center gap-2 transition-transform active:scale-98 text-center border border-amber-300"
        >
          <span>PROCEED TO CHECKOUT</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Sticky Bottom Bar for Mobile Viewport */}
      <div className="md:hidden fixed bottom-3 left-3 right-3 z-30 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-amber-200 shadow-xl flex items-center justify-between gap-3">
        <div>
          <span className="text-[10px] uppercase font-bold text-stone-500 block">Total ({itemCount} items)</span>
          <span className="text-base font-bold text-amber-950 tabular-nums">{formatINR(grandTotal)}</span>
        </div>
        <Link
          to="/checkout"
          state={{ notes: cookingNotes, coupon: appliedCoupon?.code }}
          className="px-6 py-3 bg-[#FEDB71] hover:bg-[#F5CA38] text-amber-950 font-bold text-xs rounded-xl shadow-3xs flex items-center gap-2 border border-amber-300 transition-transform active:scale-95"
        >
          <span>PROCEED TO CHECKOUT</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
