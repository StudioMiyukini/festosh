import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  ChevronRight,
  Rocket,
  Store,
  Users,
  Calendar,
  FileText,
  DollarSign,
  Package,
  MapPin,
  ClipboardList,
  Settings,
  Search,
} from 'lucide-react';

// ─── Tutorial data ─────────────────────────────────────────────────────────

interface DocSection {
  id: string;
  icon: typeof BookOpen;
  title: string;
  description: string;
  steps: { title: string; content: string }[];
}

const TUTORIALS: DocSection[] = [
  {
    id: 'getting-started',
    icon: Rocket,
    title: 'Premiers pas',
    description: 'Creez votre premier festival et configurez-le en quelques minutes.',
    steps: [
      {
        title: 'Creer un compte',
        content:
          "Rendez-vous sur la page d'inscription et creez votre compte avec votre email. Vous recevrez un acces immediat a la plateforme.",
      },
      {
        title: 'Creer un festival',
        content:
          "Depuis votre Dashboard, cliquez sur \"Creer un festival\". Renseignez le nom, le slug (l'identifiant URL), la ville et une description. Le slug definira l'adresse de votre site : {slug}.miyukini.com.",
      },
      {
        title: 'Creer une edition',
        content:
          "Un festival peut avoir plusieurs editions (annuelles par exemple). Allez dans Parametres > Editions et creez votre premiere edition avec les dates de debut et fin. Activez-la pour qu'elle devienne l'edition courante.",
      },
      {
        title: 'Configurer votre equipe',
        content:
          "Dans Parametres > Membres, invitez vos collaborateurs et attribuez-leur des roles : admin, editeur, moderateur, benevole ou exposant. Chaque role a des permissions differentes.",
      },
    ],
  },
  {
    id: 'cms',
    icon: FileText,
    title: 'Contenu CMS',
    description: "Creez et gerez les pages de votre site public avec l'editeur de blocs.",
    steps: [
      {
        title: 'Creer une page',
        content:
          "Allez dans Contenu CMS et cliquez sur \"Nouvelle page\". Donnez-lui un titre et un slug. La page sera accessible a l'adresse /p/{slug} sur votre sous-site.",
      },
      {
        title: 'Ajouter des blocs',
        content:
          "L'editeur de pages fonctionne par blocs. Ajoutez des blocs de type texte, image, galerie, ou embed. Chaque bloc peut etre reordonne par glisser-deposer.",
      },
      {
        title: 'Publier la page',
        content:
          "Une fois satisfait, activez le toggle \"Publiee\" pour rendre la page visible sur votre site public. Vous pouvez aussi la definir comme page d'accueil.",
      },
      {
        title: 'Gerer la navigation',
        content:
          "Dans l'onglet Navigation du CMS, ajoutez des liens vers vos pages, des URL externes ou des routes internes. L'ordre est personnalisable.",
      },
    ],
  },
  {
    id: 'exhibitors',
    icon: Store,
    title: 'Exposants et stands',
    description: 'Gerez les candidatures, types de stands et emplacements.',
    steps: [
      {
        title: 'Creer des types de stands',
        content:
          "Avant de creer des emplacements, definissez vos types de stands dans l'onglet Emplacements : nom, dimensions, prix (forfait ou par jour), options electricite/eau avec tarification optionnelle, et equipements disponibles.",
      },
      {
        title: 'Ajouter des emplacements',
        content:
          "Creez des emplacements individuels en selectionnant un type (qui pre-remplira les champs). Chaque emplacement a un code unique, une zone, et peut avoir ses propres surcharges de prix et options.",
      },
      {
        title: 'Gerer les candidatures',
        content:
          "Les exposants soumettent leurs candidatures via le formulaire public. Vous les retrouvez dans l'onglet Candidatures ou vous pouvez les accepter, refuser, et attribuer un emplacement.",
      },
      {
        title: 'Configurer le materiel des stands',
        content:
          "Pensez a creer votre inventaire de materiel (tables, chaises, grilles...) AVANT de configurer les types de stands. Les options d'equipement sont liees a cet inventaire et peuvent etre incluses ou payantes.",
      },
    ],
  },
  {
    id: 'programming',
    icon: Calendar,
    title: 'Programmation',
    description: 'Planifiez votre programme avec evenements, scenes et horaires.',
    steps: [
      {
        title: 'Creer des lieux/scenes',
        content:
          "Definissez d'abord vos lieux (scenes, salles, espaces) dans la section Programmation. Chaque lieu a un nom, un type et une capacite.",
      },
      {
        title: 'Ajouter des evenements',
        content:
          "Creez vos evenements avec titre, description, categorie, horaires et lieu. Vous pouvez preciser les intervenants et le nombre max de participants.",
      },
      {
        title: 'Organiser par categories',
        content:
          "Utilisez les categories (concert, conference, atelier, animation...) pour organiser votre programme. Les visiteurs pourront filtrer par categorie sur le site public.",
      },
    ],
  },
  {
    id: 'volunteers',
    icon: Users,
    title: 'Benevoles',
    description: 'Coordonnez vos equipes de benevoles avec roles et shifts.',
    steps: [
      {
        title: 'Definir des roles',
        content:
          "Creez des roles de benevoles (accueil, securite, logistique, technique...) avec description et couleur pour les identifier facilement.",
      },
      {
        title: 'Planifier des shifts',
        content:
          "Creez des creneaux horaires pour chaque role et lieu. Definissez le nombre de benevoles necessaires par shift.",
      },
      {
        title: 'Affecter les benevoles',
        content:
          "Les benevoles inscrits peuvent etre affectes aux shifts disponibles. Ils voient leur planning personnel une fois connectes.",
      },
    ],
  },
  {
    id: 'budget',
    icon: DollarSign,
    title: 'Budget',
    description: 'Suivez vos finances avec categories et ecritures.',
    steps: [
      {
        title: 'Creer des categories',
        content:
          "Definissez vos categories de recettes (billetterie, sponsors, subventions) et depenses (location, materiel, communication). Chaque categorie a une couleur.",
      },
      {
        title: 'Saisir les ecritures',
        content:
          "Ajoutez vos recettes et depenses avec montant, date, description et moyen de paiement. Le solde se calcule automatiquement.",
      },
      {
        title: 'Suivre le bilan',
        content:
          "Le tableau de bord affiche le total des recettes, depenses et le solde. Vous pouvez filtrer par categorie pour analyser chaque poste.",
      },
    ],
  },
  {
    id: 'equipment',
    icon: Package,
    title: 'Materiel',
    description: "Gerez l'inventaire et les affectations de materiel.",
    steps: [
      {
        title: "Creer l'inventaire",
        content:
          "Ajoutez vos items de materiel avec nom, categorie (mobilier, technique, signalisation...), quantite, valeur et type d'acquisition (possede, loue, prete).",
      },
      {
        title: 'Gerer les proprietaires',
        content:
          "Si du materiel appartient a des tiers, creez des fiches proprietaires avec coordonnees. Associez ensuite chaque item a son proprietaire.",
      },
      {
        title: 'Affecter le materiel',
        content:
          "Creez des affectations pour distribuer le materiel aux stands, scenes ou evenements. Suivez les quantites disponibles vs affectees.",
      },
    ],
  },
  {
    id: 'floor-plan',
    icon: MapPin,
    title: 'Plan du site',
    description: 'Concevez le plan visuel de votre evenement.',
    steps: [
      {
        title: 'Creer un plan',
        content:
          "Dans la section Plan, creez un nouveau plan avec nom et dimensions. Vous pouvez importer une image de fond (plan cadastral, photo aerienne...).",
      },
      {
        title: 'Placer les elements',
        content:
          "Positionnez vos emplacements de stands, scenes et points d'interet sur le plan. Les elements sont lies aux donnees existantes (emplacements, lieux).",
      },
    ],
  },
  {
    id: 'tasks-meetings',
    icon: ClipboardList,
    title: 'Taches et reunions',
    description: "Organisez votre travail d'equipe avec taches et reunions.",
    steps: [
      {
        title: 'Creer des taches',
        content:
          "Creez des taches avec titre, description, priorite (basse a urgente), date d'echeance et assignation. Suivez l'avancement avec les statuts : a faire, en cours, termine.",
      },
      {
        title: 'Planifier des reunions',
        content:
          "Creez des reunions avec date, duree et lieu. Chaque reunion dispose d'un editeur de blocs pour structurer l'ordre du jour.",
      },
      {
        title: 'Utiliser les blocs de reunion',
        content:
          "Ajoutez des blocs titre (ordre du jour), texte (notes), checklist (points a valider) et sondage (votes). Chaque bloc dispose d'un bouton pour creer une tache rapidement.",
      },
      {
        title: 'Vue Agenda',
        content:
          "L'onglet Agenda offre une vue calendrier mensuelle qui affiche les reunions et taches avec dates. Cliquez sur un jour pour voir les details.",
      },
    ],
  },
  {
    id: 'settings',
    icon: Settings,
    title: 'Parametres',
    description: 'Configurez votre festival : theme, editions, membres.',
    steps: [
      {
        title: 'Informations generales',
        content:
          "Modifiez le nom, la description, le logo et la banniere de votre festival. Ces informations apparaissent sur le site public.",
      },
      {
        title: 'Theme et couleurs',
        content:
          "Personnalisez les couleurs primaire et secondaire ainsi que la police de votre site public pour correspondre a votre identite visuelle.",
      },
      {
        title: 'Gestion des editions',
        content:
          "Creez et gerez les editions de votre festival. Chaque edition a ses propres dates, emplacements, programme et budget. Activez l'edition courante.",
      },
      {
        title: 'Equipe et roles',
        content:
          "Ajoutez des membres a votre equipe d'organisation. Les roles disponibles : owner, admin, editor, moderator, volunteer, exhibitor.",
      },
    ],
  },
];

export function DocsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSection, setExpandedSection] = useState<string | null>('getting-started');

  const filteredTutorials = searchQuery.trim()
    ? TUTORIALS.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.steps.some(
            (s) =>
              s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              s.content.toLowerCase().includes(searchQuery.toLowerCase()),
          ),
      )
    : TUTORIALS;

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-primary/5 to-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-4 inline-flex rounded-full bg-primary/10 p-3">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Documentation
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Guides et didacticiels pour tirer le meilleur parti de Festosh.
            </p>

            {/* Search */}
            <div className="relative mx-auto mt-8 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher dans la documentation..."
                className="w-full rounded-lg border bg-background py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
            {/* Sidebar nav */}
            <aside className="hidden lg:block">
              <nav className="sticky top-20 space-y-1">
                <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">Didacticiels</p>
                {TUTORIALS.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setExpandedSection(t.id);
                        setSearchQuery('');
                        document.getElementById(`doc-${t.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                        expandedSection === t.id
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      {t.title}
                    </button>
                  );
                })}
              </nav>
            </aside>

            {/* Main content */}
            <div className="space-y-8">
              {filteredTutorials.length === 0 ? (
                <div className="rounded-lg border border-dashed p-12 text-center">
                  <Search className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-3 text-muted-foreground">
                    Aucun resultat pour "{searchQuery}"
                  </p>
                </div>
              ) : (
                filteredTutorials.map((section) => {
                  const Icon = section.icon;
                  const isExpanded = expandedSection === section.id || searchQuery.trim() !== '';

                  return (
                    <div
                      key={section.id}
                      id={`doc-${section.id}`}
                      className="scroll-mt-20 rounded-lg border bg-card"
                    >
                      {/* Section header */}
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedSection(isExpanded && !searchQuery ? null : section.id)
                        }
                        className="flex w-full items-center gap-4 p-5 text-left"
                      >
                        <div className="rounded-lg bg-primary/10 p-2.5">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
                          <p className="mt-0.5 text-sm text-muted-foreground">{section.description}</p>
                        </div>
                        <ChevronRight
                          className={`h-5 w-5 text-muted-foreground transition-transform ${
                            isExpanded ? 'rotate-90' : ''
                          }`}
                        />
                      </button>

                      {/* Steps */}
                      {isExpanded && (
                        <div className="border-t px-5 py-4">
                          <div className="space-y-6">
                            {section.steps.map((step, idx) => (
                              <div key={idx} className="flex gap-4">
                                <div className="flex flex-col items-center">
                                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                                    {idx + 1}
                                  </div>
                                  {idx < section.steps.length - 1 && (
                                    <div className="mt-1 w-px flex-1 bg-border" />
                                  )}
                                </div>
                                <div className="pb-4">
                                  <h3 className="font-medium text-foreground">{step.title}</h3>
                                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                    {step.content}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Help CTA */}
      <section className="border-t py-12">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-foreground">Besoin d'aide ?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Si vous avez des questions ou besoin d'assistance, n'hesitez pas a nous contacter.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Link
              to="/about"
              className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              A propos de Festosh
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Commencer gratuitement
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
