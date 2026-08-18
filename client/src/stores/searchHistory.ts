import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SearchHistoryState {
  searches: string[];
  addSearch: (query: string) => void;
  removeSearch: (query: string) => void;
  clearHistory: () => void;
}

export const useSearchHistoryStore = create<SearchHistoryState>()(
  persist(
    (set, get) => ({
      searches: ['Dum Biryani', 'Masala Dosa', 'Cold Coffee', 'Gourmet Burger', 'Paneer Butter Masala'],
      addSearch: (query) => {
        const trimmed = query.trim();
        if (!trimmed) return;
        const current = get().searches.filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
        set({ searches: [trimmed, ...current].slice(0, 10) });
      },
      removeSearch: (query) => {
        set({ searches: get().searches.filter((s) => s !== query) });
      },
      clearHistory: () => set({ searches: [] }),
    }),
    {
      name: 'campus_food_search_history',
    }
  )
);
