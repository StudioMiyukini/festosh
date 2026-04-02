import { Link } from 'react-router-dom';
import {
  Sparkles,
  Users,
  Globe,
  Shield,
  Heart,
  Zap,
} from 'lucide-react';

const VALUES = [
  {
    icon: Sparkles,
    title: 'Simplicite',
    description:
      'Des outils intuitifs qui ne necessitent aucune competence technique. Creez et gerez vos festivals en quelques clics.',
  },
  {
    icon: Users,
    title: 'Collaboratif',
    description:
      'Travaillez en equipe avec des roles et permissions adaptes : organisateurs, moderateurs, benevoles, exposants.',
  },
  {
    icon: Globe,
    title: 'Multi-evenements',
    description:
      'Gerez plusieurs festivals depuis une seule plateforme. Chaque evenement dispose de son propre sous-site personnalisable.',
  },
  {
    icon: Shield,
    title: 'Securise',
    description:
      'Vos donnees sont protegees. Authentification securisee, chiffrement des communications et hebergement europeen.',
  },
];

const FEATURES_DETAIL = [
  {
    title: 'CMS integre',
    description: 'Creez des pages personnalisees pour votre festival avec un editeur de blocs intuitif.',
  },
  {
    title: 'Gestion des exposants',
    description: 'Recevez les candidatures, attribuez les emplacements, gerez les types de stands et les options.',
  },
  {
    title: 'Programmation',
    description: 'Planifiez vos evenements, concerts et animations avec un calendrier complet.',
  },
  {
    title: 'Benevoles',
    description: 'Creez des roles, planifiez des shifts et coordonnez votre equipe de benevoles.',
  },
  {
    title: 'Budget',
    description: 'Suivez vos revenus et depenses avec des categories personnalisables et des rapports.',
  },
  {
    title: 'Materiel',
    description: 'Inventoriez votre materiel, suivez les proprietaires et gerez les affectations.',
  },
  {
    title: 'Plan interactif',
    description: 'Concevez le plan de votre site avec placement visuel des stands et points d\'interet.',
  },
  {
    title: 'Taches et reunions',
    description: 'Organisez vos reunions avec un editeur de blocs et creez des taches directement pendant les sessions.',
  },
];

export function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-primary/5 to-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              A propos de <span className="text-primary">Festosh</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Festosh est une plateforme SaaS concue pour simplifier l'organisation de conventions
              et festivals. Notre mission : donner aux organisateurs les outils dont ils ont besoin
              pour creer des evenements memorables.
            </p>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold text-foreground">Notre histoire</h2>
            <div className="mt-6 space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Festosh est ne d'un constat simple : organiser un festival ou une convention implique
                de jongler entre des dizaines d'outils differents — tableurs, emails, documents partages,
                applications de messagerie. Le resultat ? Du temps perdu, des erreurs et du stress.
              </p>
              <p>
                Nous avons decide de creer une plateforme unique qui centralise tout : la gestion des
                exposants et de leurs emplacements, la programmation des evenements, la coordination
                des benevoles, le suivi budgetaire, et meme un CMS pour le site public de chaque festival.
              </p>
              <p>
                Festosh est developpe par <strong className="text-foreground">Miyukini Studio</strong>,
                un studio independant passionne par la culture geek, les conventions et les outils
                qui simplifient la vie des organisateurs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="border-y bg-muted/30 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-foreground">Nos valeurs</h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((value) => {
              const Icon = value.icon;
              return (
                <div key={value.title} className="text-center">
                  <div className="mx-auto mb-4 inline-flex rounded-full bg-primary/10 p-4">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 font-semibold text-foreground">{value.title}</h3>
                  <p className="text-sm text-muted-foreground">{value.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features overview */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold text-foreground">Fonctionnalites</h2>
            <p className="mt-3 text-muted-foreground">
              Tout ce dont vous avez besoin pour gerer votre festival, dans une seule plateforme.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES_DETAIL.map((f) => (
              <div key={f.title} className="rounded-lg border bg-card p-5">
                <h3 className="mb-2 font-semibold text-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-gradient-to-b from-background to-primary/5 py-16">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mx-auto inline-flex rounded-full bg-primary/10 p-3 mb-4">
            <Heart className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Pret a organiser ?</h2>
          <p className="mt-3 text-muted-foreground">
            Rejoignez Festosh et simplifiez l'organisation de vos evenements.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Zap className="h-4 w-4" />
              Creer un compte
            </Link>
            <Link
              to="/docs"
              className="inline-flex items-center rounded-md border px-6 py-3 text-sm font-medium hover:bg-accent"
            >
              Consulter la documentation
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
