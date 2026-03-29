import { useState, useEffect, useCallback } from 'react';
import {
  Store,
  Users,
  DollarSign,
  Calendar,
  Activity,
  Loader2,
  Plus,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { useTenantStore } from '@/stores/tenant-store';
import { api } from '@/lib/api-client';
import type { Event } from '@/types/programming';
import type { BoothApplication } from '@/types/exhibitor';
import type { Shift } from '@/types/volunteer';
import type { BudgetEntry } from '@/types/budget';

interface BudgetSummary {
  total_income: number;
  total_expenses: number;
  balance: number;
}

export function AdminOverviewPage() {
  const { festival, activeEdition } = useTenantStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [eventsCount, setEventsCount] = useState(0);
  const [applicationsCount, setApplicationsCount] = useState(0);
  const [shiftsCount, setShiftsCount] = useState(0);
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(null);

  const [recentEvents, setRecentEvents] = useState<Event[]>([]);
  const [recentApplications, setRecentApplications] = useState<BoothApplication[]>([]);
  const [recentShifts, setRecentShifts] = useState<Shift[]>([]);
  const [recentEntries, setRecentEntries] = useState<BudgetEntry[]>([]);

  const fetchData = useCallback(async () => {
    if (!festival) return;
    setLoading(true);
    setError(null);

    try {
      const editionQuery = activeEdition ? `?edition_id=${activeEdition.id}` : '';

      const [eventsRes, applicationsRes, shiftsRes, budgetRes, entriesRes] = await Promise.all([
        api.get<Event[]>(`/events/festival/${festival.id}${editionQuery}`),
        api.get<BoothApplication[]>(`/exhibitors/festival/${festival.id}/applications`),
        api.get<Shift[]>(`/volunteers/festival/${festival.id}/shifts`),
        api.get<BudgetSummary>(`/budget/festival/${festival.id}/summary`),
        api.get<BudgetEntry[]>(`/budget/festival/${festival.id}/entries`),
      ]);

      if (eventsRes.success && eventsRes.data) {
        setEventsCount(eventsRes.data.length);
        setRecentEvents(eventsRes.data.slice(0, 3));
      }
      if (applicationsRes.success && applicationsRes.data) {
        setApplicationsCount(applicationsRes.data.length);
        setRecentApplications(applicationsRes.data.slice(0, 3));
      }
      if (shiftsRes.success && shiftsRes.data) {
        setShiftsCount(shiftsRes.data.length);
        setRecentShifts(shiftsRes.data.slice(0, 3));
      }
      if (budgetRes.success && budgetRes.data) {
        setBudgetSummary(budgetRes.data);
      }
      if (entriesRes.success && entriesRes.data) {
        setRecentEntries(entriesRes.data.slice(0, 3));
      }
    } catch {
      setError('Impossible de charger les donnees du tableau de bord.');
    } finally {
      setLoading(false);
    }
  }, [festival, activeEdition]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);

  const stats = [
    {
      label: 'Evenements',
      value: String(eventsCount),
      detail: activeEdition ? activeEdition.name : 'Toutes editions',
      icon: Calendar,
    },
    {
      label: 'Candidatures',
      value: String(applicationsCount),
      detail: 'Exposants',
      icon: Store,
    },
    {
      label: 'Creneaux benevoles',
      value: String(shiftsCount),
      detail: 'Postes ouverts',
      icon: Users,
    },
    {
      label: 'Solde budget',
      value: budgetSummary ? formatCurrency(budgetSummary.balance) : '—',
      detail: budgetSummary
        ? `${formatCurrency(budgetSummary.total_income)} recettes`
        : 'Chargement...',
      icon: DollarSign,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="mb-3 h-8 w-8 text-destructive" />
        <p className="text-sm text-destructive">{error}</p>
        <button
          type="button"
          onClick={fetchData}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Reessayer
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Vue d&apos;ensemble
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tableau de bord de votre festival.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl border border-border bg-card p-6"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.detail}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="mb-4 text-base font-semibold text-foreground">Actions rapides</h2>
        <div className="flex flex-wrap gap-3">
          <a
            href="/admin/programming"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Plus className="h-4 w-4" />
            Creer un evenement
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
          </a>
          <a
            href="/admin/exhibitors"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Store className="h-4 w-4" />
            Gerer les exposants
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
          </a>
          <a
            href="/admin/volunteers"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Users className="h-4 w-4" />
            Gerer les benevoles
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
          </a>
          <a
            href="/admin/budget"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <DollarSign className="h-4 w-4" />
            Ajouter une depense
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
          </a>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Activity className="h-4 w-4" />
            Activite recente
          </h2>
        </div>
        <div className="divide-y divide-border">
          {recentEvents.map((event) => (
            <div key={`event-${event.id}`} className="flex items-start justify-between px-6 py-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <p className="text-sm text-foreground">
                  Evenement : <span className="font-medium">{event.title}</span>
                </p>
              </div>
              <span className="ml-4 flex-shrink-0 text-xs text-muted-foreground">
                {new Date(event.start_time).toLocaleDateString('fr-FR')}
              </span>
            </div>
          ))}
          {recentApplications.map((app) => (
            <div key={`app-${app.id}`} className="flex items-start justify-between px-6 py-4">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-orange-500" />
                <p className="text-sm text-foreground">
                  Candidature exposant — statut :{' '}
                  <span className="font-medium">{app.status}</span>
                </p>
              </div>
              <span className="ml-4 flex-shrink-0 text-xs text-muted-foreground">
                {new Date(app.created_at).toLocaleDateString('fr-FR')}
              </span>
            </div>
          ))}
          {recentShifts.map((shift) => (
            <div key={`shift-${shift.id}`} className="flex items-start justify-between px-6 py-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                <p className="text-sm text-foreground">
                  Creneau benevole : <span className="font-medium">{shift.title}</span>
                </p>
              </div>
              <span className="ml-4 flex-shrink-0 text-xs text-muted-foreground">
                {new Date(shift.start_time).toLocaleDateString('fr-FR')}
              </span>
            </div>
          ))}
          {recentEntries.map((entry) => (
            <div key={`entry-${entry.id}`} className="flex items-start justify-between px-6 py-4">
              <div className="flex items-center gap-2">
                <DollarSign className={`h-4 w-4 ${entry.entry_type === 'income' ? 'text-green-500' : 'text-red-500'}`} />
                <p className="text-sm text-foreground">
                  {entry.entry_type === 'income' ? 'Recette' : 'Depense'} :{' '}
                  <span className="font-medium">{entry.description}</span> —{' '}
                  {formatCurrency(entry.amount_cents)}
                </p>
              </div>
              <span className="ml-4 flex-shrink-0 text-xs text-muted-foreground">
                {entry.date}
              </span>
            </div>
          ))}
          {recentEvents.length === 0 &&
            recentApplications.length === 0 &&
            recentShifts.length === 0 &&
            recentEntries.length === 0 && (
              <div className="px-6 py-8 text-center">
                <p className="text-sm text-muted-foreground">Aucune activite recente.</p>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
