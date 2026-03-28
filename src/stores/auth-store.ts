import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PlatformRole } from '@/types/enums';

/** Minimal session info (replaces Supabase Session) */
interface Session {
  user: { id: string };
}

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  platform_role: PlatformRole;
  locale: string;
  timezone: string;
}

interface AuthState {
  session: Session | null;
  user: { id: string } | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      user: null,
      profile: null,
      isLoading: true,
      isAuthenticated: false,

      setSession: (session) =>
        set({
          session,
          user: session?.user ?? null,
          isAuthenticated: !!session,
        }),

      setProfile: (profile) => set({ profile }),

      setLoading: (isLoading) => set({ isLoading }),

      reset: () =>
        set({
          session: null,
          user: null,
          profile: null,
          isLoading: false,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'festosh-auth',
      partialize: (state) => ({
        // Only persist minimal data, session is managed by Supabase
        profile: state.profile,
      }),
    }
  )
);
