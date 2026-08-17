import { apiGet, apiPost, apiPatch, apiDelete } from './client';
import type { Cart } from '../lib/types';

export const cartApi = {
  get: () => apiGet<{ cart: Cart }>('/api/cart'),
  add: (productId: string, quantity = 1) => apiPost<{ cart: Cart }>('/api/cart', { productId, quantity }),
  update: (productId: string, quantity: number) => apiPatch<{ cart: Cart }>(`/api/cart/${productId}`, { quantity }),
  remove: (productId: string) => apiDelete<{ cart: Cart }>(`/api/cart/${productId}`),
  clear: () => apiDelete<{ cart: Cart }>('/api/cart'),
};
