/**
 * Public product detail. Shows image gallery, description, quantity selector,
 * "Add to cart" CTA. Stock-aware.
 */

import { useEffect, useState } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import { Loader2, Package, Plus, Minus, ShoppingCart, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useShopCartStore } from '@/stores/shop-cart-store';
import { formatCurrency } from '@/lib/format-utils';

interface ShopProduct {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  online_description: string | null;
  sku: string | null;
  image_url: string | null;
  gallery_urls: string[];
  price_cents: number;
  tax_rate: number;
  stock_quantity: number;
  in_stock: boolean;
  weight_grams: number | null;
}

interface OutletCtx {
  exhibitor: {
    slug: string;
    trade_name: string | null;
    company_name: string | null;
  };
}

export function ExhibitorProductPage() {
  const { slug, productSlug } = useParams<{ slug: string; productSlug: string }>();
  const { exhibitor } = useOutletContext<OutletCtx>();
  const [product, setProduct] = useState<ShopProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState(false);
  const addItem = useShopCartStore((s) => s.addItem);

  useEffect(() => {
    if (!slug || !productSlug) return;
    setLoading(true);
    setNotFound(false);
    api.get<ShopProduct>(`/public/exhibitors/by-slug/${slug}/products/${productSlug}`).then((res) => {
      if (res.success && res.data) {
        setProduct(res.data as ShopProduct);
        setActiveImage((res.data as ShopProduct).image_url);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    });
  }, [slug, productSlug]);

  const handleAdd = () => {
    if (!product || !slug) return;
    addItem(slug, {
      product_id: product.id,
      name: product.name,
      price_cents: product.price_cents,
      image_url: product.image_url,
      tax_rate: product.tax_rate,
    }, quantity);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (notFound || !product) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <h1 className="text-xl font-bold text-foreground">Produit introuvable</h1>
        <Link to={`/e/${slug}/boutique`} className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <ArrowLeft className="h-4 w-4" /> Retour a la boutique
        </Link>
      </div>
    );
  }

  const allImages = [product.image_url, ...(product.gallery_urls || [])].filter(Boolean) as string[];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to={`/e/${slug}/boutique`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour a la boutique
      </Link>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Images */}
        <div>
          <div className="aspect-square overflow-hidden rounded-xl border border-border bg-muted">
            {activeImage ? (
              <img src={activeImage} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center"><Package className="h-16 w-16 text-muted-foreground" /></div>
            )}
          </div>
          {allImages.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {allImages.map((url) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setActiveImage(url)}
                  className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border-2 transition-colors ${activeImage === url ? 'border-primary' : 'border-transparent hover:border-border'}`}
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <p className="text-xs text-muted-foreground">{exhibitor.trade_name || exhibitor.company_name}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{product.name}</h1>
          {product.sku && <p className="mt-1 text-[11px] font-mono text-muted-foreground">Ref. {product.sku}</p>}

          <p className="mt-4 text-3xl font-bold text-foreground">{formatCurrency(product.price_cents)}</p>
          {product.tax_rate > 0 && <p className="text-xs text-muted-foreground">TVA {(product.tax_rate * 100).toFixed(0)}% incluse</p>}

          <div className="mt-4 flex items-center gap-2">
            {product.in_stock ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <CheckCircle2 className="h-3 w-3" /> En stock {product.stock_quantity > 0 && product.stock_quantity <= 5 && `(${product.stock_quantity} restants)`}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                Rupture de stock
              </span>
            )}
          </div>

          {product.description && (
            <div className="mt-6 prose prose-sm dark:prose-invert max-w-none text-foreground">
              <p>{product.description}</p>
            </div>
          )}

          {product.online_description && (
            <div className="mt-4 rounded-xl bg-muted/50 p-4 text-sm text-foreground" dangerouslySetInnerHTML={{ __html: product.online_description }} />
          )}

          {/* Qty + add to cart */}
          {product.in_stock && (
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">Quantite :</span>
                <div className="inline-flex items-center rounded-md border border-border">
                  <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-2 py-1.5 text-foreground hover:bg-accent">
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-10 text-center text-sm font-medium">{quantity}</span>
                  <button type="button" onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))} className="px-2 py-1.5 text-foreground hover:bg-accent">
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAdd}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <ShoppingCart className="h-4 w-4" />
                {justAdded ? 'Ajoute au panier !' : `Ajouter au panier (${formatCurrency(product.price_cents * quantity)})`}
              </button>
              <Link to={`/e/${slug}/checkout`} className="block text-center text-xs text-muted-foreground hover:text-primary hover:underline">
                Voir le panier et commander
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
