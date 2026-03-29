import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTenantStore } from '@/stores/tenant-store';
import { useAuthStore } from '@/stores/auth-store';
import { festivalService, editionService } from '@/services/festival.service';

/**
 * Loads festival data from the :slug URL param and populates tenant store.
 * Used by FestivalPublicLayout and FestivalAdminLayout.
 */
export function useFestivalContext() {
  const { slug } = useParams<{ slug: string }>();
  const { festival, isResolving, error, setFestival, setActiveEdition, setUserRole, setResolving, setError } = useTenantStore();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!slug) return;

    // Don't refetch if same festival is already loaded
    if (festival?.slug === slug && !isResolving) return;

    setResolving(true);

    festivalService.getBySlug(slug).then(async (result) => {
      if (result.error || !result.data) {
        setError(`Festival "${slug}" introuvable`);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, user?.id]);

  return { festival, isResolving, error, slug: slug ?? '' };
}
