/** Predefined exhibitor domain choices. Stored under `value`; UI shows `label`. */
const DOMAIN_LABELS = [
  'Auteur',
  'Illustrateur',
  'Artisan',
  'Editeur',
  'Association',
  'Alimentation',
  'Bijoux',
  'Tatouage',
  'Bien-etre',
  'Sport',
  'Cosplay',
  'Jeux de societe',
  'Jeux video',
  'Manga / Anime',
  'Comics',
  'BD',
  'Figurines / Maquettes',
  'Papeterie',
  'Textile / Vetements',
  'Accessoires',
  'Decoration',
  'Photographie',
  'Musique',
  'Numerique / Tech',
  'Artiste digital',
  'Ceramique / Poterie',
  'Maroquinerie',
  'Bougie / Encens',
  'Vintage / Retro',
  'Autre',
] as const;

export type ExhibitorDomain = (typeof DOMAIN_LABELS)[number];

export interface ExhibitorDomainOption {
  value: ExhibitorDomain;
  label: ExhibitorDomain;
}

export const EXHIBITOR_DOMAINS: readonly ExhibitorDomainOption[] = DOMAIN_LABELS.map(
  (label) => ({ value: label, label }),
);
