import { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  AlertCircle,
  Ticket,
  TrendingUp,
  Users,
  Heart,
  BarChart3,
} from 'lucide-react';
import { useTenantStore } from '@/stores/tenant-store';
import { api } from '@/lib/api-client';
import { formatCurrency } from '@/lib/format-utils';

interface AnalyticsDashboard {
  attendance: {
    tickets_sold: number;
    tickets_scanned: number;
    scan_rate: number;
  };
  revenue: {
    ticket_revenue: number;
    pos_sales_revenue: number;
    marketplace_revenue: number;
    sponsor_revenue: number;
  };
  exhibitors: {
    total: number;
    accepted: number;
    pending: number;
    rejected: number;
  };
  engagement: {
    votes_cast: number;
    raffle_entries: number;
    stamps_collected: number;
  };
  marketplace: {
    orders_count: number;
    gmv: number;
  };
}

export function AdminAnalyticsPage() {
  const { activeEdition } = useTenantStore();

  const [data, setData] = useState<AnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!activeEdition) return;
    setLoading(true);
    setError(null);

    const res = await api.get<AnalyticsDashboard>(`/analytics/edition/${activeEdition.id}/dashboard`);
    if (res.success && res.data) {
      setData(res.data);
    } else {
      setError(res.error || 'Impossible de charger les statistiques.');
    }
    setLoading(false);
  }, [activeEdition]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <BarChart3 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Aucune donnee disponible.</p>
      </div>
    );
  }

  const revenueBreakdown = [
    { label: 'Billets', value: data.revenue.ticket_revenue, color: 'bg-blue-500' },
    { label: 'Point de vente', value: data.revenue.pos_sales_revenue, color: 'bg-green-500' },
    { label: 'Marketplace', value: data.revenue.marketplace_revenue, color: 'bg-purple-500' },
    { label: 'Sponsors', value: data.revenue.sponsor_revenue, color: 'bg-orange-500' },
  ];

  const totalRevenue = data.revenue.ticket_revenue + data.revenue.pos_sales_revenue + data.revenue.marketplace_revenue + data.revenue.sponsor_revenue;
  const maxRevenue = Math.max(...revenueBreakdown.map((r) => r.value), 1);

  const exhibitorStatuses = [
    { label: 'Acceptes', value: data.exhibitors.accepted, color: 'bg-green-500' },
    { label: 'En attente', value: data.exhibitors.pending, color: 'bg-yellow-500' },
    { label: 'Refuses', value: data.exhibitors.rejected, color: 'bg-red-500' },
  ];

  const ticketMax = Math.max(data.attendance.tickets_sold, 1);

if (!activeEdition) {    return <div className="flex items-center justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;  }
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Statistiques</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vue d&apos;ensemble des performances de votre edition.
        </p>
      </div>

      {/* Top-level KPI Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Billets vendus</p>
            <Ticket className="h-4 w-4 text-blue-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{data.attendance.tickets_sold}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {data.attendance.tickets_scanned} scannes
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">CA Total</p>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {formatCurrency(totalRevenue)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Exposants</p>
            <Users className="h-4 w-4 text-purple-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{data.exhibitors.total}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {data.exhibitors.accepted} acceptes
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Engagement</p>
            <Heart className="h-4 w-4 text-red-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {data.engagement.votes_cast + data.engagement.raffle_entries + data.engagement.stamps_collected}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            interactions totales
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Affluence: Sold vs Scanned */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-base font-semibold text-foreground">Affluence</h2>
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Vendus</span>
                <span className="font-medium text-foreground">{data.attendance.tickets_sold}</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-3 rounded-full bg-blue-500 transition-all"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Scannes</span>
                <span className="font-medium text-foreground">{data.attendance.tickets_scanned}</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-3 rounded-full bg-green-500 transition-all"
                  style={{ width: `${(data.attendance.tickets_scanned / ticketMax) * 100}%` }}
                />
              </div>
            </div>
            <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              Taux de scan : {data.attendance.tickets_sold > 0 ? Math.round((data.attendance.tickets_scanned / data.attendance.tickets_sold) * 100) : 0}%
            </div>
            <div className="text-sm text-muted-foreground">
              Revenus billets : <span className="font-medium text-foreground">{formatCurrency(data.revenue.ticket_revenue)}</span>
            </div>
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-base font-semibold text-foreground">Revenus par source</h2>
          <div className="space-y-4">
            {revenueBreakdown.map((item) => (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium text-foreground">{formatCurrency(item.value)}</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-3 rounded-full ${item.color} transition-all`}
                    style={{ width: `${(item.value / maxRevenue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">Total</span>
                <span className="font-bold text-foreground">{formatCurrency(totalRevenue)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Exhibitors by Status */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-base font-semibold text-foreground">Exposants par statut</h2>
          {data.exhibitors.total === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun exposant.</p>
          ) : (
            <div className="space-y-4">
              {exhibitorStatuses.map((item) => (
                <div key={item.label}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium text-foreground">{item.value}</span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-3 rounded-full ${item.color} transition-all`}
                      style={{ width: `${(item.value / data.exhibitors.total) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="border-t border-border pt-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">Total</span>
                  <span className="font-bold text-foreground">{data.exhibitors.total}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Engagement */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-base font-semibold text-foreground">Engagement</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-border p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{data.engagement.votes_cast}</p>
              <p className="mt-1 text-xs text-muted-foreground">Votes</p>
            </div>
            <div className="rounded-lg border border-border p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{data.engagement.raffle_entries}</p>
              <p className="mt-1 text-xs text-muted-foreground">Tombola</p>
            </div>
            <div className="rounded-lg border border-border p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{data.engagement.stamps_collected}</p>
              <p className="mt-1 text-xs text-muted-foreground">Tampons</p>
            </div>
          </div>
          <div className="mt-4 rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            Total interactions : {data.engagement.votes_cast + data.engagement.raffle_entries + data.engagement.stamps_collected}
          </div>
        </div>
      </div>
    </div>
  );
}
