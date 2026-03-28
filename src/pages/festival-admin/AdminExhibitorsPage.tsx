import { useState } from 'react';
import { Store, Search, Filter, Eye, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { ApplicationStatus } from '@/types/enums';

// TODO: Wire up to service layer - fetch exhibitor applications

const STATUS_OPTIONS: { value: ApplicationStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'submitted', label: 'Soumises' },
  { value: 'under_review', label: 'En cours' },
  { value: 'approved', label: 'Approuvees' },
  { value: 'rejected', label: 'Refusees' },
  { value: 'waitlisted', label: 'Liste d\'attente' },
];

const PLACEHOLDER_APPLICATIONS = [
  {
    id: '1',
    company: 'Atelier du Bois',
    contact: 'Marie Leroy',
    category: 'Artisanat',
    status: 'submitted' as ApplicationStatus,
    date: '2026-03-25',
    booth: null,
  },
  {
    id: '2',
    company: 'La Fabrique Gourmande',
    contact: 'Pierre Martin',
    category: 'Gastronomie',
    status: 'approved' as ApplicationStatus,
    date: '2026-03-20',
    booth: 'B-03',
  },
  {
    id: '3',
    company: 'Studio Crea',
    contact: 'Sophie Durand',
    category: 'Art',
    status: 'under_review' as ApplicationStatus,
    date: '2026-03-22',
    booth: null,
  },
  {
    id: '4',
    company: 'EcoStyle',
    contact: 'Luc Bernard',
    category: 'Mode',
    status: 'rejected' as ApplicationStatus,
    date: '2026-03-18',
    booth: null,
  },
  {
    id: '5',
    company: 'TechLab',
    contact: 'Emma Petit',
    category: 'Technologie',
    status: 'approved' as ApplicationStatus,
    date: '2026-03-15',
    booth: 'D-01',
  },
];

const statusConfig: Record<ApplicationStatus, { label: string; className: string; icon: typeof Clock }> = {
  draft: { label: 'Brouillon', className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400', icon: Clock },
  submitted: { label: 'Soumise', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400', icon: Clock },
  under_review: { label: 'En cours', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400', icon: Clock },
  approved: { label: 'Approuvee', className: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400', icon: CheckCircle },
  rejected: { label: 'Refusee', className: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400', icon: XCircle },
  waitlisted: { label: 'Attente', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400', icon: Clock },
  cancelled: { label: 'Annulee', className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400', icon: XCircle },
};

export function AdminExhibitorsPage() {
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredApplications = PLACEHOLDER_APPLICATIONS.filter((app) => {
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    const matchesSearch =
      searchQuery === '' ||
      app.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.contact.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Exposants</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerez les candidatures et les exposants de votre festival.
        </p>
      </div>

      {/* Search + Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher par nom ou contact..."
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
                  Entreprise
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Categorie
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Stand
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredApplications.map((app) => {
                const config = statusConfig[app.status];
                return (
                  <tr key={app.id} className="hover:bg-muted/50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">
                          {app.company}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                      {app.contact}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                      {app.category}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}
                      >
                        {config.label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                      {app.booth ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                      {app.date}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      {/* TODO: Wire up to service layer - implement application review actions */}
                      <button
                        type="button"
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        title="Voir la candidature"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
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
    </div>
  );
}
