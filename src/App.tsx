import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from '@/config/query-client';
import { useAuthInit } from '@/hooks/use-auth';
import { useTenantInit } from '@/hooks/use-tenant';
import { useTenantStore } from '@/stores/tenant-store';
import { useAuthStore } from '@/stores/auth-store';
import { platformRouter, festivalRouter } from '@/router';
import { LoadingScreen } from '@/components/shared/LoadingScreen';

function AppContent() {
  // Initialize auth and tenant resolution
  useAuthInit();
  useTenantInit();

  const { isFestivalContext, isResolving: tenantResolving, error: tenantError } = useTenantStore();
  const { isLoading: authLoading } = useAuthStore();

  // Show loading screen while resolving
  if (authLoading || tenantResolving) {
    return <LoadingScreen />;
  }

  // Show error if festival not found
  if (tenantError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">Festival introuvable</h1>
          <p className="text-muted-foreground">{tenantError}</p>
          <a
            href={`${window.location.protocol}//festosh.${import.meta.env.VITE_APP_DOMAIN || 'miyukini.com'}`}
            className="inline-block text-primary hover:underline"
          >
            Retour à Festosh
          </a>
        </div>
      </div>
    );
  }

  // Render the appropriate router based on context
  return <RouterProvider router={isFestivalContext ? festivalRouter : platformRouter} />;
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
