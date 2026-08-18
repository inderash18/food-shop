import { Link } from 'react-router-dom';
import { ShoppingBag, Trash2, Minus, Plus, ChevronLeft, Lock } from 'lucide-react';
import { useCart } from '../../hooks/useCart';
import { useAuthStore } from '../../stores/auth';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatINR } from '../../lib/format';
import { toast } from '../../components/ui/Toast';

export function CartPage() {
  const { cart, isLoading, update, remove, clear } = useCart();
  const user = useAuthStore((s) => s.user);
  const hasItems = cart.items.length > 0;

  if (!user) {
    return (
      <EmptyState
        icon={<ShoppingBag className="h-7 w-7 text-gray-400" />}
        title="Cart is empty"
        description="Log in to start adding food to your cart."
        action={
          <Link to="/login">
            <Button>Login</Button>
          </Link>
        }
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (!hasItems) {
    return (
      <EmptyState
        icon={<ShoppingBag className="h-7 w-7 text-gray-400" />}
        title="Your cart is empty"
        description="Browse the menu and add your favorite food."
        action={
          <Link to="/menu">
            <Button>Browse Menu</Button>
          </Link>
        }
      />
    );
  }

  const availableItems = cart.items.filter((i) => i.available);
  const unavailableItems = cart.items.filter((i) => !i.available);

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Your Cart</h1>
        <button onClick={() => clear.mutate()} className="text-sm text-red-500 font-medium inline-flex items-center gap-1">
          <Trash2 className="h-4 w-4" /> Clear
        </button>
      </div>

      <div className="space-y-3">
        {availableItems.map((item) => (
          <div key={item.productId} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className="h-14 w-14 rounded-xl bg-gray-100 flex items-center justify-center text-2xl shrink-0">
              {item.isVeg ? '🍛' : '🍗'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{item.name}</p>
              <p className="text-sm text-gray-500">
                {formatINR(item.price)} × {item.quantity}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (item.quantity === 1) {
                    remove.mutate(item.productId);
                  } else {
                    update.mutate({ productId: item.productId, quantity: item.quantity - 1 });
                  }
                }}
                className="h-11 w-11 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600"
                aria-label="Decrease"
              >
                <Minus className="h-5 w-5" />
              </button>
              <span className="font-bold text-gray-900 min-w-8 text-center text-lg">{item.quantity}</span>
              <button
                onClick={() => update.mutate({ productId: item.productId, quantity: item.quantity + 1 })}
                className="h-11 w-11 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600"
                aria-label="Increase"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {unavailableItems.length > 0 && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4">
          <p className="text-sm font-semibold text-red-700 mb-2">These items are out of stock:</p>
          {unavailableItems.map((item) => (
            <div key={item.productId} className="flex items-center justify-between text-sm text-red-600 py-1">
              <span>{item.name}</span>
              <button onClick={() => remove.mutate(item.productId)} className="underline text-xs">
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-5 space-y-3">
        <h3 className="font-bold text-gray-900 mb-1">Bill Details</h3>
        <div className="flex justify-between text-[13px] text-gray-600">
          <span>Item Total</span>
          <span className="font-semibold text-gray-900">{formatINR(cart.subtotal)}</span>
        </div>
        <div className="flex justify-between text-[13px] text-gray-600">
          <span>Delivery Fee</span>
          <span className="text-gray-900">Calculated at checkout</span>
        </div>
        <div className="border-t-2 border-dashed border-gray-100 pt-3 mt-1 flex justify-between items-center">
          <span className="font-extrabold text-gray-900">TO PAY</span>
          <span className="font-extrabold text-gray-900 text-lg">{formatINR(cart.subtotal)}</span>
        </div>
      </div>

      <div className="sticky bottom-24 md:bottom-4 z-10">
        <Link to="/checkout">
          <button className="w-full bg-[#60b246] hover:bg-[#539e3d] text-white font-extrabold h-[56px] rounded-2xl shadow-[0_8px_20px_rgba(96,178,70,0.25)] flex items-center justify-center gap-2 transition-transform active:scale-[0.98]">
            <Lock className="h-4 w-4" />
            Proceed to Checkout
          </button>
        </Link>
      </div>

      <Link to="/menu" className="inline-flex items-center gap-1 text-sm font-medium text-gray-500">
        <ChevronLeft className="h-4 w-4" /> Continue shopping
      </Link>
    </div>
  );
}
