/**
 * Public boutique page — lists an exhibitor's online products in a grid.
 */

import { useEffect, useState } from 'react';
import { useOutletContext, useParams, Link } from 'react-router-dom';
import { Loader2, ShoppingCart, Package, Search, Plus } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useShopCartStore } from '@/stores/shop-cart-store';
import { formatCurrency } from '@/lib/format-utils';

interface ShopProduct {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  online_description: string | null;
  image_url: string | null;
  gallery_urls: string[];
  price_cents: number;
  tax_rate: number;
  stock_quantity: number;
  in_stock: boolean;
  category_id: string | null;
}

interface Catalog {
  products: ShopProduct[];
  categories: { id: string; name: string; sort_order: number }[];
  currency: string;
  shipping_cents: number;
  free_shipping_above_cents: number | null;
}

interface OutletCtx {
  exhibitor: {
    slug: string;
    company_name: string | null;
    trade_name: string | null;
    boutique_intro: string | null;
    boutique_currency: string | null;
  };
}

export function ExhibitorBoutiquePage() {
  const { slug } = useParams<{ slug: string }>();
  const { exhibitor } = useOutletContext<OutletCtx>();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const addItem = useShopCartStore((s) => s.addItem);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    api.get<Catalog>(`/public/exhibitors/by-slug/${slug}/products`).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) setCatalog(res.data as Catalog);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [slug]);

  const filtered = (catalog?.products || []).filter((p) => {
    if (categoryFilter && p.category_id !== categoryFilter) return false;
    if (query) {
      const q = query.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !(p.description || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleAdd = (p: ShopProduct) => {
    if (!slug) return;
    addItem(slug, {
      product_id: p.id,
      name: p.name,
      price_cents: p.price_cents,
      image_url: p.image_url,
      tax_rate: p.tax_rate,
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Boutique de {exhibitor.trade_name || exhibitor.company_name}
        </h1>
        {exhibitor.boutique_intro && (
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{exhibitor.boutique_intro}</p>
        )}
        {catalog?.free_shipping_above_cents && (
          <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
            Livraison offerte des {formatCurrency(catalog.free_shipping_above_cents)}
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un produit..."
            className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        {catalog && catalog.categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setCategoryFilter(null)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                categoryFilter === null ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              Tous
            </button>
            {catalog.categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryFilter(c.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  categoryFilter === c.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
          <Package className="mb-3 h-10 w-10 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">Aucun produit</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {catalog && catalog.products.length > 0
              ? 'Aucun produit ne correspond a votre recherche.'
              : 'La boutique sera bientot ouverte. Revenez plus tard !'}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <article key={p.id} className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md">
              <Link to={`/e/${slug}/p/${p.slug || p.id}`} className="block aspect-square overflow-hidden bg-muted">
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <Package className="h-12 w-12" />
                  </div>
                )}
              </Link>
              <div className="flex flex-1 flex-col p-4">
                <Link to={`/e/${slug}/p/${p.slug || p.id}`} className="line-clamp-2 text-sm font-medium text-foreground hover:text-primary">
                  {p.name}
                </Link>
                {p.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
                )}
                <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                  <div>
                    <p className="text-lg font-bold text-foreground">{formatCurrency(p.price_cents)}</p>
                    {!p.in_stock && <p className="text-[11px] font-medium text-red-600">Rupture</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAdd(p)}
                    disabled={!p.in_stock}
                    className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus className="h-3 w-3" /> Ajouter
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Floating cart button on mobile */}
      <Link
        to={`/e/${slug}/checkout`}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-105 md:hidden"
      >
        <ShoppingCart className="h-4 w-4" /> Voir le panier
      </Link>
    </div>
  );
}
