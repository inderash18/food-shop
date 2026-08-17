import { create } from 'zustand';
import { apiPost, apiGet, setAccessToken } from '../api/client';
import type { User } from '../lib/types';

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  login: (identifier: string, password: string) => Promise<User>;
  register: (data: { name: string; email: string; studentId: string; password: string; phone?: string }) => Promise<User>;
  logout: () => Promise<void>;
  loadMe: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,

  login: async (identifier, password) => {
    const data = await apiPost<{ accessToken: string }>('/api/auth/login', { identifier, password });
    setAccessToken(data.accessToken);
    const me = await apiGet<{ user: User }>('/api/auth/me');
    set({ user: me.user, initialized: true });
    return me.user;
  },

  register: async (payload) => {
    const data = await apiPost<{ user: User }>('/api/auth/register', payload);
    set({ user: data.user });
    return data.user;
  },

  logout: async () => {
    try {
      await apiPost('/api/auth/logout');
    } catch {
      // ignore network errors on logout
    }
    setAccessToken(null);
    set({ user: null });
  },

  loadMe: async () => {
    try {
      const me = await apiGet<{ user: User }>('/api/auth/me');
      set({ user: me.user, initialized: true });
    } catch {
      set({ user: null, initialized: true });
    }
  },

  setUser: (user) => set({ user }),
}));
