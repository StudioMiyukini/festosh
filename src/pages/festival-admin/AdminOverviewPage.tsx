import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Store,
  Calendar,
  Clock,
  Wallet,
  FileText,
  Download,
  Loader2,
  Plus,
  ArrowRight,
  AlertCircle,
  DollarSign,
  Activity,
  Globe,
  EyeOff,
  Archive,
  CheckCircle,
} from 'lucide-react';
import { useTenantStore } from '@/stores/tenant-store';
import { AdminSetupWizard } from './AdminSetupWizard';
import { api } from '@/lib/api-client';
import { formatTimestamp } from '@/lib/format-utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DashboardStats {
  members: {
    total: number;
    by_role: Record<string, number>;
  };
  applications: {
    total: number;
    submitted: number;
    approved: number;
    rejected: number;
  };
  events: {
    total: number;
  };
  volunteers: {
    shifts_total: number;
    shifts_filled: number;
    volunteers_count: number;
  };
  budget: {
    income_cents: number;
    expense_cents: number;
    balance_cents: number;
  };
  cms_pages: {
    total: number;
    published: number;
    draft: number;
  };
}

// ---------------------------------------------------------------------------
// CSV download helper
// ---------------------------------------------------------------------------

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const downloadCsv = async (url: string, filename: string) => {
  const token = localStorage.getItem('festosh-token');
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return;
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
};

// ---------------------------------------------------------------------------
// Role label mapping
// ---------------------------------------------------------------------------

const ROLE_LABELS: Record<string, string> = {
  owner: 'Proprietaire',
  admin: 'Administrateur',
  editor: 'Editeur',
  moderator: 'Moderateur',
  volunteer: 'Benevole',
  exhibitor: 'Exposant',
};

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  editor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  moderator: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  volunteer: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  exhibitor: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
};

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Soumises',
  approved: 'Approuvees',
  rejected: 'Refusees',
};

const STATUS_COLORS: Record<string, string> = {
  submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AdminOverviewPage() {
  const { festival, activeEdition } = useTenantStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [showWizard, setShowWizard] = useState(true);
  const [festivalStatus, setFestivalStatus] = useState(festival?.status || 'draft');
  const [editionStatus, setEditionStatus] = useState(activeEdition?.status || 'planning');
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);

  const fetchStats = useCallback(async () => {
    if (!festival) return;
    setLoading(true);
    setError(null);

    try {
      const res = await api.get<DashboardStats>(`/festivals/${festival.id}/stats`);
      if (res.success && res.data) {
        setStats(res.data);
      } else {
        setError(res.error || 'Impossible de charger les statistiques.');
      }
    } catch {
      setError('Impossible de charger les donnees du tableau de bord.');
    } finally {
      setLoading(false);
    }
  }, [festival]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (festival) setFestivalStatus(festival.status || 'draft');
    if (activeEdition) setEditionStatus(activeEdition.status || 'planning');
  }, [festival, activeEdition]);

  const toggleFestivalPublish = async (newStatus: string) => {
    if (!festival) return;
    setPublishing(true);
    setPublishMsg(null);
    const res = await api.put(`/festivals/${festival.id}`, { status: newStatus });
    if (res.success) {
      setFestivalStatus(newStatus);
      setPublishMsg({ type: 'success', text: newStatus === 'published' ? 'Festival publie ! Il est maintenant visible dans l\'annuaire.' : newStatus === 'archived' ? 'Festival archive.' : 'Festival repasse en brouillon.' });
    } else {
      setPublishMsg({ type: 'error', text: res.error || 'Erreur' });
    }
    setPublishing(false);
  };

  const toggleEditionStatus = async (newStatus: string) => {
    if (!activeEdition) return;
    setPublishing(true);
    setPublishMsg(null);
    const res = await api.put(`/editions/${activeEdition.id}`, { status: newStatus });
    if (res.success) {
      setEditionStatus(newStatus);
      setPublishMsg({ type: 'success', text: `Edition passee en "${newStatus}".` });
    } else {
      setPublishMsg({ type: 'error', text: res.error || 'Erreur' });
    }
    setPublishing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="mb-3 h-8 w-8 text-destructive" />
        <p className="text-sm text-destructive">{error || 'Aucune donnee disponible.'}</p>
        <button
          type="button"
          onClick={fetchStats}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Reessayer
        </button>
      </div>
    );
  }

  const balancePositive = stats.budget.balance_cents >= 0;

  const statCards = [
    {
      label: 'Membres',
      value: String(stats.members.total),
      detail: `${Object.keys(stats.members.by_role).length} roles`,
      icon: Users,
      color: 'text-blue-500',
    },
    {
      label: 'Exposants',
      value: String(stats.applications.approved),
      detail: `${stats.applications.total} candidature${stats.applications.total !== 1 ? 's' : ''} au total`,
      icon: Store,
      color: 'text-orange-500',
    },
    {
      label: 'Evenements',
      value: String(stats.events.total),
      detail: activeEdition ? activeEdition.name : 'Toutes editions',
      icon: Calendar,
      color: 'text-indigo-500',
    },
    {
      label: 'Benevoles',
      value: `${stats.volunteers.shifts_filled} / ${stats.volunteers.shifts_total}`,
      detail: `${stats.volunteers.volunteers_count} benevole${stats.volunteers.volunteers_count !== 1 ? 's' : ''} inscrit${stats.volunteers.volunteers_count !== 1 ? 's' : ''}`,
      icon: Clock,
      color: 'text-green-500',
    },
    {
      label: 'Budget',
      value: formatCurrency(stats.budget.balance_cents),
      detail: `${formatCurrency(stats.budget.income_cents)} recettes / ${formatCurrency(stats.budget.expense_cents)} depenses`,
      icon: Wallet,
      color: balancePositive ? 'text-green-500' : 'text-red-500',
      valueColor: balancePositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
    },
    {
      label: 'Pages CMS',
      value: String(stats.cms_pages.published),
      detail: `${stats.cms_pages.total} page${stats.cms_pages.total !== 1 ? 's' : ''} au total (${stats.cms_pages.draft} brouillon${stats.cms_pages.draft !== 1 ? 's' : ''})`,
      icon: FileText,
      color: 'text-purple-500',
    },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Vue d&apos;ensemble
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tableau de bord de votre festival.
          </p>
        </div>
      </div>

      {/* ── Publication Banner ────────────────────────────────────────── */}
      {publishMsg && (
        <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${publishMsg.type === 'success' ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400' : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'}`}>
          {publishMsg.text}
        </div>
      )}

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        {/* Festival status */}
        <div className={`rounded-xl border p-5 ${festivalStatus === 'published' ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10' : festivalStatus === 'archived' ? 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/10' : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/10'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {festivalStatus === 'published' ? (
                <Globe className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : festivalStatus === 'archived' ? (
                <Archive className="h-5 w-5 text-gray-500" />
              ) : (
                <EyeOff className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              )}
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Festival : {festivalStatus === 'published' ? 'Publie' : festivalStatus === 'archived' ? 'Archive' : 'Brouillon'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {festivalStatus === 'published' ? 'Visible dans l\'annuaire et sur la carte' : festivalStatus === 'archived' ? 'Masque de l\'annuaire' : 'Non visible publiquement'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {festivalStatus !== 'published' && (
                <button
                  type="button"
                  disabled={publishing}
                  onClick={() => toggleFestivalPublish('published')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
                >
                  {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
                  Publier
                </button>
              )}
              {festivalStatus === 'published' && (
                <button
                  type="button"
                  disabled={publishing}
                  onClick={() => toggleFestivalPublish('draft')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50"
                >
                  <EyeOff className="h-3.5 w-3.5" />
                  Depublier
                </button>
              )}
              {festivalStatus !== 'archived' && (
                <button
                  type="button"
                  disabled={publishing}
                  onClick={() => toggleFestivalPublish('archived')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-accent disabled:opacity-50"
                >
                  <Archive className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Edition status */}
        {activeEdition && (
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Edition : {activeEdition.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Statut : <span className="font-medium">{editionStatus}</span>
                </p>
              </div>
              <select
                value={editionStatus}
                disabled={publishing}
                onChange={(e) => toggleEditionStatus(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="planning">Planification</option>
                <option value="registration_open">Inscriptions ouvertes</option>
                <option value="registration_closed">Inscriptions fermees</option>
                <option value="upcoming">A venir</option>
                <option value="ongoing">En cours</option>
                <option value="completed">Termine</option>
                <option value="cancelled">Annule</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Setup Wizard */}
      {showWizard && festival && activeEdition && (
        <AdminSetupWizard
          festival={festival}
          activeEdition={activeEdition}
          onComplete={() => { setShowWizard(false); fetchStats(); }}
        />
      )}

      {/* Stats Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl border border-border bg-card p-6"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <p className={`mt-2 text-2xl font-bold ${stat.valueColor ?? 'text-foreground'}`}>
                {stat.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.detail}</p>
            </div>
          );
        })}
      </div>

      {/* Members by role + Applications by status */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        {/* Members by role */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
            <Users className="h-4 w-4 text-blue-500" />
            Repartition des membres
          </h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats?.members?.by_role || {}).map(([role, count]) => (
              <span
                key={role}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${ROLE_COLORS[role] ?? 'bg-muted text-muted-foreground'}`}
              >
                {ROLE_LABELS[role] ?? role}
                <span className="font-bold">{count}</span>
              </span>
            ))}
            {Object.keys(stats.members.by_role).length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun membre.</p>
            )}
          </div>
        </div>

        {/* Applications by status */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
            <Store className="h-4 w-4 text-orange-500" />
            Candidatures exposants
          </h2>
          <div className="flex flex-wrap gap-2">
            {(['submitted', 'approved', 'rejected'] as const).map((status) => {
              const count = stats.applications[status];
              if (count === 0) return null;
              return (
                <span
                  key={status}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[status]}`}
                >
                  {STATUS_LABELS[status]}
                  <span className="font-bold">{count}</span>
                </span>
              );
            })}
            {stats.applications.total === 0 && (
              <p className="text-sm text-muted-foreground">Aucune candidature.</p>
            )}
          </div>
        </div>
      </div>

      {/* Export buttons */}
      <div className="mb-8">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
          <Download className="h-4 w-4" />
          Exports CSV
        </h2>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                `/exports/festival/${festival!.id}/members`,
                'membres.csv',
              )
            }
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Users className="h-4 w-4" />
            Membres
            <Download className="h-3 w-3 text-muted-foreground" />
          </button>

          {activeEdition && (
            <>
              <button
                type="button"
                onClick={() =>
                  downloadCsv(
                    `/exports/edition/${activeEdition.id}/exhibitors`,
                    'exposants.csv',
                  )
                }
                className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                <Store className="h-4 w-4" />
                Exposants
                <Download className="h-3 w-3 text-muted-foreground" />
              </button>

              <button
                type="button"
                onClick={() =>
                  downloadCsv(
                    `/exports/edition/${activeEdition.id}/volunteers`,
                    'benevoles.csv',
                  )
                }
                className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                <Clock className="h-4 w-4" />
                Benevoles
                <Download className="h-3 w-3 text-muted-foreground" />
              </button>

              <button
                type="button"
                onClick={() =>
                  downloadCsv(
                    `/exports/edition/${activeEdition.id}/budget`,
                    'budget.csv',
                  )
                }
                className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                <DollarSign className="h-4 w-4" />
                Budget
                <Download className="h-3 w-3 text-muted-foreground" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
          <Activity className="h-4 w-4" />
          Actions rapides
        </h2>
        <div className="flex flex-wrap gap-3">
          <a
            href={`/f/${festival?.slug}/admin/programming`}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Plus className="h-4 w-4" />
            Creer un evenement
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
          </a>
          <a
            href={`/f/${festival?.slug}/admin/exhibitors`}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Store className="h-4 w-4" />
            Gerer les exposants
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
          </a>
          <a
            href={`/f/${festival?.slug}/admin/volunteers`}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Users className="h-4 w-4" />
            Gerer les benevoles
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
          </a>
          <a
            href={`/f/${festival?.slug}/admin/budget`}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <DollarSign className="h-4 w-4" />
            Ajouter une depense
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
          </a>
          <a
            href={`/f/${festival?.slug}/admin/cms`}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <FileText className="h-4 w-4" />
            Editer les pages CMS
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
          </a>
        </div>
      </div>
    </div>
  );
}
