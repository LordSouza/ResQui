import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './assets/styles.css';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import { ToastProvider, useToast } from './components/ToastContext';
import { ToastContainer } from './components/ToastContainer';

function AppWithQuery() {
  const { addToast } = useToast();

  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { retry: 1, staleTime: 30_000 },
      mutations: {
        onError: (err) => addToast(err.message),
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
        <ToastContainer />
      </AuthProvider>
    </QueryClientProvider>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <AppWithQuery />
    </ToastProvider>
  </StrictMode>
);
