import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { authService } from '@/services/auth.service';
import { api } from '@/lib/api-client';

/**
 * Main auth hook - checks for existing JWT token on mount.
 * Call this ONCE in App.tsx. Other components should use useAuthStore() directly.
 */
export function useAuthInit() {
  const { setSession, setProfile, setLoading, reset } = useAuthStore();

  useEffect(() => {
    const token = api.getToken();

    if (!token) {
      setLoading(false);
      return;
    }

    // Validate token by fetching profile
    authService.getProfile().then((result) => {
      if (result.data) {
        setSession({ user: { id: result.data.id } } as never);
        setProfile(result.data);
      } else {
        // Token invalid, clear it
        api.setToken(null);
        reset();
      }
      setLoading(false);
    });
  }, [setSession, setProfile, setLoading, reset]);
}

/** Convenience hook for auth actions */
export function useAuth() {
  const store = useAuthStore();

  return {
    ...store,
    signIn: async (email: string, password: string) => {
      const result = await authService.signIn(email, password);
      if (result.data) {
        // Reload profile after sign in
        const profileResult = await authService.getProfile();
        if (profileResult.data) {
          store.setSession({ user: { id: profileResult.data.id } } as never);
          store.setProfile(profileResult.data);
        }
      }
      return result;
    },
    signUp: async (email: string, password: string, username: string) => {
      const result = await authService.signUp(email, password, username);
      if (result.data) {
        const profileResult = await authService.getProfile();
        if (profileResult.data) {
          store.setSession({ user: { id: profileResult.data.id } } as never);
          store.setProfile(profileResult.data);
        }
      }
      return result;
    },
    signOut: async () => {
      await authService.signOut();
      store.reset();
    },
  };
}
