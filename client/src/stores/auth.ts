import { create } from 'zustand';
import { apiPost, apiGet, setAccessToken } from '../api/client';
import type { User } from '../lib/types';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  authStatus: AuthStatus;
  sendOtp: (mobileNumber: string, purpose?: 'login' | 'register') => Promise<{ cooldownSeconds: number; expiresInSeconds: number }>;
  verifyOtp: (mobileNumber: string, otp: string, name?: string) => Promise<User>;
  sendEmailOTP: (email: string, purpose?: 'login' | 'register') => Promise<{ cooldownSeconds: number; expiresInSeconds: number }>;
  verifyEmailOTP: (
    email: string,
    otp: string,
    extra?: { name?: string; studentId?: string; password?: string; purpose?: 'login' | 'register' | 'admin' } | string,
    password?: string
  ) => Promise<User>;
  resendEmailOTP: (email: string, purpose?: 'login' | 'register') => Promise<{ cooldownSeconds: number; expiresInSeconds: number }>;
  sendPhoneOTP: (phone: string, purpose?: 'login' | 'register') => Promise<{ cooldownSeconds: number; expiresInSeconds: number }>;
  verifyPhoneOTP: (phone: string, otp: string, name?: string) => Promise<User>;
  resendPhoneOTP: (phone: string, purpose?: 'login' | 'register') => Promise<{ cooldownSeconds: number; expiresInSeconds: number }>;
  login: (identifier: string, password: string) => Promise<User>;
  register: (data: { name: string; email?: string; studentId?: string; password?: string; phone?: string; mobileNumber?: string }) => Promise<User>;
  logout: () => Promise<void>;
  loadMe: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  initialized: false,
  authStatus: 'loading',

  sendOtp: async (mobileNumber, purpose = 'login') => {
    const res = await apiPost<{ cooldownSeconds: number; expiresInSeconds: number }>('/api/auth/send-otp', { mobileNumber, purpose });
    return res;
  },

  verifyOtp: async (mobileNumber, otp, name) => {
    const data = await apiPost<{ user: User; accessToken: string }>('/api/auth/verify-otp', { mobileNumber, otp, name });
    if (data.accessToken) {
      setAccessToken(data.accessToken);
    }
    set({ user: data.user, initialized: true, authStatus: 'authenticated', loading: false });
    return data.user;
  },

  sendEmailOTP: async (email, purpose = 'login') => {
    const res = await apiPost<{ cooldownSeconds: number; expiresInSeconds: number }>('/api/auth/send-email-otp', { email, purpose });
    return res;
  },

  verifyEmailOTP: async (email, otp, extraOrName, password) => {
    let payload: Record<string, any> = { email, otp };
    if (typeof extraOrName === 'string') {
      payload.name = extraOrName;
      if (password) payload.password = password;
    } else if (extraOrName && typeof extraOrName === 'object') {
      payload = { ...payload, ...extraOrName };
    }
    const data = await apiPost<{ user: User; accessToken: string }>('/api/auth/verify-email-otp', payload);
    if (data.accessToken) {
      setAccessToken(data.accessToken);
    }
    set({ user: data.user, initialized: true, authStatus: 'authenticated', loading: false });
    return data.user;
  },

  resendEmailOTP: async (email, purpose = 'login') => {
    const res = await apiPost<{ cooldownSeconds: number; expiresInSeconds: number }>('/api/auth/resend-email-otp', { email, purpose });
    return res;
  },

  sendPhoneOTP: async (phone, purpose = 'login') => {
    const res = await apiPost<{ cooldownSeconds: number; expiresInSeconds: number }>('/api/auth/send-phone-otp', { phone, purpose });
    return res;
  },

  verifyPhoneOTP: async (phone, otp, name) => {
    const data = await apiPost<{ user: User; accessToken: string }>('/api/auth/verify-phone-otp', { phone, otp, name });
    if (data.accessToken) {
      setAccessToken(data.accessToken);
    }
    set({ user: data.user, initialized: true, authStatus: 'authenticated', loading: false });
    return data.user;
  },

  resendPhoneOTP: async (phone, purpose = 'login') => {
    const res = await apiPost<{ cooldownSeconds: number; expiresInSeconds: number }>('/api/auth/resend-phone-otp', { phone, purpose });
    return res;
  },

  login: async (identifier, password) => {
    const data = await apiPost<{ accessToken: string }>('/api/auth/login', { identifier, password });
    if (data?.accessToken) {
      setAccessToken(data.accessToken);
    }
    const me = await apiGet<{ user: User }>('/api/auth/me');
    set({ user: me.user, initialized: true, authStatus: 'authenticated', loading: false });
    return me.user;
  },

  register: async (payload) => {
    const data = await apiPost<{ user: User; accessToken?: string }>('/api/auth/register', payload);
    if (data?.accessToken) {
      setAccessToken(data.accessToken);
    }
    set({ user: data.user, initialized: true, authStatus: 'authenticated', loading: false });
    return data.user;
  },

  logout: async () => {
    try {
      await apiPost('/api/auth/logout');
    } catch {
      // ignore network errors on logout
    }
    setAccessToken(null);
    set({ user: null, initialized: true, authStatus: 'unauthenticated', loading: false });
  },

  loadMe: async () => {
    set({ loading: true });
    try {
      const me = await apiGet<{ user: User }>('/api/auth/me');
      set({ user: me.user, initialized: true, authStatus: 'authenticated', loading: false });
    } catch {
      setAccessToken(null);
      set({ user: null, initialized: true, authStatus: 'unauthenticated', loading: false });
    }
  },

  setUser: (user) => set({ user, authStatus: user ? 'authenticated' : 'unauthenticated' }),
}));
