import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Heart, Users, ClipboardList, Calendar, MapPin,
  ChevronDown, CheckCircle2, Car, Shield, Phone,
} from 'lucide-react';

interface Tutorial {
  id: string;
  icon: typeof Heart;
  title: string;
  steps: { title: string; detail: string }[];
}

const TUTORIALS: Tutorial[] = [
  {
    id: 'create-profile',
    icon: Users,
    title: 'Creer votre profil benevole',
    steps: [
      { title: 'Acceder a l\'espace benevole', detail: "Connectez-vous, puis cliquez sur votre nom en haut a droite et selectionnez 'Espace benevole'. Vous arrivez sur votre tableau de bord avec 3 onglets : Profil, Candidatures, Postuler." },
      { title: 'Renseigner votre bio', detail: "Dans l'onglet 'Profil', redigez une courte presentation. Expliquez vos motivations, votre experience en benevolat et ce que vous aimez faire." },
      { title: 'Ajouter vos competences', detail: "Tapez une competence (ex: 'Anglais', 'Premiers secours', 'Technique son') et appuyez sur Entree. Chaque competence apparait comme un tag que vous pouvez supprimer d'un clic." },
      { title: 'Ajouter vos certifications', detail: "De la meme facon, ajoutez vos certifications : BAFA, PSC1/PSC2, SST, permis CACES, habilitation electrique, etc. Les organisateurs filtrent souvent par certification." },
    ],
  },
  {
    id: 'availability',
    icon: Calendar,
    title: 'Definir vos disponibilites',
    steps: [
      { title: 'Grille hebdomadaire', detail: "Dans votre profil, la section 'Disponibilites' affiche les 7 jours de la semaine. Pour chaque jour, cochez si vous etes disponible. Vous pouvez preciser les creneaux (matin, apres-midi, soir)." },
      { title: 'Actions preferees', detail: "Choisissez parmi 23 types d'actions benevoles : Accueil, Guide, Comptage, Buvette, Animation, Cuisine, Crepes/gaufres, Encaissement, Montage/demontage, Decoration, Communication, Secretariat, Securite, Logistique, Technique son/lumiere, Photographe, Infirmerie, Parking, Nettoyage, Vestiaire, Billetterie, Soutien general, Autre." },
      { title: 'Pourquoi c\'est important', detail: "Les organisateurs voient vos preferences quand ils traitent votre candidature. Plus votre profil est complet, meilleures sont vos chances d'etre place sur un creneau qui vous correspond." },
    ],
  },
  {
    id: 'practical-info',
    icon: Car,
    title: 'Informations pratiques',
    steps: [
      { title: 'Taille de t-shirt', detail: "Renseignez votre taille (XS a XXL). De nombreux festivals fournissent un t-shirt aux benevoles pour les identifier facilement." },
      { title: 'Vehicule', detail: "Indiquez si vous disposez d'un vehicule. Cela aide les organisateurs a planifier le transport de materiel ou les navettes." },
      { title: 'Accessibilite PMR', detail: "Si vous etes en situation de handicap ou a mobilite reduite, cochez la case PMR. L'organisateur adaptera vos missions en consequence." },
      { title: 'Contact d\'urgence', detail: "Renseignez le nom et le numero de telephone d'une personne a contacter en cas d'urgence. Cette information est visible uniquement par les organisateurs du festival." },
    ],
  },
  {
    id: 'apply',
    icon: ClipboardList,
    title: 'Candidater a un festival',
    steps: [
      { title: 'Trouver un festival', detail: "L'onglet 'Postuler' de votre espace benevole affiche les festivals qui recherchent des benevoles. Vous pouvez aussi parcourir l'annuaire des festivals et postuler depuis le site public d'un festival." },
      { title: 'Remplir la candidature', detail: "Cliquez sur 'Postuler' a cote du festival choisi. Selectionnez les actions que vous aimeriez faire specifiquement pour ce festival (elles peuvent differer de vos preferences generales)." },
      { title: 'Indiquer vos disponibilites', detail: "Precisez les jours et creneaux ou vous etes disponible pour ce festival en particulier. Si le festival dure un week-end, indiquez samedi, dimanche ou les deux." },
      { title: 'Rediger votre motivation', detail: "Ecrivez quelques lignes sur votre motivation : pourquoi ce festival, ce que vous pouvez apporter, votre experience passee. Un message personnalise fait la difference." },
      { title: 'Envoyer', detail: "Validez votre candidature. Elle passe au statut 'En attente'. L'organisateur la traitera et vous serez notifie du resultat." },
    ],
  },
  {
    id: 'track',
    icon: MapPin,
    title: 'Suivi et missions',
    steps: [
      { title: 'Suivre vos candidatures', detail: "L'onglet 'Mes candidatures' affiche toutes vos candidatures avec le nom du festival, l'edition, le statut (en attente, acceptee, refusee) et la date de depot." },
      { title: 'Candidature acceptee', detail: "Si votre candidature est acceptee, l'organisateur vous assigne des creneaux dans le planning benevole du festival. Vous verrez vos creneaux dans la section dediee." },
      { title: 'Planning benevole', detail: "Vos creneaux affichent : le role (accueil, buvette...), le lieu, l'heure de debut et de fin, et les consignes specifiques. Presentez-vous au point de rendez-vous a l'heure indiquee." },
      { title: 'Apres le festival', detail: "Vous gagnez des XP pour votre participation. L'organisateur peut vous attribuer des badges ou recompenses supplementaires. Votre experience de benevolat est enregistree dans votre profil." },
    ],
  },
];

export function DocsVolunteerPage() {
  const [expanded, setExpanded] = useState<string | null>('create-profile');

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/docs" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour a la documentation
      </Link>

      <div className="mb-8">
        <div className="inline-flex items-center gap-3 rounded-full bg-pink-100 px-4 py-2 dark:bg-pink-900/30">
          <Heart className="h-5 w-5 text-pink-600 dark:text-pink-400" />
          <span className="text-sm font-semibold text-pink-700 dark:text-pink-300">Guide benevole</span>
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">Espace benevole</h1>
        <p className="mt-2 text-muted-foreground">
          Apprenez a creer votre profil, candidater aux festivals et gerer vos missions de benevolat.
        </p>
      </div>

      <div className="mb-8 rounded-xl border border-border bg-primary/5 p-5">
        <h3 className="text-sm font-semibold text-foreground">Parcours type d'un benevole</h3>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {['Creer un compte', 'Completer le profil', 'Ajouter competences', 'Candidater', 'Recevoir l\'acceptation', 'Voir le planning', 'Participer !'].map((s, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-primary">→</span>}
              <span className="rounded-full bg-card border border-border px-2.5 py-1 font-medium text-foreground">{s}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {TUTORIALS.map((tut) => {
          const Icon = tut.icon;
          const isOpen = expanded === tut.id;
          return (
            <div key={tut.id} className="rounded-xl border border-border bg-card overflow-hidden">
              <button type="button" onClick={() => setExpanded(isOpen ? null : tut.id)}
                className="flex w-full items-center gap-4 p-5 text-left">
                <div className="rounded-lg bg-primary/10 p-2.5"><Icon className="h-5 w-5 text-primary" /></div>
                <span className="flex-1 text-base font-semibold text-foreground">{tut.title}</span>
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="border-t border-border px-5 py-4">
                  <div className="space-y-5">
                    {tut.steps.map((step, idx) => (
                      <div key={idx} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{idx + 1}</div>
                          {idx < tut.steps.length - 1 && <div className="mt-1 w-px flex-1 bg-border" />}
                        </div>
                        <div className="pb-2">
                          <h4 className="text-sm font-semibold text-foreground">{step.title}</h4>
                          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-xl border border-border bg-card p-6 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-green-500" />
        <h3 className="text-lg font-semibold text-foreground">Pret a vous engager ?</h3>
        <p className="mt-1 text-sm text-muted-foreground">Completez votre profil et candidatez a votre premier festival.</p>
        <Link to="/volunteer" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Mon espace benevole
        </Link>
      </div>
    </div>
  );
}
