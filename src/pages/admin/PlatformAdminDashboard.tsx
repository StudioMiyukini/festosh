import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Tent,
  Calendar,
  Loader2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { formatTimestamp } from '@/lib/format-utils';
import {
  PLATFORM_PLATFORM_ROLE_LABELS,
  FESTIVAL_FESTIVAL_STATUS_LABELS,
  FESTIVAL_FESTIVAL_STATUS_COLORS,
} from '@/lib/labels';

interface PlatformStats {
  users_count: number;
  festivals_count: number;
  editions_count: number;
  users_by_role: Record<string, number>;
  festivals_by_status: Record<string, number>;
  recent_users: Array<{
    id: string;
    username: string;
    email: string;
    display_name: string | null;
    platform_role: string;
    created_at: number;
  }>;
  recent_festivals: Array<{
    id: string;
    name: string;
    slug: string;
    status: string;
    city: string | null;
    created_at: number;
  }>;
}


export function PlatformAdminDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      const res = await api.get<PlatformStats>('/platform-admin/stats');
      if (res.success && res.data) {
        setStats(res.data);
      } else {
        setError(res.error || 'Erreur lors du chargement des statistiques');
      }
      setLoading(false);
    }
    fetchStats();
  }, []);

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
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Tableau de bord</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vue d'ensemble de la plateforme Festosh.
        </p>
      </div>

      {/* Stats cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Utilisateurs</p>
            <Users className="h-5 w-5 text-primary" />
          </div>
          <p className="mt-2 text-3xl font-bold text-foreground">{stats.users_count}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.entries(stats.users_by_role).map(([role, count]) => (
              <span key={role} className="text-xs text-muted-foreground">
                {PLATFORM_ROLE_LABELS[role] || role}: {count}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Festivals</p>
            <Tent className="h-5 w-5 text-primary" />
          </div>
          <p className="mt-2 text-3xl font-bold text-foreground">{stats.festivals_count}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.entries(stats.festivals_by_status).map(([status, count]) => (
              <span key={status} className="text-xs text-muted-foreground">
                {FESTIVAL_STATUS_LABELS[status] || status}: {count}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Editions</p>
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <p className="mt-2 text-3xl font-bold text-foreground">{stats.editions_count}</p>
        </div>
      </div>

      {/* Recent items */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent users */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-sm font-semibold text-foreground">Derniers utilisateurs</h2>
            <Link
              to="/admin/users"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Voir tout <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {stats.recent_users.map((user) => (
              <div key={user.id} className="flex items-center justify-between px-6 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {user.display_name || user.username}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
                <div className="ml-4 flex flex-col items-end gap-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    {PLATFORM_ROLE_LABELS[user.platform_role] || user.platform_role}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatTimestamp(user.created_at)}
                  </span>
                </div>
              </div>
            ))}
            {stats.recent_users.length === 0 && (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                Aucun utilisateur
              </p>
            )}
          </div>
        </div>

        {/* Recent festivals */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-sm font-semibold text-foreground">Derniers festivals</h2>
            <Link
              to="/admin/festivals"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Voir tout <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {stats.recent_festivals.map((festival) => (
              <div key={festival.id} className="flex items-center justify-between px-6 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{festival.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {festival.slug}{festival.city ? ` — ${festival.city}` : ''}
                  </p>
                </div>
                <div className="ml-4 flex flex-col items-end gap-1">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      FESTIVAL_STATUS_COLORS[festival.status] || 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {FESTIVAL_STATUS_LABELS[festival.status] || festival.status}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatTimestamp(festival.created_at)}
                  </span>
                </div>
              </div>
            ))}
            {stats.recent_festivals.length === 0 && (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                Aucun festival
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
