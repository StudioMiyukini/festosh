import { useState, useEffect, useCallback } from 'react';
import {
  Store,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  MapPin,
} from 'lucide-react';
import { useTenantStore } from '@/stores/tenant-store';
import { api } from '@/lib/api-client';
import type { ApplicationStatus } from '@/types/enums';
import type { BoothApplication, ExhibitorProfile, BoothLocation } from '@/types/exhibitor';

type TabKey = 'applications' | 'exhibitors' | 'booths';

const STATUS_OPTIONS: { value: ApplicationStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'submitted', label: 'Soumises' },
  { value: 'under_review', label: 'En cours' },
  { value: 'approved', label: 'Approuvees' },
  { value: 'rejected', label: 'Refusees' },
  { value: 'waitlisted', label: "Liste d'attente" },
];

const statusConfig: Record<
  ApplicationStatus,
  { label: string; className: string; icon: typeof Clock }
> = {
  draft: {
    label: 'Brouillon',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400',
    icon: Clock,
  },
  submitted: {
    label: 'Soumise',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
    icon: Clock,
  },
  under_review: {
    label: 'En cours',
    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
    icon: Clock,
  },
  approved: {
    label: 'Approuvee',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
    icon: CheckCircle,
  },
  rejected: {
    label: 'Refusee',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
    icon: XCircle,
  },
  waitlisted: {
    label: 'Attente',
    className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
    icon: Clock,
  },
  cancelled: {
    label: 'Annulee',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400',
    icon: XCircle,
  },
};

export function AdminExhibitorsPage() {
  const { festival } = useTenantStore();

  const [activeTab, setActiveTab] = useState<TabKey>('applications');
  const [applications, setApplications] = useState<BoothApplication[]>([]);
  const [profiles, setProfiles] = useState<ExhibitorProfile[]>([]);
  const [booths, setBooths] = useState<BoothLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!festival) return;
    setLoading(true);
    setError(null);

    const [appsRes, profilesRes, boothsRes] = await Promise.all([
      api.get<BoothApplication[]>(`/exhibitors/festival/${festival.id}/applications`),
      api.get<ExhibitorProfile[]>(`/exhibitors/festival/${festival.id}/profiles`),
      api.get<BoothLocation[]>(`/exhibitors/festival/${festival.id}/booths`),
    ]);

    if (appsRes.success && appsRes.data) {
      setApplications(appsRes.data);
    } else {
      setError(appsRes.error || 'Impossible de charger les candidatures.');
    }
    if (profilesRes.success && profilesRes.data) {
      setProfiles(profilesRes.data);
    }
    if (boothsRes.success && boothsRes.data) {
      setBooths(boothsRes.data);
    }
    setLoading(false);
  }, [festival]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateStatus = async (applicationId: string, newStatus: ApplicationStatus) => {
    if (!festival) return;
    setUpdatingId(applicationId);
    setMessage(null);

    const res = await api.put<BoothApplication>(
      `/exhibitors/festival/${festival.id}/applications/${applicationId}`,
      { status: newStatus }
    );

    if (res.success && res.data) {
      setApplications((prev) =>
        prev.map((a) => (a.id === applicationId ? res.data! : a))
      );
      setMessage({
        type: 'success',
        text: `Candidature ${newStatus === 'approved' ? 'approuvee' : 'refusee'}.`,
      });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la mise a jour.' });
    }
    setUpdatingId(null);
  };

  const getProfileName = (exhibitorId: string) => {
    const profile = profiles.find((p) => p.id === exhibitorId);
    return profile?.company_name || 'Inconnu';
  };

  const filteredApplications = applications.filter((app) => {
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    const profileName = getProfileName(app.exhibitor_id).toLowerCase();
    const matchesSearch =
      searchQuery === '' || profileName.includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'applications', label: 'Candidatures', count: applications.length },
    { key: 'exhibitors', label: 'Exposants', count: profiles.length },
    { key: 'booths', label: 'Emplacements', count: booths.length },
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
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Exposants</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerez les candidatures et les exposants de votre festival.
        </p>
      </div>

      {/* Feedback message */}
      {message && (
        <div
          className={`mb-6 rounded-md border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400'
              : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}{' '}
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab: Candidatures */}
      {activeTab === 'applications' && (
        <>
          {/* Search + Filters */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Rechercher par nom..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    statusFilter === opt.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Applications Table */}
          <div className="rounded-xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Exposant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Paiement
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredApplications.map((app) => {
                    const config = statusConfig[app.status];
                    const isUpdating = updatingId === app.id;
                    return (
                      <tr key={app.id} className="hover:bg-muted/50">
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Store className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground">
                              {getProfileName(app.exhibitor_id)}
                            </span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}
                          >
                            {config.label}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                          {new Date(app.created_at).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                          {app.payment_received ? (
                            <span className="inline-flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-3 w-3" />
                              Recu
                            </span>
                          ) : (
                            <span className="text-muted-foreground">En attente</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {(app.status === 'submitted' || app.status === 'under_review') && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(app.id, 'approved')}
                                  disabled={isUpdating}
                                  className="inline-flex items-center gap-1 rounded-md bg-green-100 px-3 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-200 disabled:opacity-50 dark:bg-green-900/20 dark:text-green-400"
                                >
                                  {isUpdating ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <CheckCircle className="h-3 w-3" />
                                  )}
                                  Approuver
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(app.id, 'rejected')}
                                  disabled={isUpdating}
                                  className="inline-flex items-center gap-1 rounded-md bg-red-100 px-3 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-200 disabled:opacity-50 dark:bg-red-900/20 dark:text-red-400"
                                >
                                  {isUpdating ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <XCircle className="h-3 w-3" />
                                  )}
                                  Refuser
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredApplications.length === 0 && (
              <div className="p-12 text-center">
                <p className="text-sm text-muted-foreground">
                  Aucune candidature ne correspond aux filtres.
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Tab: Exposants */}
      {activeTab === 'exhibitors' && (
        <div className="rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Entreprise
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Ville
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Site web
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {profiles.map((profile) => (
                  <tr key={profile.id} className="hover:bg-muted/50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {profile.company_name}
                          </p>
                          {profile.legal_name && (
                            <p className="text-xs text-muted-foreground">{profile.legal_name}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <p className="text-sm text-foreground">{profile.contact_email}</p>
                      {profile.contact_phone && (
                        <p className="text-xs text-muted-foreground">{profile.contact_phone}</p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                      {profile.city || '—'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                      {profile.website_url ? (
                        <a
                          href={profile.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Voir le site
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {profiles.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-sm text-muted-foreground">Aucun profil exposant.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Emplacements */}
      {activeTab === 'booths' && (
        <div className="rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Zone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Dimensions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Prix
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Disponible
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {booths.map((booth) => (
                  <tr key={booth.id} className="hover:bg-muted/50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">{booth.code}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                      {booth.zone || '—'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                      {booth.width && booth.depth
                        ? `${booth.width}m x ${booth.depth}m`
                        : '—'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                      {booth.price_cents != null
                        ? new Intl.NumberFormat('fr-FR', {
                            style: 'currency',
                            currency: 'EUR',
                          }).format(booth.price_cents / 100)
                        : '—'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center">
                      {booth.is_available ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                          <CheckCircle className="h-3 w-3" />
                          Oui
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                          <XCircle className="h-3 w-3" />
                          Non
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {booths.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-sm text-muted-foreground">Aucun emplacement defini.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
