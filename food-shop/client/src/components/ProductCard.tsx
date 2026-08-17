import { Link, useNavigate } from 'react-router-dom';
import { Plus, Minus, Leaf, Drumstick } from 'lucide-react';
import type { Product } from '../lib/types';
import { formatINR } from '../lib/format';
import { useCart } from '../hooks/useCart';
import { cn } from '../lib/format';
import { useAuthStore } from '../stores/auth';

export function ProductCard({ product }: { product: Product }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { cart, add, remove } = useCart();
  const inCart = cart.items.find((i) => i.productId === product._id);
  const soldOut = (product.effectiveStock ?? product.stock) <= 0;
  const imageUrl = product.imageUrl ?? `/images/${product.slug}.svg`;

  const handleAdd = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    add.mutate({ productId: product._id });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
      <Link to={`/menu/${product._id}`} className="relative block h-36 bg-gray-100 overflow-hidden">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-50">
            <span className="text-4xl">{product.isVeg ? '🍛' : '🍗'}</span>
          </div>
        )}
        <span
          className={cn(
            'absolute top-2 right-2 h-6 w-6 rounded-md bg-white shadow flex items-center justify-center',
            product.isVeg ? 'text-green-600' : 'text-red-600'
          )}
          title={product.isVeg ? 'Vegetarian' : 'Non-vegetarian'}
        >
          {product.isVeg ? <Leaf className="h-4 w-4" /> : <Drumstick className="h-4 w-4" />}
        </span>
        {product.isPopular && (
          <span className="absolute top-2 left-2 bg-amber-400 text-amber-950 text-[10px] font-bold px-2 py-0.5 rounded-full">POPULAR</span>
        )}
      </Link>

      <div className="p-3.5 flex flex-col flex-1">
        <Link to={`/menu/${product._id}`}>
          <h3 className="font-semibold text-gray-900 leading-snug line-clamp-1">{product.name}</h3>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{product.description ?? 'Freshly prepared at the food shop'}</p>
        </Link>

        <div className="mt-auto pt-3 flex items-end justify-between gap-2">
          <div>
            <p className="font-bold text-gray-900">{formatINR(product.price)}</p>
            <p className="text-[11px] text-gray-400">~{product.prepMinutes} min</p>
          </div>

          {soldOut ? (
            <span className="text-xs font-bold text-red-500 bg-red-50 px-3 py-2 rounded-xl">SOLD OUT</span>
          ) : inCart ? (
            <div className="flex items-center gap-2 bg-primary-50 rounded-xl px-1.5 py-1">
              <button
                onClick={() => (inCart.quantity === 1 ? remove.mutate(product._id) : add.mutate({ productId: product._id }))}
                className="h-7 w-7 rounded-lg bg-white shadow-sm flex items-center justify-center text-primary-600"
                aria-label="Decrease"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="text-sm font-bold text-primary-700 min-w-5 text-center">{inCart.quantity}</span>
              <button
                onClick={handleAdd}
                className="h-7 w-7 rounded-lg bg-white shadow-sm flex items-center justify-center text-primary-600"
                aria-label="Increase"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleAdd}
              className="flex items-center gap-1 bg-primary-600 text-white text-sm font-semibold px-3.5 py-2 rounded-xl hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              ADD
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
