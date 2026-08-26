import { create } from 'zustand';
import apiClient, { getErrorMessage, setAdminToken, getAdminToken } from '../api/client';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'SUPER_ADMIN' | 'STAFF' | string;
  studentId?: string;
  phone?: string;
  avatarUrl?: string;
}

export type AdminAuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AdminAuthState {
  adminUser: AdminUser | null;
  adminToken: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  adminAuthStatus: AdminAuthStatus;
  error: string | null;
  loginAdmin: (identifier: string, password: string) => Promise<AdminUser>;
  logoutAdmin: () => Promise<void>;
  loadAdminMe: () => Promise<AdminUser | null>;
  clearError: () => void;
}

export const useAdminAuthStore = create<AdminAuthState>((set) => ({
  adminUser: null,
  adminToken: getAdminToken(),
  isLoading: false,
  isInitialized: false,
  adminAuthStatus: 'loading',
  error: null,

  loginAdmin: async (identifier: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.post('/api/admin/login', { identifier, password });
      const data = res.data?.data || res.data;
      const user = data.user;
      const token = data.accessToken;

      if (token) {
        setAdminToken(token);
      }

      set({
        adminUser: user,
        adminToken: token || null,
        isLoading: false,
        isInitialized: true,
        adminAuthStatus: 'authenticated',
        error: null,
      });

      return user;
    } catch (err: any) {
      const msg = getErrorMessage(err) || 'Admin authentication failed';
      setAdminToken(null);
      set({ isLoading: false, error: msg, adminUser: null, adminToken: null, adminAuthStatus: 'unauthenticated' });
      throw new Error(msg);
    }
  },

  loadAdminMe: async () => {
    set({ isLoading: true });
    try {
      const res = await apiClient.get('/api/admin/me');
      const data = res.data?.data || res.data;
      const user = data.user;
      set({
        adminUser: user,
        isLoading: false,
        isInitialized: true,
        adminAuthStatus: 'authenticated',
        error: null,
      });
      return user;
    } catch (err) {
      setAdminToken(null);
      set({
        adminUser: null,
        adminToken: null,
        isLoading: false,
        isInitialized: true,
        adminAuthStatus: 'unauthenticated',
      });
      return null;
    }
  },

  logoutAdmin: async () => {
    try {
      await apiClient.post('/api/admin/logout');
    } catch {
      // ignore network errors on logout
    } finally {
      setAdminToken(null);
      set({
        adminUser: null,
        adminToken: null,
        isInitialized: true,
        isLoading: false,
        adminAuthStatus: 'unauthenticated',
        error: null,
      });
    }
  },

  clearError: () => set({ error: null }),
}));
