import { useState } from 'react';
import { Search, Store, MapPin, Filter } from 'lucide-react';

// TODO: Wire up to service layer - fetch exhibitors from edition
const PLACEHOLDER_CATEGORIES = ['Artisanat', 'Gastronomie', 'Mode', 'Art', 'Technologie', 'Bien-etre'];

const PLACEHOLDER_EXHIBITORS = [
  {
    id: '1',
    name: 'Atelier du Bois',
    category: 'Artisanat',
    booth: 'A-12',
    description: 'Creations artisanales en bois recycle.',
  },
  {
    id: '2',
    name: 'La Fabrique Gourmande',
    category: 'Gastronomie',
    booth: 'B-03',
    description: 'Confitures et miels artisanaux de la region.',
  },
  {
    id: '3',
    name: 'Studio Crea',
    category: 'Art',
    booth: 'C-07',
    description: 'Illustrations et peintures originales.',
  },
  {
    id: '4',
    name: 'EcoStyle',
    category: 'Mode',
    booth: 'A-05',
    description: 'Vetements eco-responsables et accessoires.',
  },
  {
    id: '5',
    name: 'TechLab',
    category: 'Technologie',
    booth: 'D-01',
    description: 'Innovations tech et gadgets connectes.',
  },
  {
    id: '6',
    name: 'Zen & Harmonie',
    category: 'Bien-etre',
    booth: 'B-08',
    description: 'Huiles essentielles et soins naturels.',
  },
  {
    id: '7',
    name: 'Poterie du Sud',
    category: 'Artisanat',
    booth: 'A-15',
    description: 'Poteries et ceramiques faites main.',
  },
  {
    id: '8',
    name: 'Chocolaterie Fine',
    category: 'Gastronomie',
    booth: 'B-11',
    description: 'Chocolats artisanaux et pralines.',
  },
];

export function FestivalExhibitorsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredExhibitors = PLACEHOLDER_EXHIBITORS.filter((ex) => {
    const matchesSearch =
      searchQuery === '' ||
      ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || ex.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Exposants</h1>
        <p className="mt-2 text-muted-foreground">
          Decouvrez les exposants presents a cette edition.
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Rechercher un exposant..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-border bg-background py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Category Filter */}
      <div className="mb-8 flex items-center gap-3">
        <Filter className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              !selectedCategory
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Tout
          </button>
          {PLACEHOLDER_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Exhibitor Grid */}
      {filteredExhibitors.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Store className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Aucun exposant ne correspond a votre recherche.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredExhibitors.map((exhibitor) => (
            <div
              key={exhibitor.id}
              className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-sm"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Store className="h-5 w-5 text-primary" />
                </div>
                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  <MapPin className="h-2.5 w-2.5" />
                  {exhibitor.booth}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-foreground">{exhibitor.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{exhibitor.description}</p>
              <div className="mt-3">
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {exhibitor.category}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
