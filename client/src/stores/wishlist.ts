import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '../lib/types';

interface WishlistState {
  items: Product[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  toggleItem: (product: Product) => boolean;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => void;
  count: () => number;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product) => {
        const { items } = get();
        if (!items.some((i) => i._id === product._id)) {
          set({ items: [product, ...items].slice(0, 50) });
        }
      },
      removeItem: (productId) => {
        set({ items: get().items.filter((i) => i._id !== productId) });
      },
      toggleItem: (product) => {
        const { items } = get();
        const exists = items.some((i) => i._id === product._id);
        if (exists) {
          set({ items: items.filter((i) => i._id !== product._id) });
          return false;
        } else {
          set({ items: [product, ...items].slice(0, 50) });
          return true;
        }
      },
      isInWishlist: (productId) => {
        return get().items.some((i) => i._id === productId);
      },
      clearWishlist: () => set({ items: [] }),
      count: () => get().items.length,
    }),
    {
      name: 'campus_food_wishlist',
    }
  )
);
