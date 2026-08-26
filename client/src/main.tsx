import { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { useAuthStore } from './stores/auth';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000, // 30s cache freshness for near-instant navigation
      gcTime: 5 * 60_000, // Keep in memory for 5 minutes
    },
  },
});

function AuthBootstrap() {
  const initialized = useAuthStore((s) => s.initialized);
  const loadMe = useAuthStore((s) => s.loadMe);

  useEffect(() => {
    if (!window.location.pathname.startsWith('/admin')) {
      if (!initialized) loadMe();
    }
  }, [initialized, loadMe]);

  return null;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthBootstrap />
      <App />
    </BrowserRouter>
  </QueryClientProvider>
);
