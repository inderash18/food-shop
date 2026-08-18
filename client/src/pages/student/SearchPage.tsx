import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search as SearchIcon,
  X,
  Clock,
  Sparkles,
  TrendingUp,
  SlidersHorizontal,
  Leaf,
  Filter,
} from 'lucide-react';
import { apiGet } from '../../api/client';
import { useSearchHistoryStore } from '../../stores/searchHistory';
import { useDebounce } from '../../hooks/useDebounce';
import { ProductCard } from '../../components/ProductCard';
import { ProductGridSkeleton } from '../../components/ui/Skeleton';
import { cn } from '../../lib/utils';
import type { Category, Product } from '../../lib/types';

export function SearchPage() {
  const { searches, addSearch, removeSearch, clearHistory } = useSearchHistoryStore();

  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isVeg, setIsVeg] = useState<'all' | 'veg' | 'nonveg'>('all');
  const [sortBy, setSortBy] = useState<string>('popular');

  const debouncedQuery = useDebounce(query, 250);

  // Fetch Categories for filter pills
  const { data: catData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiGet<{ categories: Category[] }>('/api/categories'),
  });
  const categories = catData?.categories ?? [];

  // Query Products matching debounced search and filters
  const { data: prodData, isLoading } = useQuery({
    queryKey: ['products-search', debouncedQuery, selectedCategory, isVeg, sortBy],
    queryFn: () => {
      const params = new URLSearchParams();
      if (debouncedQuery.trim()) params.set('search', debouncedQuery.trim());
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      if (isVeg === 'veg') params.set('isVeg', 'true');
      if (isVeg === 'nonveg') params.set('isVeg', 'false');
      params.set('sort', sortBy);
      params.set('limit', '30');
      return apiGet<{ products: Product[] }>(`/api/products?${params.toString()}`);
    },
    enabled: true,
  });

  const products = prodData?.products ?? [];

  const handleExecuteSearch = (searchTerm: string) => {
    setQuery(searchTerm);
    addSearch(searchTerm);
  };

  const trendingSearches = [
    'Dum Biryani',
    'Masala Dosa',
    'Cold Coffee',
    'Crispy Burger',
    'Samosa Pav',
    'Thali Meal',
    'Chocolate Brownie',
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      
      {/* Search Input Bar */}
      <div className="relative">
        <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm p-2 flex items-center gap-3 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-50 transition-all">
          <SearchIcon className="w-5 h-5 text-emerald-600 ml-3 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Search for food dishes, snacks, shakes, and drinks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim()) {
                addSearch(query.trim());
              }
            }}
            className="w-full bg-transparent py-2.5 text-sm font-semibold outline-none text-gray-900 placeholder:text-gray-400"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 mr-1 shrink-0 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter & Sorting Controls */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        
        {/* Diet Preference */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-gray-200 shadow-2xs">
          {[
            { id: 'all', label: 'All Items' },
            { id: 'veg', label: 'Pure Veg', dot: 'bg-emerald-500' },
            { id: 'nonveg', label: 'Non-Veg', dot: 'bg-rose-500' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setIsVeg(item.id as any)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5',
                isVeg === item.id
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-3xs'
                  : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              {item.dot && <span className={cn('w-2 h-2 rounded-full', item.dot)}></span>}
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Categories Pills */}
        <div className="flex items-center gap-1 overflow-x-auto py-1 max-w-full scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap',
              selectedCategory === 'all'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            )}
          >
            All Categories
          </button>
          {categories.map((c) => (
            <button
              key={c._id}
              onClick={() => setSelectedCategory(c.slug || c._id)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap',
                selectedCategory === (c.slug || c._id)
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Searches & Popular Tags (shown when query is short) */}
      {!query && (
        <div className="space-y-6 pt-2 animate-in">
          
          {/* Recent Searches */}
          {searches.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Recent Searches
                </h3>
                <button
                  onClick={clearHistory}
                  className="text-[11px] font-bold text-gray-400 hover:text-rose-600 transition-colors"
                >
                  Clear History
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {searches.map((term) => (
                  <div
                    key={term}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:border-emerald-300 rounded-xl text-xs font-bold text-gray-700 shadow-3xs group transition-all"
                  >
                    <span
                      onClick={() => handleExecuteSearch(term)}
                      className="cursor-pointer group-hover:text-emerald-700"
                    >
                      {term}
                    </span>
                    <button
                      onClick={() => removeSearch(term)}
                      className="text-gray-400 hover:text-rose-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trending Searches */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-amber-500" /> Popular on Campus
            </h3>

            <div className="flex flex-wrap gap-2">
              {trendingSearches.map((item) => (
                <button
                  key={item}
                  onClick={() => handleExecuteSearch(item)}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 text-emerald-900 border border-emerald-200/80 rounded-xl text-xs font-bold transition-all shadow-3xs active:scale-95 flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" /> {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results Header */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-4">
        <p className="text-xs font-extrabold text-gray-900">
          {isLoading
            ? 'Searching kitchen catalog...'
            : `${products.length} dishes found${query ? ` for "${query}"` : ''}`}
        </p>
      </div>

      {/* Search Results Grid */}
      {isLoading ? (
        <ProductGridSkeleton count={8} />
      ) : products.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center space-y-3">
          <SearchIcon className="w-10 h-10 text-gray-300 mx-auto" />
          <h3 className="text-base font-extrabold text-gray-800">No dishes matched your search</h3>
          <p className="text-xs text-gray-500 max-w-xs mx-auto">
            Try searching for another dish keyword, or clear dietary filters.
          </p>
          <button
            onClick={() => {
              setQuery('');
              setSelectedCategory('all');
              setIsVeg('all');
            }}
            className="px-5 py-2.5 bg-emerald-50 text-emerald-800 font-extrabold text-xs rounded-xl border border-emerald-200"
          >
            Reset All Filters
          </button>
        </div>
      )}
    </div>
  );
}
