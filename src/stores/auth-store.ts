import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PlatformRole, UserType, DocumentType, DocumentStatus } from '@/types/enums';

/** Minimal session info */
interface Session {
  user: { id: string };
}

export interface ExhibitorProfile {
  id: string;
  company_name: string | null;
  trade_name: string | null;
  activity_type: string | null;
  category: string | null;
  description: string | null;
  logo_url: string | null;
  website: string | null;
  social_links: string[];
  legal_form: string | null;
  registration_number: string | null;
  siret: string | null;
  vat_number: string | null;
  insurer_name: string | null;
  insurance_contract_number: string | null;
  contact_first_name: string | null;
  contact_last_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
}

export interface UserDocument {
  id: string;
  file_name: string;
  document_type: DocumentType;
  label: string | null;
  mime_type: string;
  size_bytes: number;
  status: DocumentStatus;
  review_notes?: string | null;
  created_at: number;
}

export interface Profile {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  birth_date: string | null;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  phone: string | null;
  platform_role: PlatformRole;
  user_type: UserType;
  volunteer_bio: string | null;
  volunteer_skills: string[];
  locale: string;
  timezone: string;
  exhibitor_profile?: ExhibitorProfile | null;
  documents?: UserDocument[];
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
        // Only persist minimal data
        profile: state.profile,
      }),
    }
  )
);
