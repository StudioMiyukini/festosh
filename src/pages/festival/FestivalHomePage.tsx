import { Link } from 'react-router-dom';
import { CalendarDays, MapPin, Store, ArrowRight } from 'lucide-react';
import { useTenantStore } from '@/stores/tenant-store';

export function FestivalHomePage() {
  const { festival, activeEdition } = useTenantStore();

  const slug = festival?.slug ?? '';

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
              <div className="mt-4 flex items-center justify-center gap-4 text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  {activeEdition.start_date} &mdash; {activeEdition.end_date}
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

      {/* Upcoming Events Preview */}
      <section className="border-t border-border bg-muted/30 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">Evenements a venir</h2>
            <Link
              to={`/f/${slug}/schedule`}
              className="text-sm font-medium text-primary hover:underline"
            >
              Voir tout
            </Link>
          </div>
          {/* TODO: Wire up to service layer - fetch upcoming events */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-card p-5"
              >
                <div className="mb-2 inline-block rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                  Concert
                </div>
                <h3 className="mb-1 text-base font-semibold text-foreground">
                  Evenement exemple {i}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Samedi 14:00 &mdash; Scene principale
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Exhibitor Highlights */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">Exposants en vedette</h2>
            <Link
              to={`/f/${slug}/exhibitors`}
              className="text-sm font-medium text-primary hover:underline"
            >
              Voir tous les exposants
            </Link>
          </div>
          {/* TODO: Wire up to service layer - fetch featured exhibitors */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-card p-5 text-center"
              >
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Store className="h-5 w-5 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">
                  Exposant {i}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">Artisanat</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
