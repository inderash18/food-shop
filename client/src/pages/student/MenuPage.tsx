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
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for food..."
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Search food"
          />
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={cn('h-11 px-3.5 rounded-xl border flex items-center gap-2 text-sm font-medium', showFilters ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-white border-gray-300 text-gray-700')}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
        </button>
      </div>

      {showFilters && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Dietary</p>
            <div className="flex gap-2">
              {(['all', 'veg', 'nonveg'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setIsVeg(v)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-medium border',
                    isVeg === v ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-300'
                  )}
                >
                  {v === 'all' ? 'All' : v === 'veg' ? 'Veg' : 'Non-veg'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Sort by</p>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="w-full h-10 rounded-xl border border-gray-300 px-3 text-sm text-gray-800"
            >
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
        <button
          onClick={() => setParams({})}
          className={cn(
            'shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium border whitespace-nowrap',
            !categorySlug ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-300'
          )}
        >
          All
        </button>
        {(categories?.categories ?? []).map((c) => (
          <button
            key={c._id}
            onClick={() => setParams(categorySlug === c.slug ? {} : { category: c.slug })}
            className={cn(
              'shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium border whitespace-nowrap',
              categorySlug === c.slug ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-300'
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className={cn('transition-opacity', isFetching && !showSkeleton ? 'opacity-60' : '')}>
        {showSkeleton ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
