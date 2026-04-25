import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Store, Building2, ClipboardList, FileText, Receipt,
  Eye, ShoppingCart, BarChart3, ChevronDown, CheckCircle2, MapPin,
  Zap, Droplets, FileDown, Tag, Shield,
} from 'lucide-react';

interface Tutorial {
  id: string;
  icon: typeof Store;
  title: string;
  steps: { title: string; detail: string }[];
}

const TUTORIALS: Tutorial[] = [
  {
    id: 'create-profile',
    icon: Building2,
    title: 'Creer votre profil exposant',
    steps: [
      { title: 'Acceder a l\'espace exposant', detail: "Connectez-vous, cliquez sur votre nom en haut a droite et selectionnez 'Espace exposant'. L'onglet 'Mon profil' s'affiche en premier." },
      { title: 'Informations entreprise', detail: "Renseignez votre raison sociale (obligatoire), nom commercial, SIRET, numero de TVA, description de votre activite et site web. Ces informations seront reutilisees dans toutes vos candidatures." },
      { title: 'Contact et adresse', detail: "Ajoutez votre email de contact (obligatoire), telephone et adresse postale. L'email de contact sera utilise par les organisateurs pour communiquer avec vous." },
      { title: 'Domaines d\'expertise', detail: "Selectionnez vos domaines parmi 30+ categories : Auteur, Illustrateur, Artisan, Editeur, Food, Bijoux, Gaming, Anime, Comics, Cosplay, Figurines, Papeterie, Photographie, etc. Ces tags vous rendent plus visible dans l'annuaire." },
      { title: 'Accessibilite PMR', detail: "Si votre stand est accessible aux personnes a mobilite reduite, cochez la case PMR. Cela sera affiche sur votre fiche dans l'annuaire." },
      { title: 'Enregistrer', detail: "Cliquez sur 'Enregistrer le profil' en bas. Votre profil est desormais reutilisable pour candidater a n'importe quel festival sur Festosh." },
    ],
  },
  {
    id: 'apply',
    icon: ClipboardList,
    title: 'Candidater a un festival',
    steps: [
      { title: 'Trouver un festival', detail: "Rendez-vous dans 'Festivals' (navigation principale). Cliquez sur un festival publie pour acceder a son site. Dans le menu du festival, cliquez sur 'Candidature'." },
      { title: 'Verification du profil', detail: "La page verifie que votre profil exposant est complet (raison sociale, email, SIRET). Si des informations manquent, un bandeau orange vous redirige vers votre profil pour le completer." },
      { title: 'Choisir un type de stand', detail: "L'organisateur propose differents types de stands. Chaque type affiche : nom, prix (forfait ou par jour), dimensions (largeur x profondeur), et options (electricite, eau). Cliquez sur le type souhaite pour le selectionner (bordure violette)." },
      { title: 'Selectionner un emplacement (optionnel)', detail: "Si l'organisateur a active la selection d'emplacements, une grille s'affiche avec les emplacements disponibles. Chaque emplacement montre son code, sa zone et son prix. Selectionnez votre prefere — l'organisateur peut le modifier apres examen." },
      { title: 'Demandes particulieres', detail: "Redigez vos besoins specifiques dans la zone de texte : contraintes d'installation, voisinage prefere, equipement supplementaire, horaires speciaux, etc." },
      { title: 'Accepter les reglements', detail: "Si le festival exige l'acceptation de reglements, cochez chaque reglement. Vous pouvez cliquer sur le titre pour lire le contenu complet avant d'accepter." },
      { title: 'Recapitulatif et envoi', detail: "Le panneau a droite resume : votre profil (vert si complet), le type de stand choisi, l'emplacement, et les reglements acceptes. Cliquez sur 'Envoyer la candidature'. Vous recevrez une confirmation." },
    ],
  },
  {
    id: 'track-apps',
    icon: MapPin,
    title: 'Suivre vos candidatures',
    steps: [
      { title: 'Tableau des candidatures', detail: "Dans 'Espace exposant > Candidatures', chaque candidature est affichee sous forme de fiche avec : nom du festival (lien cliquable), edition, statut avec icone coloree (soumise, en cours, approuvee, refusee, liste d'attente)." },
      { title: 'Montant et paiement', detail: "Le montant a payer et le statut du paiement (paye / non paye) sont affiches. Si l'organisateur a attribue un stand, le code d'emplacement et la zone sont visibles." },
      { title: 'Notes de l\'organisateur', detail: "Si l'organisateur laisse un commentaire (feedback, instructions), il apparait en bas de la fiche dans un encadre gris." },
      { title: 'Statistiques', detail: "Les 4 cartes en haut du dashboard affichent en un coup d'oeil : candidatures approuvees, candidatures en cours, documents a verifier, documents a renouveler." },
    ],
  },
  {
    id: 'documents',
    icon: FileText,
    title: 'Gerer vos documents',
    steps: [
      { title: 'Telecharger un document', detail: "Dans l'onglet 'Documents', cliquez sur 'Ajouter'. Vous etes redirige vers votre profil ou vous pouvez uploader un fichier (Kbis, assurance, piece d'identite, RIB, autre). Le fichier est envoye et le document apparait avec le statut 'En attente'." },
      { title: 'Comprendre les statuts', detail: "Chaque document a un statut : 'En attente' (jaune) — l'organisateur ne l'a pas encore verifie. 'Verifie' (vert) — le document est valide. 'Refuse' (rouge) — le document a un probleme, contactez l'organisateur." },
      { title: 'Filtrer les documents', detail: "Utilisez les boutons filtres en haut : 'Tous', 'En attente', 'Verifies', 'A renouveler'. Le bouton 'A renouveler' affiche un badge rouge si des documents sont expires ou expirent bientot." },
      { title: 'Definir une date d\'expiration', detail: "Cliquez sur 'Definir l'expiration' sous un document. Selectionnez la date dans le calendrier et enregistrez. Quand la date approche (30 jours), le document passe en orange 'Expire bientot'. Apres la date, il passe en rouge 'Expire'." },
      { title: 'Documents expires', detail: "Les documents expires ou expirant bientot ont une bordure coloree (orange ou rouge). Le nombre total est affiche dans la carte 'Documents a renouveler' en haut du dashboard." },
    ],
  },
  {
    id: 'invoices',
    icon: Receipt,
    title: 'Consulter vos factures',
    steps: [
      { title: 'Liste des factures', detail: "L'onglet 'Factures' affiche toutes vos factures dans un tableau : numero, libelle, festival, montant TTC, statut (brouillon, envoyee, payee, en retard) et date d'emission." },
      { title: 'Telecharger en PDF', detail: "Cliquez sur l'icone PDF a droite de chaque facture. Une page s'ouvre avec la facture formatee en A4 : emetteur (Festosh), client (vos informations), description, montant HT, TVA et TTC. Cliquez sur 'Telecharger PDF' en haut ou faites Ctrl+P pour enregistrer en PDF." },
      { title: 'Statuts de paiement', detail: "Les factures peuvent avoir differents statuts : 'Payee' (vert) — reglement recu. 'En attente' (jaune) — paiement en cours. 'En retard' (rouge) — date d'echeance depassee. 'Annulee' (gris)." },
    ],
  },
  {
    id: 'visibility',
    icon: Eye,
    title: 'Gerer la visibilite de votre profil',
    steps: [
      { title: 'Annuaire public', detail: "Le toggle 'Annuaire des exposants' en haut controle si votre profil apparait dans l'annuaire public de Festosh. Quand il est active (violet), les visiteurs et organisateurs peuvent vous trouver. Quand il est desactive, seuls les organisateurs des festivals ou vous avez candidate vous voient." },
      { title: 'Visibilite par champ', detail: "Chaque information de votre profil peut etre configuree individuellement. Cliquez sur le bouton a droite de chaque champ pour basculer entre 'Public' (icone oeil vert — visible par tous) et 'Organisateurs' (icone bouclier orange — visible uniquement par les organisateurs)." },
      { title: 'Categories de champs', detail: "Les champs sont groupes : Contact (nom, email, telephone), Administratif (SIRET, TVA, forme juridique), Assurance (assureur, n° contrat), Documents (Kbis, attestation, piece d'identite), Adresse (siege et facturation)." },
      { title: 'Enregistrer', detail: "Apres avoir configure la visibilite, cliquez sur 'Enregistrer' en bas. Un message vert confirme la sauvegarde." },
    ],
  },
  {
    id: 'pos',
    icon: ShoppingCart,
    title: 'Utiliser la caisse (POS)',
    steps: [
      { title: 'Acceder a la caisse', detail: "Depuis l'Espace exposant, cliquez sur 'Caisse POS' (bouton violet en haut). La page affiche une grille de produits a gauche et le panier a droite (sur desktop). Sur mobile, le panier est accessible via le bouton flottant en bas a droite." },
      { title: 'Ajouter des produits au panier', detail: "Cliquez sur un produit pour l'ajouter au panier. Un badge violet en haut a gauche du produit indique la quantite dans le panier. Les produits en rupture sont grises et non cliquables." },
      { title: 'Filtrer les produits', detail: "Utilisez la barre de recherche pour trouver un produit par nom. Les boutons de categories permettent de filtrer par type (Goodies, Boissons, etc.)." },
      { title: 'Modifier le panier', detail: "Dans le panier, utilisez les boutons +/- pour ajuster les quantites. Cliquez sur X pour retirer un produit. 'Vider' supprime tout le panier." },
      { title: 'Appliquer un code promo', detail: "Saisissez un code promo dans le champ dedie et cliquez 'Appliquer'. Si le code est valide, la remise s'affiche en vert dans les totaux. Cliquez sur X a cote du coupon pour le retirer." },
      { title: 'Encaisser', detail: "Choisissez le mode de paiement (Especes, CB, Virement). Le total TTC s'affiche. Cliquez sur le bouton vert 'Encaisser' pour enregistrer la vente. Un toast de confirmation s'affiche avec le numero de vente." },
    ],
  },
  {
    id: 'products',
    icon: Tag,
    title: 'Gerer vos produits et stock',
    steps: [
      { title: 'Acceder a la gestion', detail: "Depuis l'Espace exposant, cliquez sur 'Produits'. Vous y trouverez 3 onglets : Produits, Categories, Coupons." },
      { title: 'Creer un produit', detail: "Cliquez sur '+ Ajouter un produit'. Renseignez : nom, SKU (reference), prix de vente, cout d'achat, taux de TVA (0%, 5.5%, 10%, 20%), stock initial, seuil d'alerte stock, image et description." },
      { title: 'Organiser par categories', detail: "L'onglet 'Categories' permet de creer des categories avec nom et couleur. Assignez chaque produit a une categorie pour faciliter le tri sur la caisse." },
      { title: 'Suivi du stock', detail: "Le stock est decremente automatiquement a chaque vente. Quand le stock atteint le seuil d'alerte, un badge orange apparait. A zero, le produit est marque 'Rupture' en rouge." },
      { title: 'Coupons de reduction', detail: "L'onglet 'Coupons' permet de creer des codes promo : pourcentage (ex: -10%) ou montant fixe (ex: -2EUR), avec limite d'utilisations, montant minimum de commande et periode de validite." },
    ],
  },
  {
    id: 'accounting',
    icon: BarChart3,
    title: 'Comptabilite exposant',
    steps: [
      { title: 'Acceder a la comptabilite', detail: "Depuis l'Espace exposant, cliquez sur 'Comptabilite'. Le tableau de bord affiche vos metriques financieres." },
      { title: 'Chiffre d\'affaires', detail: "Le CA total est calcule a partir de toutes vos ventes enregistrees via la caisse. Il est ventile par produit pour identifier vos best-sellers." },
      { title: 'Charges', detail: "Ajoutez vos depenses : location de stand, transport, hebergement, materiel, nourriture, etc. Chaque charge a un montant, une categorie et une date." },
      { title: 'Seuil de rentabilite', detail: "L'outil calcule automatiquement votre point mort : combien il reste a vendre pour couvrir vos charges. Un indicateur visuel montre votre progression vers la rentabilite." },
    ],
  },
];

export function DocsExhibitorPage() {
  const [expanded, setExpanded] = useState<string | null>('create-profile');

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/docs" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour a la documentation
      </Link>

      <div className="mb-8">
        <div className="inline-flex items-center gap-3 rounded-full bg-blue-100 px-4 py-2 dark:bg-blue-900/30">
          <Store className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">Guide exposant</span>
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">Espace exposant</h1>
        <p className="mt-2 text-muted-foreground">
          Profil, candidatures, documents, factures, caisse et comptabilite — tout ce qu'il faut savoir.
        </p>
      </div>

      <div className="mb-8 rounded-xl border border-border bg-primary/5 p-5">
        <h3 className="text-sm font-semibold text-foreground">Parcours type d'un exposant</h3>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {['Creer un compte', 'Completer le profil', 'Uploader les documents', 'Candidater', 'Acceptation', 'Stand attribue', 'Vendre avec le POS'].map((s, i) => (
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
        <h3 className="text-lg font-semibold text-foreground">Pret a exposer ?</h3>
        <p className="mt-1 text-sm text-muted-foreground">Completez votre profil et candidatez a votre premier festival.</p>
        <Link to="/exhibitor" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Mon espace exposant
        </Link>
      </div>
    </div>
  );
}
