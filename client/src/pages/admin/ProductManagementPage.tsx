import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit2, Trash2, Package, CheckCircle, XCircle } from 'lucide-react';
import { adminApi } from '../../api/admin';
import type { Product, Category } from '../../lib/types';
import { Modal } from '../../components/admin/Modal';

export function ProductManagementPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categoryId: '',
    price: 0,
    stock: 0,
    minimumStock: 5,
    prepMinutes: 5,
    isVeg: true,
    isPopular: false,
    isActive: true,
    imageUrl: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', search, page],
    queryFn: () => adminApi.products({ search, page, limit: 15 }),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: adminApi.categories,
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof formData) => adminApi.createProduct(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setIsCreateModalOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<typeof formData> }) =>
      adminApi.updateProduct(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setEditingProduct(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      categoryId: categories?.[0]?._id || '',
      price: 0,
      stock: 10,
      minimumStock: 5,
      prepMinutes: 5,
      isVeg: true,
      isPopular: false,
      isActive: true,
      imageUrl: '',
    });
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      description: p.description || '',
      categoryId: typeof p.categoryId === 'string' ? p.categoryId : (p.categoryId as Category)?._id || '',
      price: p.price,
      stock: p.stock,
      minimumStock: p.minimumStock || 5,
      prepMinutes: p.prepMinutes || 5,
      isVeg: p.isVeg,
      isPopular: p.isPopular || false,
      isActive: p.isActive,
      imageUrl: p.imageUrl || '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct._id, body: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const toggleStock = (product: Product, inStock: boolean) => {
    updateMutation.mutate({
      id: product._id,
      body: { stock: inStock ? 50 : 0 } // if marking in stock, default to 50 for simplicity, out of stock is 0
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-xs text-gray-500">Manage catalog, prices, and availability</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsCreateModalOpen(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-colors w-fit"
        >
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-gray-400">Loading catalog...</div>
        ) : data?.products && data.products.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Availability</th>
                  <th className="px-4 py-3">Created Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.products.map((product) => {
                  const isOutOfStock = product.stock <= 0;
                  return (
                    <tr key={product._id} className={`hover:bg-gray-50/70 transition-colors ${!product.isActive ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 text-gray-400 flex items-center justify-center font-bold text-xs">
                              {product.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-gray-900 flex items-center gap-2">
                              {product.name}
                              {!product.isActive && <span className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 text-[9px] font-bold">DISABLED</span>}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {typeof product.categoryId === 'object' && product.categoryId !== null ? (product.categoryId as Category).name : 'General'}
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900">₹{product.price}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleStock(product, isOutOfStock)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${
                            isOutOfStock
                              ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          {isOutOfStock ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                          {isOutOfStock ? 'OUT OF STOCK' : 'IN STOCK'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{product.createdAt ? new Date(product.createdAt).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-3 text-right space-x-1">
                        <button onClick={() => handleOpenEdit(product)} className="p-1.5 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => { if (window.confirm(`Delete ${product.name}?`)) deleteMutation.mutate(product._id); }} className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-gray-400">No products found.</div>
        )}
      </div>

      {(isCreateModalOpen || editingProduct) && (
        <Modal
          open={isCreateModalOpen || Boolean(editingProduct)}
          onClose={() => { setIsCreateModalOpen(false); setEditingProduct(null); }}
          title={editingProduct ? `Edit ${editingProduct.name}` : 'Add New Product'}
        >
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-gray-700 font-bold mb-1">Product Name</label>
              <input required type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full p-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Description</label>
              <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} className="w-full p-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Category</label>
                <select value={formData.categoryId} onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })} className="w-full p-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white">
                  <option value="">Select Category</option>
                  {categories?.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Price (₹)</label>
                <input required type="number" min="0" value={formData.price} onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })} className="w-full p-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono" />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Image URL</label>
              <input type="url" value={formData.imageUrl} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} className="w-full p-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>

            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-700">
                <input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                Enable Product (Active)
              </label>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end gap-2">
              <button type="button" onClick={() => { setIsCreateModalOpen(false); setEditingProduct(null); }} className="px-4 py-2 border border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold">
                {editingProduct ? 'Save Changes' : 'Create Product'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
