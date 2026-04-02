import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, CalendarDays, Loader2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { Festival } from '@/types/festival';

export function DirectoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFestivals();
  }, []);

  const loadFestivals = async (search?: string) => {
    setLoading(true);
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    const result = await api.get<Festival[]>(`/directory${qs}`);
    if (result.data) {
      setFestivals(result.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadFestivals(searchQuery || undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Annuaire des festivals
        </h1>
        <p className="mt-2 text-muted-foreground">
          Decouvrez les festivals et evenements sur Festosh.
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Rechercher un festival..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-border bg-background py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Festival Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : festivals.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Search className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {searchQuery
              ? 'Aucun festival ne correspond a votre recherche.'
              : 'Aucun festival publie pour le moment.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {festivals.map((festival) => (
            <Link
              key={festival.id}
              to={`/f/${festival.slug}`}
              className="group overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md"
            >
              {/* Banner */}
              <div className="aspect-[16/9] bg-gradient-to-br from-primary/20 to-secondary/20">
                {festival.banner_url ? (
                  <img
                    src={festival.banner_url}
                    alt={festival.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <span className="text-3xl font-bold text-primary/30">
                      {festival.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              {/* Info */}
              <div className="p-4">
                <h3 className="text-base font-semibold text-foreground group-hover:text-primary">
                  {festival.name}
                </h3>
                {festival.location_name && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {festival.location_name}
                  </div>
                )}
                {festival.description && (
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                    {festival.description}
                  </p>
                )}
                {festival.tags && festival.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {(typeof festival.tags === 'string' ? JSON.parse(festival.tags) : festival.tags).map((tag: string) => (
                      <span
                        key={tag}
                        className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
