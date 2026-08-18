import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import { apiGet } from '../../api/client';
import { useDebounce } from '../../hooks/useDebounce';
import { ProductCard } from '../../components/ProductCard';
import { ProductCardSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { cn } from '../../lib/format';
import type { Category, Product } from '../../lib/types';

type SortKey = 'popular' | 'price_asc' | 'price_desc' | 'newest' | 'name';

const sortOptions: { value: SortKey; label: string }[] = [
  { value: 'popular', label: 'Popular' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest' },
  { value: 'name', label: 'Name' },
];

export function MenuPage() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [sort, setSort] = useState<SortKey>('popular');
  const [showFilters, setShowFilters] = useState(false);
  const [isVeg, setIsVeg] = useState<'all' | 'veg' | 'nonveg'>('all');
  const debouncedSearch = useDebounce(search, 350);

  const categorySlug = params.get('category') ?? undefined;

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiGet<{ categories: Category[] }>('/api/categories'),
    staleTime: 60_000,
  });

  const queryKey = ['products', { category: categorySlug, q: debouncedSearch, sort, isVeg, limit: 60 }];
  const { data, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: () => {
      const qp = new URLSearchParams();
      if (categorySlug) qp.set('category', categorySlug);
      if (debouncedSearch) qp.set('search', debouncedSearch);
      qp.set('sort', sort);
      if (isVeg === 'veg') qp.set('isVeg', 'true');
      if (isVeg === 'nonveg') qp.set('isVeg', 'false');
      qp.set('limit', '60');
      return apiGet<{ products: Product[] }>(`/api/products?${qp.toString()}`);
    },
    staleTime: 15_000,
  });

  const products = useMemo(() => data?.products ?? [], [data]);
  const showSkeleton = isLoading;

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex gap-2.5 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for food, canteen items..."
            className="w-full h-11 pl-10 pr-10 rounded-2xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 text-sm font-medium shadow-2xs transition-all"
            aria-label="Search food"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs bg-gray-100 rounded-full w-5 h-5 flex items-center justify-center font-bold"
            >
              ✕
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={cn(
            'h-11 px-3.5 rounded-2xl border flex items-center gap-1.5 text-xs font-bold transition-all shadow-2xs shrink-0',
            showFilters || isVeg !== 'all' || sort !== 'popular'
              ? 'bg-primary-50 border-primary-200 text-primary-700 ring-2 ring-primary-100'
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
          )}
        >
          <SlidersHorizontal className="h-4 w-4 text-primary-500" />
          <span>Filters</span>
          {(isVeg !== 'all' || sort !== 'popular') && (
            <span className="w-2 h-2 rounded-full bg-primary-500"></span>
          )}
        </button>
      </div>

      {/* Filter Drawer / Panel */}
      {showFilters && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 space-y-4 animate-in">
          <div>
            <p className="text-xs font-extrabold text-gray-900 mb-2 uppercase tracking-wider">Diet Preference</p>
            <div className="flex gap-2">
              {([
                { key: 'all', label: 'All Items', dot: null },
                { key: 'veg', label: 'Pure Veg', dot: 'bg-emerald-500' },
                { key: 'nonveg', label: 'Non-Veg', dot: 'bg-rose-500' },
              ] as const).map((v) => (
                <button
                  key={v.key}
                  onClick={() => setIsVeg(v.key)}
                  className={cn(
                    'px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5',
                    isVeg === v.key 
                      ? 'bg-primary-50 text-primary-600 border-primary-200 shadow-2xs' 
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  )}
                >
                  {v.dot && <span className={cn('w-2 h-2 rounded-full shrink-0', v.dot)}></span>}
                  {v.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-extrabold text-gray-900 mb-2 uppercase tracking-wider">Sort by</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {sortOptions.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setSort(o.value)}
                  className={cn(
                    'px-3 py-2 rounded-xl text-xs font-bold border text-left transition-all',
                    sort === o.value
                      ? 'bg-primary-50 text-primary-600 border-primary-200 shadow-2xs'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Category Pills (Horizontal Scroll) */}
      <div className="flex gap-2 overflow-x-auto pb-1 pt-1 -mx-3.5 px-3.5 sm:-mx-6 sm:px-6 scrollbar-none snap-x">
        <button
          onClick={() => setParams({})}
          className={cn(
            'shrink-0 px-4 h-9 flex items-center justify-center rounded-xl text-xs font-extrabold border transition-all snap-start shadow-2xs',
            !categorySlug 
              ? 'bg-primary-600 text-white border-primary-600 shadow-sm shadow-primary-500/20' 
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          )}
        >
          All Items
        </button>
        {(categories?.categories ?? []).map((c) => (
          <button
            key={c._id}
            onClick={() => setParams(categorySlug === c.slug ? {} : { category: c.slug })}
            className={cn(
              'shrink-0 px-3.5 h-9 flex items-center justify-center rounded-xl text-xs font-extrabold border transition-all snap-start shadow-2xs',
              categorySlug === c.slug 
                ? 'bg-primary-600 text-white border-primary-600 shadow-sm shadow-primary-500/20' 
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Products Feed */}
      <div className={cn('transition-opacity pt-1', isFetching && !showSkeleton ? 'opacity-60' : '')}>
        {showSkeleton ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            title="No food found"
            description={debouncedSearch ? `No results for "${debouncedSearch}". Try a different search.` : 'No items in this category right now.'}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
