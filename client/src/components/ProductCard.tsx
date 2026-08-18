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
    <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-lg transition-shadow relative group">
      
      {/* Edge to Edge Image */}
      <div className="relative h-[180px] w-full overflow-hidden bg-gray-50">
        <Link to={`/menu/${product._id}`} className="block h-full w-full">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} loading="lazy" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gray-50 transition-colors">
              <span className="text-6xl drop-shadow-sm">{product.isVeg ? '🥗' : '🍔'}</span>
            </div>
          )}
        </Link>
        
        {/* Wishlist */}
        <button 
          onClick={handleToggleWishlist}
          className={cn(
            "absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-colors shadow-sm",
            wishlisted ? "bg-white text-red-500" : "bg-white/90 backdrop-blur-sm text-gray-400 hover:text-gray-600"
          )}
        >
          <Heart className="w-5 h-5" fill={wishlisted ? "currentColor" : "none"} />
        </button>

        {/* Promo Badge */}
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-lg text-primary-600 font-extrabold text-xs shadow-sm flex items-center gap-1">
          <Star className="w-3 h-3 fill-primary-600" /> BESTSELLER
        </div>
      </div>

      <div className="p-4 flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-1">
          <Link to={`/menu/${product._id}`} className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-[17px] leading-tight truncate">{product.name}</h3>
          </Link>
          <div className={cn("w-4 h-4 rounded-[4px] border flex items-center justify-center shrink-0 mt-0.5", product.isVeg ? "border-green-500" : "border-red-500")}>
            <div className={cn("w-2 h-2 rounded-full", product.isVeg ? "bg-green-500" : "bg-red-500")}></div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1 text-gray-700 bg-gray-50 px-1.5 py-0.5 rounded text-[11px] font-bold">
            <Star className="w-3 h-3 fill-green-600 text-green-600" />
            4.5
          </div>
          <span className="text-gray-300">•</span>
          <span className="text-[12px] text-gray-500 font-medium">{product.prepMinutes} mins</span>
        </div>

        <div className="flex items-center justify-between mt-auto pt-2">
          <div className="flex flex-col">
            <span className="font-bold text-gray-900 text-[17px]">{formatINR(product.price)}</span>
            <span className="text-[11px] text-gray-400 font-medium line-through">{formatINR(product.price * 1.15)}</span>
          </div>
          
          <div className="shrink-0 relative">
            {soldOut ? (
               <div className="flex items-center justify-center bg-gray-100 text-gray-400 text-xs font-bold h-9 px-4 rounded-xl cursor-not-allowed">
                 SOLD OUT
               </div>
            ) : inCart ? (
              <div className="flex items-center justify-between bg-white rounded-xl h-9 w-[90px] border border-primary-200 shadow-sm overflow-hidden">
                <button
                  onClick={() => (inCart.quantity === 1 ? remove.mutate(product._id) : update.mutate({ productId: product._id, quantity: inCart.quantity - 1 }))}
                  className="h-full w-8 text-primary-600 flex items-center justify-center hover:bg-primary-50 transition-colors"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="text-sm font-extrabold text-primary-600">{inCart.quantity}</span>
                <button
                  onClick={() => update.mutate({ productId: product._id, quantity: inCart.quantity + 1 })}
                  className="h-full w-8 text-primary-600 flex items-center justify-center hover:bg-primary-50 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleAdd}
                className="flex items-center justify-center bg-white border border-gray-200 text-primary-600 text-[13px] font-extrabold h-9 px-6 rounded-xl hover:bg-gray-50 transition-colors shadow-sm relative overflow-hidden"
              >
                ADD
                <span className="absolute top-0 right-1 text-[8px] text-primary-400 font-bold">+</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
