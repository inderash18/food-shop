import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, MoreHorizontal, ArrowUp } from 'lucide-react';
import { apiGet } from '../../api/client';
import type { Category, Product } from '../../lib/types';
import { cn } from '../../lib/format';

export function HomePage() {
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiGet<{ categories: Category[] }>('/api/categories'),
    staleTime: 60_000,
  });

  const { data: popular, isLoading: loadingPopular } = useQuery({
    queryKey: ['products', { sort: 'popular', limit: 8 }],
    queryFn: () => apiGet<{ products: Product[] }>('/api/products?sort=popular&limit=8&inStockOnly=false'),
    staleTime: 30_000,
  });

  const { data: bestSellers, isLoading: loadingBestSellers } = useQuery({
    queryKey: ['products', { sort: 'popular', limit: 4, offset: 8 }],
    queryFn: () => apiGet<{ products: Product[] }>('/api/products?sort=popular&limit=4&offset=8&inStockOnly=false'),
    staleTime: 30_000,
  });

  const { data: promos, isLoading: loadingPromos } = useQuery({
    queryKey: ['products', { sort: 'price_asc', limit: 4 }],
    queryFn: () => apiGet<{ products: Product[] }>('/api/products?sort=price_asc&limit=4&inStockOnly=false'),
    staleTime: 30_000,
  });

  return (
    <div className="space-y-10 py-6">
      {/* Category Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Category</h2>
          <Link to="/menu" className="text-sm font-semibold text-yellow-500 hover:text-yellow-600 flex items-center">
            View all &gt;
          </Link>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
          {(categories?.categories ?? []).map((c) => (
            <Link
              key={c._id}
              to={`/menu?category=${c.slug}`}
              className="shrink-0 flex flex-col items-center justify-center w-28 h-28 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group"
            >
              <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">
                {emojiForCategory(c.slug)}
              </span>
              <span className="text-sm font-medium text-gray-500 group-hover:text-gray-900 transition-colors">{c.name}</span>
            </Link>
          ))}
          {/* Add some dummy categories to match the design length if needed */}
          {!categories?.categories?.length && Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="shrink-0 flex flex-col items-center justify-center w-28 h-28 bg-white rounded-3xl border border-gray-100 shadow-sm">
              <span className="text-3xl mb-2">🍔</span>
              <span className="text-sm font-medium text-gray-500">Burger</span>
            </div>
          ))}
        </div>
      </section>

      {/* Popular This Week Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Popular This Week</h2>
          <Link to="/menu" className="text-sm font-semibold text-yellow-500 hover:text-yellow-600 flex items-center">
            View all &gt;
          </Link>
        </div>
        
        <div className="flex gap-6 overflow-x-auto pb-4 pt-2 -mt-2 px-1 scrollbar-none">
          {loadingPopular ? (
            <div className="flex gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-80 h-40 bg-gray-200 rounded-3xl animate-pulse shrink-0"></div>
              ))}
            </div>
          ) : (
            (popular?.products ?? []).slice(0, 5).map((p, index) => (
              <div 
                key={p._id} 
                className={cn(
                  "shrink-0 w-[340px] bg-white rounded-3xl p-5 flex items-center gap-5 transition-all cursor-pointer",
                  index === 1 
                    ? "border-2 border-yellow-400 shadow-lg shadow-yellow-400/20 scale-[1.02]" 
                    : "border border-gray-100 shadow-sm hover:border-yellow-200"
                )}
              >
                <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0 bg-gray-50">
                  <img src={p.imageUrl || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80'} alt={p.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-gray-900 truncate pr-2">{p.name}</h3>
                    <button className="text-gray-400 hover:text-gray-600"><MoreHorizontal className="h-5 w-5" /></button>
                  </div>
                  <div className="font-bold text-gray-900 mt-1">
                    <span className="text-yellow-500">$</span>{p.price.toFixed(2)}
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-500 font-medium">
                    <span className="text-yellow-400">★</span> 5.0
                    <span className="mx-1">•</span>
                    1k+ User Reviews
                  </div>
                  <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor...
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Best Seller Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Best Seller</h2>
          <Link to="/menu" className="text-sm font-semibold text-yellow-500 hover:text-yellow-600 flex items-center">
            View all &gt;
          </Link>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6">
          {loadingBestSellers ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-3xl animate-pulse"></div>
            ))
          ) : (
            (bestSellers?.products ?? []).slice(0, 5).map((p) => (
              <div key={p._id} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center group cursor-pointer relative">
                <button className="absolute top-4 right-4 text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity"><MoreHorizontal className="h-5 w-5" /></button>
                <div className="w-32 h-32 rounded-full overflow-hidden mb-4 shadow-sm">
                  <img src={p.imageUrl || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80'} alt={p.name} className="w-full h-full object-cover" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{p.name}</h3>
                <div className="font-bold text-gray-900 mb-3">
                  <span className="text-yellow-500">$</span>{p.price.toFixed(2)}
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full w-full justify-center">
                  Sold 1k <span className="text-green-500 flex items-center ml-1">+15% <ArrowUp className="h-3 w-3 ml-0.5" /></span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Promo Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Promo</h2>
          <Link to="/menu" className="text-sm font-semibold text-yellow-500 hover:text-yellow-600 flex items-center">
            View all &gt;
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {loadingPromos ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-3xl animate-pulse"></div>
            ))
          ) : (
            (promos?.products ?? []).slice(0, 4).map((p) => (
              <div key={p._id} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex items-center gap-4 cursor-pointer">
                <div className="absolute top-0 left-0 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-br-xl z-10">
                  15% Off
                </div>
                <div className="flex-1 min-w-0 pt-2">
                  <h3 className="font-bold text-gray-900 truncate mb-1">{p.name}</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-gray-900"><span className="text-yellow-500">$</span>{(p.price * 0.85).toFixed(2)}</span>
                    <span className="text-xs text-gray-400 line-through">${p.price.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-400 font-medium">
                    <span className="text-yellow-400">★</span> 5.0
                    <span className="mx-1">•</span>
                    1k+ Reviews
                  </div>
                </div>
                <div className="w-20 h-20 shrink-0">
                  <img src={p.imageUrl || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80'} alt={p.name} className="w-full h-full object-contain mix-blend-multiply" />
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function emojiForCategory(slug: string): string {
  const map: Record<string, string> = {
    bakery: '🧁',
    burger: '🍔',
    beverage: '🥤',
    chicken: '🍗',
    pizza: '🍕',
    seafood: '🐟',
    breakfast: '🍳',
    lunch: '🍱',
    meals: '🍛',
    snacks: '🥪',
    beverages: '🥤',
    'fast-food': '🍔',
    desserts: '🍰',
    combos: '🍽️',
  };
  return map[slug] ?? '🍽️';
}

