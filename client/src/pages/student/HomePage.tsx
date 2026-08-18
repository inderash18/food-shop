import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Utensils,
  Search,
  Plus,
  Minus,
  Clock,
  Ticket,
  QrCode,
  ArrowRight,
  ShoppingBag,
  RefreshCw,
} from 'lucide-react';
import { apiGet } from '../../api/client';
import { useAuthStore } from '../../stores/auth';
import { useCart } from '../../hooks/useCart';
import { formatINR } from '../../lib/format';
import { ProductImage } from '../../components/ProductImage';
import { FoodDetailDrawer } from '../../components/food/FoodDetailDrawer';
import { DigitalOrderPassModal } from '../../components/ticket/DigitalTicketModal';
import type { Product, Order } from '../../lib/types';
import { cn } from '../../lib/utils';
import { toast } from '../../components/ui/Toast';

export function HomePage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { cart, addItem, updateQuantity, itemCount, subtotal } = useCart();

  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [selectedPass, setSelectedPass] = useState<Order | null>(null);

  // 1. Fetch Food Menu Catalog
  const { data: catalogData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['food-catalog'],
    queryFn: () =>
      apiGet<{ products: Product[]; categories: Array<{ _id: string; name: string; slug: string }> }>(
        '/api/products'
      ),
    staleTime: 60_000,
  });

  const products = catalogData?.products || [];

  // 2. Fetch User's Active Pre-Orders
  const { data: activeOrderData } = useQuery({
    queryKey: ['my-active-order'],
    queryFn: () => apiGet<{ order: Order | null }>('/api/orders/mine/active'),
    enabled: !!user,
    refetchInterval: (query) => {
      const order = (query.state.data as any)?.order;
      if (!order || order.status === 'COMPLETED' || order.status === 'CANCELLED') return false;
      return 10_000;
    },
  });

  const activeOrder = activeOrderData?.order;

  // Categories
  const categories = [
    { id: 'ALL', label: 'All Catalog' },
    { id: 'breakfast', label: 'Breakfast' },
    { id: 'lunch', label: 'Lunch' },
    { id: 'meals', label: 'Meals' },
    { id: 'snacks', label: 'Snacks' },
    { id: 'beverages', label: 'Beverages' },
    { id: 'combos', label: 'Combos' },
  ];

  // Filtering
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat =
        selectedCategory === 'ALL' ||
        (typeof p.categoryId === 'object' ? (p.categoryId as any).slug === selectedCategory : false);
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const handleQuickAdd = (p: Product) => {
    addItem(p, 1);
    toast.success(`Added ${p.name} to Pre-Order`);
  };

  return (
    <div className="space-y-6 pb-24 max-w-6xl mx-auto px-2 sm:px-4 antialiased">
      
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-amber-100 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-amber-950 tracking-tight">
            Pre-Order Overview
          </h1>
          <p className="text-xs font-normal text-stone-500 mt-1">
            Manage active collection tokens, monitor preparation progress, and pre-order meals.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9 px-3.5 rounded-xl border border-amber-200/80 bg-white hover:bg-amber-50 text-amber-950 text-xs font-medium transition-all shadow-3xs flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            title="Refresh Catalog"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
            <span>Refresh</span>
          </button>

          {itemCount > 0 && (
            <Link
              to="/cart"
              className="h-9 px-4 rounded-xl bg-[#FEDB71] hover:bg-[#F5CA38] text-amber-950 text-xs font-bold shadow-3xs flex items-center gap-2 transition-transform active:scale-95 border border-amber-300"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-amber-950" />
              <span>Checkout ({formatINR(subtotal)})</span>
            </Link>
          )}
        </div>
      </div>

      {/* 2. Top Metric & Active Pass Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Active Pass Card / Live Token */}
        {activeOrder ? (
          <div className="md:col-span-2 bg-white rounded-2xl border-2 border-[#FEDB71] p-5 shadow-xs flex flex-col justify-between gap-4 animate-in">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                    Live Pre-Order Token
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold font-mono text-amber-950 mt-1 tabular-nums">
                  #{activeOrder.tokenNumber || activeOrder.orderNumber}
                </h2>
              </div>

              <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#FEDB71] text-amber-950 border border-amber-300 shadow-3xs">
                {activeOrder.status === 'READY' ? 'Ready for Collection' : 'Kitchen Preparing'}
              </span>
            </div>

            {/* Preparation Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-medium text-stone-500">
                <span>Estimated ready time</span>
                <span className="font-bold text-amber-950">~5–10 mins</span>
              </div>
              <div className="w-full h-2 bg-amber-50 rounded-full overflow-hidden border border-amber-100">
                <div
                  className={cn(
                    'h-full rounded-full bg-[#FEDB71] transition-all duration-500',
                    activeOrder.status === 'READY' ? 'w-full' : 'w-2/3'
                  )}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-amber-100">
              <p className="text-xs text-stone-500">
                {activeOrder.items?.length || 1} items ordered
              </p>
              <button
                onClick={() => setSelectedPass(activeOrder)}
                className="px-3.5 py-1.5 bg-[#FEDB71] hover:bg-[#F5CA38] text-amber-950 text-xs font-bold rounded-xl shadow-3xs flex items-center gap-1.5 transition-all border border-amber-300"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Open Digital Pass</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="md:col-span-2 bg-white rounded-2xl border border-amber-200/80 p-5 shadow-xs flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4 text-[#F59E0B]" />
                <h3 className="text-sm font-bold text-amber-950">No Active Pre-Orders</h3>
              </div>
              <p className="text-xs text-stone-500">
                Select items from the catalog below to generate an express collection token.
              </p>
            </div>
            <Link
              to="/orders"
              className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 text-xs font-bold transition-colors shrink-0 border border-amber-200"
            >
              Order History
            </Link>
          </div>
        )}

        {/* Quick Summary Stat Card */}
        <div className="bg-white rounded-2xl border border-amber-200/80 p-5 shadow-xs flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500">Current Bag</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-[#F59E0B] border border-amber-200/60">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>

          <div>
            <p className="text-2xl font-bold text-amber-950 tabular-nums">
              {itemCount} <span className="text-xs font-normal text-stone-400">items</span>
            </p>
            <p className="text-xs font-bold text-amber-900 mt-0.5 tabular-nums">
              Subtotal: {formatINR(subtotal)}
            </p>
          </div>

          <div className="pt-2 border-t border-amber-100 flex justify-between items-center text-xs">
            <span className="text-stone-400 font-medium">Avg Prep Time</span>
            <span className="font-semibold text-amber-950 flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#F59E0B]" /> ~8–12 mins
            </span>
          </div>
        </div>
      </div>

      {/* 3. Catalog Controls: Search Filter & Category Tabs */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all select-none border',
                  selectedCategory === cat.id
                    ? 'bg-[#FEDB71] text-amber-950 font-bold border-amber-300 shadow-3xs'
                    : 'bg-white text-stone-600 font-medium border-amber-100 hover:bg-amber-50'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Filter Box */}
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-amber-600" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter items by name..."
              className="w-full pl-8 pr-7 py-1.5 bg-white border border-amber-200 rounded-xl text-xs font-normal text-amber-950 placeholder:text-stone-400 focus:outline-none focus:border-amber-400 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs font-bold"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Structured Product Card Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-32 bg-white border border-amber-100 rounded-2xl p-4" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-12 text-center bg-white border border-amber-100 rounded-2xl space-y-2">
          <Utensils className="w-8 h-8 text-amber-300 mx-auto" />
          <h3 className="text-sm font-semibold text-amber-950">No items found in catalog</h3>
          <p className="text-xs text-stone-400">Try adjusting your filter or search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((p) => {
            const cartItem = cart?.items.find((i) => i.productId === p._id);
            const inCartQty = cartItem?.quantity || 0;

            return (
              <div
                key={p._id}
                className="bg-white rounded-2xl border border-amber-100 hover:border-amber-300 p-4 flex items-center justify-between gap-3 transition-all shadow-xs group"
              >
                {/* Thumbnail & Item Info */}
                <div
                  onClick={() => setActiveProduct(p)}
                  className="flex items-center gap-3.5 flex-1 min-w-0 cursor-pointer"
                >
                  <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-amber-50 border border-amber-200/60">
                    <ProductImage src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                  </div>

                  <div className="min-w-0 space-y-0.5">
                    <h3 className="text-xs sm:text-sm font-semibold text-amber-950 truncate group-hover:text-amber-800 transition-colors">
                      {p.name}
                    </h3>
                    <p className="text-[11px] font-normal text-stone-500 line-clamp-1">
                      {p.description}
                    </p>
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="text-xs sm:text-sm font-bold text-amber-950 tabular-nums">
                        {formatINR(p.price)}
                      </span>
                      <span className="text-[10px] text-stone-400 font-medium flex items-center gap-0.5 tabular-nums">
                        <Clock className="w-3 h-3 text-[#F59E0B]" /> {p.prepMinutes || 8}m
                      </span>
                    </div>
                  </div>
                </div>

                {/* Add / Stepper Button */}
                <div className="shrink-0">
                  {inCartQty === 0 ? (
                    <button
                      onClick={() => handleQuickAdd(p)}
                      className="h-8 px-3.5 bg-[#FEDB71] hover:bg-[#F5CA38] text-amber-950 font-bold text-xs rounded-xl transition-all flex items-center gap-1 active:scale-95 shadow-3xs border border-amber-300"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-950" />
                      <span>Add</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-xl p-1 shadow-3xs">
                      <button
                        onClick={() => updateQuantity(p._id, inCartQty - 1)}
                        className="w-6 h-6 rounded-lg bg-white text-amber-950 flex items-center justify-center hover:bg-amber-100 transition-colors shadow-3xs border border-amber-200/60"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center text-xs font-bold text-amber-950 tabular-nums">
                        {inCartQty}
                      </span>
                      <button
                        onClick={() => updateQuantity(p._id, inCartQty + 1)}
                        className="w-6 h-6 rounded-lg bg-[#FEDB71] text-amber-950 flex items-center justify-center hover:bg-[#F5CA38] transition-colors shadow-3xs border border-amber-300"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Checkout Bar for Mobile (Clean White & Yellow with NO black) */}
      {itemCount > 0 && (
        <div className="md:hidden fixed bottom-4 left-4 right-4 z-40 animate-in">
          <Link
            to="/cart"
            className="w-full bg-[#FEDB71] text-amber-950 p-3.5 rounded-2xl shadow-yellow flex items-center justify-between gap-3 active:scale-98 transition-transform border border-amber-300"
          >
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-amber-900 text-white flex items-center justify-center text-xs font-bold tabular-nums">
                {itemCount}
              </span>
              <span className="text-xs font-bold">Pre-Order Bag</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tabular-nums">{formatINR(subtotal)}</span>
              <span className="px-2.5 py-1 bg-white text-amber-950 font-bold text-[11px] rounded-lg flex items-center gap-1 shadow-3xs border border-amber-200">
                Checkout <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </Link>
        </div>
      )}

      {/* Food Customization Drawer */}
      <FoodDetailDrawer
        product={activeProduct}
        isOpen={!!activeProduct}
        onClose={() => setActiveProduct(null)}
        onAddToCart={(prod, qty, addons, notes) => {
          addItem(prod, qty, addons, notes);
          toast.success(`Added ${qty}x ${prod.name} to Pre-Order`);
        }}
      />

      {/* Digital Pass Modal */}
      <DigitalOrderPassModal
        booking={selectedPass}
        isOpen={!!selectedPass}
        onClose={() => setSelectedPass(null)}
      />
    </div>
  );
}

export { HomePage as MenuPage };
