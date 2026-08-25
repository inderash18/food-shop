import { create } from 'zustand';
import apiClient, { getErrorMessage } from '../api/client';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'SUPER_ADMIN' | 'STAFF' | string;
  studentId?: string;
  phone?: string;
  avatarUrl?: string;
}

interface AdminAuthState {
  adminUser: AdminUser | null;
  adminToken: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  loginAdmin: (identifier: string, password: string) => Promise<AdminUser>;
  logoutAdmin: () => Promise<void>;
  loadAdminMe: () => Promise<AdminUser | null>;
  clearError: () => void;
}

export const useAdminAuthStore = create<AdminAuthState>((set, get) => ({
  adminUser: null,
  adminToken: sessionStorage.getItem('adminAccessToken') || null,
  isLoading: false,
  isInitialized: false,
  error: null,

  loginAdmin: async (identifier: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.post('/api/admin/login', { identifier, password });
      const data = res.data?.data || res.data;
      const user = data.user;
      const token = data.accessToken;

      if (token) {
        sessionStorage.setItem('adminAccessToken', token);
      }

      set({
        adminUser: user,
        adminToken: token || null,
        isLoading: false,
        isInitialized: true,
        error: null,
      });

      return user;
    } catch (err: any) {
      const msg = getErrorMessage(err) || 'Admin authentication failed';
      set({ isLoading: false, error: msg, adminUser: null, adminToken: null });
      sessionStorage.removeItem('adminAccessToken');
      throw new Error(msg);
    }
  },

  loadAdminMe: async () => {
    set({ isLoading: true });
    try {
      const res = await apiClient.get('/api/admin/me');
      const data = res.data?.data || res.data;
      const user = data.user;
      set({ adminUser: user, isLoading: false, isInitialized: true, error: null });
      return user;
    } catch (err) {
      set({ adminUser: null, adminToken: null, isLoading: false, isInitialized: true });
      sessionStorage.removeItem('adminAccessToken');
      return null;
    }
  },

  logoutAdmin: async () => {
    try {
      await apiClient.post('/api/admin/logout');
    } catch {
      // ignore network errors on logout
    } finally {
      sessionStorage.removeItem('adminAccessToken');
      set({ adminUser: null, adminToken: null, isInitialized: true, error: null });
    }
  },

  clearError: () => set({ error: null }),
}));
