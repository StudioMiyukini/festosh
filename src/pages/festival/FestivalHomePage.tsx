import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useTenantStore } from '@/stores/tenant-store';
import { api } from '@/lib/api-client';
import { BlockRenderer } from '@/features/cms/components/BlockRenderer';
import type { CmsPage, CmsBlock } from '@/types/cms';

interface CmsPageWithBlocks extends CmsPage {
  blocks: CmsBlock[];
}

export function FestivalHomePage() {
  const { festival } = useTenantStore();

  const [page, setPage] = useState<CmsPageWithBlocks | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!festival?.id) return;

    setLoading(true);

    // Fetch the CMS homepage (slug = "accueil")
    api
      .get<CmsPageWithBlocks>(
        `/cms/festival/${festival.id}/pages/by-slug/accueil`
      )
      .then((res) => {
        if (res.success && res.data) {
          setPage(res.data);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [festival?.id]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No CMS page found — show minimal fallback
  if (!page || !page.blocks || page.blocks.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {festival?.name ?? 'Festival'}
          </h1>
          {festival?.description && (
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              {festival.description}
            </p>
          )}
        </div>
      </div>
    );
  }

  const sortedBlocks = [...page.blocks]
    .filter((b) => b.is_visible !== false)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div>
      {sortedBlocks.map((block) => (
        <BlockRenderer key={block.id} block={block} />
      ))}
    </div>
  );
}
