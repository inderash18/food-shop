import { Link, useNavigate } from 'react-router-dom';
import { ProductImage } from './ProductImage';
import { Plus, Minus, Heart, Clock } from 'lucide-react';
import type { Product } from '../lib/types';
import { formatINR } from '../lib/format';
import { useCart } from '../hooks/useCart';
import { cn } from '../lib/format';
import { useAuthStore } from '../stores/auth';
import { useWishlistStore } from '../stores/wishlist';
import { toast } from './ui/Toast';

export function ProductCard({ product }: { product: Product }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { cart, add, remove, update } = useCart();
  const { toggleItem, isInWishlist } = useWishlistStore();
  const inCart = cart.items.find((i) => i.productId === product._id);
  const soldOut = (product.effectiveStock ?? product.stock) <= 0;
  const wishlisted = isInWishlist(product._id);

  const handleAdd = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    add.mutate({ productId: product._id });
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const added = toggleItem(product);
    if (added) {
      toast.success(`Saved to wishlist`);
    } else {
      toast.success(`Removed from wishlist`);
    }
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-amber-100/90 hover:border-amber-300 shadow-3xs transition-all flex flex-col group">
      
      {/* Product Image */}
      <div className="relative h-36 w-full overflow-hidden bg-amber-50">
        <Link to={`/menu/${product._id}`} className="block h-full w-full">
          <ProductImage src={product.imageUrl} alt={product.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200" />
        </Link>
        
        {/* Wishlist Button */}
        <button 
          onClick={handleToggleWishlist}
          className={cn(
            "absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-lg flex items-center justify-center transition-colors shadow-3xs",
            wishlisted ? "bg-white text-rose-500" : "bg-white/90 text-stone-400 hover:text-stone-600"
          )}
        >
          <Heart className="w-3.5 h-3.5" fill={wishlisted ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="p-3.5 flex flex-col flex-1 justify-between gap-3">
        <div>
          <Link to={`/menu/${product._id}`} className="block">
            <h3 className="font-semibold text-amber-950 text-sm leading-tight truncate group-hover:text-amber-800 transition-colors">
              {product.name}
            </h3>
          </Link>
          
          <div className="flex items-center gap-2 mt-1.5 text-xs text-stone-500 font-normal">
            <span className="flex items-center gap-1 tabular-nums">
              <Clock className="w-3 h-3 text-[#F59E0B]" /> {product.prepMinutes || 8} mins
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-amber-100">
          <span className="font-bold text-amber-950 text-base tabular-nums">
            {formatINR(product.price)}
          </span>
          
          <div className="shrink-0">
            {soldOut ? (
              <span className="text-stone-400 text-xs font-medium px-2 py-1 bg-amber-50 rounded-lg">
                Unavailable
              </span>
            ) : inCart ? (
              <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-xl p-0.5 shadow-3xs">
                <button
                  onClick={() => (inCart.quantity === 1 ? remove.mutate(product._id) : update.mutate({ productId: product._id, quantity: inCart.quantity - 1 }))}
                  className="w-6 h-6 rounded-lg bg-white text-amber-950 flex items-center justify-center hover:bg-amber-100 transition-colors shadow-3xs border border-amber-200/60"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-5 text-center text-xs font-bold text-amber-950 tabular-nums">{inCart.quantity}</span>
                <button
                  onClick={() => update.mutate({ productId: product._id, quantity: inCart.quantity + 1 })}
                  className="w-6 h-6 rounded-lg bg-[#FEDB71] text-amber-950 flex items-center justify-center hover:bg-[#F5CA38] transition-colors shadow-3xs border border-amber-300"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleAdd}
                className="h-8 px-3.5 bg-[#FEDB71] hover:bg-[#F5CA38] text-amber-950 text-xs font-bold rounded-xl transition-all shadow-3xs active:scale-95 border border-amber-300"
              >
                + Add
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
