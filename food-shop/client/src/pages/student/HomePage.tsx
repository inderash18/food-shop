import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, ArrowRight, Clock } from 'lucide-react';
import { apiGet } from '../../api/client';
import { useAuthStore } from '../../stores/auth';
import { ProductCard } from '../../components/ProductCard';
import { ProductCardSkeleton } from '../../components/ui/Skeleton';
import type { Category, Product, ShopSettings } from '../../lib/types';

export function HomePage() {
  const user = useAuthStore((s) => s.user);

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

  const { data: shop } = useQuery({
    queryKey: ['shop-settings'],
    queryFn: () => apiGet<{ settings: ShopSettings }>('/api/settings/public'),
    staleTime: 60_000,
  });

  const closed = shop?.settings.shopStatus !== 'OPEN';

  return (
    <div className="space-y-7">
      <section className="rounded-3xl bg-gradient-to-br from-primary-600 to-primary-800 text-white p-6 md:p-8">
        <p className="text-sm text-primary-100 mb-1">
          {user ? `Hi ${user.name.split(' ')[0]} 👋` : 'Welcome to'} {shop?.settings.collegeName ?? ''}
        </p>
        <h1 className="text-2xl md:text-3xl font-bold leading-tight">
          Hungry? Order from
          <br />
          the campus food shop.
        </h1>
        <p className="text-primary-100 text-sm mt-2">Fresh food, prepared for you. Pay online, skip the queue.</p>
        <Link to="/menu" className="mt-5 inline-flex items-center gap-2 bg-white text-primary-700 font-semibold px-5 py-2.5 rounded-xl hover:bg-primary-50 transition-colors">
          <Search className="h-4 w-4" />
          Browse Menu
        </Link>
      </section>

      {closed && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 text-sm">
          <strong>The food shop is currently {shop?.settings.shopStatus === 'CLOSED' ? 'closed' : 'paused'}.</strong>{' '}
          You can browse the menu, but new orders will not be accepted.
        </div>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900">Categories</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
          {(categories?.categories ?? []).map((c) => (
            <Link
              key={c._id}
              to={`/menu?category=${c.slug}`}
              className="shrink-0 flex flex-col items-center gap-2 w-20 py-3 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-primary-200 transition-colors"
            >
              <span className="h-10 w-10 rounded-full bg-primary-50 flex items-center justify-center text-lg">
                {emojiForCategory(c.slug)}
              </span>
              <span className="text-xs font-medium text-gray-700 text-center leading-tight">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900">Popular right now</h2>
          <Link to="/menu" className="inline-flex items-center gap-1 text-sm font-medium text-primary-600">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {loadingPopular ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(popular?.products ?? []).slice(0, 8).map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        )}
      </section>

      {user && (
        <section className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 flex items-center gap-4">
          <span className="h-12 w-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center">
            <Clock className="h-6 w-6" />
          </span>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Track your order</h3>
            <p className="text-sm text-gray-500">See the live status of your active order</p>
          </div>
          <Link to="/orders" className="text-sm font-semibold text-primary-600">
            View
          </Link>
        </section>
      )}
    </div>
  );
}

function emojiForCategory(slug: string): string {
  const map: Record<string, string> = {
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
