import { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  TrendingUp,
  Users,
  Sparkles,
  Search,
  XCircle,
  Receipt,
  CreditCard,
  Gift,
  Check,
  X,
} from 'lucide-react';
import { api, ApiClient } from '@/lib/api-client';
import { formatCurrency, formatTimestamp } from '@/lib/format-utils';
import { useDebounce } from '@/hooks/use-debounce';

/* ---------- Types ---------- */

interface RevenueStats {
  total_revenue: number;
  monthly_revenue: number;
  active_subscriptions: number;
  beta_users: number;
  mrr: number;
}

interface Subscription {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  plan_name: string;
  plan_slug: string;
  status: string;
  started_at: number;
  current_period_end: number;
}

interface Invoice {
  id: string;
  number: string;
  client_name: string;
  description: string;
  amount_ht: number;
  amount_tva: number;
  amount_ttc: number;
  status: string;
  created_at: number;
}

interface Plan {
  id: string;
  name: string;
  slug: string;
}

/* ---------- Constants ---------- */

const PAGE_SIZE = 20;

const SUB_STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  trialing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  past_due: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const SUB_STATUS_LABEL: Record<string, string> = {
  active: 'Actif',
  cancelled: 'Annule',
  trialing: 'Essai',
  past_due: 'En retard',
};

const INV_STATUS_BADGE: Record<string, string> = {
  paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const INV_STATUS_LABEL: Record<string, string> = {
  paid: 'Payee',
  pending: 'En attente',
  overdue: 'En retard',
  draft: 'Brouillon',
};

type Tab = 'subscriptions' | 'invoices' | 'grant';

/* ---------- Component ---------- */

export function PlatformAdminBilling() {
  /* ---- Shared state ---- */
  const [activeTab, setActiveTab] = useState<Tab>('subscriptions');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  /* ---- Revenue stats ---- */
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  /* ---- Subscriptions tab ---- */
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [subsTotal, setSubsTotal] = useState(0);
  const [subsPage, setSubsPage] = useState(0);
  const [subsLoading, setSubsLoading] = useState(true);
  const [subsError, setSubsError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchInput, 300);

  /* ---- Invoices tab ---- */
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invTotal, setInvTotal] = useState(0);
  const [invPage, setInvPage] = useState(0);
  const [invLoading, setInvLoading] = useState(true);
  const [invError, setInvError] = useState<string | null>(null);

  /* ---- Grant tab ---- */
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [grantUserId, setGrantUserId] = useState('');
  const [grantPlanId, setGrantPlanId] = useState('');
  const [grantMonths, setGrantMonths] = useState(1);
  const [grantLifetime, setGrantLifetime] = useState(false);
  const [grantFree, setGrantFree] = useState(false);
  const [grantNote, setGrantNote] = useState('');
  const [granting, setGranting] = useState(false);
  const [grantResult, setGrantResult] = useState<string | null>(null);

  /* ---- Fetch revenue stats ---- */
  useEffect(() => {
    api.get<RevenueStats>('/billing/admin/revenue').then((res) => {
      if (res.success && res.data) {
        setStats(res.data);
      }
      setStatsLoading(false);
    });
  }, []);

  /* ---- Fetch subscriptions ---- */
  const fetchSubscriptions = useCallback(async () => {
    setSubsLoading(true);
    setSubsError(null);

    const qs = ApiClient.queryString({
      limit: PAGE_SIZE,
      offset: subsPage * PAGE_SIZE,
      status: statusFilter || undefined,
      search: debouncedSearch || undefined,
    });

    const res = await api.get<Subscription[]>(`/billing/admin/subscriptions${qs}`);

    if (res.success && res.data) {
      setSubscriptions(Array.isArray(res.data) ? res.data : []);
      setSubsTotal(res.pagination?.total ?? res.data.length);
    } else {
      setSubsError(res.error || 'Erreur lors du chargement des abonnements');
    }
    setSubsLoading(false);
  }, [subsPage, statusFilter, debouncedSearch]);

  useEffect(() => {
    if (activeTab === 'subscriptions') {
      fetchSubscriptions();
    }
  }, [activeTab, fetchSubscriptions]);

  /* ---- Fetch invoices ---- */
  const fetchInvoices = useCallback(async () => {
    setInvLoading(true);
    setInvError(null);

    const qs = ApiClient.queryString({
      limit: PAGE_SIZE,
      offset: invPage * PAGE_SIZE,
    });

    const res = await api.get<Invoice[]>(`/billing/admin/invoices${qs}`);

    if (res.success && res.data) {
      setInvoices(Array.isArray(res.data) ? res.data : []);
      setInvTotal(res.pagination?.total ?? res.data.length);
    } else {
      setInvError(res.error || 'Erreur lors du chargement des factures');
    }
    setInvLoading(false);
  }, [invPage]);

  useEffect(() => {
    if (activeTab === 'invoices') {
      fetchInvoices();
    }
  }, [activeTab, fetchInvoices]);

  /* ---- Fetch plans (for grant tab) ---- */
  useEffect(() => {
    if (activeTab === 'grant' && plans.length === 0) {
      setPlansLoading(true);
      api.get<Plan[]>('/subscriptions/plans').then((res) => {
        if (res.success && res.data) {
          const list = Array.isArray(res.data) ? res.data : [];
          setPlans(list);
          if (list.length > 0 && !grantPlanId) {
            setGrantPlanId(list[0].id);
          }
        }
        setPlansLoading(false);
      });
    }
  }, [activeTab, plans.length, grantPlanId]);

  /* ---- Cancel subscription ---- */
  const handleCancel = async (id: string) => {
    setCancellingId(id);
    const res = await api.post(`/billing/admin/cancel/${id}`);
    if (res.success) {
      setMessage({ type: 'success', text: 'Abonnement annule avec succes.' });
      fetchSubscriptions();
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de l\'annulation.' });
    }
    setCancellingId(null);
  };

  /* ---- Grant subscription ---- */
  const handleGrant = async () => {
    if (!grantUserId.trim() || !grantPlanId) return;
    setGranting(true);
    setGrantResult(null);
    setMessage(null);

    const res = await api.post<{ subscription_id: string; message?: string }>('/billing/admin/grant', {
      user_id: grantUserId.trim(),
      plan_id: grantPlanId || undefined,
      months: grantLifetime ? undefined : grantMonths,
      lifetime: grantLifetime || undefined,
      free: grantFree || grantLifetime || undefined,
      note: grantNote.trim() || undefined,
    });

    if (res.success && res.data) {
      setGrantResult(res.data.subscription_id);
      setMessage({ type: 'success', text: 'Abonnement accorde avec succes.' });
      setGrantUserId('');
      setGrantMonths(1);
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de l\'attribution.' });
    }
    setGranting(false);
  };

  /* ---- Helpers ---- */
  const subsTotalPages = Math.ceil(subsTotal / PAGE_SIZE);
  const invTotalPages = Math.ceil(invTotal / PAGE_SIZE);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'subscriptions', label: 'Abonnements', icon: <CreditCard className="h-4 w-4" /> },
    { key: 'invoices', label: 'Factures', icon: <Receipt className="h-4 w-4" /> },
    { key: 'grant', label: 'Accorder', icon: <Gift className="h-4 w-4" /> },
  ];

  /* ---------- Render ---------- */
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Facturation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vue d'ensemble des revenus, abonnements et factures de la plateforme.
        </p>
      </div>

      {/* Flash message */}
      {message && (
        <div
          className={`mb-4 flex items-center justify-between rounded-md border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400'
              : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'
          }`}
        >
          <span>{message.text}</span>
          <button type="button" onClick={() => setMessage(null)} className="ml-3 flex-shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Revenue stats cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-border bg-card px-5 py-4">
              <div className="mb-2 h-4 w-20 rounded bg-muted" />
              <div className="h-7 w-24 rounded bg-muted" />
            </div>
          ))
        ) : (
          <>
            <div className="rounded-xl border border-border bg-card px-5 py-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">CA Total</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {stats ? formatCurrency(stats.total_revenue) : '-'}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card px-5 py-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">CA ce mois</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {stats ? formatCurrency(stats.monthly_revenue) : '-'}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card px-5 py-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Abonnements actifs</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {stats?.active_subscriptions ?? '-'}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card px-5 py-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Utilisateurs beta</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {stats?.beta_users ?? '-'}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ========== TAB: Abonnements ========== */}
      {activeTab === 'subscriptions' && (
        <div>
          {/* MRR display */}
          {stats && (
            <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>MRR : <strong className="text-foreground">{formatCurrency(stats.mrr)}</strong></span>
            </div>
          )}

          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setSubsPage(0);
              }}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Tous les statuts</option>
              <option value="active">Actif</option>
              <option value="cancelled">Annule</option>
              <option value="trialing">Essai</option>
              <option value="past_due">En retard</option>
            </select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setSubsPage(0);
                }}
                placeholder="Rechercher un utilisateur..."
                className="rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <span className="text-xs text-muted-foreground">{subsTotal} abonnement(s)</span>
          </div>

          {/* Subscriptions table */}
          {subsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : subsError ? (
            <div className="flex flex-col items-center py-16">
              <AlertCircle className="mb-2 h-6 w-6 text-destructive" />
              <p className="text-sm text-destructive">{subsError}</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Utilisateur
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Plan
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Statut
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Debut
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Fin periode
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {subscriptions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-muted/50">
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-foreground">
                          {sub.user_name}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                          {sub.user_email}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">
                          {sub.plan_name}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              SUB_STATUS_BADGE[sub.status] || SUB_STATUS_BADGE.active
                            }`}
                          >
                            {SUB_STATUS_LABEL[sub.status] || sub.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                          {formatTimestamp(sub.started_at)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                          {formatTimestamp(sub.current_period_end)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          {sub.status === 'active' || sub.status === 'trialing' || sub.status === 'past_due' ? (
                            <button
                              type="button"
                              disabled={cancellingId === sub.id}
                              onClick={() => handleCancel(sub.id)}
                              className="inline-flex items-center gap-1.5 rounded-md border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                            >
                              {cancellingId === sub.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5" />
                              )}
                              Annuler
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {subscriptions.length === 0 && (
                <div className="p-12 text-center">
                  <CreditCard className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Aucun abonnement trouve.</p>
                </div>
              )}

              {/* Pagination */}
              {subsTotalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border px-4 py-3">
                  <p className="text-xs text-muted-foreground">
                    Page {subsPage + 1} sur {subsTotalPages}
                  </p>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      disabled={subsPage === 0}
                      onClick={() => setSubsPage((p) => p - 1)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-accent disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={subsPage >= subsTotalPages - 1}
                      onClick={() => setSubsPage((p) => p + 1)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-accent disabled:opacity-50"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========== TAB: Factures ========== */}
      {activeTab === 'invoices' && (
        <div>
          {invLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : invError ? (
            <div className="flex flex-col items-center py-16">
              <AlertCircle className="mb-2 h-6 w-6 text-destructive" />
              <p className="text-sm text-destructive">{invError}</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        N° Facture
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Client
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Libelle
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        HT
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        TVA
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        TTC
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Statut
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-muted/50">
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-foreground">
                          {inv.number}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">
                          {inv.client_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {inv.description}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-foreground">
                          {formatCurrency(inv.amount_ht)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-muted-foreground">
                          {formatCurrency(inv.amount_tva)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-foreground">
                          {formatCurrency(inv.amount_ttc)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              INV_STATUS_BADGE[inv.status] || INV_STATUS_BADGE.pending
                            }`}
                          >
                            {INV_STATUS_LABEL[inv.status] || inv.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                          {formatTimestamp(inv.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {invoices.length === 0 && (
                <div className="p-12 text-center">
                  <Receipt className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Aucune facture trouvee.</p>
                </div>
              )}

              {/* Pagination */}
              {invTotalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border px-4 py-3">
                  <p className="text-xs text-muted-foreground">
                    Page {invPage + 1} sur {invTotalPages}
                  </p>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      disabled={invPage === 0}
                      onClick={() => setInvPage((p) => p - 1)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-accent disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={invPage >= invTotalPages - 1}
                      onClick={() => setInvPage((p) => p + 1)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-accent disabled:opacity-50"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========== TAB: Accorder un abonnement ========== */}
      {activeTab === 'grant' && (
        <div className="mx-auto max-w-lg">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5">
                <Gift className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Accorder un abonnement</h2>
                <p className="text-sm text-muted-foreground">
                  Attribuez manuellement un abonnement a un utilisateur.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* User ID */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  ID Utilisateur
                </label>
                <input
                  type="text"
                  value={grantUserId}
                  onChange={(e) => setGrantUserId(e.target.value)}
                  placeholder="ex: a1b2c3d4-e5f6-..."
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Plan */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Plan
                </label>
                {plansLoading ? (
                  <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Chargement des plans...
                  </div>
                ) : (
                  <select
                    value={grantPlanId}
                    onChange={(e) => setGrantPlanId(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {plans.length === 0 && <option value="">Aucun plan disponible</option>}
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Type d'offre */}
              <div className="space-y-3 rounded-lg border border-border p-4">
                <p className="text-sm font-medium text-foreground">Type d'offre</p>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={grantLifetime}
                    onChange={(e) => { setGrantLifetime(e.target.checked); if (e.target.checked) setGrantFree(true); }}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="text-sm font-medium text-foreground">Abonnement a vie</span>
                    <p className="text-xs text-muted-foreground">Acces gratuit permanent, sans date d'expiration</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={grantFree}
                    onChange={(e) => setGrantFree(e.target.checked)}
                    disabled={grantLifetime}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary disabled:opacity-50"
                  />
                  <div>
                    <span className="text-sm font-medium text-foreground">Gratuit</span>
                    <p className="text-xs text-muted-foreground">Facture a 0€ (offert par l'administrateur)</p>
                  </div>
                </label>
              </div>

              {/* Duration (hidden if lifetime) */}
              {!grantLifetime && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Duree (mois)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={grantMonths}
                    onChange={(e) => setGrantMonths(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {grantFree ? `${grantMonths} mois offerts gratuitement` : `${grantMonths} mois factures`}
                  </p>
                </div>
              )}

              {/* Note */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Note (optionnel)
                </label>
                <input
                  type="text"
                  value={grantNote}
                  onChange={(e) => setGrantNote(e.target.value)}
                  placeholder="Ex: Partenaire officiel, early supporter..."
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Submit */}
              <button
                type="button"
                disabled={granting || !grantUserId.trim()}
                onClick={handleGrant}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {granting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Gift className="h-4 w-4" />
                )}
                Accorder
              </button>

              {/* Grant result */}
              {grantResult && (
                <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm dark:border-green-800 dark:bg-green-900/20">
                  <Check className="h-4 w-4 flex-shrink-0 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-300">Abonnement cree</p>
                    <p className="mt-0.5 font-mono text-xs text-green-600 dark:text-green-400">
                      ID : {grantResult}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
