import { useEffect } from 'react';
import { useTenantStore } from '@/stores/tenant-store';
import { useAuthStore } from '@/stores/auth-store';
import { festivalService, editionService } from '@/services/festival.service';

const APP_DOMAIN = import.meta.env.VITE_APP_DOMAIN || 'festosh.net';

/**
 * Resolves the current tenant (festival) from the hostname.
 *
 * Hostname patterns:
 * - `festosh.net` or `localhost` → Platform mode (no festival)
 * - `{slug}.festosh.net` → Festival sub-site mode
 * - `localhost?festival={slug}` → Festival mode in dev
 *
 * Call this ONCE in App.tsx. Other components use useTenantStore() directly.
 */
export function useTenantInit() {
  const { setFestival, setActiveEdition, setUserRole, setResolving, setError } = useTenantStore();
  const { user } = useAuthStore();

  useEffect(() => {
    const hostname = window.location.hostname;
    const slug = extractSlugFromHostname(hostname);

    if (!slug) {
      setFestival(null);
      setResolving(false);
      return;
    }

    setResolving(true);

    festivalService.getBySlug(slug).then(async (result) => {
      if (result.error || !result.data) {
        setError(`Festival "${slug}" not found`);
        return;
      }

      setFestival(result.data);

      // Load active edition
      const editionResult = await editionService.getActive(result.data.id);
      if (editionResult.data) {
        setActiveEdition(editionResult.data);
      }

      // Resolve user's role in this festival
      if (user) {
        const roleResult = await festivalService.getUserRole(result.data.id);
        if (roleResult.data) {
          setUserRole(roleResult.data as never);
        }
      }

      setResolving(false);
    });
  }, [user, setFestival, setActiveEdition, setUserRole, setResolving, setError]);
}

function extractSlugFromHostname(hostname: string): string | null {
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const params = new URLSearchParams(window.location.search);
    return params.get('festival');
  }

  if (hostname === `festosh.${APP_DOMAIN}` || hostname === APP_DOMAIN) {
    return null;
  }

  if (hostname.endsWith(`.${APP_DOMAIN}`)) {
    const slug = hostname.replace(`.${APP_DOMAIN}`, '');
    const reserved = ['www', 'api', 'app', 'admin', 'mail', 'festosh'];
    if (reserved.includes(slug)) return null;
    return slug;
  }

  return null;
}
