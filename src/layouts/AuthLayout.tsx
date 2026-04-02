import { Outlet } from 'react-router-dom';
import { Logo } from '@/components/shared/Logo';

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo className="scale-125" />
        </div>
        <div className="rounded-xl border border-border bg-card p-8 shadow-lg">
          <Outlet />
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          &copy; 2026 Festosh. Tous droits reserves.
        </p>
      </div>
    </div>
  );
}
