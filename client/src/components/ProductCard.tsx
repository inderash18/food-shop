import { Link, useNavigate } from 'react-router-dom';
import { Plus, Minus, Heart, Star } from 'lucide-react';
import type { Product } from '../lib/types';
import { formatINR } from '../lib/format';
import { useCart } from '../hooks/useCart';
import { cn } from '../lib/format';
import { useAuthStore } from '../stores/auth';
import { useState } from 'react';

export function ProductCard({ product }: { product: Product }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { cart, add, remove, update } = useCart();
  const inCart = cart.items.find((i) => i.productId === product._id);
  const soldOut = (product.effectiveStock ?? product.stock) <= 0;
  
  const [wishlisted, setWishlisted] = useState(false);

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
    setWishlisted(!wishlisted);
  };

  return (
    <div className="bg-surface rounded-3xl border border-border shadow-card p-4 flex flex-col transition-shadow hover:shadow-soft relative">
      <button 
        onClick={handleToggleWishlist}
        className={cn(
          "absolute top-4 left-4 z-10 w-6 h-6 rounded flex items-center justify-center transition-colors",
          wishlisted ? "bg-primary-500 text-white" : "bg-gray-100 text-gray-400"
        )}
      >
        <Heart className="w-3.5 h-3.5" fill={wishlisted ? "currentColor" : "none"} />
      </button>

      <Link to={`/menu/${product._id}`} className="relative block h-40 w-full mb-3 rounded-2xl overflow-hidden group">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} loading="lazy" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gray-50 group-hover:bg-gray-100 transition-colors">
            <span className="text-6xl drop-shadow-sm">{product.isVeg ? '🥗' : '🍔'}</span>
          </div>
        )}
      </Link>

      <div className="flex flex-col flex-1">
        <Link to={`/menu/${product._id}`}>
          <h3 className="font-semibold text-gray-900 text-[17px] mb-1 leading-tight line-clamp-1">{product.name}</h3>
        </Link>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-end gap-1.5">
            <span className="font-bold text-primary-500 text-lg">{formatINR(product.price)}</span>
            <span className="text-[11px] text-gray-400 font-medium mb-1 line-through">{formatINR(product.price * 1.15)}</span>
          </div>
          
          <div className="flex items-center gap-1 text-amber-400">
            <Star className="w-3 h-3 fill-current" />
            <span className="text-[11px] text-gray-500 font-medium">{product.prepMinutes}m</span>
          </div>
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2">
          <button
            onClick={handleToggleWishlist}
            className="flex items-center justify-center bg-gray-100 text-gray-600 text-xs font-semibold py-2.5 rounded-full hover:bg-gray-200 transition-colors"
          >
            Wishlist
          </button>
          
          {soldOut ? (
             <div className="flex items-center justify-center bg-gray-100 text-gray-400 text-xs font-semibold py-2.5 rounded-full cursor-not-allowed">
               Sold Out
             </div>
          ) : inCart ? (
            <div className="flex items-center justify-between bg-primary-50 rounded-full px-2 py-1 border border-primary-100">
              <button
                onClick={() => (inCart.quantity === 1 ? remove.mutate(product._id) : update.mutate({ productId: product._id, quantity: inCart.quantity - 1 }))}
                className="h-7 w-7 rounded-full bg-white text-primary-600 flex items-center justify-center shadow-sm hover:bg-gray-50"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="text-sm font-bold text-primary-600">{inCart.quantity}</span>
              <button
                onClick={handleAdd}
                className="h-7 w-7 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-sm hover:bg-primary-600"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleAdd}
              className="flex items-center justify-center bg-primary-500 text-white text-xs font-semibold py-2.5 rounded-full hover:bg-primary-600 transition-colors shadow-sm"
            >
              Order Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
