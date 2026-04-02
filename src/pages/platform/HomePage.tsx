import { Link } from 'react-router-dom';
import { Map, Store, Users, Wallet } from 'lucide-react';

const FEATURES = [
  {
    icon: Users,
    title: 'Gestion multi-festivals',
    description:
      'Gerez plusieurs festivals depuis une seule plateforme. Chaque evenement dispose de son propre espace personnalisable.',
  },
  {
    icon: Map,
    title: 'Plan interactif',
    description:
      'Creez des plans de site interactifs avec placement de stands, scenes et points d\'interet.',
  },
  {
    icon: Store,
    title: 'Gestion des exposants',
    description:
      'Recevez et traitez les candidatures, attribuez les emplacements et communiquez avec vos exposants.',
  },
  {
    icon: Wallet,
    title: 'Budget & materiel',
    description:
      'Suivez vos recettes et depenses, gerez votre inventaire de materiel et les affectations.',
  },
];

export function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Gerez vos festivals,{' '}
              <span className="text-primary">simplement.</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Festosh est la plateforme tout-en-un pour organiser, gerer et promouvoir vos
              festivals. De la programmation a la gestion des exposants, tout est centralise.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to="/directory"
                className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                Decouvrir l&apos;annuaire
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center rounded-md border border-border bg-background px-6 py-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
              >
                Creer un festival
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Tout ce qu&apos;il faut pour vos evenements
            </h2>
            <p className="mt-4 text-muted-foreground">
              Des outils puissants et intuitifs pour chaque aspect de votre festival.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-md"
                >
                  <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
