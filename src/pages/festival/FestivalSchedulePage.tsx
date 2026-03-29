import { useEffect, useMemo, useState } from 'react';
import { Clock, MapPin, Filter, Loader2, CalendarDays, Users } from 'lucide-react';
import { useTenantStore } from '@/stores/tenant-store';
import { api, ApiClient } from '@/lib/api-client';
import { formatDate } from '@/lib/date';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Event } from '@/types/programming';
import type { Venue } from '@/types/programming';

/** Group events by date string (YYYY-MM-DD). */
function groupByDate(events: Event[]): Record<string, Event[]> {
  const groups: Record<string, Event[]> = {};
  for (const event of events) {
    const dateKey = event.start_time.slice(0, 10); // YYYY-MM-DD
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(event);
  }
  // Sort events within each group by start_time
  for (const key of Object.keys(groups)) {
    groups[key].sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
  }
  return groups;
}

/** Format a time string from ISO datetime. */
function formatTime(isoDate: string): string {
  return format(parseISO(isoDate), 'HH:mm', { locale: fr });
}

/** Format a date key as a human-readable day label. */
function formatDayLabel(dateKey: string): string {
  return format(parseISO(dateKey), 'EEEE d MMMM', { locale: fr });
}

export function FestivalSchedulePage() {
  const { festival, activeEdition } = useTenantStore();

  const [events, setEvents] = useState<Event[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeDateKey, setActiveDateKey] = useState<string | null>(null);

  // Build venue lookup map
  const venueMap = useMemo(() => {
    const map = new Map<string, Venue>();
    for (const v of venues) {
      map.set(v.id, v);
    }
    return map;
  }, [venues]);

  useEffect(() => {
    if (!festival?.id) return;

    setLoading(true);

    const editionParam = activeEdition?.id
      ? ApiClient.queryString({ edition_id: activeEdition.id })
      : '';

    Promise.all([
      api.get<Event[]>(`/events/festival/${festival.id}${editionParam}`),
      api.get<Venue[]>(`/venues/festival/${festival.id}`),
    ])
      .then(([eventsRes, venuesRes]) => {
        if (eventsRes.success && eventsRes.data) {
          // Only show public events
          const publicEvents = eventsRes.data.filter((e) => e.is_public);
          setEvents(publicEvents);
        }
        if (venuesRes.success && venuesRes.data) {
          setVenues(venuesRes.data);
        }
      })
      .finally(() => setLoading(false));
  }, [festival?.id, activeEdition?.id]);

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const e of events) {
      if (e.category) cats.add(e.category);
    }
    return Array.from(cats).sort();
  }, [events]);

  // Group events by date
  const grouped = useMemo(() => groupByDate(events), [events]);
  const sortedDateKeys = useMemo(
    () => Object.keys(grouped).sort(),
    [grouped]
  );

  // Set initial active date
  useEffect(() => {
    if (sortedDateKeys.length > 0 && !activeDateKey) {
      setActiveDateKey(sortedDateKeys[0]);
    }
  }, [sortedDateKeys, activeDateKey]);

  // Filter events for the active date and category
  const visibleEvents = useMemo(() => {
    if (!activeDateKey || !grouped[activeDateKey]) return [];
    let filtered = grouped[activeDateKey];
    if (selectedCategory) {
      filtered = filtered.filter((e) => e.category === selectedCategory);
    }
    return filtered;
  }, [grouped, activeDateKey, selectedCategory]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Chargement du programme...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Programme</h1>
        <p className="mt-2 text-muted-foreground">
          Decouvrez les evenements et activites prevus.
        </p>
      </div>

      {events.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <CalendarDays className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold text-foreground">
            Aucun evenement programme
          </h2>
          <p className="text-sm text-muted-foreground">
            Le programme sera publie prochainement. Revenez bientot !
          </p>
        </div>
      ) : (
        <>
          {/* Date Tabs */}
          <div className="mb-6 flex gap-2 overflow-x-auto border-b border-border pb-2">
            {sortedDateKeys.map((dateKey) => (
              <button
                key={dateKey}
                onClick={() => setActiveDateKey(dateKey)}
                className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium capitalize transition-colors ${
                  activeDateKey === dateKey
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                {formatDayLabel(dateKey)}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="mb-8 flex items-center gap-3">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    !selectedCategory
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  Tout
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      selectedCategory === cat
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Events List */}
          <div className="space-y-4">
            {visibleEvents.length === 0 ? (
              <div className="rounded-lg border border-border bg-card p-12 text-center">
                <p className="text-sm text-muted-foreground">
                  Aucun evenement pour cette selection.
                </p>
              </div>
            ) : (
              visibleEvents.map((event) => {
                const venue = event.venue_id ? venueMap.get(event.venue_id) : null;
                return (
                  <div
                    key={event.id}
                    className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-sm"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1">
                        {event.category && (
                          <div className="mb-2 inline-block rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            {event.category}
                          </div>
                        )}
                        <h3 className="text-base font-semibold text-foreground">
                          {event.title}
                        </h3>
                        {event.description && (
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                            {event.description}
                          </p>
                        )}
                        {/* Speakers */}
                        {event.speakers && event.speakers.length > 0 && (
                          <div className="mt-2 flex items-center gap-2">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {event.speakers.map((s) => s.name).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:text-right">
                        <span className="inline-flex items-center gap-1 sm:justify-end">
                          <Clock className="h-3 w-3" />
                          {formatTime(event.start_time)} &mdash; {formatTime(event.end_time)}
                        </span>
                        {venue && (
                          <span className="inline-flex items-center gap-1 sm:justify-end">
                            <MapPin className="h-3 w-3" />
                            {venue.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
