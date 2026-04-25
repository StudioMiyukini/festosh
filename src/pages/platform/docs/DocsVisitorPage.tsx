import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Sparkles, Star, Ticket, Heart, QrCode, Trophy, Gift,
  ListOrdered, BookMarked, MessageSquare, ChevronDown, CheckCircle2,
} from 'lucide-react';

interface Tutorial {
  id: string;
  icon: typeof Sparkles;
  title: string;
  steps: { title: string; detail: string }[];
}

const TUTORIALS: Tutorial[] = [
  {
    id: 'first-steps',
    icon: Sparkles,
    title: 'Premiers pas en tant que visiteur',
    steps: [
      { title: 'Creer votre compte', detail: "Cliquez sur 'S'inscrire' en haut a droite. Choisissez le type 'Visiteur'. Renseignez votre nom d'utilisateur, email et mot de passe (10 caracteres minimum, avec majuscule, minuscule et chiffre). Validez et connectez-vous." },
      { title: 'Completer votre profil', detail: "Allez dans 'Mon profil' via le menu utilisateur. Ajoutez votre prenom, nom, date de naissance et une photo de profil. Ces informations apparaitront dans vos avis et interactions." },
      { title: 'Decouvrir les festivals', detail: "Cliquez sur 'Festivals' dans la barre de navigation. Vous verrez la liste de tous les festivals publies. Utilisez la barre de recherche ou la carte interactive pour trouver un evenement pres de chez vous." },
      { title: 'Acceder a un festival', detail: "Cliquez sur un festival dans l'annuaire pour acceder a son site public. Vous y trouverez le programme, les exposants, le plan, la candidature exposant et les reglements." },
    ],
  },
  {
    id: 'xp-system',
    icon: Star,
    title: 'Systeme XP et niveaux',
    steps: [
      { title: 'Comprendre les XP', detail: "Les XP (points d'experience) recompensent votre participation. Chaque action sur Festosh vous rapporte des XP : assister a un festival (+100), laisser un avis (+75), acheter un billet (+50), scanner un QR code (+30), voter (+20), participer a une tombola (+15), collectionner un tampon (+15)." },
      { title: 'Monter de niveau', detail: "Votre niveau progresse a chaque palier d'XP. Les 10 niveaux sont : Debutant (0), Curieux (100), Explorateur (300), Aventurier (600), Expert (1000), Veteran (1500), Champion (2500), Legendaire (4000), Mythique (6000), Divin (10000)." },
      { title: 'Gagner des pieces', detail: "En plus des XP, vous gagnez des pieces virtuelles. Elles peuvent etre utilisees pour des fonctionnalites speciales ou des recompenses dans les festivals participants." },
      { title: 'Consulter votre progression', detail: "Rendez-vous dans 'Espace visiteur' via le menu utilisateur. Le tableau de bord affiche votre niveau actuel, la barre de progression vers le prochain niveau, vos XP totaux et vos pieces." },
    ],
  },
  {
    id: 'tickets',
    icon: Ticket,
    title: 'Acheter et utiliser des billets',
    steps: [
      { title: 'Trouver la billetterie', detail: "Sur le site public d'un festival, la section billetterie affiche les types de billets disponibles avec leur prix, la quantite restante et la limite par personne." },
      { title: 'Acheter un billet', detail: "Selectionnez le type de billet souhaite et la quantite. Confirmez votre achat. Un QR code unique est genere pour chaque billet." },
      { title: 'Retrouver vos billets', detail: "Tous vos billets sont accessibles dans 'Espace visiteur > Mes billets'. Chaque billet affiche le QR code, le nom du festival, la date et le statut (valide ou utilise)." },
      { title: "Presenter votre billet a l'entree", detail: "Ouvrez votre billet et presentez le QR code au scanner a l'entree du festival. L'ecran affichera vert (valide), jaune (deja scanne) ou rouge (invalide)." },
    ],
  },
  {
    id: 'favorites',
    icon: Heart,
    title: 'Favoris et avis',
    steps: [
      { title: 'Suivre un exposant', detail: "Dans l'annuaire des exposants ou sur la page d'un festival, cliquez sur l'icone coeur a cote d'un exposant pour l'ajouter a vos favoris. Retrouvez-les dans 'Espace visiteur > Favoris'." },
      { title: 'Laisser un avis', detail: "Apres avoir assiste a un festival (billet scanne), rendez-vous dans 'Espace visiteur > Mes festivals'. Cliquez sur 'Donner mon avis' a cote du festival." },
      { title: 'Criteres de notation', detail: "Notez sur 8 criteres : organisation, programme, stands, ambiance, restauration, accessibilite, rapport qualite-prix, accueil. Chaque critere se note de 1 a 5 etoiles." },
      { title: 'Score NPS', detail: "En plus des etoiles, indiquez sur une echelle de 0 a 10 si vous recommanderiez ce festival. Vous pouvez aussi indiquer si vous comptez y retourner et laisser un commentaire libre." },
    ],
  },
  {
    id: 'stamps',
    icon: Trophy,
    title: 'Cartes de tampons',
    steps: [
      { title: 'Trouver une carte', detail: "Pendant un festival, consultez la section gamification. Les cartes de tampons actives s'affichent avec le nombre de tampons a collecter et la recompense promise." },
      { title: 'Collecter des tampons', detail: "Rendez-vous aux stands participants. Chaque stand dispose d'un QR code. Scannez-le avec votre telephone depuis la page /scan. Le tampon est ajoute automatiquement a votre carte." },
      { title: 'Voir votre progression', detail: "Dans 'Espace visiteur', consultez vos cartes de tampons. La barre de progression indique combien de tampons il vous reste a collecter." },
      { title: 'Obtenir la recompense', detail: "Une fois tous les tampons collectes, la recompense est debloquee automatiquement. Vous recevez egalement des XP bonus (+100 XP pour une carte complete)." },
    ],
  },
  {
    id: 'hunt',
    icon: QrCode,
    title: 'Chasse au tresor',
    steps: [
      { title: 'Rejoindre une chasse', detail: "Sur le site d'un festival, consultez les chasses au tresor actives. Chaque chasse a un theme, une description et une liste de checkpoints a trouver." },
      { title: 'Trouver les indices', detail: "Chaque checkpoint donne un indice pour localiser le QR code cache dans le festival. Les indices peuvent etre des enigmes, des descriptions de lieux ou des coordonnees." },
      { title: 'Scanner les checkpoints', detail: "Quand vous trouvez un QR code, scannez-le depuis /scan. Votre progression est mise a jour immediatement. Vous gagnez des XP a chaque checkpoint." },
      { title: 'Terminer la chasse', detail: "Completez tous les checkpoints pour terminer la chasse. Des recompenses speciales (badges, XP bonus) sont attribuees aux chasseurs qui terminent." },
    ],
  },
  {
    id: 'vote-raffle',
    icon: Gift,
    title: 'Votes et tombola',
    steps: [
      { title: 'Voter', detail: "Pendant un festival, rendez-vous dans la section votes. Choisissez une categorie (meilleur stand, meilleur cosplay, etc.), selectionnez votre favori et attribuez une note de 1 a 5 etoiles. Vous ne pouvez voter qu'une fois par categorie." },
      { title: 'Voir les resultats', detail: "Les resultats se mettent a jour en temps reel. Le classement affiche les candidats avec leur note moyenne. Les 3 premiers ont des medailles or, argent et bronze." },
      { title: 'Participer a une tombola', detail: "Cliquez sur 'Participer' a cote d'une tombola active. Vous recevez un numero unique. Chaque visiteur ne peut participer qu'une seule fois par tombola." },
      { title: 'Tirage au sort', detail: "L'organisateur lance le tirage a la date prevue. Le gagnant est selectionne aleatoirement. Consultez les resultats dans la section tombola du festival." },
    ],
  },
  {
    id: 'queues',
    icon: ListOrdered,
    title: "Files d'attente virtuelles",
    steps: [
      { title: 'Rejoindre une file', detail: "Sur le site d'un festival, consultez les files actives (dedicaces, ateliers, etc.). Cliquez sur 'Rejoindre' pour prendre un ticket virtuel. Pas besoin de faire la queue physiquement." },
      { title: 'Suivre votre position', detail: "Votre ticket affiche votre numero et le temps d'attente estime. La position se met a jour automatiquement toutes les 5 secondes." },
      { title: "Etre appele", detail: "Quand c'est votre tour, votre numero passe en tete de liste. Presentez-vous au point de service avec votre ticket virtuel." },
      { title: 'Annuler', detail: "Si vous ne souhaitez plus attendre, cliquez sur 'Annuler' pour quitter la file sans penalite." },
    ],
  },
  {
    id: 'reservations',
    icon: BookMarked,
    title: 'Reserver un creneau',
    steps: [
      { title: 'Voir les creneaux', detail: "Sur un festival, la section reservations affiche les activites reservables (ateliers, dedicaces, rencontres) avec les creneaux horaires et le nombre de places restantes." },
      { title: 'Reserver', detail: "Cliquez sur un creneau disponible pour reserver votre place. Un QR code de confirmation est genere automatiquement." },
      { title: 'Consulter vos reservations', detail: "Toutes vos reservations sont visibles dans 'Espace visiteur > Reservations' avec l'horaire, le lieu et le QR code." },
      { title: 'Annuler une reservation', detail: "Si vous ne pouvez plus venir, cliquez sur 'Annuler' a cote de la reservation. La place est liberee pour un autre visiteur." },
    ],
  },
  {
    id: 'messaging',
    icon: MessageSquare,
    title: 'Contacter un exposant',
    steps: [
      { title: 'Depuis l\'annuaire', detail: "Dans l'annuaire des exposants, cliquez sur le bouton 'Contacter' de la fiche d'un exposant. Une conversation est creee automatiquement." },
      { title: 'Envoyer un message', detail: "Redigez votre message et envoyez-le. L'exposant recevra une notification et pourra vous repondre." },
      { title: 'Suivi des conversations', detail: "Retrouvez toutes vos conversations dans 'Messagerie' (menu utilisateur). Les messages non lus sont indiques par un badge." },
    ],
  },
];

export function DocsVisitorPage() {
  const [expanded, setExpanded] = useState<string | null>('first-steps');

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/docs" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour a la documentation
      </Link>

      <div className="mb-8">
        <div className="inline-flex items-center gap-3 rounded-full bg-purple-100 px-4 py-2 dark:bg-purple-900/30">
          <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">Guide visiteur</span>
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">Espace visiteur</h1>
        <p className="mt-2 text-muted-foreground">
          Decouvrez comment profiter au maximum des festivals : XP, tampons, billets, votes, tombola et plus.
        </p>
      </div>

      {/* Quick overview */}
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { icon: Star, label: 'XP & Niveaux', color: 'text-amber-500' },
          { icon: Ticket, label: 'Billets QR', color: 'text-blue-500' },
          { icon: Heart, label: 'Favoris & Avis', color: 'text-red-500' },
          { icon: Trophy, label: 'Tampons & Badges', color: 'text-green-500' },
          { icon: Gift, label: 'Votes & Tombola', color: 'text-purple-500' },
          { icon: QrCode, label: 'Scanner QR', color: 'text-indigo-500' },
        ].map((f) => (
          <div key={f.label} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
            <f.icon className={`h-5 w-5 ${f.color}`} />
            <span className="text-sm font-medium text-foreground">{f.label}</span>
          </div>
        ))}
      </div>

      {/* Tutorials */}
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
        <h3 className="text-lg font-semibold text-foreground">Vous etes pret !</h3>
        <p className="mt-1 text-sm text-muted-foreground">Explorez les festivals et commencez a collectionner des XP.</p>
        <Link to="/directory" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Decouvrir les festivals
        </Link>
      </div>
    </div>
  );
}
