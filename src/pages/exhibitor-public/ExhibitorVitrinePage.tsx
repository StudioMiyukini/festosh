/**
 * Public vitrine of an exhibitor. Renders the CMS blocks of their `accueil` page,
 * with a graceful fallback when no page is published yet.
 */

import { useEffect, useState } from 'react';
import { useOutletContext, Link, useParams } from 'react-router-dom';
import { Loader2, ShoppingBag, Globe } from 'lucide-react';
import { api } from '@/lib/api-client';
import { BlockRenderer } from '@/features/cms/components/BlockRenderer';
import type { CmsBlock } from '@/types/cms';

interface VitrinePage {
  id: string;
  title: string;
  blocks: CmsBlock[];
}

interface OutletCtx {
  exhibitor: {
    slug: string;
    company_name: string | null;
    trade_name: string | null;
    description: string | null;
    photo_url: string | null;
    logo_url: string | null;
    website: string | null;
    domains: string[];
    boutique_enabled: number;
    vitrine_page_id: string | null;
    social_links: Record<string, string>;
  };
}

export function ExhibitorVitrinePage() {
  const { slug } = useParams<{ slug: string }>();
  const { exhibitor } = useOutletContext<OutletCtx>();
  const [page, setPage] = useState<VitrinePage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api.get<VitrinePage>(`/cms/exhibitor/by-slug/${slug}/pages/accueil`).then((res) => {
      if (res.success && res.data) setPage(res.data as VitrinePage);
      setLoading(false);
    });
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const displayName = exhibitor.trade_name || exhibitor.company_name || 'Exposant';

  // Fallback hero when no CMS page exists yet
  if (!page) {
    return (
      <>
        <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/5 via-background to-background">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
            <div className="grid items-center gap-8 md:grid-cols-[1fr,auto]">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
                  {displayName}
                </h1>
                {exhibitor.description && (
                  <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
                    {exhibitor.description}
                  </p>
                )}
                <div className="mt-6 flex flex-wrap gap-2">
                  {exhibitor.boutique_enabled === 1 && (
                    <Link
                      to={`/e/${slug}/boutique`}
                      className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
                    >
                      <ShoppingBag className="h-4 w-4" /> Voir la boutique
                    </Link>
                  )}
                  {exhibitor.website && (
                    <a
                      href={exhibitor.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
                    >
                      <Globe className="h-4 w-4" /> Site officiel
                    </a>
                  )}
                </div>
                {exhibitor.domains.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {exhibitor.domains.map((d) => (
                      <span key={d} className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
                        {d}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {(exhibitor.photo_url || exhibitor.logo_url) && (
                <div className="hidden md:block">
                  <img
                    src={exhibitor.photo_url || exhibitor.logo_url || ''}
                    alt=""
                    className="h-48 w-48 rounded-2xl object-cover ring-1 ring-border lg:h-64 lg:w-64"
                  />
                </div>
              )}
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6 lg:px-8">
          <p className="text-sm text-muted-foreground">
            Cette vitrine sera bientot enrichie. Revenez plus tard pour decouvrir notre univers !
          </p>
        </section>
      </>
    );
  }

  const sorted = [...page.blocks].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  return (
    <article className="pb-16">
      {sorted.map((block) => (
        <BlockRenderer key={block.id} block={block} />
      ))}
    </article>
  );
}
