import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Loader2,
  FileText,
  ClipboardList,
  Receipt,
  Upload,
  CalendarClock,
  AlertTriangle,
  X,
  Check,
  Eye,
  Shield,
  Store,
  ShoppingCart,
  BarChart3,
  Building2,
  Save,
  MapPin,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  FileDown,
  Globe,
  Briefcase,
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  Wallet,
  Package,
  ArrowUpRight,
  Bell,
  Target,
  PiggyBank,
  Sparkles,
  Layout,
  ShoppingBag,
  Truck,
  Copy,
  Edit2,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatTimestamp, formatCurrency } from '@/lib/format-utils';
import { EmptyState } from '@/components/shared/EmptyState';
import { EXHIBITOR_DOMAINS } from '@/lib/exhibitor-domains';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExhibitorProfile {
  id: string;
  slug: string | null;
  company_name: string | null;
  trade_name: string | null;
  description: string | null;
  logo_url: string | null;
  website: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  siret: string | null;
  vat_number: string | null;
  activity_type: string | null;
  category: string | null;
  domains: string[];
  is_pmr: number | null;
  address_line1: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  boutique_enabled: number | null;
  boutique_intro: string | null;
  boutique_currency: string | null;
  boutique_shipping_cents: number | null;
  boutique_free_shipping_above_cents: number | null;
  vitrine_page_id: string | null;
}

interface MyDocument {
  id: string;
  file_name: string;
  document_type: string;
  status: string;
  label: string | null;
  expires_at: number | null;
  created_at: number;
  is_expiring_soon: boolean;
  is_expired: boolean;
  days_until_expiry: number | null;
}

interface MyApplication {
  id: string;
  edition_id: string;
  status: string;
  created_at: number;
  amount_cents: number | null;
  is_paid: number | null;
  festival_name: string;
  festival_slug: string;
  edition_name: string;
  assigned_booth_id: string | null;
  booth_code: string | null;
  booth_zone: string | null;
  review_notes: string | null;
}

interface MyInvoice {
  id: string;
  invoice_number: string;
  label: string;
  total_cents: number;
  currency: string;
  status: string;
  issued_at: number | null;
  festival_name: string | null;
  festival_slug: string | null;
  created_at: number;
}

interface Accounting {
  revenue: { total_cents: number; tax_cents: number; discount_cents: number; sales_count: number; avg_sale_cents: number };
  costs: { cogs_cents: number; expenses_cents: number; total_cents: number };
  profit: { gross_cents: number; net_cents: number; margin_percent: number };
  break_even: { remaining_cents: number; remaining_sales: number; is_profitable: boolean };
  stock: { total_value_cents: number; total_cost_cents: number; low_stock_count: number; product_count: number };
  expenses_by_category: Record<string, number>;
  sales_by_payment: Record<string, { count: number; total: number }>;
  daily_revenue: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TabId = 'overview' | 'profile' | 'vitrine' | 'boutique' | 'applications' | 'documents' | 'invoices' | 'visibility';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Especes', card: 'CB', transfer: 'Virement', check: 'Cheque', other: 'Autre',
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  insurance: 'Assurance', kbis: 'Kbis', id_card: "Piece d'identite", rib: 'RIB', other: 'Autre',
};
const DOCUMENT_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  verified: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};
const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente', verified: 'Verifie', rejected: 'Refuse',
};
const APPLICATION_STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  under_review: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  waitlisted: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};
const APPLICATION_STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', submitted: 'Soumise', under_review: 'En cours',
  approved: 'Approuvee', rejected: 'Refusee', waitlisted: "Liste d'attente",
};
const APPLICATION_STATUS_ICONS: Record<string, typeof Check> = {
  approved: CheckCircle2, submitted: Clock, under_review: Clock, rejected: XCircle, waitlisted: AlertCircle,
};
const INVOICE_STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600', sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700', overdue: 'bg-red-100 text-red-700', cancelled: 'bg-gray-100 text-gray-600',
};
const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', sent: 'Envoyee', paid: 'Payee', overdue: 'En retard', cancelled: 'Annulee',
};

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}>
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Sparkline (inline SVG, no chart lib)
// ---------------------------------------------------------------------------

function Sparkline({ values, height = 56, color = 'rgb(99 102 241)' }: { values: number[]; height?: number; color?: string }) {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const w = 100;
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const points = values.map((v, i) => `${i * step},${((max - v) / range) * 100}`).join(' ');
  const lastIdx = values.length - 1;
  const lastY = ((max - values[lastIdx]) / range) * 100;
  return (
    <svg viewBox={`0 0 ${w} 100`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon fill="url(#spark-grad)" points={`0,100 ${points} ${w},100`} />
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" points={points} />
      <circle cx={lastIdx * step} cy={lastY} r="2" fill={color} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Overview tab — real dashboard with KPIs, sparkline, alerts, activity
// ---------------------------------------------------------------------------

interface OverviewProps {
  applications: MyApplication[];
  documents: MyDocument[];
  accounting: Accounting | null;
  accountingLoading: boolean;
  onJump: (tab: TabId) => void;
}

function OverviewTab({ applications, documents, accounting, accountingLoading, onJump }: OverviewProps) {
  const approved = applications.filter((a) => a.status === 'approved').length;
  const pending = applications.filter((a) => a.status === 'submitted' || a.status === 'under_review').length;
  const docsExpiring = documents.filter((d) => d.is_expiring_soon && !d.is_expired).length;
  const docsExpired = documents.filter((d) => d.is_expired).length;
  const docsPending = documents.filter((d) => d.status === 'pending').length;

  // Last 30 days revenue series
  const series = useMemo(() => {
    const out: { day: string; cents: number }[] = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      out.push({ day: key, cents: accounting?.daily_revenue?.[key] ?? 0 });
    }
    return out;
  }, [accounting]);

  const last7 = series.slice(-7).reduce((s, p) => s + p.cents, 0);
  const prev7 = series.slice(-14, -7).reduce((s, p) => s + p.cents, 0);
  const trend7 = prev7 > 0 ? ((last7 - prev7) / prev7) * 100 : last7 > 0 ? 100 : 0;

  const profitable = accounting?.break_even.is_profitable ?? false;
  const revenue = accounting?.revenue.total_cents ?? 0;
  const netProfit = accounting?.profit.net_cents ?? 0;
  const margin = accounting?.profit.margin_percent ?? 0;
  const stockValue = accounting?.stock.total_value_cents ?? 0;
  const lowStock = accounting?.stock.low_stock_count ?? 0;
  const productCount = accounting?.stock.product_count ?? 0;

  const alerts: { tone: 'warn' | 'danger' | 'info'; icon: typeof Bell; text: string; action: () => void; cta: string }[] = [];
  if (docsExpired > 0) alerts.push({ tone: 'danger', icon: AlertCircle, text: `${docsExpired} document${docsExpired > 1 ? 's' : ''} expire${docsExpired > 1 ? 's' : ''}`, action: () => onJump('documents'), cta: 'Renouveler' });
  if (docsExpiring > 0) alerts.push({ tone: 'warn', icon: AlertTriangle, text: `${docsExpiring} document${docsExpiring > 1 ? 's' : ''} a renouveler sous 30j`, action: () => onJump('documents'), cta: 'Verifier' });
  if (docsPending > 0) alerts.push({ tone: 'info', icon: FileText, text: `${docsPending} document${docsPending > 1 ? 's' : ''} en attente de validation`, action: () => onJump('documents'), cta: 'Voir' });
  if (pending > 0) alerts.push({ tone: 'info', icon: Clock, text: `${pending} candidature${pending > 1 ? 's' : ''} en cours`, action: () => onJump('applications'), cta: 'Suivre' });
  if (lowStock > 0) alerts.push({ tone: 'warn', icon: Package, text: `${lowStock} produit${lowStock > 1 ? 's' : ''} en stock faible`, action: () => { window.location.href = '/pos/products'; }, cta: 'Reapprovisionner' });

  // Build recent activity (latest 8 mixed events)
  const activity = useMemo(() => {
    type Item = { ts: number; icon: typeof Clock; tone: string; title: string; subtitle: string; href?: string };
    const items: Item[] = [];
    applications.slice(0, 5).forEach((a) => items.push({
      ts: a.created_at,
      icon: APPLICATION_STATUS_ICONS[a.status] || Clock,
      tone: a.status === 'approved' ? 'text-green-600' : a.status === 'rejected' ? 'text-red-600' : 'text-blue-600',
      title: `${APPLICATION_STATUS_LABELS[a.status] || a.status} — ${a.festival_name}`,
      subtitle: a.edition_name,
      href: `/f/${a.festival_slug}`,
    }));
    documents.slice(0, 5).forEach((d) => items.push({
      ts: d.created_at,
      icon: d.is_expired ? AlertCircle : d.status === 'verified' ? CheckCircle2 : FileText,
      tone: d.is_expired ? 'text-red-600' : d.status === 'verified' ? 'text-green-600' : 'text-amber-600',
      title: d.label || DOCUMENT_TYPE_LABELS[d.document_type] || d.document_type,
      subtitle: DOCUMENT_STATUS_LABELS[d.status] || d.status,
    }));
    return items.sort((a, b) => b.ts - a.ts).slice(0, 8);
  }, [applications, documents]);

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Wallet}
          label="Chiffre d'affaires"
          value={accountingLoading ? '...' : formatCurrency(revenue)}
          hint={`${accounting?.revenue.sales_count ?? 0} ventes`}
          trend={accounting ? trend7 : null}
          accent="indigo"
        />
        <KpiCard
          icon={profitable ? TrendingUp : TrendingDown}
          label="Benefice net"
          value={accountingLoading ? '...' : formatCurrency(netProfit)}
          hint={`Marge ${margin.toFixed(1)}%`}
          accent={netProfit >= 0 ? 'green' : 'red'}
        />
        <KpiCard
          icon={Package}
          label="Stock"
          value={accountingLoading ? '...' : formatCurrency(stockValue)}
          hint={`${productCount} produit${productCount > 1 ? 's' : ''}`}
          accent={lowStock > 0 ? 'amber' : 'slate'}
          badge={lowStock > 0 ? `${lowStock} faible${lowStock > 1 ? 's' : ''}` : undefined}
        />
        <KpiCard
          icon={CheckCircle2}
          label="Candidatures"
          value={approved.toString()}
          hint={`${pending} en cours`}
          accent="blue"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue chart */}
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <BarChart3 className="h-4 w-4 text-primary" /> Revenus des 30 derniers jours
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatCurrency(last7)} cette semaine{' '}
                <span className={`ml-1 inline-flex items-center gap-0.5 ${trend7 >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {trend7 >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {trend7 >= 0 ? '+' : ''}{trend7.toFixed(0)}%
                </span>
              </p>
            </div>
            <Link to="/pos/accounting" className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10">
              Comptabilite <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          {accountingLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : revenue === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center text-center">
              <ShoppingCart className="mb-2 h-6 w-6 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Aucune vente enregistree</p>
              <Link to="/pos" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                Ouvrir la caisse <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          ) : (
            <>
              <Sparkline values={series.map((s) => s.cents)} height={80} />
              <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{series[0].day.slice(5)}</span>
                <span>{series[15].day.slice(5)}</span>
                <span>{series[29].day.slice(5)}</span>
              </div>
            </>
          )}
        </div>

        {/* Break-even / profitability */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Target className="h-4 w-4 text-primary" /> Seuil de rentabilite
          </h3>
          {accountingLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : profitable ? (
            <div className="space-y-2">
              <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/10">
                <p className="flex items-center gap-1.5 text-sm font-medium text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" /> Edition rentable
                </p>
                <p className="mt-1 text-xs text-green-700/80 dark:text-green-400/80">
                  Vous avez depasse vos couts de {formatCurrency(Math.abs(netProfit))}.
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                Couts cumules : <span className="font-medium text-foreground">{formatCurrency(accounting?.costs.total_cents ?? 0)}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(accounting?.break_even.remaining_cents ?? 0)}</p>
                <p className="text-xs text-muted-foreground">restants pour atteindre l'equilibre</p>
              </div>
              {accounting && accounting.break_even.remaining_sales > 0 && (
                <p className="text-xs text-muted-foreground">
                  Soit environ <span className="font-medium text-foreground">{accounting.break_even.remaining_sales}</span> ventes au panier moyen ({formatCurrency(accounting.revenue.avg_sale_cents)}).
                </p>
              )}
              <Link to="/pos" className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                <ShoppingCart className="h-3.5 w-3.5" /> Encaisser une vente
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Alerts */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Bell className="h-4 w-4 text-primary" /> Alertes
            {alerts.length > 0 && <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{alerts.length}</Badge>}
          </h3>
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <CheckCircle2 className="mb-2 h-6 w-6 text-green-500" />
              <p className="text-sm text-muted-foreground">Tout est en ordre</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {alerts.map((a, i) => {
                const Icon = a.icon;
                const toneCls = a.tone === 'danger'
                  ? 'border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-900/10'
                  : a.tone === 'warn'
                  ? 'border-orange-200 bg-orange-50 dark:border-orange-900/40 dark:bg-orange-900/10'
                  : 'border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-900/10';
                const iconTone = a.tone === 'danger' ? 'text-red-600' : a.tone === 'warn' ? 'text-orange-600' : 'text-blue-600';
                return (
                  <li key={i} className={`flex items-start justify-between gap-2 rounded-lg border px-3 py-2 ${toneCls}`}>
                    <div className="flex items-start gap-2 text-xs">
                      <Icon className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 ${iconTone}`} />
                      <span className="text-foreground">{a.text}</span>
                    </div>
                    <button type="button" onClick={a.action} className="flex-shrink-0 text-[11px] font-medium text-primary hover:underline">
                      {a.cta}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Payment methods breakdown */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <PiggyBank className="h-4 w-4 text-primary" /> Encaissements
          </h3>
          {accountingLoading || !accounting ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : Object.keys(accounting.sales_by_payment).length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Aucun encaissement</p>
          ) : (
            <ul className="space-y-3">
              {Object.entries(accounting.sales_by_payment)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([method, info]) => {
                  const pct = revenue > 0 ? (info.total / revenue) * 100 : 0;
                  return (
                    <li key={method}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground">{PAYMENT_METHOD_LABELS[method] || method}</span>
                        <span className="text-muted-foreground">{formatCurrency(info.total)}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">{info.count} vente{info.count > 1 ? 's' : ''} • {pct.toFixed(0)}%</p>
                    </li>
                  );
                })}
            </ul>
          )}
        </div>

        {/* Activity feed */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-primary" /> Activite recente
          </h3>
          {activity.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Aucune activite</p>
          ) : (
            <ul className="space-y-3">
              {activity.map((item, i) => {
                const Icon = item.icon;
                const row = (
                  <div className="flex items-start gap-2">
                    <Icon className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 ${item.tone}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground">{item.subtitle} • {formatTimestamp(item.ts)}</p>
                    </div>
                  </div>
                );
                return (
                  <li key={i}>
                    {item.href ? <Link to={item.href} className="block rounded-md hover:bg-accent/50 -mx-1 px-1 py-1">{row}</Link> : row}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 to-transparent p-5">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Actions rapides</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction href="/pos" icon={ShoppingCart} title="Caisse" desc="Encaisser une vente" />
          <QuickAction href="/pos/products" icon={Store} title="Produits" desc="Gerer le stock" />
          <QuickAction href="/exhibitors" icon={Globe} title="Annuaire" desc="Decouvrir des festivals" />
          <QuickAction onClick={() => onJump('profile')} icon={Building2} title="Mon profil" desc="Mettre a jour" />
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, hint, trend, accent, badge }: {
  icon: typeof Wallet; label: string; value: string; hint?: string; trend?: number | null; accent: 'indigo' | 'green' | 'red' | 'amber' | 'blue' | 'slate'; badge?: string;
}) {
  const accents: Record<string, { bg: string; icon: string; ring: string }> = {
    indigo: { bg: 'bg-indigo-50 dark:bg-indigo-900/10', icon: 'text-indigo-600', ring: 'ring-indigo-100 dark:ring-indigo-900/30' },
    green: { bg: 'bg-green-50 dark:bg-green-900/10', icon: 'text-green-600', ring: 'ring-green-100 dark:ring-green-900/30' },
    red: { bg: 'bg-red-50 dark:bg-red-900/10', icon: 'text-red-600', ring: 'ring-red-100 dark:ring-red-900/30' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-900/10', icon: 'text-amber-600', ring: 'ring-amber-100 dark:ring-amber-900/30' },
    blue: { bg: 'bg-blue-50 dark:bg-blue-900/10', icon: 'text-blue-600', ring: 'ring-blue-100 dark:ring-blue-900/30' },
    slate: { bg: 'bg-slate-50 dark:bg-slate-900/20', icon: 'text-slate-600', ring: 'ring-slate-100 dark:ring-slate-900/30' },
  };
  const a = accents[accent];
  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ring-1 ${a.bg} ${a.ring}`}>
          <Icon className={`h-4 w-4 ${a.icon}`} />
        </span>
        {badge && <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{badge}</Badge>}
        {trend !== null && trend !== undefined && Number.isFinite(trend) && (
          <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend >= 0 ? '+' : ''}{trend.toFixed(0)}%
          </span>
        )}
      </div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function QuickAction({ href, onClick, icon: Icon, title, desc }: {
  href?: string; onClick?: () => void; icon: typeof Wallet; title: string; desc: string;
}) {
  const content = (
    <div className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-all hover:border-primary/40 hover:shadow-sm">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{desc}</p>
      </div>
      <ArrowUpRight className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
    </div>
  );
  return href ? <Link to={href}>{content}</Link> : <button type="button" onClick={onClick} className="text-left">{content}</button>;
}

// ---------------------------------------------------------------------------
// Tab: Profile
// ---------------------------------------------------------------------------

function ProfileTab() {
  const [profile, setProfile] = useState<ExhibitorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      const res = await api.get<ExhibitorProfile>('/exhibitors/profile');
      if (res.success && res.data) {
        const d = res.data as any;
        setProfile({
          ...d,
          domains: Array.isArray(d.domains) ? d.domains : typeof d.domains === 'string' ? JSON.parse(d.domains || '[]') : [],
        });
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setMessage(null);
    const res = await api.post('/exhibitors/profile', {
      company_name: profile.company_name,
      trade_name: profile.trade_name,
      description: profile.description,
      website: profile.website,
      contact_email: profile.contact_email,
      contact_phone: profile.contact_phone,
      siret: profile.siret,
      vat_number: profile.vat_number,
      activity_type: profile.activity_type,
      category: profile.category,
      domains: profile.domains,
      is_pmr: profile.is_pmr,
      address_line1: profile.address_line1,
      city: profile.city,
      postal_code: profile.postal_code,
      country: profile.country,
    });
    setSaving(false);
    if (res.success) {
      setMessage({ type: 'success', text: 'Profil exposant mis a jour.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la sauvegarde.' });
    }
  };

  const update = (key: keyof ExhibitorProfile, value: unknown) => {
    if (!profile) return;
    setProfile({ ...profile, [key]: value } as ExhibitorProfile);
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (!profile) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-foreground">Creer votre profil exposant</h3>
        <p className="mt-2 text-sm text-muted-foreground">Renseignez les informations de votre entreprise pour candidater aux festivals.</p>
        <button type="button" onClick={() => setProfile({ id: '', slug: null, company_name: '', trade_name: '', description: '', logo_url: '', website: '', contact_email: '', contact_phone: '', siret: '', vat_number: '', activity_type: '', category: '', domains: [], is_pmr: 0, address_line1: '', city: '', postal_code: '', country: 'France', boutique_enabled: 0, boutique_intro: null, boutique_currency: 'EUR', boutique_shipping_cents: 0, boutique_free_shipping_above_cents: null, vitrine_page_id: null })} className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Building2 className="h-4 w-4" /> Commencer
        </button>
      </div>
    );
  }

  const inputCls = 'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50';
  const labelCls = 'mb-1 block text-sm font-medium text-foreground';

  return (
    <div className="space-y-6">
      {message && (
        <div className={`rounded-md border px-4 py-3 text-sm ${message.type === 'success' ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* Company info */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
          <Building2 className="h-5 w-5 text-primary" /> Informations entreprise
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Raison sociale <span className="text-destructive">*</span></label>
            <input type="text" value={profile.company_name || ''} onChange={(e) => update('company_name', e.target.value)} className={inputCls} placeholder="Mon Entreprise SAS" />
          </div>
          <div>
            <label className={labelCls}>Nom commercial</label>
            <input type="text" value={profile.trade_name || ''} onChange={(e) => update('trade_name', e.target.value)} className={inputCls} placeholder="Ma Marque" />
          </div>
          <div>
            <label className={labelCls}>SIRET</label>
            <input type="text" value={profile.siret || ''} onChange={(e) => update('siret', e.target.value)} className={inputCls} placeholder="123 456 789 00012" />
          </div>
          <div>
            <label className={labelCls}>N° TVA</label>
            <input type="text" value={profile.vat_number || ''} onChange={(e) => update('vat_number', e.target.value)} className={inputCls} placeholder="FR12345678901" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Description</label>
            <textarea value={profile.description || ''} onChange={(e) => update('description', e.target.value)} rows={3} className={inputCls + ' resize-none'} placeholder="Presentez votre activite..." />
          </div>
          <div>
            <label className={labelCls}>Site web</label>
            <input type="url" value={profile.website || ''} onChange={(e) => update('website', e.target.value)} className={inputCls} placeholder="https://..." />
          </div>
          <div>
            <label className={labelCls}>Type d'activite</label>
            <input type="text" value={profile.activity_type || ''} onChange={(e) => update('activity_type', e.target.value)} className={inputCls} placeholder="Artisan, editeur..." />
          </div>
        </div>
      </div>

      {/* Contact + Address */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
          <MapPin className="h-5 w-5 text-primary" /> Contact & Adresse
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Email de contact <span className="text-destructive">*</span></label>
            <input type="email" value={profile.contact_email || ''} onChange={(e) => update('contact_email', e.target.value)} className={inputCls} placeholder="contact@..." />
          </div>
          <div>
            <label className={labelCls}>Telephone</label>
            <input type="tel" value={profile.contact_phone || ''} onChange={(e) => update('contact_phone', e.target.value)} className={inputCls} placeholder="06 ..." />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Adresse</label>
            <input type="text" value={profile.address_line1 || ''} onChange={(e) => update('address_line1', e.target.value)} className={inputCls} placeholder="12 rue..." />
          </div>
          <div>
            <label className={labelCls}>Code postal</label>
            <input type="text" value={profile.postal_code || ''} onChange={(e) => update('postal_code', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Ville</label>
            <input type="text" value={profile.city || ''} onChange={(e) => update('city', e.target.value)} className={inputCls} />
          </div>
        </div>
      </div>

      {/* Domains */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
          <Briefcase className="h-5 w-5 text-primary" /> Domaines d'expertise
        </h3>
        <div className="flex flex-wrap gap-2">
          {EXHIBITOR_DOMAINS.map((d) => {
            const selected = profile.domains?.includes(d.value);
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => {
                  const next = selected
                    ? (profile.domains || []).filter((x) => x !== d.value)
                    : [...(profile.domains || []), d.value];
                  update('domains', next);
                }}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  selected
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={!!profile.is_pmr} onChange={(e) => update('is_pmr', e.target.checked ? 1 : 0)} className="h-4 w-4 rounded border-border" />
            Stand accessible PMR
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer le profil
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Documents
// ---------------------------------------------------------------------------

function DocumentsTab() {
  const [documents, setDocuments] = useState<MyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expiryDocId, setExpiryDocId] = useState<string | null>(null);
  const [expiryDate, setExpiryDate] = useState('');
  const [savingExpiry, setSavingExpiry] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified' | 'expired'>('all');
  const navigate = useNavigate();

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await api.get<MyDocument[]>('/exhibitor-hub/my-documents');
    if (result.success && result.data) {
      setDocuments(Array.isArray(result.data) ? result.data : []);
    } else {
      setError(result.error || 'Erreur lors du chargement des documents.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const openExpiryDialog = (doc: MyDocument) => {
    setExpiryDocId(doc.id);
    setExpiryDate(doc.expires_at ? new Date(doc.expires_at * 1000).toISOString().split('T')[0] : '');
  };

  const saveExpiry = async () => {
    if (!expiryDocId) return;
    setSavingExpiry(true);
    const unixTimestamp = expiryDate ? Math.floor(new Date(expiryDate).getTime() / 1000) : null;
    await api.put(`/exhibitor-hub/documents/${expiryDocId}/expiry`, { expires_at: unixTimestamp });
    setSavingExpiry(false);
    setExpiryDocId(null);
    fetchDocuments();
  };

  const filtered = documents.filter((d) => {
    if (filter === 'pending') return d.status === 'pending';
    if (filter === 'verified') return d.status === 'verified';
    if (filter === 'expired') return d.is_expired || d.is_expiring_soon;
    return true;
  });

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (error) return <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>;

  if (documents.length === 0) {
    return (
      <EmptyState icon={FileText} title="Aucun document" description="Ajoutez vos documents administratifs (Kbis, assurance, piece d'identite)."
        action={{ label: 'Ajouter un document', onClick: () => navigate('/profile') }} />
    );
  }

  return (
    <>
      {/* Filter bar + upload */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(['all', 'pending', 'verified', 'expired'] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
              {f === 'all' ? 'Tous' : f === 'pending' ? 'En attente' : f === 'verified' ? 'Verifies' : 'A renouveler'}
              {f === 'expired' && (documents.filter((d) => d.is_expired || d.is_expiring_soon).length > 0) && (
                <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                  {documents.filter((d) => d.is_expired || d.is_expiring_soon).length}
                </span>
              )}
            </button>
          ))}
        </div>
        <Link to="/profile" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Upload className="h-4 w-4" /> Ajouter
        </Link>
      </div>

      {/* Document cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((doc) => (
          <div key={doc.id} className={`rounded-xl border bg-card p-5 transition-shadow hover:shadow-md ${doc.is_expired ? 'border-red-300 dark:border-red-800' : doc.is_expiring_soon ? 'border-orange-300 dark:border-orange-800' : 'border-border'}`}>
            <div className="mb-3 flex items-start justify-between gap-2">
              <Badge className="bg-muted text-foreground">{DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}</Badge>
              <Badge className={DOCUMENT_STATUS_STYLES[doc.status] || 'bg-gray-100 text-gray-600'}>{DOCUMENT_STATUS_LABELS[doc.status] || doc.status}</Badge>
            </div>
            <p className="mb-1 truncate text-sm font-medium text-foreground" title={doc.file_name}>{doc.file_name}</p>
            {doc.label && <p className="mb-2 text-xs text-muted-foreground">{doc.label}</p>}
            <p className="mb-2 text-xs text-muted-foreground">Televerse le {formatTimestamp(doc.created_at)}</p>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {doc.expires_at ? (
                <>
                  <span className="text-xs text-muted-foreground">Expire le {formatTimestamp(doc.expires_at)}</span>
                  {doc.is_expired && <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Expire</Badge>}
                  {!doc.is_expired && doc.is_expiring_soon && (
                    <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                      <AlertTriangle className="mr-1 h-3 w-3" />{doc.days_until_expiry}j
                    </Badge>
                  )}
                </>
              ) : (
                <span className="text-xs italic text-muted-foreground">Pas de date d'expiration</span>
              )}
            </div>
            <button type="button" onClick={() => openExpiryDialog(doc)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent">
              <CalendarClock className="h-3.5 w-3.5" />
              {doc.expires_at ? "Modifier" : "Definir l'expiration"}
            </button>
          </div>
        ))}
      </div>
      {filtered.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Aucun document dans cette categorie.</p>}

      {/* Expiry dialog */}
      {expiryDocId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Date d'expiration</h3>
              <button type="button" onClick={() => setExpiryDocId(null)} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="mb-4 w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setExpiryDocId(null)} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">Annuler</button>
              <button type="button" onClick={saveExpiry} disabled={savingExpiry} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {savingExpiry ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Tab: Applications (enriched)
// ---------------------------------------------------------------------------

function ApplicationsTab() {
  const [applications, setApplications] = useState<MyApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const result = await api.get<MyApplication[]>('/exhibitor-hub/my-applications');
      if (result.success && result.data) setApplications(Array.isArray(result.data) ? result.data : []);
      else setError(result.error || 'Erreur lors du chargement.');
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (error) return <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>;
  if (applications.length === 0) return <EmptyState icon={ClipboardList} title="Aucune candidature" description="Parcourez l'annuaire des festivals pour trouver un evenement et candidater." action={{ label: 'Voir les festivals', onClick: () => window.location.href = '/directory' }} />;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {applications.map((app) => {
        const StatusIcon = APPLICATION_STATUS_ICONS[app.status] || Clock;
        return (
          <div key={app.id} className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <Link to={`/f/${app.festival_slug}`} className="text-base font-semibold text-foreground hover:text-primary hover:underline">
                  {app.festival_name}
                </Link>
                <p className="text-xs text-muted-foreground">{app.edition_name}</p>
              </div>
              <Badge className={APPLICATION_STATUS_STYLES[app.status] || 'bg-gray-100 text-gray-600'}>
                <StatusIcon className="mr-1 h-3 w-3" />
                {APPLICATION_STATUS_LABELS[app.status] || app.status}
              </Badge>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              {app.amount_cents !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Montant</span>
                  <span className="font-medium text-foreground">{formatCurrency(app.amount_cents)}</span>
                </div>
              )}
              {app.is_paid !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Paiement</span>
                  <Badge className={app.is_paid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                    {app.is_paid ? 'Paye' : 'Non paye'}
                  </Badge>
                </div>
              )}
              {app.booth_code && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Stand assigne</span>
                  <span className="font-mono text-xs font-bold text-primary">
                    {app.booth_code}{app.booth_zone ? ` (${app.booth_zone})` : ''}
                  </span>
                </div>
              )}
              {app.review_notes && app.status !== 'submitted' && (
                <div className="mt-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  <strong>Note de l'organisateur :</strong> {app.review_notes}
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
              <span className="text-xs text-muted-foreground">{formatTimestamp(app.created_at)}</span>
              <Link to={`/f/${app.festival_slug}`} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                Voir le festival <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Invoices
// ---------------------------------------------------------------------------

function InvoicesTab() {
  const [invoices, setInvoices] = useState<MyInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const result = await api.get<MyInvoice[]>('/exhibitor-hub/my-invoices');
      if (result.success && result.data) setInvoices(Array.isArray(result.data) ? result.data : []);
      else setError(result.error || 'Erreur lors du chargement.');
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (error) return <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>;
  if (invoices.length === 0) return <EmptyState icon={Receipt} title="Aucune facture" description="Vos factures apparaitront ici lorsque vous aurez des paiements." />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">N° Facture</th>
            <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">Libelle</th>
            <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">Festival</th>
            <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-muted-foreground">Montant TTC</th>
            <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">Statut</th>
            <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">Date</th>
            <th className="whitespace-nowrap px-4 py-3 text-center font-medium text-muted-foreground">PDF</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/40">
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-medium text-foreground">{inv.invoice_number}</td>
              <td className="max-w-[200px] truncate px-4 py-3 text-foreground" title={inv.label}>{inv.label}</td>
              <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{inv.festival_name || '-'}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-foreground">{formatCurrency(inv.total_cents)}</td>
              <td className="whitespace-nowrap px-4 py-3">
                <Badge className={INVOICE_STATUS_STYLES[inv.status] || 'bg-gray-100 text-gray-600'}>{INVOICE_STATUS_LABELS[inv.status] || inv.status}</Badge>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{inv.issued_at ? formatTimestamp(inv.issued_at) : '-'}</td>
              <td className="whitespace-nowrap px-4 py-3 text-center">
                <button type="button" onClick={() => window.open(`${import.meta.env.VITE_API_URL || '/api'}/billing/invoices/${inv.id}/pdf`, '_blank')}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent" title="Telecharger PDF">
                  <FileDown className="h-3.5 w-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Visibility
// ---------------------------------------------------------------------------

const VISIBILITY_FIELDS: { key: string; label: string; group?: string }[] = [
  { key: 'contact_first_name', label: 'Nom du responsable', group: 'Contact' },
  { key: 'contact_last_name', label: 'Prenom du responsable', group: 'Contact' },
  { key: 'contact_email', label: 'Email de contact', group: 'Contact' },
  { key: 'contact_phone', label: 'Telephone', group: 'Contact' },
  { key: 'registration_number', label: 'KBIS / INSEE', group: 'Administratif' },
  { key: 'siret', label: 'SIRET', group: 'Administratif' },
  { key: 'vat_number', label: 'Numero TVA', group: 'Administratif' },
  { key: 'legal_form', label: 'Forme juridique', group: 'Administratif' },
  { key: 'insurer_name', label: 'Assureur', group: 'Assurance' },
  { key: 'insurance_contract_number', label: 'N° contrat assurance', group: 'Assurance' },
  { key: 'kbis_file_url', label: 'Document KBIS', group: 'Documents' },
  { key: 'insurance_file_url', label: 'Attestation assurance', group: 'Documents' },
  { key: 'id_file_url', label: "Piece d'identite", group: 'Documents' },
  { key: 'address_line1', label: 'Adresse siege', group: 'Adresse' },
  { key: 'postal_code', label: 'Code postal siege', group: 'Adresse' },
  { key: 'billing_address_line1', label: 'Adresse de facturation', group: 'Facturation' },
  { key: 'billing_postal_code', label: 'Code postal facturation', group: 'Facturation' },
  { key: 'billing_city', label: 'Ville facturation', group: 'Facturation' },
];

function VisibilityTab() {
  const [directoryVisible, setDirectoryVisible] = useState(true);
  const [fieldVisibility, setFieldVisibility] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      const res = await api.get<{ directory_visible: number; visibility: Record<string, string> }>('/exhibitor-hub/my-visibility');
      if (res.success && res.data) {
        setDirectoryVisible(!!res.data.directory_visible);
        setFieldVisibility(res.data.visibility || {});
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const res = await api.put('/exhibitor-hub/my-visibility', { directory_visible: directoryVisible, visibility: fieldVisibility });
    setMessage(res.success ? { type: 'success', text: 'Parametres de visibilite mis a jour.' } : { type: 'error', text: res.error || 'Erreur' });
    setSaving(false);
  };

  const toggleField = (key: string) => {
    setFieldVisibility((prev) => ({ ...prev, [key]: prev[key] === 'public' ? 'organizer' : 'public' }));
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      {message && (
        <div className={`rounded-md border px-4 py-3 text-sm ${message.type === 'success' ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400' : 'border-red-200 bg-red-50 text-red-700'}`}>{message.text}</div>
      )}

      {/* Directory opt-in */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Annuaire des exposants</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {directoryVisible
                ? 'Votre profil est visible dans l\'annuaire public. Les visiteurs et organisateurs peuvent vous trouver.'
                : 'Votre profil est masque. Seuls les organisateurs des festivals ou vous candidatez peuvent le voir.'}
            </p>
          </div>
          <button type="button" onClick={() => setDirectoryVisible(!directoryVisible)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${directoryVisible ? 'bg-primary' : 'bg-muted'}`}>
            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${directoryVisible ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      {/* Per-field visibility */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-1 text-sm font-semibold text-foreground">Visibilite par champ</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          <Eye className="mr-1 inline h-3 w-3 text-green-600" /> <strong>Public</strong> = visible par tous | <Shield className="mr-1 inline h-3 w-3 text-orange-600" /> <strong>Organisateurs</strong> = visible uniquement par les organisateurs de festivals
        </p>
        <div className="space-y-4">
          {(() => {
            let lastGroup = '';
            return VISIBILITY_FIELDS.map((field) => {
              const isPublic = fieldVisibility[field.key] === 'public';
              const showGroup = field.group && field.group !== lastGroup;
              if (field.group) lastGroup = field.group;
              return (
                <div key={field.key}>
                  {showGroup && <p className="mb-2 mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{field.group}</p>}
                  <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                    <span className="text-sm text-foreground">{field.label}</span>
                    <button type="button" onClick={() => toggleField(field.key)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        isPublic ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400' : 'bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400'
                      }`}>
                      {isPublic ? <><Eye className="h-3 w-3" /> Public</> : <><Shield className="h-3 w-3" /> Organisateurs</>}
                    </button>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Vitrine (public CMS page editor entry point)
// ---------------------------------------------------------------------------

interface VitrineProps { exhibitorId: string | null; slug: string | null; }

function VitrineTab({ exhibitorId, slug }: VitrineProps) {
  const navigate = useNavigate();
  const [page, setPage] = useState<{ id: string; title: string; is_published: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [slugDraft, setSlugDraft] = useState(slug || '');
  const [savingSlug, setSavingSlug] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => { setSlugDraft(slug || ''); }, [slug]);

  useEffect(() => {
    if (!exhibitorId) { setLoading(false); return; }
    api.get<{ id: string; title: string; is_published: number }[]>(`/cms/exhibitor/${exhibitorId}/pages`).then((res) => {
      if (res.success && res.data) {
        const pages = res.data as any[];
        const home = pages.find((p) => p.slug === 'accueil') || pages[0];
        if (home) setPage(home);
      }
      setLoading(false);
    });
  }, [exhibitorId]);

  const handleSlugSave = async () => {
    setSavingSlug(true);
    setMessage(null);
    const desired = slugDraft.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
    const res = await api.post('/exhibitors/profile', { slug: desired });
    setSavingSlug(false);
    if (res.success) {
      setMessage({ type: 'success', text: 'Identifiant mis a jour' });
      // Force reload after slug change so links reflect it
      setTimeout(() => window.location.reload(), 800);
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur' });
    }
  };

  const handleCreateVitrine = async () => {
    if (!exhibitorId) return;
    setCreating(true);
    const res = await api.post<{ id: string; title: string; is_published: number }>(`/cms/exhibitor/${exhibitorId}/pages/initialize-vitrine`);
    setCreating(false);
    if (res.success && res.data) {
      const created = res.data as { id: string; title: string; is_published: number };
      setPage(created);
      navigate(`/exhibitor/cms/${created.id}`);
    }
  };

  const publicUrl = slug ? `${window.location.origin}/e/${slug}` : '';

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      {message && (
        <div className={`rounded-md border px-4 py-3 text-sm ${message.type === 'success' ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400' : 'border-red-200 bg-red-50 text-red-700'}`}>{message.text}</div>
      )}

      {/* Slug / URL */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-1 flex items-center gap-2 text-base font-semibold text-foreground">
          <Globe className="h-5 w-5 text-primary" /> URL publique
        </h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Identifiant utilise dans l'URL de votre vitrine et de votre boutique. Caracteres autorises : a-z, 0-9, tirets.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-muted-foreground">{window.location.origin}/e/</span>
          <input
            type="text"
            value={slugDraft}
            onChange={(e) => setSlugDraft(e.target.value)}
            className="flex-1 min-w-[160px] rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="ma-marque"
          />
          <button
            type="button"
            onClick={handleSlugSave}
            disabled={savingSlug || slugDraft.trim() === (slug || '')}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {savingSlug ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Enregistrer
          </button>
        </div>
        {publicUrl && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              Voir la vitrine <ExternalLink className="h-3 w-3" />
            </a>
            <button type="button" onClick={() => { navigator.clipboard.writeText(publicUrl); setMessage({ type: 'success', text: 'URL copiee' }); }} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <Copy className="h-3 w-3" /> Copier l'URL
            </button>
          </div>
        )}
      </div>

      {/* Page editor entry */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
          <Layout className="h-5 w-5 text-primary" /> Page de presentation
        </h3>
        {page ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">{page.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {page.is_published ? (
                  <span className="inline-flex items-center gap-1 text-green-600"><CheckCircle2 className="h-3 w-3" /> Publiee</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-600"><AlertCircle className="h-3 w-3" /> Non publiee</span>
                )}
              </p>
            </div>
            <Link to={`/exhibitor/cms/${page.id}`} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Edit2 className="h-3.5 w-3.5" /> Modifier la page
            </Link>
          </div>
        ) : (
          <div className="text-center py-6">
            <Layout className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-foreground">Vous n'avez pas encore de page de presentation.</p>
            <p className="mt-1 text-xs text-muted-foreground">Creez-en une pour decrire votre univers, vos creations et vos services.</p>
            <button type="button" onClick={handleCreateVitrine} disabled={creating || !exhibitorId} className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Creer ma vitrine
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Boutique
// ---------------------------------------------------------------------------

interface OnlineProduct {
  id: string; name: string; sku: string | null; price_cents: number; stock_quantity: number;
  is_online: number; is_active: number; image_url: string | null;
}
interface ReceivedOrder {
  id: string; order_number: string; status: string; customer_email: string;
  total_cents: number; created_at: number; payment_status: string | null;
}

function BoutiqueTab({ profile }: { profile: ExhibitorProfile | null }) {
  const [enabled, setEnabled] = useState(profile?.boutique_enabled === 1);
  const [intro, setIntro] = useState(profile?.boutique_intro || '');
  const [shippingCents, setShippingCents] = useState(profile?.boutique_shipping_cents ?? 0);
  const [freeAbove, setFreeAbove] = useState<number | ''>(profile?.boutique_free_shipping_above_cents ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [products, setProducts] = useState<OnlineProduct[]>([]);
  const [orders, setOrders] = useState<ReceivedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    setEnabled(profile?.boutique_enabled === 1);
    setIntro(profile?.boutique_intro || '');
    setShippingCents(profile?.boutique_shipping_cents ?? 0);
    setFreeAbove(profile?.boutique_free_shipping_above_cents ?? '');
  }, [profile]);

  useEffect(() => {
    Promise.all([
      api.get<OnlineProduct[]>('/pos/products'),
      api.get<ReceivedOrder[]>('/shop/my-orders'),
    ]).then(([prodRes, ordersRes]) => {
      if (prodRes.success && prodRes.data) setProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
      if (ordersRes.success && ordersRes.data) setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);
      setLoading(false);
    });
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    setMessage(null);
    const res = await api.post('/exhibitors/profile', {
      boutique_enabled: enabled ? 1 : 0,
      boutique_intro: intro || null,
      boutique_shipping_cents: shippingCents,
      boutique_free_shipping_above_cents: freeAbove === '' ? null : freeAbove,
    });
    setSaving(false);
    setMessage(res.success ? { type: 'success', text: 'Boutique mise a jour' } : { type: 'error', text: res.error || 'Erreur' });
  };

  const handleToggleOnline = async (p: OnlineProduct) => {
    setTogglingId(p.id);
    const res = await api.put(`/pos/products/${p.id}`, { is_online: p.is_online ? 0 : 1 });
    setTogglingId(null);
    if (res.success) {
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_online: x.is_online ? 0 : 1 } : x)));
    }
  };

  const onlineCount = products.filter((p) => p.is_online === 1 && p.is_active === 1).length;
  const pendingOrders = orders.filter((o) => o.status === 'paid' || o.status === 'fulfilled').length;
  const revenue30d = orders.filter((o) => o.status !== 'pending' && o.status !== 'cancelled' && o.created_at > (Date.now() / 1000) - 30 * 86400)
    .reduce((s, o) => s + o.total_cents, 0);

  return (
    <div className="space-y-6">
      {message && (
        <div className={`rounded-md border px-4 py-3 text-sm ${message.type === 'success' ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400' : 'border-red-200 bg-red-50 text-red-700'}`}>{message.text}</div>
      )}

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">En vente</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{onlineCount}</p>
          <p className="text-xs text-muted-foreground">produit{onlineCount > 1 ? 's' : ''}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">A traiter</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{pendingOrders}</p>
          <p className="text-xs text-muted-foreground">commande{pendingOrders > 1 ? 's' : ''}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">CA 30 jours</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{formatCurrency(revenue30d)}</p>
          <p className="text-xs text-muted-foreground">en ligne</p>
        </div>
      </div>

      {/* Settings */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
          <ShoppingBag className="h-5 w-5 text-primary" /> Configuration de la boutique
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Boutique active</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Lorsqu'elle est active, vos produits "en ligne" sont visibles sur /e/{profile?.slug || '...'}/boutique</p>
            </div>
            <button type="button" onClick={() => setEnabled(!enabled)} className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors ${enabled ? 'bg-primary' : 'bg-muted'}`}>
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} style={{ marginTop: 2 }} />
            </button>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Texte d'introduction de la boutique</label>
            <textarea value={intro} onChange={(e) => setIntro(e.target.value)} rows={2} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="Bienvenue dans ma boutique en ligne..." />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Frais de livraison (cts)</label>
              <input type="number" min="0" value={shippingCents} onChange={(e) => setShippingCents(parseInt(e.target.value, 10) || 0)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              <p className="mt-1 text-[11px] text-muted-foreground">{formatCurrency(shippingCents)} par commande</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Livraison offerte au-dessus de (cts)</label>
              <input type="number" min="0" value={freeAbove} onChange={(e) => setFreeAbove(e.target.value === '' ? '' : parseInt(e.target.value, 10) || 0)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Optionnel" />
            </div>
          </div>
          <button type="button" onClick={handleSaveSettings} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Enregistrer
          </button>
        </div>
      </div>

      {/* Products in shop */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Package className="h-5 w-5 text-primary" /> Produits en vente
          </h3>
          <Link to="/pos/products" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            Gerer le catalogue <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : products.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Aucun produit. <Link to="/pos/products" className="text-primary hover:underline">Ajouter un produit</Link>.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-2 py-2 font-medium">Produit</th>
                  <th className="px-2 py-2 font-medium">Prix</th>
                  <th className="px-2 py-2 font-medium">Stock</th>
                  <th className="px-2 py-2 text-center font-medium">En ligne</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-2">
                        {p.image_url ? <img src={p.image_url} alt="" className="h-8 w-8 rounded object-cover" /> : <div className="flex h-8 w-8 items-center justify-center rounded bg-muted"><Package className="h-3 w-3 text-muted-foreground" /></div>}
                        <div>
                          <p className="text-sm font-medium text-foreground">{p.name}</p>
                          {p.sku && <p className="text-[11px] text-muted-foreground">{p.sku}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-sm">{formatCurrency(p.price_cents)}</td>
                    <td className={`px-2 py-2 text-sm ${p.stock_quantity === 0 ? 'text-red-600' : p.stock_quantity <= 5 ? 'text-amber-600' : 'text-foreground'}`}>{p.stock_quantity}</td>
                    <td className="px-2 py-2 text-center">
                      <button type="button" onClick={() => handleToggleOnline(p)} disabled={togglingId === p.id || p.is_active !== 1} className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${p.is_online ? 'bg-primary' : 'bg-muted'} ${p.is_active !== 1 ? 'opacity-50' : ''}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${p.is_online ? 'translate-x-4' : 'translate-x-0.5'}`} style={{ marginTop: 2 }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Orders */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
          <Truck className="h-5 w-5 text-primary" /> Commandes recues
        </h3>
        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : orders.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Aucune commande pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-2 py-2 font-medium">N°</th>
                  <th className="px-2 py-2 font-medium">Client</th>
                  <th className="px-2 py-2 font-medium">Date</th>
                  <th className="px-2 py-2 font-medium">Statut</th>
                  <th className="px-2 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 10).map((o) => (
                  <tr key={o.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-2 py-2 font-mono text-xs">{o.order_number}</td>
                    <td className="px-2 py-2 text-sm">{o.customer_email}</td>
                    <td className="px-2 py-2 text-xs text-muted-foreground">{formatTimestamp(o.created_at)}</td>
                    <td className="px-2 py-2"><Badge className={
                      o.status === 'paid' ? 'bg-blue-100 text-blue-700' :
                      o.status === 'shipped' ? 'bg-indigo-100 text-indigo-700' :
                      o.status === 'delivered' ? 'bg-green-100 text-green-700' :
                      o.status === 'cancelled' ? 'bg-gray-100 text-gray-600' :
                      'bg-yellow-100 text-yellow-700'
                    }>{o.status}</Badge></td>
                    <td className="px-2 py-2 text-right text-sm font-medium">{formatCurrency(o.total_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'vitrine', label: 'Vitrine', icon: Layout },
  { id: 'boutique', label: 'Boutique', icon: ShoppingBag },
  { id: 'applications', label: 'Candidatures', icon: ClipboardList },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'invoices', label: 'Factures', icon: Receipt },
  { id: 'profile', label: 'Mon profil', icon: Building2 },
  { id: 'visibility', label: 'Visibilite', icon: Eye },
];

export function ExhibitorDashboardPage() {
  const { isAuthenticated, isLoading, profile } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [mountedTabs, setMountedTabs] = useState<Set<TabId>>(new Set(['overview']));

  // Cross-tab shared data (powers overview + tab badges)
  const [apps, setApps] = useState<MyApplication[]>([]);
  const [docs, setDocs] = useState<MyDocument[]>([]);
  const [accounting, setAccounting] = useState<Accounting | null>(null);
  const [accountingLoading, setAccountingLoading] = useState(true);
  const [exhibitorProfile, setExhibitorProfile] = useState<ExhibitorProfile | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate('/login', { replace: true });
  }, [isLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    Promise.all([
      api.get<MyApplication[]>('/exhibitor-hub/my-applications'),
      api.get<MyDocument[]>('/exhibitor-hub/my-documents'),
      api.get<Accounting>('/pos/accounting'),
      api.get<ExhibitorProfile>('/exhibitors/profile'),
    ]).then(([appsRes, docsRes, accRes, profRes]) => {
      if (appsRes.success && appsRes.data) setApps(Array.isArray(appsRes.data) ? appsRes.data : []);
      if (docsRes.success && docsRes.data) setDocs(Array.isArray(docsRes.data) ? docsRes.data : []);
      if (accRes.success && accRes.data) setAccounting(accRes.data as Accounting);
      if (profRes.success && profRes.data) {
        const d = profRes.data as any;
        setExhibitorProfile({ ...d, domains: Array.isArray(d.domains) ? d.domains : [] });
      }
      setAccountingLoading(false);
    });
  }, [isAuthenticated]);

  // Badge counts for tab pills
  const appsPendingCount = apps.filter((a) => a.status === 'submitted' || a.status === 'under_review').length;
  const docsAlertCount = docs.filter((d) => d.is_expired || d.is_expiring_soon || d.status === 'pending').length;
  const docsHasExpired = docs.some((d) => d.is_expired);
  const tabBadge: Partial<Record<TabId, { count: number; tone: 'red' | 'amber' | 'blue' }>> = {
    applications: appsPendingCount > 0 ? { count: appsPendingCount, tone: 'blue' } : undefined,
    documents: docsAlertCount > 0 ? { count: docsAlertCount, tone: docsHasExpired ? 'red' : 'amber' } : undefined,
  };
  const totalAlerts =
    docs.filter((d) => d.is_expired).length +
    docs.filter((d) => d.is_expiring_soon && !d.is_expired).length +
    docs.filter((d) => d.status === 'pending').length +
    appsPendingCount +
    (accounting?.stock.low_stock_count ?? 0);

  const selectTab = useCallback((tab: TabId) => {
    setActiveTab(tab);
    setMountedTabs((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
  }, []);

  if (isLoading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!isAuthenticated || !profile) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Espace exposant</h1>
            {totalAlerts > 0 && (
              <button
                type="button"
                onClick={() => selectTab('overview')}
                className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
              >
                <Bell className="h-3 w-3" /> {totalAlerts} alerte{totalAlerts > 1 ? 's' : ''}
              </button>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Bonjour {profile.first_name || profile.email?.split('@')[0]} • Pilotez votre activite, vos candidatures et vos ventes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/pos" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
            <ShoppingCart className="h-4 w-4" /> Ouvrir la caisse
          </Link>
          <div className="flex items-center rounded-md border border-border bg-card">
            <Link to="/pos/products" title="Produits" className="inline-flex items-center gap-1.5 border-r border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">
              <Store className="h-4 w-4" /> Produits
            </Link>
            <Link to="/pos/accounting" title="Comptabilite" className="inline-flex items-center gap-1.5 border-r border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">
              <BarChart3 className="h-4 w-4" /> Compta
            </Link>
            <Link to="/exhibitors" title="Annuaire des exposants" className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">
              <Globe className="h-4 w-4" /> Annuaire
            </Link>
          </div>
        </div>
      </div>

      {/* Tab navigation — pill style with badges */}
      <div className="mb-6 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <nav className="inline-flex gap-1 rounded-xl border border-border bg-muted/40 p-1" aria-label="Onglets">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const b = tabBadge[tab.id];
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => selectTab(tab.id)}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {b && (
                  <span
                    className={`inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-semibold ${
                      b.tone === 'red'
                        ? 'bg-red-500 text-white'
                        : b.tone === 'amber'
                        ? 'bg-amber-500 text-white'
                        : 'bg-blue-500 text-white'
                    }`}
                  >
                    {b.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab panels */}
      <div>
        {mountedTabs.has('overview') && (
          <div className={activeTab === 'overview' ? '' : 'hidden'}>
            <OverviewTab
              applications={apps}
              documents={docs}
              accounting={accounting}
              accountingLoading={accountingLoading}
              onJump={selectTab}
            />
          </div>
        )}
        {mountedTabs.has('vitrine') && (
          <div className={activeTab === 'vitrine' ? '' : 'hidden'}>
            <VitrineTab exhibitorId={exhibitorProfile?.id || null} slug={exhibitorProfile?.slug || null} />
          </div>
        )}
        {mountedTabs.has('boutique') && (
          <div className={activeTab === 'boutique' ? '' : 'hidden'}>
            <BoutiqueTab profile={exhibitorProfile} />
          </div>
        )}
        {mountedTabs.has('profile') && <div className={activeTab === 'profile' ? '' : 'hidden'}><ProfileTab /></div>}
        {mountedTabs.has('applications') && <div className={activeTab === 'applications' ? '' : 'hidden'}><ApplicationsTab /></div>}
        {mountedTabs.has('documents') && <div className={activeTab === 'documents' ? '' : 'hidden'}><DocumentsTab /></div>}
        {mountedTabs.has('invoices') && <div className={activeTab === 'invoices' ? '' : 'hidden'}><InvoicesTab /></div>}
        {mountedTabs.has('visibility') && <div className={activeTab === 'visibility' ? '' : 'hidden'}><VisibilityTab /></div>}
      </div>
    </div>
  );
}
