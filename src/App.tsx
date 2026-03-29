import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from '@/config/query-client';
import { useAuthInit } from '@/hooks/use-auth';
import { useAuthStore } from '@/stores/auth-store';
import { router } from '@/router';
import { LoadingScreen } from '@/components/shared/LoadingScreen';

function AppContent() {
  useAuthInit();
  const { isLoading } = useAuthStore();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return <RouterProvider router={router} />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          duration: 4000,
        }}
      />
    </QueryClientProvider>
  );
}
