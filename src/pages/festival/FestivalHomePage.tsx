import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, MapPin, Store, ArrowRight, Clock, Loader2 } from 'lucide-react';
import { useTenantStore } from '@/stores/tenant-store';
import { api, ApiClient } from '@/lib/api-client';
import { formatDate } from '@/lib/date';
import type { Event } from '@/types/programming';
import type { ExhibitorProfile } from '@/types/exhibitor';

export function FestivalHomePage() {
  const { festival, activeEdition } = useTenantStore();
  const slug = festival?.slug ?? '';

  const [events, setEvents] = useState<Event[]>([]);
  const [exhibitors, setExhibitors] = useState<ExhibitorProfile[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingExhibitors, setLoadingExhibitors] = useState(true);

  useEffect(() => {
    if (!festival?.id) return;

    // Fetch upcoming events (up to 4)
    const editionParam = activeEdition?.id
      ? ApiClient.queryString({ edition_id: activeEdition.id })
      : '';
    api
      .get<Event[]>(`/events/festival/${festival.id}${editionParam}`)
      .then((res) => {
        if (res.success && res.data) {
          setEvents(res.data.slice(0, 4));
        }
      })
      .finally(() => setLoadingEvents(false));

    // Fetch exhibitor profiles (up to 6)
    api
      .get<ExhibitorProfile[]>(`/exhibitors/festival/${festival.id}/profiles`)
      .then((res) => {
        if (res.success && res.data) {
          setExhibitors(res.data.slice(0, 6));
        }
      })
      .finally(() => setLoadingExhibitors(false));
  }, [festival?.id, activeEdition?.id]);

  return (
    <div>
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        {festival?.banner_url && (
          <img
            src={festival.banner_url}
            alt={festival.name}
            className="absolute inset-0 h-full w-full object-cover opacity-20"
          />
        )}
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              {festival?.name ?? 'Festival'}
            </h1>
            {activeEdition && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  {formatDate(activeEdition.start_date)} &mdash; {formatDate(activeEdition.end_date)}
                </span>
                {festival?.location_name && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {festival.location_name}
                  </span>
                )}
              </div>
            )}
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to={`/f/${slug}/schedule`}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Voir le programme
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to={`/f/${slug}/apply`}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                <Store className="h-4 w-4" />
                Devenir exposant
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Description */}
      {festival?.description && (
        <section className="py-16">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-6 text-2xl font-bold text-foreground">A propos</h2>
            <p className="leading-relaxed text-muted-foreground">{festival.description}</p>
          </div>
        </section>
      )}

      {/* Prochains evenements */}
      <section className="border-t border-border bg-muted/30 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">Prochains evenements</h2>
            <Link
              to={`/f/${slug}/schedule`}
              className="text-sm font-medium text-primary hover:underline"
            >
              Voir tout
            </Link>
          </div>

          {loadingEvents ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-12 text-center">
              <CalendarDays className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Aucun evenement programme pour le moment.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-sm"
                >
                  {event.category && (
                    <div className="mb-2 inline-block rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                      {event.category}
                    </div>
                  )}
                  <h3 className="mb-1 text-base font-semibold text-foreground">
                    {event.title}
                  </h3>
                  <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(event.start_time)}
                    </span>
                    {event.venue_id && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {event.venue_id}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Nos exposants */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">Nos exposants</h2>
            <Link
              to={`/f/${slug}/exhibitors`}
              className="text-sm font-medium text-primary hover:underline"
            >
              Voir tous les exposants
            </Link>
          </div>

          {loadingExhibitors ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : exhibitors.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-12 text-center">
              <Store className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Les exposants seront annonces prochainement.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {exhibitors.map((exhibitor) => (
                <div
                  key={exhibitor.id}
                  className="rounded-xl border border-border bg-card p-5 text-center transition-shadow hover:shadow-sm"
                >
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    {exhibitor.logo_url ? (
                      <img
                        src={exhibitor.logo_url}
                        alt={exhibitor.company_name}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <Store className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {exhibitor.company_name}
                  </h3>
                  {exhibitor.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {exhibitor.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
