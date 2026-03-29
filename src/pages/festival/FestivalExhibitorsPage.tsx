import { useEffect, useMemo, useState } from 'react';
import { Search, Store, MapPin, Loader2, Globe, Mail } from 'lucide-react';
import { useTenantStore } from '@/stores/tenant-store';
import { api } from '@/lib/api-client';
import type { ExhibitorProfile, BoothLocation } from '@/types/exhibitor';

export function FestivalExhibitorsPage() {
  const { festival } = useTenantStore();

  const [exhibitors, setExhibitors] = useState<ExhibitorProfile[]>([]);
  const [booths, setBooths] = useState<BoothLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!festival?.id) return;

    setLoading(true);

    Promise.all([
      api.get<ExhibitorProfile[]>(`/exhibitors/festival/${festival.id}/profiles`),
      api.get<BoothLocation[]>(`/exhibitors/festival/${festival.id}/booths`),
    ])
      .then(([profilesRes, boothsRes]) => {
        if (profilesRes.success && profilesRes.data) {
          setExhibitors(profilesRes.data);
        }
        if (boothsRes.success && boothsRes.data) {
          setBooths(boothsRes.data);
        }
      })
      .finally(() => setLoading(false));
  }, [festival?.id]);

  // Build a lookup: exhibitor_id -> booth info
  // Note: booths don't have an exhibitor_id directly, so we match via assigned_booth_id
  // from applications. For now, we show booths as a flat list alongside exhibitors.
  const boothMap = useMemo(() => {
    const map = new Map<string, BoothLocation>();
    for (const b of booths) {
      map.set(b.id, b);
    }
    return map;
  }, [booths]);

  // Filter exhibitors by company name
  const filteredExhibitors = useMemo(() => {
    if (!searchQuery.trim()) return exhibitors;
    const query = searchQuery.toLowerCase();
    return exhibitors.filter(
      (ex) =>
        ex.company_name.toLowerCase().includes(query) ||
        (ex.description && ex.description.toLowerCase().includes(query))
    );
  }, [exhibitors, searchQuery]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Chargement des exposants...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Exposants</h1>
        <p className="mt-2 text-muted-foreground">
          Decouvrez les exposants presents a cette edition.
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Rechercher un exposant..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-border bg-background py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Exhibitor Grid */}
      {filteredExhibitors.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Store className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
          {exhibitors.length === 0 ? (
            <>
              <h2 className="mb-2 text-lg font-semibold text-foreground">
                Aucun exposant pour le moment
              </h2>
              <p className="text-sm text-muted-foreground">
                Les exposants seront annonces prochainement.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucun exposant ne correspond a votre recherche.
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredExhibitors.map((exhibitor) => (
            <div
              key={exhibitor.id}
              className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-sm"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  {exhibitor.logo_url ? (
                    <img
                      src={exhibitor.logo_url}
                      alt={exhibitor.company_name}
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                  ) : (
                    <Store className="h-5 w-5 text-primary" />
                  )}
                </div>
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                {exhibitor.company_name}
              </h3>
              {exhibitor.description && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {exhibitor.description}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {exhibitor.city && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <MapPin className="h-2.5 w-2.5" />
                    {exhibitor.city}
                  </span>
                )}
                {exhibitor.website_url && (
                  <a
                    href={exhibitor.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                  >
                    <Globe className="h-2.5 w-2.5" />
                    Site web
                  </a>
                )}
                {exhibitor.contact_email && (
                  <a
                    href={`mailto:${exhibitor.contact_email}`}
                    className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                  >
                    <Mail className="h-2.5 w-2.5" />
                    Contact
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results count */}
      {filteredExhibitors.length > 0 && (
        <div className="mt-6 text-center text-xs text-muted-foreground">
          {filteredExhibitors.length} exposant{filteredExhibitors.length > 1 ? 's' : ''}{' '}
          {searchQuery.trim() ? 'trouve(s)' : 'au total'}
        </div>
      )}
    </div>
  );
}
