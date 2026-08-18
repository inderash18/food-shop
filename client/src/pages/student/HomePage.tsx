import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { apiGet } from '../../api/client';
import type { Category, Product } from '../../lib/types';
import { ProductCard } from '../../components/ProductCard';

export function HomePage() {
  const navigate = useNavigate();

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiGet<{ categories: Category[] }>('/api/categories'),
    staleTime: 60_000,
  });

  const { data: topPicks, isLoading: loadingTopPicks } = useQuery({
    queryKey: ['products', { sort: 'popular', limit: 8 }],
    queryFn: () => apiGet<{ products: Product[] }>('/api/products?sort=popular&limit=8&inStockOnly=false'),
    staleTime: 30_000,
  });

  const { data: recommended, isLoading: loadingRecommended } = useQuery({
    queryKey: ['products', { sort: 'newest', limit: 8 }],
    queryFn: () => apiGet<{ products: Product[] }>('/api/products?sort=newest&limit=8&inStockOnly=false'),
    staleTime: 30_000,
  });

  return (
    <div className="space-y-8 pb-8 md:px-0 px-1 pt-1">
      
      {/* Mobile Search Bar (Hidden on desktop since it's in header) */}
      <div className="md:hidden sticky top-[64px] z-10 bg-white pt-2 pb-4 px-3 -mx-4 shadow-[0_10px_10px_-10px_rgba(0,0,0,0.05)]">
        <div 
          className="relative bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden cursor-text h-[50px] flex items-center"
          onClick={() => navigate('/menu')}
        >
          <Search className="absolute left-4 text-gray-400 h-5 w-5" />
          <div className="pl-12 pr-4 text-gray-400 font-medium text-[15px] flex items-center w-full">
            Search for restaurants, items or more
            <div className="ml-auto flex gap-3 items-center">
              <div className="w-[1px] h-5 bg-gray-200"></div>
              <span className="text-primary-500 font-bold text-[10px] bg-primary-50 px-2 py-1 rounded">PRO</span>
            </div>
          </div>
        </div>
      </div>

      {/* Promotional Hero */}
      <section className="px-4 md:px-0 mt-2">
        <div className="bg-gradient-to-r from-[#ff7e5f] to-[#feb47b] rounded-3xl p-6 text-white shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[160px]">
          <div className="relative z-10 max-w-[70%]">
            <h2 className="font-extrabold text-2xl md:text-3xl leading-tight mb-2 tracking-tight drop-shadow-sm">
              Craving something delicious?
            </h2>
            <p className="font-medium text-white/90 text-[13px] mb-5 drop-shadow-sm leading-snug">
              Fresh food from your campus favorites, delivered fast.
            </p>
          </div>
          <button onClick={() => navigate('/menu')} className="bg-white text-[#ff7e5f] font-extrabold text-[13px] px-6 py-2.5 rounded-full w-max shadow-sm relative z-10 active:scale-95 transition-transform uppercase tracking-wide">
            Order Now
          </button>
          
          <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-20 pointer-events-none">
            <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full object-cover">
              <path fill="#FFFFFF" d="M42.7,-73.4C55.9,-65.8,67.6,-54.6,76.5,-41.4C85.4,-28.1,91.5,-12.8,89.5,1.7C87.4,16.2,77.3,29.9,67.3,42.5C57.3,55.1,47.4,66.6,34.8,74.5C22.2,82.4,6.9,86.7,-7.8,86.2C-22.5,85.6,-36.7,80.1,-49.5,71.5C-62.3,62.8,-73.6,50.9,-81.4,36.5C-89.2,22,-93.4,4.9,-91.1,-11.4C-88.8,-27.7,-79.9,-43.3,-67.6,-53.4C-55.3,-63.5,-39.6,-68.2,-25,-71.4C-10.4,-74.5,3.1,-76.1,17.2,-74C31.3,-71.8,42.7,-73.4,42.7,-73.4Z" transform="translate(100 100) scale(1.1)" />
            </svg>
          </div>
        </div>
      </section>

      {/* Categories (What's on your mind?) */}
      <section className="px-4 md:px-0 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">What's on your mind?</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none snap-x -mx-4 px-4">
          {(categories?.categories ?? []).map((c) => (
            <Link
              key={c._id}
              to={`/menu?category=${c.slug}`}
              className="shrink-0 flex flex-col items-center gap-2 group snap-start"
            >
              <div className="w-[84px] h-[84px] bg-white rounded-full flex items-center justify-center shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden group-active:scale-95 transition-transform border border-gray-100">
                <span className="text-[40px] drop-shadow-sm group-hover:scale-110 transition-transform">
                  {emojiForCategory(c.slug)}
                </span>
              </div>
              <span className="text-[13px] font-semibold text-gray-700 tracking-tight">{c.name}</span>
            </Link>
          ))}
          {/* Fallback dummy categories to show scroll */}
          {!categories?.categories?.length && Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="shrink-0 flex flex-col items-center gap-2">
              <div className="w-[84px] h-[84px] bg-white rounded-full flex items-center justify-center shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-gray-100">
                <span className="text-[40px] drop-shadow-sm">🍔</span>
              </div>
              <span className="text-[13px] font-semibold text-gray-700">Burger</span>
            </div>
          ))}
        </div>
      </section>

      {/* Top Restaurants / Popular */}
      <section className="px-3 md:px-0">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[22px] font-extrabold text-gray-900 tracking-tight">Top picks for you</h2>
        </div>
        
        {loadingTopPicks ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-full h-64 bg-gray-200 rounded-3xl animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {(topPicks?.products ?? []).slice(0, 4).map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* Recommended (Vertical Feed) */}
      <section className="px-3 md:px-0">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[22px] font-extrabold text-gray-900 tracking-tight">Recommended</h2>
        </div>
        
        {loadingRecommended ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-full h-64 bg-gray-200 rounded-3xl animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {(recommended?.products ?? []).map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        )}
      </section>
      
      {/* Spacer to allow scrolling past bottom nav */}
      <div className="h-6"></div>
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
    'fast-food': '🍟',
    desserts: '🍰',
    combos: '🍽️',
  };
  return map[slug] ?? '🍽️';
}

