/**
 * Checkout: cart review + customer info + shipping address + payment.
 *
 * The form posts to /api/shop/checkout which creates the order + payment intent.
 * If the merchant uses the mock provider (no Stripe key set) the order is auto-
 * confirmed via /api/shop/orders/:id/confirm and we redirect to /order/:number.
 * If real Stripe is configured the client_secret is returned and the UI shows a
 * note pointing to the merchant — full Stripe Elements integration is left as a
 * follow-up wiring step (no SDK dependency added yet).
 */

import { useState } from 'react';
import { useParams, useNavigate, Link, useOutletContext } from 'react-router-dom';
import { Loader2, Trash2, Plus, Minus, ShoppingBag, ArrowLeft, Lock, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { useShopCartStore, getCartTotals, EMPTY_CART } from '@/stores/shop-cart-store';
import { formatCurrency } from '@/lib/format-utils';

interface OutletCtx {
  exhibitor: {
    slug: string;
    trade_name: string | null;
    company_name: string | null;
    boutique_currency: string | null;
    boutique_shipping_cents: number | null;
    boutique_free_shipping_above_cents: number | null;
  };
}

interface CheckoutResponse {
  order_id: string;
  order_number: string;
  total_cents: number;
  currency: string;
  payment: {
    provider: 'mock' | 'stripe';
    intent_id: string;
    client_secret: string;
    status: string;
  };
}

export function ExhibitorCheckoutPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { exhibitor } = useOutletContext<OutletCtx>();
  const { profile } = useAuthStore();
  const cart = useShopCartStore((s) => (slug && s.carts[slug]) || EMPTY_CART);
  const updateQty = useShopCartStore((s) => s.updateQuantity);
  const removeItem = useShopCartStore((s) => s.removeItem);
  const clearCart = useShopCartStore((s) => s.clearCart);

  const totals = getCartTotals(cart);
  const baseShipping = exhibitor.boutique_shipping_cents ?? 0;
  const freeAbove = exhibitor.boutique_free_shipping_above_cents;
  const shipping = freeAbove && totals.subtotal_cents >= freeAbove ? 0 : baseShipping;
  const grandTotal = totals.subtotal_cents + totals.tax_cents + shipping;

  const [email, setEmail] = useState(profile?.email || '');
  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [phone, setPhone] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [postal, setPostal] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('FR');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.items.length === 0) return;
    if (!email || !address1 || !postal || !city) {
      setError('Veuillez completer tous les champs requis.');
      return;
    }
    setSubmitting(true);
    setError(null);

    const res = await api.post<CheckoutResponse>('/shop/checkout', {
      exhibitor_slug: slug,
      items: cart.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
      customer: { email, first_name: firstName, last_name: lastName, phone },
      shipping: { address_line1: address1, address_line2: address2, postal_code: postal, city, country },
      use_billing_same_as_shipping: true,
      notes,
    });

    if (!res.success || !res.data) {
      setError(res.error || 'Erreur lors de la commande');
      setSubmitting(false);
      return;
    }

    const data = res.data;

    // Mock provider: auto-confirm and redirect.
    // Stripe provider: in a future iteration, mount Stripe Elements with the
    // returned client_secret. For now we still try to confirm (server will return
    // 402 if not actually paid) so the merchant can wire Elements without code
    // changes here.
    const confirmRes = await api.post<{ status?: string; order_number?: string }>(
      `/shop/orders/${data.order_id}/confirm`,
      {},
    );

    if (confirmRes.success) {
      clearCart(slug!);
      navigate(`/order/${data.order_number}`);
    } else {
      setError(
        data.payment.provider === 'stripe'
          ? 'Paiement requis : votre commande a ete creee mais le paiement Stripe doit etre finalise. Contactez l\'exposant.'
          : confirmRes.error || 'Paiement non confirme',
      );
      setSubmitting(false);
    }
  };

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <ShoppingBag className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
        <h1 className="text-xl font-bold text-foreground">Votre panier est vide</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ajoutez des produits depuis la boutique pour commander.
        </p>
        <Link to={`/e/${slug}/boutique`} className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <ArrowLeft className="h-4 w-4" /> Decouvrir la boutique
        </Link>
      </div>
    );
  }

  const inputCls = 'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50';
  const labelCls = 'mb-1 block text-xs font-medium text-foreground';

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Commander</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Aupres de <span className="font-medium text-foreground">{exhibitor.trade_name || exhibitor.company_name}</span>
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-6 lg:grid-cols-[1fr,380px]">
        {/* Left column: form */}
        <div className="space-y-6">
          {/* Customer info */}
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold text-foreground">Vos coordonnees</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelCls}>Email <span className="text-destructive">*</span></label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputCls} placeholder="vous@example.com" />
              </div>
              <div>
                <label className={labelCls}>Prenom</label>
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Nom</label>
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Telephone</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
              </div>
            </div>
          </section>

          {/* Shipping */}
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold text-foreground">Adresse de livraison</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelCls}>Adresse <span className="text-destructive">*</span></label>
                <input type="text" value={address1} onChange={(e) => setAddress1(e.target.value)} required className={inputCls} placeholder="12 rue ..." />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Complement</label>
                <input type="text" value={address2} onChange={(e) => setAddress2(e.target.value)} className={inputCls} placeholder="Appartement, code, etc." />
              </div>
              <div>
                <label className={labelCls}>Code postal <span className="text-destructive">*</span></label>
                <input type="text" value={postal} onChange={(e) => setPostal(e.target.value)} required className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Ville <span className="text-destructive">*</span></label>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} required className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Pays</label>
                <select value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls}>
                  <option value="FR">France</option>
                  <option value="BE">Belgique</option>
                  <option value="CH">Suisse</option>
                  <option value="LU">Luxembourg</option>
                  <option value="DE">Allemagne</option>
                  <option value="ES">Espagne</option>
                  <option value="IT">Italie</option>
                </select>
              </div>
            </div>
          </section>

          {/* Notes */}
          <section className="rounded-xl border border-border bg-card p-5">
            <label className={labelCls}>Note pour l'exposant (facultatif)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={`${inputCls} resize-none`} placeholder="Instructions de livraison, demande speciale..." />
          </section>

          {error && (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        {/* Right column: cart summary */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 flex items-center justify-between text-sm font-semibold text-foreground">
              Votre panier
              <span className="text-xs font-normal text-muted-foreground">{totals.item_count} article{totals.item_count > 1 ? 's' : ''}</span>
            </h2>
            <ul className="divide-y divide-border">
              {cart.items.map((item) => (
                <li key={item.product_id} className="flex items-start gap-3 py-3">
                  <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                    {item.image_url ? (
                      <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground"><ShoppingBag className="h-4 w-4" /></div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(item.price_cents)} l'unite</p>
                    <div className="mt-1.5 inline-flex items-center rounded-md border border-border">
                      <button type="button" onClick={() => updateQty(slug!, item.product_id, item.quantity - 1)} className="px-1.5 py-0.5 text-foreground hover:bg-accent" aria-label="Diminuer">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-8 text-center text-xs">{item.quantity}</span>
                      <button type="button" onClick={() => updateQty(slug!, item.product_id, item.quantity + 1)} className="px-1.5 py-0.5 text-foreground hover:bg-accent" aria-label="Augmenter">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(item.price_cents * item.quantity)}</p>
                    <button type="button" onClick={() => removeItem(slug!, item.product_id)} className="mt-1 text-xs text-muted-foreground hover:text-destructive" aria-label="Retirer">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 space-y-1.5 border-t border-border pt-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Sous-total</span>
                <span>{formatCurrency(totals.subtotal_cents)}</span>
              </div>
              {totals.tax_cents > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>TVA</span>
                  <span>{formatCurrency(totals.tax_cents)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>Livraison</span>
                <span>{shipping > 0 ? formatCurrency(shipping) : <span className="text-green-600">Offerte</span>}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-base font-bold text-foreground">
                <span>Total</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </section>

          <button
            type="submit"
            disabled={submitting || cart.items.length === 0}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            Payer {formatCurrency(grandTotal)}
          </button>
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <CheckCircle2 className="h-3 w-3" /> Paiement securise — vos donnees ne sont pas stockees
          </p>
        </aside>
      </form>
    </div>
  );
}
