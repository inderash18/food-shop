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

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

client.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
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
    return null;
  }
}

client.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ApiError>) => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;

    if (status === 401 && original && !original._retry && !String(original.url).includes('/auth/login') && !String(original.url).includes('/auth/refresh')) {
      original._retry = true;
      if (!refreshPromise) refreshPromise = tryRefresh();
      const token = await refreshPromise;
      refreshPromise = null;
      if (token) {
        return client(original);
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
  return (res.data as { data: T }).data;
}

export async function apiPost<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await client.post<T>(url, body, config);
  return (res.data as { data: T }).data;
}

export async function apiPatch<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await client.patch<T>(url, body, config);
  return (res.data as { data: T }).data;
}

export async function apiDelete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await client.delete<T>(url, config);
  return (res.data as { data: T }).data;
}

export default client;
