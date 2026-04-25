import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, CalendarDays, Rocket, FileText, Store, Users, DollarSign,
  Package, MapPin, Ticket, Handshake, Trophy, Star, Gift, ListOrdered,
  BookMarked, ClipboardList, Mic, BarChart3, Briefcase, Key, Settings,
  ShieldCheck, QrCode, ChevronDown, CheckCircle2, Scale, MessageSquare,
  ShoppingCart, Globe, Palette, Mail,
} from 'lucide-react';

interface Tutorial {
  id: string;
  icon: typeof CalendarDays;
  title: string;
  category: string;
  steps: { title: string; detail: string }[];
}

const TUTORIALS: Tutorial[] = [
  // ── DEMARRAGE ──
  {
    id: 'create-festival', icon: Rocket, title: 'Creer votre festival', category: 'Demarrage',
    steps: [
      { title: 'Acceder a l\'espace organisateur', detail: "Connectez-vous, cliquez sur votre nom en haut a droite, puis 'Espace organisateur'. Si vous n'avez pas encore de festival, l'ecran affiche un bouton 'Creer un festival'." },
      { title: 'Renseigner les informations', detail: "Entrez le nom de votre festival. Un slug URL est genere automatiquement (ex: 'mon-festival' → festosh.net/f/mon-festival). Ajoutez la ville et le pays. Les coordonnees GPS sont calculees automatiquement." },
      { title: 'Premiere edition', detail: "Une premiere edition est creee automatiquement. Configurez ses dates, sa capacite et son statut dans Parametres > General de l'administration." },
      { title: 'Acceder a l\'administration', detail: "Cliquez sur 'Admin' a cote de votre festival. Vous arrivez sur le tableau de bord d'administration avec l'assistant de configuration." },
    ],
  },
  {
    id: 'setup-wizard', icon: CheckCircle2, title: 'Assistant de configuration (7 etapes)', category: 'Demarrage',
    steps: [
      { title: '1. Informations du festival', detail: "Verifiez que le nom et la ville sont renseignes. Allez dans Parametres > General pour completer la description, l'adresse, le logo et la banniere." },
      { title: '2. Identification organisateur', detail: "Dans Parametres > General, remplissez la section 'Identification de l'organisateur' : raison sociale, type d'entite (association, societe, mairie...), SIRET, RNA (si association), adresse du siege, email, telephone, IBAN et assurance. Ces informations apparaissent sur les factures." },
      { title: '3. Creer l\'edition', detail: "Dans Parametres > General, configurez l'edition active : dates de debut/fin, dates d'ouverture/fermeture des inscriptions, capacite maximale et horaires visiteurs." },
      { title: '4. Pages du site', detail: "Cliquez sur 'Generer les pages' dans l'assistant. 5 pages sont creees automatiquement : Accueil, Exposants, Candidature, Programme et Infos pratiques. La navigation est aussi generee." },
      { title: '5. Reglements', detail: "Allez dans Parametres > Reglements. Cliquez sur 'Appliquer un modele' et choisissez parmi 7 modeles (visiteur, exposant, cosplay, photo/video, benevole, securite, vie privee). Personnalisez le contenu et publiez." },
      { title: '6. Types de stands', detail: "Allez dans Festival > Exposants > onglet 'Types de stands'. Creez vos types (ex: Standard 3x2m a 50EUR, Premium 4x3m a 100EUR) avec options electricite/eau." },
      { title: '7. Publier', detail: "De retour sur la vue d'ensemble, cliquez sur 'Publier' pour rendre votre festival visible dans l'annuaire et sur la carte. Vous pouvez depublier a tout moment." },
    ],
  },
  // ── CONTENU ──
  {
    id: 'cms', icon: FileText, title: 'Editeur de site (CMS)', category: 'Contenu',
    steps: [
      { title: 'Creer une page', detail: "Dans Festival > Site & Pages, cliquez sur 'Nouvelle page'. Donnez un titre et un slug. La page sera accessible a /f/{slug}/p/{page-slug}." },
      { title: 'Ajouter des blocs', detail: "Cliquez sur '+ Ajouter un bloc' en bas de la page. Choisissez parmi 23 types : Hero (banniere), Texte, Image, Galerie, Video (YouTube/Vimeo), Carte, FAQ, Compte a rebours, Formulaire de contact, Image+Texte, Bouton CTA, Temoignage, Tableau de prix, Onglets, Carousel de logos, Statistiques, etc." },
      { title: 'Configurer chaque bloc', detail: "Chaque bloc a ses propres options. Par exemple, le bloc Hero a : titre, sous-titre, image de fond, et jusqu'a 2 boutons d'action. Le bloc FAQ a des paires question/reponse depliables." },
      { title: 'Reordonner et gerer', detail: "Deplacez les blocs avec les fleches haut/bas. Masquez un bloc avec l'icone oeil (sans le supprimer). Supprimez avec la corbeille." },
      { title: 'Navigation', detail: "L'onglet 'Navigation' gere le menu du site public. Ajoutez des liens internes (pages CMS), externes (URL), ou vers des fonctions (programme, exposants, candidature). Supportez les sous-menus et l'ouverture dans un nouvel onglet." },
      { title: 'Publication', detail: "Chaque page a un toggle 'Publiee'. Les pages non publiees ne sont pas accessibles au public. La page d'accueil est marquee comme homepage." },
    ],
  },
  {
    id: 'programming', icon: CalendarDays, title: 'Programme et lieux', category: 'Contenu',
    steps: [
      { title: 'Creer des lieux', detail: "Dans Festival > Programme, commencez par creer vos lieux (scenes, salles, espaces). Chaque lieu a un nom, un type et une capacite. Vous pouvez les positionner sur le plan de salle." },
      { title: 'Ajouter des evenements', detail: "Creez un evenement avec titre, description, categorie (concert, conference, atelier, animation...), lieu, date/heure de debut et de fin, et nombre max de participants." },
      { title: 'Intervenants', detail: "Ajoutez des intervenants a chaque evenement : nom, bio, photo et lien. Ils apparaissent sur la fiche de l'evenement dans le programme public." },
      { title: 'Programme public', detail: "Le programme est genere automatiquement sur le site public du festival avec filtres par jour, lieu et categorie." },
    ],
  },
  // ── EXPOSANTS ──
  {
    id: 'exhibitors', icon: Store, title: 'Gerer les exposants', category: 'Exposants',
    steps: [
      { title: 'Types de stands', detail: "Creez des modeles de stands : nom, dimensions (largeur x profondeur en metres), prix (forfait ou par jour), options electricite et eau (incluses ou payantes), couleur pour le plan, et equipements optionnels." },
      { title: 'Emplacements', detail: "Definissez les emplacements physiques avec un code unique (ex: A01, B12), une zone (ex: Hall A), et un type de stand associe. Activez/desactivez la disponibilite." },
      { title: 'Selection par les exposants', detail: "Dans l'onglet 'Configuration', activez 'Permettre aux exposants de choisir leur emplacement'. Les exposants verront la liste des emplacements disponibles dans le formulaire de candidature." },
      { title: 'Traiter les candidatures', detail: "L'onglet 'Candidatures' affiche toutes les demandes. Pour chaque candidature : consultez le profil exposant, les documents, les preferences. Changez le statut : Approuvee, Refusee, ou Liste d'attente." },
      { title: 'Assigner un emplacement', detail: "Apres approbation, assignez un emplacement physique a l'exposant. L'emplacement passe en 'occupe' et l'exposant voit son attribution dans son espace." },
    ],
  },
  // ── LOGISTIQUE ──
  {
    id: 'budget', icon: DollarSign, title: 'Budget et finances', category: 'Logistique',
    steps: [
      { title: 'Categories', detail: "Creez des categories de recettes (billetterie, sponsors, subventions, stands) et de depenses (location, materiel, communication, artistes). Chaque categorie a une couleur pour les graphiques." },
      { title: 'Ecritures', detail: "Ajoutez chaque recette ou depense avec : montant, date, moyen de paiement, notes. Joignez un justificatif (photo de facture, recu PDF) a chaque ecriture." },
      { title: 'Resume', detail: "Le tableau de bord affiche en temps reel : total recettes, total depenses, solde. Les indicateurs visuels montrent si vous etes en excedent (vert) ou en deficit (rouge)." },
    ],
  },
  {
    id: 'equipment', icon: Package, title: 'Materiel et inventaire', category: 'Logistique',
    steps: [
      { title: 'Inventaire', detail: "Ajoutez vos items : nom, categorie, unite, quantite totale, valeur et type (possede, loue, prete). Creez des fiches proprietaires pour le materiel emprunte." },
      { title: 'Attributions', detail: "Distribuez le materiel aux stands, scenes ou equipes. Suivez les quantites disponibles et l'etat (neuf, bon, use)." },
    ],
  },
  {
    id: 'floor-plan', icon: MapPin, title: 'Plan de salle', category: 'Logistique',
    steps: [
      { title: 'Creer un plan', detail: "Creez un plan avec nom et dimensions. Importez une image de fond (plan cadastral, photo satellite). Configurez la grille d'accrochage." },
      { title: 'Placer les elements', detail: "Ajoutez des elements : stands (lies aux emplacements), scenes, entrees/sorties, toilettes, parking, restauration, infirmerie, point info, acces PMR, murs, barrieres et decorations. Chaque element est redimensionnable et orientable." },
    ],
  },
  {
    id: 'sponsors', icon: Handshake, title: 'Sponsors et partenaires', category: 'Logistique',
    steps: [
      { title: 'Niveaux de sponsoring', detail: "Creez des paliers (Or, Argent, Bronze, etc.) avec prix, avantages et nombre max de sponsors." },
      { title: 'Ajouter un sponsor', detail: "Renseignez : nom de l'entreprise, logo, description, contact, montant et palier. Suivez les paiements." },
      { title: 'Affichage public', detail: "Les sponsors actifs apparaissent automatiquement sur le site public, tries par niveau. Utilisez le bloc CMS 'Carousel de logos' pour les mettre en valeur." },
    ],
  },
  // ── VISITEURS ──
  {
    id: 'ticketing', icon: Ticket, title: 'Billetterie', category: 'Visiteurs',
    steps: [
      { title: 'Types de billets', detail: "Creez des types (entree journee, pass 2 jours, VIP) avec prix, quantite totale, limite par personne, periode de vente et couleur." },
      { title: 'Ventes et scans', detail: "Les visiteurs achetent via l'API. Chaque billet genere un QR code unique. Le scanner integre (/scan) valide les billets a l'entree avec feedback visuel." },
      { title: 'Statistiques', detail: "Suivez en temps reel : billets vendus, chiffre d'affaires, taux de scan." },
    ],
  },
  {
    id: 'gamification', icon: Trophy, title: 'Gamification', category: 'Visiteurs',
    steps: [
      { title: 'Cartes de tampons', detail: "Definissez le nombre de tampons a collecter et la recompense. Les visiteurs scannent les QR codes des stands pour progresser." },
      { title: 'Badges', detail: "Creez des badges a debloquer : condition (tampons, events, achats) et seuil. Les visiteurs les voient dans leur profil." },
      { title: 'Chasses au tresor', detail: "Creez une chasse avec des checkpoints. Chaque checkpoint a un indice et un QR code auto-genere. Les visiteurs scannent pour progresser." },
    ],
  },
  {
    id: 'votes', icon: Star, title: 'Votes et prix', category: 'Visiteurs',
    steps: [
      { title: 'Categories de votes', detail: "Creez des categories (meilleur stand, meilleur cosplay, prix du public). Definissez la periode de vote." },
      { title: 'Resultats', detail: "Le classement est en temps reel avec notes moyennes. Medailles or/argent/bronze pour le top 3." },
    ],
  },
  {
    id: 'raffles', icon: Gift, title: 'Tombola', category: 'Visiteurs',
    steps: [
      { title: 'Creer et gerer', detail: "Definissez une tombola avec nom, description et lots. Les visiteurs s'inscrivent (1 participation max). Cliquez sur 'Tirer au sort' pour selectionner un gagnant aleatoire." },
    ],
  },
  {
    id: 'queues', icon: ListOrdered, title: "Files d'attente", category: 'Visiteurs',
    steps: [
      { title: 'Creer une file', detail: "Definissez une file avec nom et duree moyenne de service. Les visiteurs prennent un ticket virtuel." },
      { title: 'Gerer le flux', detail: "Le tableau de bord live montre les personnes en attente. Boutons 'Appeler suivant' et 'Servi'. Rafraichissement auto toutes les 5 secondes." },
    ],
  },
  {
    id: 'surveys', icon: ClipboardList, title: 'Questionnaires', category: 'Visiteurs',
    steps: [
      { title: 'Constructeur', detail: "Creez un questionnaire avec des questions de type texte libre, choix unique/multiple, note etoiles ou oui/non. Chaque question peut etre obligatoire." },
      { title: 'Publication', detail: "Publiez et partagez le lien. Vous pouvez aussi l'integrer dans une page CMS du festival." },
      { title: 'Analyse', detail: "Consultez les reponses individuelles et les statistiques agregees (graphiques de repartition par question)." },
    ],
  },
  // ── EQUIPE ──
  {
    id: 'volunteers', icon: Users, title: 'Gerer les benevoles', category: 'Equipe',
    steps: [
      { title: 'Roles', detail: "Creez des roles (accueil, securite, buvette, technique) avec description et couleur." },
      { title: 'Creneaux', detail: "Planifiez des shifts avec role, lieu, horaires et nombre de benevoles necessaires." },
      { title: 'Affectations', detail: "Assignez les benevoles inscrits aux shifts. Ils voient leur planning une fois connectes." },
    ],
  },
  {
    id: 'artists', icon: Mic, title: 'Artistes et invites', category: 'Equipe',
    steps: [
      { title: 'Fiches', detail: "Ajoutez des artistes avec bio, photo, reseaux sociaux, categorie et role. Renseignez les besoins logistiques (cachet, rider, transport, hebergement)." },
      { title: 'Paiements', detail: "Suivez le statut de paiement de chaque artiste. Les statistiques montrent le total des cachets." },
    ],
  },
  {
    id: 'workspace', icon: Briefcase, title: 'Espace de travail', category: 'Equipe',
    steps: [
      { title: 'Documents', detail: "Editeur collaboratif type Notion : blocs paragraphe, titres, listes, citations, images. Sauvegarde automatique et synchronisation temps reel entre utilisateurs (polling 3s)." },
      { title: 'Tableurs', detail: "Tableurs avec colonnes typees (texte, nombre, date, selection, case a cocher). Edition inline avec sauvegarde automatique." },
      { title: 'Calendrier', detail: "Calendrier d'equipe avec vue mois/semaine. Evenements avec lieu, horaires et participants. Plusieurs calendriers avec couleurs." },
      { title: 'Kanban', detail: "Tableaux de taches type Trello : colonnes personnalisables, cartes avec priorite, assignee, date d'echeance et checklists." },
    ],
  },
  {
    id: 'analytics', icon: BarChart3, title: 'Statistiques', category: 'Equipe',
    steps: [
      { title: 'Tableau de bord', detail: "Vue d'ensemble : billets vendus/scannes, CA total (billetterie + POS + marketplace + sponsors), exposants, engagement (votes, tombola, tampons)." },
    ],
  },
  // ── PARAMETRES ──
  {
    id: 'settings', icon: Settings, title: 'Parametres generaux', category: 'Parametres',
    steps: [
      { title: 'Infos festival', detail: "Nom, description, ville, pays, email de contact, reseaux sociaux." },
      { title: 'Theme visuel', detail: "Couleurs (primaire, secondaire, accent, fond, texte), police, style d'en-tete. Le theme s'applique au site public du festival." },
      { title: 'Email (SMTP)', detail: "Configurez un serveur SMTP pour envoyer des emails personnalises. Guide detaille pour Gmail disponible dans l'assistant." },
    ],
  },
  {
    id: 'regulations', icon: Scale, title: 'Reglements', category: 'Parametres',
    steps: [
      { title: 'Modeles', detail: "7 modeles pre-rediges : visiteur, exposant, cosplay, photo/video, benevole, securite, vie privee. Cliquez sur 'Appliquer un modele' pour generer." },
      { title: 'Acceptation obligatoire', detail: "Activez 'Acceptation requise' pour obliger les exposants a accepter ce reglement dans leur formulaire de candidature." },
      { title: 'Suivi', detail: "Consultez qui a accepte, quand et depuis quelle IP." },
    ],
  },
  {
    id: 'roles', icon: ShieldCheck, title: 'Roles et permissions', category: 'Parametres',
    steps: [
      { title: 'Roles de base', detail: "6 roles : Owner, Admin, Editor, Moderator, Volunteer, Exhibitor." },
      { title: 'Roles personnalises', detail: "Creez des roles sur mesure avec 40 permissions granulaires groupees en 19 categories." },
    ],
  },
  {
    id: 'api', icon: Key, title: 'API et webhooks', category: 'Parametres',
    steps: [
      { title: 'Cles API', detail: "Generez des cles (prefixe fsk_) pour integrer Festosh avec vos outils. La cle n'est affichee qu'une fois a la creation." },
      { title: 'Webhooks', detail: "Recevez des notifications temps reel : ticket vendu, candidature soumise, commande creee, vote, vente." },
    ],
  },
];

function groupByCategory(tutorials: Tutorial[]) {
  const groups: { category: string; items: Tutorial[] }[] = [];
  const map = new Map<string, Tutorial[]>();
  for (const t of tutorials) {
    const arr = map.get(t.category) || [];
    arr.push(t);
    map.set(t.category, arr);
  }
  for (const [category, items] of map.entries()) groups.push({ category, items });
  return groups;
}

export function DocsOrganizerPage() {
  const [expanded, setExpanded] = useState<string | null>('create-festival');
  const grouped = groupByCategory(TUTORIALS);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/docs" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour a la documentation
      </Link>

      <div className="mb-8">
        <div className="inline-flex items-center gap-3 rounded-full bg-green-100 px-4 py-2 dark:bg-green-900/30">
          <CalendarDays className="h-5 w-5 text-green-600 dark:text-green-400" />
          <span className="text-sm font-semibold text-green-700 dark:text-green-300">Guide organisateur</span>
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">Espace organisateur</h1>
        <p className="mt-2 text-muted-foreground">
          Creez, configurez et gerez votre festival de A a Z.
        </p>
      </div>

      {grouped.map((group) => (
        <div key={group.category} className="mb-8">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">{group.category}</h2>
          <div className="space-y-3">
            {group.items.map((tut) => {
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
        </div>
      ))}

      <div className="mt-8 rounded-xl border border-border bg-card p-6 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-green-500" />
        <h3 className="text-lg font-semibold text-foreground">Pret a lancer votre festival ?</h3>
        <p className="mt-1 text-sm text-muted-foreground">Creez votre premier festival et suivez l'assistant de configuration.</p>
        <Link to="/organizer" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Mon espace organisateur
        </Link>
      </div>
    </div>
  );
}
