import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  ChevronRight,
  Rocket,
  Store,
  Users,
  Calendar,
  CalendarDays,
  FileText,
  DollarSign,
  Package,
  MapPin,
  ClipboardList,
  Settings,
  Search,
  Ticket,
  ShoppingCart,
  Handshake,
  BookMarked,
  Trophy,
  Star,
  Gift,
  Mic,
  ListOrdered,
  BarChart3,
  Key,
  QrCode,
  ShieldCheck,
  Briefcase,
  Sparkles,
  MessageSquare,
  Heart,
} from 'lucide-react';

interface DocSection {
  id: string;
  icon: typeof BookOpen;
  title: string;
  description: string;
  category?: string;
  steps: { title: string; content: string }[];
}

const TUTORIALS: DocSection[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // PREMIERS PAS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'getting-started',
    icon: Rocket,
    title: 'Premiers pas',
    description: 'Creez votre compte et decouvrez la plateforme.',
    category: 'Decouverte',
    steps: [
      { title: 'Creer un compte', content: "Rendez-vous sur la page d'inscription. Choisissez votre type de profil : visiteur, benevole, exposant ou organisateur. Votre email servira d'identifiant." },
      { title: 'Completer votre profil', content: "Ajoutez votre nom, photo et informations de contact. Les exposants peuvent completer leur profil professionnel (SIRET, assurances, logo, reseaux sociaux) depuis l'Espace exposant." },
      { title: 'Explorer la plateforme', content: "La page d'accueil affiche les prochains evenements. L'annuaire des festivals propose une vue liste et une vue carte interactive. L'annuaire des exposants permet de trouver des stands par domaine, ville ou categorie." },
      { title: 'Naviguer dans les menus', content: "Le menu utilisateur (en haut a droite) donne acces a : Mon profil, Mon espace visiteur, Messagerie, Espace exposant (si exposant/organisateur), et Administration (si admin plateforme)." },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // VISITEURS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'visitor',
    icon: Sparkles,
    title: 'Espace visiteur',
    description: 'XP, pieces, favoris, avis et historique.',
    category: 'Visiteur',
    steps: [
      { title: 'Systeme XP et pieces', content: "Chaque action sur Festosh vous rapporte des points d'experience (XP) et des pieces. Visiter un festival (+100 XP), deposer un avis (+75 XP), faire un achat (+30 XP), scanner un QR code, voter, participer a une tombola... Montez de niveau : Debutant, Curieux, Explorateur, Aventurier, Expert, Veterant, Champion, Legendaire, Mythique, Divin." },
      { title: 'Festivals visites', content: "L'onglet 'Mes festivals' affiche l'historique de tous les festivals ou votre billet a ete scanne. Pour chaque festival, vous pouvez deposer un avis de satisfaction." },
      { title: 'Formulaire de satisfaction', content: "Notez chaque festival sur 8 criteres (organisation, programme, stands, ambiance, restauration, accessibilite, rapport qualite-prix) avec des etoiles. Ajoutez un score NPS (0-10), indiquez si vous y retourneriez, et laissez un commentaire." },
      { title: 'Exposants favoris', content: "Suivez vos exposants preferes en les ajoutant en favoris depuis l'annuaire. L'onglet 'Exposants favoris' montre ou ils seront presents aux prochains festivals." },
      { title: 'Mes billets', content: "Retrouvez l'historique de tous vos billets achetes avec QR code, statut (valide/utilise) et montant." },
      { title: 'Historique XP', content: "Consultez le detail de tous vos gains XP et pieces dans l'onglet 'Historique XP'. Les regles de gain sont affichees en bas de page." },
    ],
  },
  {
    id: 'messaging',
    icon: MessageSquare,
    title: 'Messagerie',
    description: 'Communiquez avec les exposants et organisateurs.',
    category: 'Visiteur',
    steps: [
      { title: 'Envoyer un message', content: "Cliquez sur 'Messagerie' dans le menu utilisateur. Le bouton 'Nouveau message' permet d'envoyer un message a n'importe quel utilisateur en entrant son identifiant." },
      { title: 'Conversations', content: "Les conversations s'affichent a gauche avec le dernier message et le compteur de non-lus. Cliquez sur une conversation pour voir les messages. L'affichage se rafraichit automatiquement toutes les 10 secondes." },
      { title: 'Contacter un exposant', content: "Depuis l'annuaire des exposants ou la page d'un festival, cliquez sur 'Contacter' pour ouvrir directement une conversation avec l'exposant." },
    ],
  },
  {
    id: 'scan',
    icon: QrCode,
    title: 'Scanner un QR code',
    description: "Scannez les QR codes aux festivals pour gagner des recompenses.",
    category: 'Visiteur',
    steps: [
      { title: 'Acceder au scanner', content: "Rendez-vous sur /scan ou cliquez sur le lien de scan fourni par l'organisateur. Le scanner fonctionne sans compte (mais les XP ne sont attribues qu'aux utilisateurs connectes)." },
      { title: 'Types de QR codes', content: "Les organisateurs peuvent creer differents types : tickets d'entree, tickets boisson/nourriture, trophees a collectionner, points de chasse au tresor, bons/coupons, points tampon. Chaque type a ses propres recompenses en XP et pieces." },
      { title: 'Resultat du scan', content: "Apres un scan reussi, l'ecran affiche le type d'objet, son nom, et les XP/pieces gagnes. Les tickets consommables (boisson, entree) ne peuvent etre scannes qu'une seule fois." },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BENEVOLE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'volunteer-profile',
    icon: Heart,
    title: 'Espace benevole',
    description: 'Creez votre profil, candidatez et suivez vos missions.',
    category: 'Benevole',
    steps: [
      { title: 'Creer votre profil', content: "Depuis le menu utilisateur, cliquez sur 'Espace benevole'. L'onglet 'Profil' vous permet de renseigner vos competences (langues, secourisme, technique...), certifications (BAFA, PSC1, SST...), disponibilites par jour de la semaine, et actions preferees parmi 23 types (accueil, buvette, securite, logistique, etc.)." },
      { title: 'Informations pratiques', content: "Renseignez votre taille de t-shirt, si vous avez un vehicule, si vous etes PMR, et votre contact d'urgence (nom + telephone). Ces informations aident les organisateurs a planifier la logistique." },
      { title: 'Candidater a un festival', content: "L'onglet 'Postuler' affiche les festivals qui recherchent des benevoles. Cliquez sur 'Postuler', selectionnez vos actions preferees pour ce festival, indiquez vos disponibilites specifiques et redigez votre motivation." },
      { title: 'Suivre vos candidatures', content: "L'onglet 'Mes candidatures' centralise toutes vos candidatures avec le nom du festival, l'edition et le statut (en attente, acceptee, refusee). Une fois accepte, l'organisateur vous assignera des creneaux dans le planning benevole." },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPOSANTS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'exhibitor-profile',
    icon: Store,
    title: 'Profil exposant',
    description: 'Creez votre profil professionnel reutilisable.',
    category: 'Exposant',
    steps: [
      { title: 'Creer son profil', content: "Depuis l'Espace exposant, completez votre profil : nom de societe, activite, description, logo, photo de stand, site web, reseaux sociaux, SIRET, assurances, coordonnees du responsable." },
      { title: 'Documents', content: "Uploadez vos documents officiels (KBIS, attestation d'assurance, piece d'identite). Definissez une date d'expiration pour recevoir un rappel de renouvellement 30 jours avant." },
      { title: 'Adresse de facturation', content: "Renseignez votre adresse de facturation separement de l'adresse du siege. Elle sera utilisee pour les factures emises par les festivals." },
      { title: 'Visibilite', content: "L'onglet 'Visibilite' permet de controler quelles informations sont publiques (visibles par tous) ou reservees aux organisateurs. Vous pouvez aussi masquer votre profil de l'annuaire public." },
      { title: 'Domaines et PMR', content: "Selectionnez vos domaines d'activite (Auteur, Illustrateur, Artisan, Bijoux, Tatouage, etc.) et indiquez si votre stand est accessible PMR." },
    ],
  },
  {
    id: 'exhibitor-applications',
    icon: ClipboardList,
    title: 'Candidatures exposant',
    description: 'Candidatez a plusieurs festivals avec un seul profil.',
    category: 'Exposant',
    steps: [
      { title: 'Candidater', content: "Sur la page d'un festival, cliquez sur 'Candidater'. Votre profil exposant est pre-rempli. Indiquez vos preferences : zone, taille de stand, besoins en electricite/eau." },
      { title: 'Suivi cross-festivals', content: "L'onglet 'Mes candidatures' de l'Espace exposant centralise toutes vos candidatures sur tous les festivals : statut, montant, lien vers l'admin du festival." },
      { title: 'Factures et PDF', content: "L'onglet 'Mes factures' centralise toutes les factures emises par les festivals. Cliquez sur le bouton PDF a droite de chaque facture pour la telecharger en version imprimable (format A4 avec emetteur, client, montants HT/TVA/TTC)." },
    ],
  },
  {
    id: 'exhibitor-apply-detail',
    icon: ClipboardList,
    title: 'Candidature exposant detaillee',
    description: 'Le parcours complet pour candidater a un festival.',
    category: 'Exposant',
    steps: [
      { title: 'Acceder au formulaire', content: "Rendez-vous sur le site public d'un festival (via l'annuaire), puis cliquez sur 'Candidature' dans le menu. Vous devez etre connecte avec un profil exposant." },
      { title: 'Choisir un type de stand', content: "L'organisateur propose differents types de stands avec dimensions, prix (forfait ou par jour), et options (electricite, eau). Cliquez sur le type souhaite pour le selectionner." },
      { title: 'Selectionner un emplacement', content: "Si l'organisateur a active la selection d'emplacements, vous pouvez choisir votre emplacement prefere sur le plan. Sinon, l'organisateur vous attribuera un emplacement apres acceptation." },
      { title: 'Demandes particulieres', content: "Redigez vos besoins specifiques : preferences de placement, equipement supplementaire, contraintes d'installation, acces PMR, etc." },
      { title: 'Accepter les reglements', content: "Si le festival exige l'acceptation de reglements (reglement exposant, reglement interieur...), cochez chaque reglement pour confirmer votre lecture et acceptation." },
      { title: 'Verifier et envoyer', content: "Le panneau recapitulatif a droite affiche votre profil exposant, le type de stand choisi et le statut des reglements. Assurez-vous que votre profil est complet (raison sociale, email, SIRET). Cliquez sur 'Envoyer la candidature'." },
      { title: 'Suivi', content: "Apres envoi, retrouvez votre candidature dans l'Espace exposant > Candidatures. L'organisateur la traitera et vous recevrez une notification. Si acceptee, votre stand assigne et les notes de l'organisateur seront visibles." },
    ],
  },
  {
    id: 'pos',
    icon: ShoppingCart,
    title: 'Caisse et stock (POS)',
    description: 'Vendez, gerez votre stock et suivez votre comptabilite.',
    category: 'Exposant',
    steps: [
      { title: 'Produits', content: "Creez vos produits avec nom, description, prix, cout d'achat, TVA (0%, 5.5%, 10%, 20%), stock initial et seuil d'alerte. Organisez-les par categories. Activez 'En ligne' pour les proposer sur le marketplace." },
      { title: 'Caisse (POS)', content: "La page /pos affiche une caisse tactile optimisee pour tablette. Selectionnez les produits, ajustez les quantites, appliquez un code promo, choisissez le mode de paiement (especes, CB, virement) et encaissez. Le stock est decremente automatiquement." },
      { title: 'Coupons', content: "Creez des codes promo (pourcentage ou montant fixe) avec limites d'utilisation, montant minimum et periode de validite." },
      { title: 'Comptabilite', content: "La page /pos/accounting affiche le chiffre d'affaires, les charges, le benefice net et l'objectif neutre (break-even). Ajoutez vos depenses (stand, transport, hebergement, materiel...) et l'outil calcule combien il reste a vendre pour etre rentable." },
      { title: 'Stock', content: "Les alertes de stock bas s'affichent en orange, les ruptures en rouge. Le stock est mis a jour en temps reel a chaque vente." },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ORGANISATEUR — Gestion de base
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'create-festival',
    icon: Rocket,
    title: 'Creer un festival',
    description: 'Configurez votre evenement de A a Z.',
    category: 'Organisateur',
    steps: [
      { title: 'Creer le festival', content: "Depuis le Dashboard, cliquez sur 'Creer un festival'. Renseignez le nom, la ville et le pays. Un slug URL est genere automatiquement. Les coordonnees GPS sont calculees automatiquement depuis l'adresse via OpenStreetMap." },
      { title: 'Premiere edition', content: "Une premiere edition est creee automatiquement. Configurez ses dates dans Parametres > General. Chaque edition a son propre programme, budget, stands et billetterie." },
      { title: 'Equipe', content: "Invitez vos collaborateurs et attribuez-leur un role de base (owner, admin, editor, moderator, volunteer, exhibitor). Les owners et admins ont acces a toutes les fonctionnalites." },
      { title: 'Site public', content: "Votre festival a un sous-site accessible a /f/{slug}. Personnalisez-le avec le CMS, les couleurs et le logo." },
    ],
  },
  {
    id: 'cms',
    icon: FileText,
    title: 'Contenu CMS',
    description: "Editeur de pages avec blocs et navigation.",
    category: 'Organisateur',
    steps: [
      { title: 'Creer une page', content: "Allez dans Contenu CMS et cliquez sur 'Nouvelle page'. Donnez-lui un titre et un slug. La page sera accessible a /f/{slug}/p/{page-slug}." },
      { title: 'Editeur de blocs', content: "Ajoutez des blocs : texte, image, galerie, video, formulaire de contact, FAQ, compteur, HTML personnalise, tableau de prix, etc. Chaque bloc est configurable et reordonnable." },
      { title: 'Navigation', content: "Gerez le menu de navigation de votre site public : ajoutez des liens vers vos pages, des URL externes, avec support des sous-menus." },
    ],
  },
  {
    id: 'exhibitors-admin',
    icon: Store,
    title: 'Gestion des exposants',
    description: 'Candidatures, stands et emplacements.',
    category: 'Organisateur',
    steps: [
      { title: 'Types de stands', content: "Definissez vos types de stands : nom, dimensions, prix (forfait ou par jour), electricite/eau en option, equipements inclus ou payants." },
      { title: 'Emplacements', content: "Creez des emplacements avec code unique et zone. Associez-les a un type de stand. Placez-les sur le plan de salle." },
      { title: 'Candidatures', content: "Les exposants candidatent via le formulaire public. Gerez les candidatures : en attente, en revision, approuvee, refusee, liste d'attente. Attribuez un emplacement aux candidatures approuvees." },
    ],
  },
  {
    id: 'programming',
    icon: Calendar,
    title: 'Programmation',
    description: 'Evenements, lieux et horaires.',
    category: 'Organisateur',
    steps: [
      { title: 'Lieux', content: "Creez vos lieux (scenes, salles, espaces) avec nom, type et capacite." },
      { title: 'Evenements', content: "Ajoutez vos evenements avec titre, description, categorie, horaires, lieu, intervenants et capacite max." },
      { title: 'Categories', content: "Utilisez les categories (concert, conference, atelier, animation...) pour organiser le programme. Les visiteurs filtrent par categorie sur le site public." },
    ],
  },
  {
    id: 'volunteers',
    icon: Users,
    title: 'Benevoles',
    description: 'Roles, shifts et affectations.',
    category: 'Organisateur',
    steps: [
      { title: 'Roles', content: "Creez des roles de benevoles (accueil, securite, logistique, technique...) avec description et couleur." },
      { title: 'Shifts', content: "Planifiez des creneaux horaires pour chaque role et lieu. Definissez le nombre de benevoles necessaires." },
      { title: 'Affectations', content: "Affectez les benevoles inscrits aux shifts disponibles. Ils voient leur planning personnel une fois connectes." },
    ],
  },
  {
    id: 'budget',
    icon: DollarSign,
    title: 'Budget',
    description: 'Recettes, depenses et justificatifs.',
    category: 'Organisateur',
    steps: [
      { title: 'Categories', content: "Definissez vos categories de recettes (billetterie, sponsors, subventions) et depenses (location, materiel, communication)." },
      { title: 'Ecritures', content: "Ajoutez vos recettes et depenses avec montant, date, moyen de paiement et notes. Joignez un justificatif (PDF, photo) a chaque ecriture." },
      { title: 'Suivi', content: "Le tableau de bord affiche le total recettes, depenses et solde en temps reel." },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ORGANISATEUR — Commerce
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'ticketing',
    icon: Ticket,
    title: 'Billetterie',
    description: 'Vente de billets avec QR codes et scan.',
    category: 'Commerce',
    steps: [
      { title: 'Types de billets', content: "Creez des types de billets : nom, prix, quantite totale, max par commande, periode de vente, periode de validite, couleur." },
      { title: 'Achat', content: "Les visiteurs achetent leurs billets via l'API. Chaque billet genere un QR code unique et une reference de commande." },
      { title: 'Scan', content: "Le scanner integre permet de valider les billets a l'entree. Scannez le QR code : vert = valide, jaune = deja utilise, rouge = invalide." },
      { title: 'Statistiques', content: "Suivez les ventes en temps reel : billets vendus, chiffre d'affaires, taux de scan." },
    ],
  },
  {
    id: 'marketplace',
    icon: ShoppingCart,
    title: 'Marketplace',
    description: 'Boutique en ligne multi-vendeurs.',
    category: 'Commerce',
    steps: [
      { title: 'Produits en ligne', content: "Les exposants activent 'En ligne' sur leurs produits pour les rendre disponibles sur le marketplace du festival." },
      { title: 'Commandes', content: "Les visiteurs passent commande via la boutique publique. Chaque commande peut contenir des produits de plusieurs exposants." },
      { title: 'Gestion vendeur', content: "Les exposants voient leurs commandes dans l'onglet Marketplace de l'admin. Ils mettent a jour le statut par article (en attente, confirme, expedie, livre)." },
    ],
  },
  {
    id: 'sponsors',
    icon: Handshake,
    title: 'Sponsors',
    description: 'Paliers, sponsors et suivi des paiements.',
    category: 'Commerce',
    steps: [
      { title: 'Paliers', content: "Definissez des paliers de sponsoring (Or, Argent, Bronze...) avec prix, avantages (texte libre), couleur et nombre max de sponsors." },
      { title: 'Sponsors', content: "Ajoutez vos sponsors avec entreprise, logo, contact, montant et palier. Suivez les paiements avec le toggle 'Paye'." },
      { title: 'Affichage public', content: "Les sponsors actifs s'affichent automatiquement sur le site public, tries par niveau de palier." },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ORGANISATEUR — Experience visiteur
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'reservations',
    icon: BookMarked,
    title: 'Reservations',
    description: 'Creneaux reservables pour ateliers et dedicaces.',
    category: 'Experience visiteur',
    steps: [
      { title: 'Creer des creneaux', content: "Definissez des creneaux reservables avec titre, description, lieu, horaires, capacite et prix optionnel." },
      { title: 'Reservations', content: "Les visiteurs reservent via le site public. Un QR code est genere pour chaque reservation. La capacite est decrementee automatiquement." },
    ],
  },
  {
    id: 'gamification',
    icon: Trophy,
    title: 'Gamification',
    description: 'Tampons, badges et chasses au tresor.',
    category: 'Experience visiteur',
    steps: [
      { title: 'Cartes tampons', content: "Creez des cartes tampons : nom, nombre de tampons requis et recompense. Les visiteurs collectent des tampons en scannant les QR codes des stands." },
      { title: 'Badges', content: "Definissez des badges a debloquer : condition (tampons collectes, events assistes, achats effectues, chasses terminees) et seuil. Les visiteurs les voient dans leur profil." },
      { title: 'Chasses au tresor', content: "Creez une chasse avec des points de controle. Chaque checkpoint a un nom, un indice et un QR code auto-genere. Les visiteurs scannent les QR codes pour progresser." },
    ],
  },
  {
    id: 'votes',
    icon: Star,
    title: 'Votes et prix du public',
    description: 'Categories de votes avec classement.',
    category: 'Experience visiteur',
    steps: [
      { title: 'Categories', content: "Creez des categories de votes : nom, periode de vote, nombre max de votes par visiteur." },
      { title: 'Voter', content: "Les visiteurs votent pour un exposant ou produit avec une note de 1 a 5 etoiles et un commentaire optionnel." },
      { title: 'Resultats', content: "Les resultats s'affichent en temps reel avec classement par note moyenne. Medailles or/argent/bronze pour le top 3." },
    ],
  },
  {
    id: 'raffles',
    icon: Gift,
    title: 'Tombola',
    description: 'Lots, participations et tirage au sort.',
    category: 'Experience visiteur',
    steps: [
      { title: 'Creer une tombola', content: "Definissez une tombola avec nom, description et date de tirage. Ajoutez des lots (nom, description, sponsor)." },
      { title: 'Participations', content: "Les visiteurs participent et recoivent un code unique. Chaque visiteur ne peut participer qu'une fois." },
      { title: 'Tirage', content: "Cliquez sur 'Tirer au sort' pour selectionner aleatoirement un gagnant par lot. Les resultats s'affichent immediatement." },
    ],
  },
  {
    id: 'queues',
    icon: ListOrdered,
    title: "Files d'attente virtuelles",
    description: 'Evitez les queues physiques.',
    category: 'Experience visiteur',
    steps: [
      { title: 'Creer une file', content: "Definissez une file d'attente avec nom, lieu et duree moyenne de service." },
      { title: 'Rejoindre', content: "Les visiteurs prennent un ticket virtuel et recoivent un numero. L'attente estimee est calculee automatiquement." },
      { title: 'Gerer', content: "Le tableau de bord live montre les personnes en attente. Boutons 'Appeler suivant' et 'Servi' pour gerer le flux. Rafraichissement automatique toutes les 5 secondes." },
    ],
  },
  {
    id: 'surveys',
    icon: ClipboardList,
    title: 'Questionnaires',
    description: 'Sondages personnalises pour les visiteurs.',
    category: 'Experience visiteur',
    steps: [
      { title: 'Creer un questionnaire', content: "Allez dans Questionnaires et cliquez 'Nouveau'. Donnez un titre et une description. Ajoutez des questions de type : texte libre, choix unique, choix multiple, note (etoiles), oui/non." },
      { title: 'Configurer les questions', content: "Pour chaque question, definissez le libelle, le type, si elle est obligatoire, et les options de reponse (pour les choix). Reordonnez les questions par glisser-deposer." },
      { title: 'Publier et partager', content: "Publiez le questionnaire pour le rendre accessible. Un lien unique est genere. Vous pouvez aussi l'integrer dans une page CMS du festival." },
      { title: 'Analyser les reponses', content: "L'onglet 'Reponses' affiche toutes les reponses collectees. L'onglet 'Statistiques' montre des graphiques de repartition pour chaque question." },
      { title: 'Dupliquer', content: "Dupliquez un questionnaire existant pour en creer une variante sans repartir de zero." },
    ],
  },
  {
    id: 'qr-objects',
    icon: QrCode,
    title: 'QR Codes universels',
    description: 'Trophees, tickets, bons — tout en QR code.',
    category: 'Experience visiteur',
    steps: [
      { title: 'Types', content: "8 types : Trophee, Point de chasse, Ticket d'entree, Ticket boisson, Ticket nourriture, Bon/Coupon, Point tampon, Personnalise." },
      { title: 'Creation unitaire', content: "Creez un QR code avec nom, type, recompenses XP/pieces, limites de scan, periode de validite." },
      { title: 'Creation en lot', content: "Generez jusqu'a 500 QR codes en une fois (ex: 200 tickets boisson). La liste des codes est copiable pour impression." },
      { title: 'Scan', content: "La page /scan permet a n'importe qui de scanner un QR code. Feedback visuel immediat : succes avec recompenses ou erreur detaillee." },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ORGANISATEUR — Production
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'artists',
    icon: Mic,
    title: 'Artistes et invites',
    description: 'Fiches artistes, cachets et logistique.',
    category: 'Production',
    steps: [
      { title: 'Fiches artistes', content: "Ajoutez vos artistes/invites avec bio, photo, site web, reseaux sociaux, categorie et role." },
      { title: 'Logistique', content: "Renseignez les besoins : cachet, rider technique, regime alimentaire, transport, hebergement, dates d'arrivee/depart." },
      { title: 'Paiements', content: "Suivez le statut de paiement de chaque artiste. Les statistiques montrent le total des cachets, le nombre paye et la repartition par categorie." },
    ],
  },
  {
    id: 'analytics',
    icon: BarChart3,
    title: 'Analytics',
    description: 'Tableau de bord temps reel.',
    category: 'Production',
    steps: [
      { title: 'Vue d\'ensemble', content: "Le dashboard affiche en temps reel : billets vendus/scannes, chiffre d'affaires total (billetterie + POS + marketplace + sponsors), nombre d'exposants, et engagement (votes, tombola, tampons)." },
      { title: 'Affluence', content: "Le taux de scan (billets scannes / vendus) indique l'affluence reelle vs les ventes." },
      { title: 'Revenus', content: "Repartition des revenus par source avec barres visuelles." },
    ],
  },
  {
    id: 'workspace',
    icon: Briefcase,
    title: 'Espace de travail collaboratif',
    description: 'Documents, tableurs, calendrier et taches.',
    category: 'Production',
    steps: [
      { title: 'Documents', content: "Editeur de documents collaboratif type Notion : blocs paragraphe, titres, listes, citations, code, images. Sauvegarde automatique et synchronisation temps reel entre utilisateurs." },
      { title: 'Tableurs', content: "Tableurs collaboratifs avec colonnes typees (texte, nombre, date, selection, case a cocher). Edition inline avec sauvegarde automatique sur chaque cellule." },
      { title: 'Calendrier partage', content: "Calendrier d'equipe avec vue mois et semaine. Creez des evenements avec lieu, horaires, rappels et participants. Filtrez par calendrier (plusieurs calendriers avec couleurs)." },
      { title: 'Tableaux kanban', content: "Tableaux de taches type Trello : colonnes personnalisables, cartes avec priorite, assignee, date d'echeance, labels et checklists. Deplacement entre colonnes. Limite WIP configurable." },
      { title: 'Collaboration', content: "Tous les outils se synchronisent automatiquement toutes les 3 secondes. Les modifications des autres utilisateurs apparaissent sans recharger la page." },
    ],
  },
  {
    id: 'meetings',
    icon: ClipboardList,
    title: 'Reunions collaboratives',
    description: 'Editeur de reunions avec blocs interactifs.',
    category: 'Production',
    steps: [
      { title: 'Creer une reunion', content: "Creez une reunion avec titre, date, duree et lieu. Un ordre du jour avec blocs par defaut est cree automatiquement." },
      { title: 'Types de blocs', content: "8 types : Texte, Titre (H1/H2/H3), Checklist (items avec statut valide/en cours/annule), Actions (avec assignee et date), Sondage (vote en temps reel), Separateur, Note (info/warning/success), Decision (proposee/acceptee/rejetee)." },
      { title: 'Edition collaborative', content: "Tous les participants voient les modifications en temps reel (polling 3s). L'historique de chaque bloc est conserve. Le dernier editeur est affiche." },
      { title: 'Sondages', content: "Les blocs sondage permettent de voter en temps reel. Chaque option affiche le nombre de votes et le pourcentage. Le sondage peut etre ferme." },
    ],
  },
  {
    id: 'roles',
    icon: ShieldCheck,
    title: 'Roles et permissions',
    description: 'Roles personnalises avec permissions granulaires.',
    category: 'Production',
    steps: [
      { title: 'Roles de base', content: "6 roles de base : Owner (tout), Admin (tout), Editor (contenu), Moderator (moderation), Volunteer (benevole), Exhibitor (exposant). Les owners et admins ont toutes les permissions." },
      { title: 'Roles personnalises', content: "Creez des roles sur mesure avec 40 permissions groupees en 19 categories : CMS, Programme, Exposants, Benevoles, Budget, Billetterie, Sponsors, Gamification, Votes, Tombola, QR Codes, Artistes, Files d'attente, Reservations, Materiel, Analytics, Marketplace, Parametres, Membres." },
      { title: 'Assigner', content: "Attribuez un role personnalise a chaque membre de l'equipe en complement de son role de base. Les permissions se cumulent." },
      { title: 'Scope edition', content: "Un role personnalise peut etre limite a une edition specifique (ou global au festival)." },
    ],
  },
  {
    id: 'api',
    icon: Key,
    title: 'API et webhooks',
    description: 'Integrez Festosh avec vos outils.',
    category: 'Production',
    steps: [
      { title: 'Cles API', content: "Generez des cles API (prefixe fsk_) pour acceder a l'API Festosh depuis vos outils. La cle complete n'est affichee qu'une seule fois a la creation." },
      { title: 'Webhooks', content: "Configurez des webhooks pour recevoir des notifications en temps reel : ticket vendu, commande creee, candidature soumise, vote exprime, vente effectuee." },
      { title: 'Logs', content: "Consultez l'historique des appels webhook : statut HTTP, duree, corps de la reponse." },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PARAMETRES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'settings',
    icon: Settings,
    title: 'Parametres du festival',
    description: 'Theme, editions, email et communication.',
    category: 'Parametres',
    steps: [
      { title: 'Informations', content: "Modifiez le nom, la description, le logo, la banniere, la ville et l'adresse. Les coordonnees GPS sont mises a jour automatiquement." },
      { title: 'Theme', content: "Personnalisez les couleurs primaire, secondaire, d'accent, fond et texte. Choisissez la police et le style d'en-tete de votre site public." },
      { title: 'Communication', content: "Configurez les parametres SMTP pour l'envoi d'emails et les campagnes email aux exposants et participants." },
      { title: 'Editions', content: "Gerez les editions de votre festival. Chaque edition a ses propres dates, programme, budget, stands et billetterie. Activez l'edition courante." },
    ],
  },
  {
    id: 'regulations',
    icon: BookMarked,
    title: 'Reglements',
    description: 'Regles du festival avec acceptation obligatoire.',
    category: 'Parametres',
    steps: [
      { title: 'Templates', content: "Cliquez sur 'Appliquer un modele' pour generer un reglement pre-redige. 7 modeles disponibles : Visiteur, Exposant, Cosplay, Photo/Video, Benevole, Securite, Vie privee." },
      { title: 'Personnaliser', content: "Modifiez le titre, le contenu et la categorie. L'editeur de texte riche permet de structurer le document avec titres, listes et mise en forme." },
      { title: 'Acceptation obligatoire', content: "Activez 'Acceptation requise' pour obliger les exposants a accepter ce reglement lors de leur candidature. Une case a cocher apparaitra sur le formulaire de candidature." },
      { title: 'Publication', content: "Publiez le reglement pour le rendre visible sur le site public du festival (page 'Reglements'). Les reglements non publies sont en brouillon." },
      { title: 'Suivi des acceptations', content: "Consultez qui a accepte chaque reglement, a quelle date et depuis quelle adresse IP. Utile pour prouver le consentement en cas de litige." },
    ],
  },
  {
    id: 'equipment',
    icon: Package,
    title: 'Materiel',
    description: "Inventaire et affectations.",
    category: 'Parametres',
    steps: [
      { title: 'Inventaire', content: "Ajoutez vos items avec nom, categorie, quantite, valeur et type d'acquisition (possede, loue, prete)." },
      { title: 'Proprietaires', content: "Creez des fiches proprietaires avec coordonnees pour le materiel emprunte ou loue." },
      { title: 'Affectations', content: "Distribuez le materiel aux stands, scenes ou evenements. Suivez les quantites disponibles." },
    ],
  },
  {
    id: 'floor-plan',
    icon: MapPin,
    title: 'Plan du site',
    description: 'Plan visuel interactif.',
    category: 'Parametres',
    steps: [
      { title: 'Creer un plan', content: "Creez un plan avec nom et dimensions. Importez une image de fond (plan cadastral, photo aerienne)." },
      { title: 'Elements', content: "Placez vos emplacements de stands, scenes et points d'interet sur le plan. Les elements sont lies aux donnees existantes." },
    ],
  },
];

// Group tutorials by category
function groupByCategory(tutorials: DocSection[]): { category: string; items: DocSection[] }[] {
  const groups: { category: string; items: DocSection[] }[] = [];
  const map = new Map<string, DocSection[]>();
  for (const t of tutorials) {
    const cat = t.category || 'Autre';
    const existing = map.get(cat) || [];
    existing.push(t);
    map.set(cat, existing);
  }
  for (const [category, items] of map.entries()) {
    groups.push({ category, items });
  }
  return groups;
}

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

  const grouped = groupByCategory(filteredTutorials);

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
              Guides complets pour visiteurs, exposants et organisateurs.
            </p>

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

      {/* Role-specific guides */}
      <section className="border-b border-border py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-6 text-center text-lg font-bold text-foreground">Guides par type d'utilisateur</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { to: '/docs/visitor', icon: Sparkles, label: 'Visiteur', desc: 'XP, billets, tampons, votes, tombola', color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' },
              { to: '/docs/volunteer', icon: Heart, label: 'Benevole', desc: 'Profil, competences, candidatures, missions', color: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400' },
              { to: '/docs/exhibitor', icon: Store, label: 'Exposant', desc: 'Profil, stands, POS, documents, factures', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
              { to: '/docs/organizer', icon: CalendarDays, label: 'Organisateur', desc: 'Creation, CMS, exposants, budget, equipe', color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' },
            ].map((g) => (
              <Link key={g.to} to={g.to} className="group rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md hover:border-primary/30">
                <div className={`mb-3 inline-flex rounded-lg p-2.5 ${g.color}`}>
                  <g.icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-foreground group-hover:text-primary">{g.label}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{g.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
            {/* Sidebar nav */}
            <aside className="hidden lg:block">
              <nav className="sticky top-20 space-y-4 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2">
                {grouped.map((group) => (
                  <div key={group.category}>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {group.category}
                    </p>
                    <div className="space-y-0.5">
                      {group.items.map((t) => {
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
                            className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
                              expandedSection === t.id
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                            {t.title}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>
            </aside>

            {/* Main content */}
            <div className="space-y-6">
              {filteredTutorials.length === 0 ? (
                <div className="rounded-lg border border-dashed p-12 text-center">
                  <Search className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-3 text-muted-foreground">
                    Aucun resultat pour "{searchQuery}"
                  </p>
                </div>
              ) : (
                grouped.map((group) => (
                  <div key={group.category}>
                    <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      {group.category}
                    </h2>
                    <div className="space-y-3">
                      {group.items.map((section) => {
                        const Icon = section.icon;
                        const isExpanded = expandedSection === section.id || searchQuery.trim() !== '';

                        return (
                          <div
                            key={section.id}
                            id={`doc-${section.id}`}
                            className="scroll-mt-20 rounded-lg border bg-card"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedSection(isExpanded && !searchQuery ? null : section.id)
                              }
                              className="flex w-full items-center gap-4 p-4 text-left"
                            >
                              <div className="rounded-lg bg-primary/10 p-2">
                                <Icon className="h-4 w-4 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
                                <p className="mt-0.5 text-xs text-muted-foreground">{section.description}</p>
                              </div>
                              <ChevronRight
                                className={`h-4 w-4 text-muted-foreground transition-transform ${
                                  isExpanded ? 'rotate-90' : ''
                                }`}
                              />
                            </button>

                            {isExpanded && (
                              <div className="border-t px-4 py-3">
                                <div className="space-y-4">
                                  {section.steps.map((step, idx) => (
                                    <div key={idx} className="flex gap-3">
                                      <div className="flex flex-col items-center">
                                        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                                          {idx + 1}
                                        </div>
                                        {idx < section.steps.length - 1 && (
                                          <div className="mt-1 w-px flex-1 bg-border" />
                                        )}
                                      </div>
                                      <div className="pb-3">
                                        <h4 className="text-sm font-medium text-foreground">{step.title}</h4>
                                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
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
                      })}
                    </div>
                  </div>
                ))
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
            Si vous avez des questions, utilisez la messagerie integree ou contactez-nous.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Link
              to="/about"
              className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              A propos
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
