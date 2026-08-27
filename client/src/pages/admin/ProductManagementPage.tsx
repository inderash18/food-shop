import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  AlertTriangle,
  Leaf,
  UtensilsCrossed,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { adminApi } from '../../api/admin';
import type { Product, Category } from '../../lib/types';
import { Modal } from '../../components/admin/Modal';
import { formatINR } from '../../lib/format';

export function ProductManagementPage() {
  const queryClient = useQueryClient();

  // Search & Filter State
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'UNAVAILABLE'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const limit = 25;

  // Toast / Feedback State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categoryId: '',
    price: 0,
    stock: 50,
    minimumStock: 5,
    prepMinutes: 5,
    isVeg: true,
    isPopular: false,
    isActive: true,
    imageUrl: '',
  });

  // Queries
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-products', debouncedSearch, statusFilter, selectedCategory, page],
    queryFn: () =>
      adminApi.products({
        search: debouncedSearch.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        page,
        limit,
      }),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: adminApi.categories,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (body: typeof formData) => adminApi.createProduct(body),
    onSuccess: (newProd) => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsFormModalOpen(false);
      resetForm();
      showToast(`"${newProd.name}" added successfully.`);
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || 'Failed to add food item. Please try again.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<typeof formData> }) =>
      adminApi.updateProduct(id, body),
    onSuccess: (updatedProd) => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsFormModalOpen(false);
      setEditingProduct(null);
      resetForm();
      showToast(`"${updatedProd.name}" updated successfully.`);
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || 'Failed to update food item. Please try again.');
    },
  });

  const toggleAvailabilityMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminApi.setProductAvailability(id, isActive),
    onSuccess: (updatedProd) => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      showToast(`"${updatedProd.name}" is now ${updatedProd.isActive ? 'Available' : 'Unavailable'}.`);
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || 'Failed to update availability.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteProduct(id),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDeletingProduct(null);
      showToast(res?.message || 'Product removed successfully.');
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || 'Failed to delete product.');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      categoryId: categories?.[0]?._id || '',
      price: 0,
      stock: 50,
      minimumStock: 5,
      prepMinutes: 5,
      isVeg: true,
      isPopular: false,
      isActive: true,
      imageUrl: '',
    });
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    resetForm();
    if (categories?.length > 0) {
      setFormData((prev) => ({ ...prev, categoryId: categories[0]._id }));
    }
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      description: p.description || '',
      categoryId: typeof p.categoryId === 'string' ? p.categoryId : (p.categoryId as Category)?._id || categories?.[0]?._id || '',
      price: p.price,
      stock: p.stock ?? 50,
      minimumStock: p.minimumStock || 5,
      prepMinutes: p.prepMinutes || 5,
      isVeg: p.isVeg ?? true,
      isPopular: p.isPopular || false,
      isActive: p.isActive ?? true,
      imageUrl: p.imageUrl || '',
    });
    setIsFormModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.price < 0) {
      alert('Price must be greater than or equal to 0');
      return;
    }
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct._id, body: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const productsList = data?.products || [];
  const totalProducts = data?.total ?? 0;
  const totalPages = data?.pages || Math.max(1, Math.ceil(totalProducts / limit));

  return (
    <div className="space-y-6">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">Products</h1>
            <span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full border border-blue-100 flex items-center gap-1.5">
              <UtensilsCrossed className="w-3.5 h-3.5" />
              {totalProducts} {totalProducts === 1 ? 'Food Item' : 'Food Items'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage food catalog, change prices directly, and toggle real-time availability
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-2.5 rounded-xl text-xs font-semibold shadow-xs transition-colors"
            title="Refresh list"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all hover:shadow"
          >
            <Plus className="w-4 h-4" /> Add Food
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search food name or description..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-slate-400"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
            className="border border-slate-200 bg-slate-50 text-slate-700 text-xs font-semibold py-1.5 px-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.name}
              </option>
            ))}
          </select>

          {/* Availability Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {(
              [
                { id: 'ALL', label: 'All' },
                { id: 'AVAILABLE', label: 'Available' },
                { id: 'UNAVAILABLE', label: 'Unavailable' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setStatusFilter(tab.id);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop Table & Mobile Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading food catalog...</div>
        ) : productsList.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3.5">Food Item</th>
                    <th className="px-4 py-3.5">Category</th>
                    <th className="px-4 py-3.5 font-mono">Price</th>
                    <th className="px-4 py-3.5">Availability</th>
                    <th className="px-4 py-3.5">Stock</th>
                    <th className="px-4 py-3.5">Prep Time</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {productsList.map((product) => {
                    const categoryName =
                      typeof product.categoryId === 'object' && product.categoryId !== null
                        ? (product.categoryId as Category).name
                        : 'General';

                    return (
                      <tr
                        key={product._id}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          !product.isActive ? 'opacity-60 bg-slate-50/30' : ''
                        }`}
                      >
                        {/* Food Item Image & Name */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-11 h-11 rounded-xl object-cover bg-slate-100 border border-slate-200 flex-shrink-0"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-xs border border-slate-200 flex-shrink-0">
                                <ImageIcon className="w-4 h-4" />
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                {product.name}
                                {product.isVeg ? (
                                  <span className="inline-flex items-center text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-semibold">
                                    <Leaf className="w-2.5 h-2.5 mr-0.5" /> Veg
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center text-[10px] text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded font-semibold">
                                    Non-Veg
                                  </span>
                                )}
                              </div>
                              {product.description && (
                                <p className="text-[11px] text-slate-500 max-w-xs truncate mt-0.5">
                                  {product.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-4 py-3">
                          <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-medium text-[11px] border border-slate-200">
                            {categoryName}
                          </span>
                        </td>

                        {/* Price */}
                        <td className="px-4 py-3 font-mono font-black text-slate-900 text-sm">
                          {formatINR(product.price)}
                        </td>

                        {/* Availability Toggle */}
                        <td className="px-4 py-3">
                          <button
                            onClick={() =>
                              toggleAvailabilityMutation.mutate({
                                id: product._id,
                                isActive: !product.isActive,
                              })
                            }
                            disabled={toggleAvailabilityMutation.isPending}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer shadow-2xs ${
                              product.isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300'
                                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 hover:border-rose-300'
                            }`}
                            title="Click to toggle availability"
                          >
                            {product.isActive ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>AVAILABLE</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                <span>UNAVAILABLE</span>
                              </>
                            )}
                          </button>
                        </td>

                        {/* Stock */}
                        <td className="px-4 py-3 font-mono">
                          {product.stock <= 0 ? (
                            <span className="text-rose-600 font-bold text-[11px]">Out of Stock</span>
                          ) : product.stock <= (product.minimumStock || 5) ? (
                            <span className="text-amber-700 font-bold text-[11px]">Low: {product.stock}</span>
                          ) : (
                            <span className="text-slate-700 font-semibold text-[11px]">{product.stock} units</span>
                          )}
                        </td>

                        {/* Prep Time */}
                        <td className="px-4 py-3 text-slate-500 font-medium">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {product.prepMinutes || 5} mins
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenEdit(product)}
                            className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors inline-flex items-center gap-1 border border-blue-200 text-[11px] font-semibold"
                            title="Edit Food & Price"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => setDeletingProduct(product)}
                            className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors inline-flex items-center gap-1 border border-rose-200 text-[11px] font-semibold"
                            title="Delete Food Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Layout */}
            <div className="block md:hidden divide-y divide-slate-100 p-3 space-y-3">
              {productsList.map((product) => {
                const categoryName =
                  typeof product.categoryId === 'object' && product.categoryId !== null
                    ? (product.categoryId as Category).name
                    : 'General';

                return (
                  <div
                    key={product._id}
                    className={`p-3 rounded-xl border border-slate-200 bg-white space-y-3 ${
                      !product.isActive ? 'opacity-60 bg-slate-50/50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-14 h-14 rounded-xl object-cover bg-slate-100 border border-slate-200 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-xs border border-slate-200 flex-shrink-0">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-900 text-sm truncate">{product.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {categoryName}
                          </span>
                          <span className="font-mono font-black text-slate-900 text-sm">
                            {formatINR(product.price)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <button
                        onClick={() =>
                          toggleAvailabilityMutation.mutate({
                            id: product._id,
                            isActive: !product.isActive,
                          })
                        }
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                          product.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {product.isActive ? 'AVAILABLE' : 'UNAVAILABLE'}
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(product)}
                          className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold inline-flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" /> Edit
                        </button>
                        <button
                          onClick={() => setDeletingProduct(product)}
                          className="p-1.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="p-12 text-center text-xs text-slate-400 space-y-3">
            <UtensilsCrossed className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
            <p className="text-sm font-semibold text-slate-700">No food items yet</p>
            <p className="text-xs text-slate-400">Get started by creating your first food menu item.</p>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Food
            </button>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
            <div>
              Showing page <span className="font-bold text-slate-900">{page}</span> of{' '}
              <span className="font-bold text-slate-900">{totalPages}</span> ({totalProducts} total)
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 inline-flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 inline-flex items-center gap-1"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Food Modal */}
      {isFormModalOpen && (
        <Modal
          open={isFormModalOpen}
          onClose={() => {
            setIsFormModalOpen(false);
            setEditingProduct(null);
          }}
          title={editingProduct ? `Edit ${editingProduct.name}` : 'Add Food Item'}
        >
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Food Name */}
            <div>
              <label className="block text-slate-800 font-bold mb-1">
                Food Name <span className="text-rose-500">*</span>
              </label>
              <input
                required
                type="text"
                placeholder="e.g. Chicken Burger, Masala Dosa..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-slate-800 font-bold mb-1">Description</label>
              <textarea
                placeholder="Fresh ingredients, savory taste, served hot..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs"
              />
            </div>

            {/* Category & Price (PRICE FIELD CLEARLY VISIBLE) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-800 font-bold mb-1">
                  Category <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-xs font-medium cursor-pointer"
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-800 font-bold mb-1">
                  Price (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold font-mono">
                    ₹
                  </span>
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    placeholder="70"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full pl-8 pr-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono font-bold text-sm text-slate-900 bg-amber-50/40"
                  />
                </div>
              </div>
            </div>

            {/* Image URL & Preview */}
            <div>
              <label className="block text-slate-800 font-bold mb-1">Image URL</label>
              <input
                type="text"
                placeholder="https://images.unsplash.com/... or /images/products/..."
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs"
              />
              {formData.imageUrl && (
                <div className="mt-2 flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                  <img
                    src={formData.imageUrl}
                    alt="Preview"
                    className="w-10 h-10 rounded-lg object-cover bg-white border border-slate-200"
                    onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                  />
                  <span className="text-[11px] text-slate-500">Live image preview</span>
                </div>
              )}
            </div>

            {/* Stock, Prep Time & Dietary Choice */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-800 font-bold mb-1">Daily Stock</label>
                <input
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-800 font-bold mb-1">Prep Time (mins)</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={formData.prepMinutes}
                  onChange={(e) => setFormData({ ...formData, prepMinutes: Number(e.target.value) })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-800 font-bold mb-1">Dietary Type</label>
                <select
                  value={formData.isVeg ? 'VEG' : 'NON_VEG'}
                  onChange={(e) => setFormData({ ...formData, isVeg: e.target.value === 'VEG' })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-xs font-semibold cursor-pointer"
                >
                  <option value="VEG">🌱 Vegetarian</option>
                  <option value="NON_VEG">🍗 Non-Vegetarian</option>
                </select>
              </div>
            </div>

            {/* Availability Toggle */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">Food Availability</span>
                <span className="text-[11px] text-slate-500">
                  {formData.isActive ? 'Visible & orderable by students' : 'Hidden / marked unavailable for checkout'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.isActive ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.isActive ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsFormModalOpen(false);
                  setEditingProduct(null);
                }}
                className="px-4 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition-colors text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all disabled:opacity-50"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : editingProduct
                  ? 'Save Changes'
                  : 'Add Food Item'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingProduct && (
        <Modal
          open={Boolean(deletingProduct)}
          onClose={() => setDeletingProduct(null)}
          title={`Delete "${deletingProduct.name}"?`}
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-start gap-3 p-3 bg-amber-50 text-amber-900 rounded-xl border border-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Historical Order Protection</p>
                <p className="text-[11px] text-amber-800">
                  If this item was ordered in past student receipts, it will be safely deactivated to preserve
                  historical order data and audit trails.
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingProduct(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(deletingProduct._id)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
