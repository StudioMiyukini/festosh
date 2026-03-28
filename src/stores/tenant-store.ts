import { create } from 'zustand';
import type { Festival, Edition } from '@/types/festival';
import type { FestivalRole } from '@/types/enums';

interface TenantState {
  /** The current festival resolved from hostname (null = platform mode) */
  festival: Festival | null;
  /** The active edition of the current festival */
  activeEdition: Edition | null;
  /** Current user's role in this festival */
  userRole: FestivalRole | null;
  /** Whether we're in a festival sub-site context */
  isFestivalContext: boolean;
  /** Whether tenant resolution is in progress */
  isResolving: boolean;
  /** Resolution error */
  error: string | null;

  // Actions
  setFestival: (festival: Festival | null) => void;
  setActiveEdition: (edition: Edition | null) => void;
  setUserRole: (role: FestivalRole | null) => void;
  setResolving: (resolving: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useTenantStore = create<TenantState>()((set) => ({
  festival: null,
  activeEdition: null,
  userRole: null,
  isFestivalContext: false,
  isResolving: true,
  error: null,

  setFestival: (festival) =>
    set({
      festival,
      isFestivalContext: !!festival,
      error: null,
    }),

  setActiveEdition: (activeEdition) => set({ activeEdition }),

  setUserRole: (userRole) => set({ userRole }),

  setResolving: (isResolving) => set({ isResolving }),

  setError: (error) => set({ error, isResolving: false }),

  reset: () =>
    set({
      festival: null,
      activeEdition: null,
      userRole: null,
      isFestivalContext: false,
      isResolving: false,
      error: null,
    }),
}));
