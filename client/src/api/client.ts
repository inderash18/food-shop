import axios, { AxiosError, AxiosRequestConfig } from 'axios';

export interface ApiError {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

const baseURL = import.meta.env.VITE_API_URL ?? '';

const client = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 20000,
});

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;
let adminRefreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
  if (token) {
    sessionStorage.setItem('studentAccessToken', token);
  } else {
    sessionStorage.removeItem('studentAccessToken');
  }
}

export function getAccessToken(): string | null {
  if (!accessToken) {
    accessToken = sessionStorage.getItem('studentAccessToken') || sessionStorage.getItem('adminAccessToken') || localStorage.getItem('token') || null;
  }
  return accessToken;
}

export function getAdminToken(): string | null {
  return sessionStorage.getItem('adminAccessToken') || sessionStorage.getItem('studentAccessToken') || localStorage.getItem('token') || accessToken || null;
}

export function setAdminToken(token: string | null): void {
  if (token) {
    sessionStorage.setItem('adminAccessToken', token);
  } else {
    sessionStorage.removeItem('adminAccessToken');
  }
}

client.interceptors.request.use((config) => {
  const url = config.url || '';
  const isAdminRequest = url.includes('/admin') || url.startsWith('/api/admin');

  const token = isAdminRequest
    ? (getAdminToken() || getAccessToken())
    : (getAccessToken() || getAdminToken());

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

async function tryRefresh(): Promise<string | null> {
  try {
    const res = await axios.post(`${baseURL}/api/auth/refresh`, undefined, { withCredentials: true, timeout: 10000 });
    const token = res.data?.data?.accessToken as string;
    if (token) setAccessToken(token);
    return token;
  } catch {
    setAccessToken(null);
    return null;
  }
}

async function tryAdminRefresh(): Promise<string | null> {
  try {
    const res = await axios.post(`${baseURL}/api/admin/refresh`, undefined, { withCredentials: true, timeout: 10000 });
    const token = res.data?.data?.accessToken as string;
    if (token) setAdminToken(token);
    return token;
  } catch {
    setAdminToken(null);
    return null;
  }
}

client.interceptors.response.use(
  (res) => {
    const newToken = res.headers?.['x-new-access-token'] || res.headers?.['X-New-Access-Token'];
    if (newToken) {
      const url = res.config?.url || '';
      if (url.includes('/admin') || url.startsWith('/api/admin')) {
        setAdminToken(newToken);
      } else {
        setAccessToken(newToken);
      }
    }
    return res;
  },
  async (error: AxiosError<ApiError>) => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;
    const url = original?.url || '';

    if (
      status === 401 &&
      original &&
      !original._retry &&
      !url.includes('/auth/login') &&
      !url.includes('/admin/login') &&
      !url.includes('/auth/refresh') &&
      !url.includes('/admin/refresh')
    ) {
      original._retry = true;
      const isAdminRoute = url.includes('/admin') || url.startsWith('/api/admin');

      if (isAdminRoute) {
        if (!adminRefreshPromise) adminRefreshPromise = tryAdminRefresh();
        const token = await adminRefreshPromise;
        adminRefreshPromise = null;
        if (token) {
          original.headers = original.headers || {};
          original.headers.Authorization = `Bearer ${token}`;
          return client(original);
        }
      } else {
        if (!refreshPromise) refreshPromise = tryRefresh();
        const token = await refreshPromise;
        refreshPromise = null;
        if (token) {
          original.headers = original.headers || {};
          original.headers.Authorization = `Bearer ${token}`;
          return client(original);
        }
      }
    }

    return Promise.reject(error);
  }
);

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiError | undefined;
    if (data?.error?.message) return data.error.message;
    if (err.code === 'ECONNABORTED') return 'Request timed out. Please try again.';
    if (!err.response) return 'Connection interrupted. Please check your network.';
  }
  return 'Something went wrong. Please try again.';
}

export function getErrorCode(err: unknown): string | undefined {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as ApiError | undefined)?.error?.code;
  }
  return undefined;
}

export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await client.get<T>(url, config);
  const body = res.data as any;
  if (body && typeof body === 'object' && 'data' in body) {
    return body.data as T;
  }
  return body as T;
}

export async function apiPost<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await client.post<T>(url, body, config);
  const resBody = res.data as any;
  if (resBody && typeof resBody === 'object' && 'data' in resBody) {
    return resBody.data as T;
  }
  return resBody as T;
}

export async function apiPatch<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await client.patch<T>(url, body, config);
  const resBody = res.data as any;
  if (resBody && typeof resBody === 'object' && 'data' in resBody) {
    return resBody.data as T;
  }
  return resBody as T;
}

export async function apiDelete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await client.delete<T>(url, config);
  const resBody = res.data as any;
  if (resBody && typeof resBody === 'object' && 'data' in resBody) {
    return resBody.data as T;
  }
  return resBody as T;
}

export default client;
