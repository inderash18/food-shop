import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Leaf, Drumstick, Clock, Plus, Minus } from 'lucide-react';
import { apiGet } from '../../api/client';
import { useCart } from '../../hooks/useCart';
import { formatINR } from '../../lib/format';
import { Button } from '../../components/ui/Button';
import type { Product } from '../../lib/types';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { cart, add, remove, update } = useCart();

  const { data, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => apiGet<{ product: Product }>(`/api/products/${id}`),
    enabled: !!id,
  });

  const product = data?.product;
  const inCart = product ? cart.items.find((i) => i.productId === product._id) : undefined;
  const soldOut = product ? (product.effectiveStock ?? product.stock) <= 0 : false;

  if (isLoading) return <div className="animate-pulse rounded-3xl bg-gray-200 h-80" />;

  if (!product) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-600">Product not found.</p>
        <Link to="/menu" className="text-primary-600 font-medium text-sm mt-2 inline-block">
          Back to menu
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <Link to="/menu" className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900">
        <ChevronLeft className="h-4 w-4" /> Back to menu
      </Link>

      <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-56 object-cover" />
        ) : (
          <div className="h-56 bg-gradient-to-br from-primary-50 to-blue-50 flex items-center justify-center text-6xl">
            {product.isVeg ? '🍛' : '🍗'}
          </div>
        )}
        <div className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{product.name}</h1>
              <p className="text-sm text-gray-500 mt-1">{product.description}</p>
            </div>
            <span
              className={`shrink-0 flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${product.isVeg ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}
            >
              {product.isVeg ? <Leaf className="h-3.5 w-3.5" /> : <Drumstick className="h-3.5 w-3.5" />}
              {product.isVeg ? 'Veg' : 'Non-veg'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> ~{product.prepMinutes} min
            </span>
            {soldOut ? (
              <span className="font-bold text-red-500">Sold out</span>
            ) : (
              <span>{product.effectiveStock} available</span>
            )}
          </div>

          <div className="pt-2 flex items-center justify-between">
            <p className="text-2xl font-bold text-gray-900">{formatINR(product.price)}</p>
            {soldOut ? (
              <Button disabled>Sold Out</Button>
            ) : inCart ? (
              <div className="flex items-center gap-3 bg-primary-50 rounded-xl px-2 py-1.5">
                <button
                  onClick={() => (inCart.quantity === 1 ? remove.mutate(product._id) : update.mutate({ productId: product._id, quantity: inCart.quantity - 1 }))}
                  className="h-8 w-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-primary-600"
                  aria-label="Decrease"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="font-bold text-primary-700 min-w-5 text-center">{inCart.quantity}</span>
                <button onClick={() => add.mutate({ productId: product._id })} className="h-8 w-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-primary-600" aria-label="Increase">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Button onClick={() => add.mutate({ productId: product._id })}>Add to Cart</Button>
            )}
          </div>
        </div>
      </div>

      {inCart && (
        <Link to="/cart">
          <Button className="w-full" size="lg">
            Go to Cart ({inCart.quantity} item{inCart.quantity > 1 ? 's' : ''})
          </Button>
        </Link>
      )}
    </div>
  );
}
