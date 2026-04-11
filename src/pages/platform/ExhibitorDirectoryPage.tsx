import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Loader2,
  MapPin,
  ExternalLink,
  Mail,
  MessageSquare,
  Store,
  ChevronLeft,
  ChevronRight,
  Globe,
} from 'lucide-react';
import { api, ApiClient } from '@/lib/api-client';
import { useDebounce } from '@/hooks/use-debounce';
import { Accessibility } from 'lucide-react';

interface ExhibitorCard {
  id: string;
  user_id: string;
  company_name: string;
  trade_name: string | null;
  activity_type: string | null;
  category: string | null;
  description: string | null;
  logo_url: string | null;
  photo_url: string | null;
  website: string | null;
  city: string | null;
  country: string | null;
  contact_email: string | null;
  social_links?: string | Record<string, string> | null;
  domains?: string[];
  is_pmr?: number;
}

interface DirectoryFilters {
  categories: string[];
  cities: string[];
  domains: string[];
}

interface DirectoryResponse {
  data: ExhibitorCard[];
  filters: DirectoryFilters;
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

const LIMIT = 24;

export function ExhibitorDirectoryPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [domain, setDomain] = useState('');
  const [pmrOnly, setPmrOnly] = useState(false);
  const [offset, setOffset] = useState(0);

  const [exhibitors, setExhibitors] = useState<ExhibitorCard[]>([]);
  const [filters, setFilters] = useState<DirectoryFilters>({ categories: [], cities: [], domains: [] });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  const fetchDirectory = useCallback(async (params: {
    search: string;
    category: string;
    city: string;
    domain: string;
    pmr: boolean;
    offset: number;
  }) => {
    setLoading(true);
    setError(null);

    const qs = ApiClient.queryString({
      search: params.search || undefined,
      category: params.category || undefined,
      city: params.city || undefined,
      domain: params.domain || undefined,
      pmr: params.pmr ? '1' : undefined,
      limit: LIMIT,
      offset: params.offset,
    });

    const result = await api.get<DirectoryResponse>(`/exhibitor-hub/directory${qs}`);

    if (result.data) {
      const response = result.data;
      setExhibitors(response.data);
      setFilters(response.filters);
      setTotal(response.pagination.total);
    } else {
      setError(result.error || 'Une erreur est survenue.');
      setExhibitors([]);
    }

    setLoading(false);
  }, []);

  // Reset offset when filters change
  useEffect(() => {
    setOffset(0);
  }, [debouncedSearch, category, city]);

  // Fetch data when filters or offset change
  useEffect(() => {
    fetchDirectory({
      search: debouncedSearch,
      category,
      city,
      domain,
      pmr: pmrOnly,
      offset,
    });
  }, [debouncedSearch, category, city, domain, pmrOnly, offset, fetchDirectory]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const currentPage = Math.floor(offset / LIMIT) + 1;

  const goToPrevPage = () => {
    if (offset > 0) {
      setOffset((prev) => Math.max(0, prev - LIMIT));
    }
  };

  const goToNextPage = () => {
    if (offset + LIMIT < total) {
      setOffset((prev) => prev + LIMIT);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Annuaire des exposants
        </h1>
        <p className="mt-2 text-muted-foreground">
          Decouvrez les exposants du reseau Festosh
        </p>
      </div>

      {/* Filter Bar */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher un exposant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Category Dropdown */}
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">Toutes les categories</option>
          {filters.categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        {/* City Dropdown */}
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">Toutes les villes</option>
          {filters.cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={domain}
          onChange={(e) => { setDomain(e.target.value); setOffset(0); }}
          className="rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">Tous les domaines</option>
          {filters.domains.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => { setPmrOnly(!pmrOnly); setOffset(0); }}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
            pmrOnly
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-background text-muted-foreground hover:text-foreground'
          }`}
          title="Accessible PMR"
        >
          <Accessibility className="h-4 w-4" />
          PMR
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-12 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : exhibitors.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Store className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Aucun exposant trouve</p>
        </div>
      ) : (
        <>
          {/* Exhibitor Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {exhibitors.map((exhibitor) => (
              <div
                key={exhibitor.id}
                className="flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md"
              >
                {/* Logo / Photo */}
                <div className="flex h-40 items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                  {exhibitor.logo_url || exhibitor.photo_url ? (
                    <img
                      src={exhibitor.logo_url || exhibitor.photo_url!}
                      alt={exhibitor.company_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Store className="h-12 w-12 text-primary/30" />
                  )}
                </div>

                {/* Card Body */}
                <div className="flex flex-1 flex-col p-4">
                  {/* Company Name */}
                  <h3 className="text-base font-bold text-foreground">
                    {exhibitor.company_name}
                  </h3>

                  {/* Badges */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {exhibitor.is_pmr === 1 && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        <Accessibility className="h-2.5 w-2.5" />
                        PMR
                      </span>
                    )}
                    {exhibitor.activity_type && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        {exhibitor.activity_type}
                      </span>
                    )}
                    {exhibitor.category && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {exhibitor.category}
                      </span>
                    )}
                    {Array.isArray(exhibitor.domains) && exhibitor.domains.slice(0, 3).map((d: string) => (
                      <span key={d} className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                        {d}
                      </span>
                    ))}
                  </div>

                  {/* Description */}
                  {exhibitor.description && (
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                      {exhibitor.description}
                    </p>
                  )}

                  {/* Location */}
                  {(exhibitor.city || exhibitor.country) && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span>
                        {[exhibitor.city, exhibitor.country].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}

                  {/* Spacer to push actions to bottom */}
                  <div className="flex-1" />

                  {/* Actions */}
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                    {exhibitor.website && (
                      <a
                        href={exhibitor.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Site web
                      </a>
                    )}
                    {(() => {
                      const links = exhibitor.social_links
                        ? typeof exhibitor.social_links === 'string'
                          ? (() => { try { return JSON.parse(exhibitor.social_links); } catch { return null; } })()
                          : exhibitor.social_links
                        : null;
                      if (!links) return null;
                      const urls: string[] = Array.isArray(links) ? links : Object.values(links);
                      return urls.filter(Boolean).slice(0, 3).map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                          title={url}
                        >
                          <Globe className="h-3 w-3" />
                        </a>
                      ));
                    })()}
                    {exhibitor.contact_email && (
                      <a
                        href={`mailto:${exhibitor.contact_email}`}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Mail className="h-3 w-3" />
                        {exhibitor.contact_email}
                      </a>
                    )}
                    <a
                      href={`/messaging?to=${exhibitor.user_id}`}
                      className="ml-auto inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      <MessageSquare className="h-3 w-3" />
                      Contacter
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-4">
              <button
                onClick={goToPrevPage}
                disabled={currentPage <= 1}
                className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Precedent
              </button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} sur {totalPages}
              </span>
              <button
                onClick={goToNextPage}
                disabled={currentPage >= totalPages}
                className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
