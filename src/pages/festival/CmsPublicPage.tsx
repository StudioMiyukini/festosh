import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, FileQuestion } from 'lucide-react';
import { useTenantStore } from '@/stores/tenant-store';
import { api } from '@/lib/api-client';
import { BlockRenderer } from '@/features/cms/components/BlockRenderer';
import type { CmsPage, CmsBlock } from '@/types/cms';

interface CmsPageWithBlocks extends CmsPage {
  blocks: CmsBlock[];
}

export function CmsPublicPage() {
  const { pageSlug } = useParams<{ pageSlug: string }>();
  const { festival } = useTenantStore();

  const [page, setPage] = useState<CmsPageWithBlocks | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!festival?.id || !pageSlug) return;

    setLoading(true);
    setNotFound(false);

    api
      .get<CmsPageWithBlocks>(
        `/cms/festival/${festival.id}/pages/by-slug/${pageSlug}`
      )
      .then((res) => {
        if (res.success && res.data) {
          setPage(res.data);
        } else {
          setNotFound(true);
        }
      })
      .catch(() => {
        setNotFound(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [festival?.id, pageSlug]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <FileQuestion className="mb-4 h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold text-foreground">Page introuvable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          La page que vous recherchez n'existe pas ou a ete supprimee.
        </p>
      </div>
    );
  }

  const sortedBlocks = [...page.blocks].sort(
    (a, b) => a.sort_order - b.sort_order
  );

  return (
    <div>
      <div className="mx-auto max-w-4xl px-4 pt-12 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {page.title}
        </h1>
      </div>

      <div className="pb-16">
        {sortedBlocks.map((block) => (
          <BlockRenderer key={block.id} block={block} />
        ))}
      </div>
    </div>
  );
}
