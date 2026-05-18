/**
 * Order confirmation page, accessible by order number (no auth required).
 * Customers reach this after a successful checkout; they can also bookmark the URL
 * to track their order status.
 */

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, CheckCircle2, Truck, Package, Clock, XCircle, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api-client';
import { formatCurrency, formatTimestamp } from '@/lib/format-utils';

interface OrderItem {
  id: string; product_name: string; quantity: number;
  unit_price_cents: number; subtotal_cents: number;
}
interface Order {
  id: string; order_number: string; status: string;
  customer_email: string; customer_first_name: string | null; customer_last_name: string | null;
  shipping_address_line1: string | null; shipping_postal_code: string | null; shipping_city: string | null;
  subtotal_cents: number; shipping_cents: number; tax_cents: number; total_cents: number; currency: string;
  tracking_url: string | null;
  created_at: number; paid_at: number | null; shipped_at: number | null;
  items: OrderItem[];
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'En attente de paiement', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
  paid: { label: 'Paiement confirme', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2 },
  fulfilled: { label: 'Commande preparee', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Package },
  shipped: { label: 'Expediee', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', icon: Truck },
  delivered: { label: 'Livree', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2 },
  cancelled: { label: 'Annulee', color: 'bg-gray-100 text-gray-600', icon: XCircle },
  refunded: { label: 'Remboursee', color: 'bg-gray-100 text-gray-600', icon: XCircle },
};

const STEPS: { key: string; label: string; icon: typeof Clock }[] = [
  { key: 'paid', label: 'Paiement', icon: CheckCircle2 },
  { key: 'fulfilled', label: 'Preparation', icon: Package },
  { key: 'shipped', label: 'Expedition', icon: Truck },
  { key: 'delivered', label: 'Livraison', icon: CheckCircle2 },
];

export function OrderConfirmationPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderNumber) return;
    api.get<Order>(`/shop/orders/by-number/${orderNumber}`).then((res) => {
      if (res.success && res.data) setOrder(res.data as Order);
      setLoading(false);
    });
  }, [orderNumber]);

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-foreground">Commande introuvable</h1>
        <Link to="/" className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <ArrowLeft className="h-4 w-4" /> Accueil
        </Link>
      </div>
    );
  }

  const status = STATUS_LABELS[order.status] || STATUS_LABELS.pending;
  const StatusIcon = status.icon;
  const reachedIndex = STEPS.findIndex((s) => s.key === order.status);
  const progress = order.status === 'pending' ? -1 : reachedIndex >= 0 ? reachedIndex : 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="text-center">
        <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Merci pour votre commande !</h1>
        <p className="mt-1 text-sm text-muted-foreground">Un email de confirmation a ete envoye a <span className="font-medium text-foreground">{order.customer_email}</span></p>
        <p className="mt-2 font-mono text-xs text-muted-foreground">Reference : {order.order_number}</p>
      </header>

      {/* Status + tracker */}
      <section className="mt-8 rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${status.color}`}>
            <StatusIcon className="h-4 w-4" /> {status.label}
          </span>
          <span className="text-xs text-muted-foreground">{formatTimestamp(order.created_at)}</span>
        </div>
        {order.status !== 'cancelled' && order.status !== 'refunded' && (
          <ol className="relative grid grid-cols-4 gap-2">
            <div className="absolute left-0 right-0 top-3 h-0.5 bg-muted" />
            <div
              className="absolute left-0 top-3 h-0.5 bg-primary transition-all"
              style={{ width: progress >= 0 ? `${((progress + 1) / STEPS.length) * 100}%` : '0%' }}
            />
            {STEPS.map((step, i) => {
              const done = progress >= i;
              const Icon = step.icon;
              return (
                <li key={step.key} className="relative flex flex-col items-center text-center">
                  <span className={`relative z-10 inline-flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-card ${done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    <Icon className="h-3 w-3" />
                  </span>
                  <span className={`mt-1.5 text-[11px] font-medium ${done ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</span>
                </li>
              );
            })}
          </ol>
        )}
        {order.tracking_url && (
          <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
            <Truck className="h-4 w-4" /> Suivre l'envoi
          </a>
        )}
      </section>

      {/* Items */}
      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Recapitulatif</h2>
        <ul className="divide-y divide-border">
          {order.items.map((it) => (
            <li key={it.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <p className="font-medium text-foreground">{it.product_name}</p>
                <p className="text-xs text-muted-foreground">{it.quantity} × {formatCurrency(it.unit_price_cents)}</p>
              </div>
              <p className="font-semibold text-foreground">{formatCurrency(it.subtotal_cents)}</p>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
          <div className="flex justify-between text-muted-foreground"><dt>Sous-total</dt><dd>{formatCurrency(order.subtotal_cents)}</dd></div>
          {order.tax_cents > 0 && <div className="flex justify-between text-muted-foreground"><dt>TVA</dt><dd>{formatCurrency(order.tax_cents)}</dd></div>}
          <div className="flex justify-between text-muted-foreground"><dt>Livraison</dt><dd>{order.shipping_cents > 0 ? formatCurrency(order.shipping_cents) : <span className="text-green-600">Offerte</span>}</dd></div>
          <div className="flex justify-between border-t border-border pt-2 text-base font-bold text-foreground"><dt>Total</dt><dd>{formatCurrency(order.total_cents)}</dd></div>
        </dl>
      </section>

      {/* Shipping address */}
      {order.shipping_address_line1 && (
        <section className="mt-6 rounded-xl border border-border bg-card p-5">
          <h2 className="mb-2 text-sm font-semibold text-foreground">Adresse de livraison</h2>
          <p className="text-sm text-foreground">
            {order.customer_first_name} {order.customer_last_name}<br />
            {order.shipping_address_line1}<br />
            {order.shipping_postal_code} {order.shipping_city}
          </p>
        </section>
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Gardez cette page en favori pour suivre votre commande. Pour toute question, contactez directement l'exposant.
      </p>
    </div>
  );
}
