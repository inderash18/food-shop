import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Trash2, ArrowRight, Star, Plus } from 'lucide-react';
import { useWishlistStore } from '../../stores/wishlist';
import { useCart } from '../../hooks/useCart';
import { ProductImage } from '../../components/ProductImage';
import { formatINR } from '../../lib/format';
import { toast } from '../../components/ui/Toast';
import { cn } from '../../lib/utils';

export function WishlistPage() {
  const { items, removeItem, clearWishlist } = useWishlistStore();
  const { add } = useCart();

  const handleAddToCart = (productId: string, name: string) => {
    add.mutate({ productId, quantity: 1 });
    toast.success(`Added ${name} to cart!`);
  };

  const handleAddAllToCart = () => {
    items.forEach((item) => {
      add.mutate({ productId: item._id, quantity: 1 });
    });
    toast.success(`Added ${items.length} items to cart!`);
  };

  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-4">
        <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
          <Heart className="w-10 h-10" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-black text-gray-900">Your wishlist is empty</h2>
          <p className="text-xs text-gray-500 max-w-xs mx-auto">
            Save your favorite dishes, quick meals, and afternoon snacks to order them anytime in a single tap.
          </p>
        </div>
        <div className="pt-2">
          <Link
            to="/menu"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-emerald transition-transform active:scale-95"
          >
            Explore Menu <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      
      {/* Header with Counter and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
            <span>Saved Wishlist</span>
            <span className="text-xs font-black bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-xl">
              {items.length} {items.length === 1 ? 'Dish' : 'Dishes'}
            </span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Your personalized collection of favorite campus culinary picks.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleAddAllToCart}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-emerald flex items-center gap-1.5 transition-transform active:scale-95"
          >
            <ShoppingBag className="w-3.5 h-3.5" /> Add All to Cart
          </button>
          <button
            onClick={() => {
              clearWishlist();
              toast.success('Wishlist cleared');
            }}
            className="p-2.5 bg-gray-50 hover:bg-rose-50 text-gray-400 hover:text-rose-600 rounded-xl border border-gray-200 transition-colors"
            title="Clear all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid of Wishlist Items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((product) => {
          const soldOut = (product.effectiveStock ?? product.stock) <= 0;

          return (
            <div
              key={product._id}
              className="bg-white rounded-3xl border border-gray-100 shadow-2xs overflow-hidden flex flex-col hover:border-gray-200 transition-all group"
            >
              {/* Product Photo */}
              <div className="relative h-44 w-full overflow-hidden bg-gray-100">
                <ProductImage
                  src={product.imageUrl}
                  alt={product.name}
                  categoryName={typeof product.categoryId === 'object' ? (product.categoryId as any)?.name : 'meals'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Remove from Wishlist Button */}
                <button
                  onClick={() => {
                    removeItem(product._id);
                    toast.success(`Removed ${product.name} from wishlist`);
                  }}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/95 backdrop-blur-md shadow-sm flex items-center justify-center text-rose-500 hover:bg-rose-50 transition-colors"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                {/* Bestseller / Rating Badge */}
                <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-2 py-0.5 rounded-lg text-amber-700 text-[10px] font-extrabold flex items-center gap-1 shadow-xs border border-gray-100">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span>4.5</span>
                </div>
              </div>

              {/* Product Info */}
              <div className="p-4 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <Link to={`/menu/${product._id}`} className="min-w-0 flex-1">
                    <h3 className="font-bold text-gray-900 text-sm truncate group-hover:text-emerald-700 transition-colors">
                      {product.name}
                    </h3>
                  </Link>
                  <div
                    className={cn(
                      'w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center shrink-0 mt-0.5',
                      product.isVeg ? 'border-emerald-600' : 'border-rose-500'
                    )}
                  >
                    <div
                      className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        product.isVeg ? 'bg-emerald-600' : 'bg-rose-500'
                      )}
                    ></div>
                  </div>
                </div>

                <p className="text-[11px] text-gray-500 line-clamp-1 mb-3">
                  {product.description || 'Prepared fresh in the campus kitchen.'}
                </p>

                {/* Price and Add to Cart Action */}
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50">
                  <div>
                    <span className="font-extrabold text-sm text-gray-900">{formatINR(product.price)}</span>
                    <span className="text-[10px] text-gray-400 line-through ml-1.5">
                      {formatINR(product.price * 1.15)}
                    </span>
                  </div>

                  {soldOut ? (
                    <span className="text-[10px] font-extrabold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-xl">
                      Sold Out
                    </span>
                  ) : (
                    <button
                      onClick={() => handleAddToCart(product._id, product.name)}
                      className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-extrabold rounded-xl border border-emerald-200/80 transition-colors flex items-center gap-1 shadow-3xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add to Cart
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
