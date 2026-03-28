import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Tag, CalendarDays } from 'lucide-react';

// TODO: Replace with real data from festival service
const PLACEHOLDER_FESTIVALS = [
  {
    id: '1',
    slug: 'fete-musique-lyon',
    name: 'Fete de la Musique Lyon',
    banner_url: null,
    location_name: 'Lyon',
    tags: ['musique', 'gratuit', 'plein air'],
    next_date: '21 juin 2026',
  },
  {
    id: '2',
    slug: 'marche-noel-strasbourg',
    name: 'Marche de Noel de Strasbourg',
    banner_url: null,
    location_name: 'Strasbourg',
    tags: ['noel', 'marche', 'artisanat'],
    next_date: '25 nov. 2026',
  },
  {
    id: '3',
    slug: 'festival-bd-angouleme',
    name: 'Festival de la BD',
    banner_url: null,
    location_name: 'Angouleme',
    tags: ['culture', 'bande dessinee'],
    next_date: '29 janv. 2027',
  },
  {
    id: '4',
    slug: 'salon-agriculture',
    name: 'Salon de l\'Agriculture',
    banner_url: null,
    location_name: 'Paris',
    tags: ['agriculture', 'gastronomie'],
    next_date: '27 fev. 2027',
  },
  {
    id: '5',
    slug: 'festival-avignon',
    name: 'Festival d\'Avignon',
    banner_url: null,
    location_name: 'Avignon',
    tags: ['theatre', 'spectacle vivant'],
    next_date: '4 juil. 2026',
  },
  {
    id: '6',
    slug: 'solidays',
    name: 'Solidays',
    banner_url: null,
    location_name: 'Paris',
    tags: ['musique', 'solidarite'],
    next_date: '19 juin 2026',
  },
];

// TODO: Replace with real filter options from API
const FILTER_TAGS = ['musique', 'culture', 'gastronomie', 'artisanat', 'plein air', 'gratuit'];
const FILTER_CITIES = ['Paris', 'Lyon', 'Strasbourg', 'Angouleme', 'Avignon'];

export function DirectoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  // TODO: Wire up to service layer - implement real search and filtering
  const filteredFestivals = PLACEHOLDER_FESTIVALS.filter((f) => {
    const matchesSearch =
      searchQuery === '' ||
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.location_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTags =
      selectedTags.length === 0 || selectedTags.some((t) => f.tags.includes(t));
    const matchesCity = !selectedCity || f.location_name === selectedCity;
    return matchesSearch && matchesTags && matchesCity;
  });

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Annuaire des festivals
        </h1>
        <p className="mt-2 text-muted-foreground">
          Decouvrez les festivals et evenements sur Festosh.
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Rechercher un festival..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-border bg-background py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Filter Sidebar */}
        <aside className="w-full flex-shrink-0 lg:w-60">
          <div className="rounded-lg border border-border bg-card p-4">
            {/* Tags Filter */}
            <div className="mb-6">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Tag className="h-4 w-4" />
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {FILTER_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* City Filter */}
            <div className="mb-6">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <MapPin className="h-4 w-4" />
                Ville
              </h3>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => setSelectedCity(null)}
                  className={`rounded-md px-3 py-1.5 text-left text-xs font-medium transition-colors ${
                    !selectedCity
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent'
                  }`}
                >
                  Toutes les villes
                </button>
                {FILTER_CITIES.map((city) => (
                  <button
                    key={city}
                    onClick={() => setSelectedCity(city)}
                    className={`rounded-md px-3 py-1.5 text-left text-xs font-medium transition-colors ${
                      selectedCity === city
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Filter Placeholder */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <CalendarDays className="h-4 w-4" />
                Dates
              </h3>
              <p className="text-xs text-muted-foreground">
                {/* TODO: Add date range picker */}
                Filtre par date bientot disponible
              </p>
            </div>
          </div>
        </aside>

        {/* Festival Grid */}
        <div className="flex-1">
          {filteredFestivals.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-12 text-center">
              <Search className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Aucun festival ne correspond a votre recherche.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filteredFestivals.map((festival) => (
                <Link
                  key={festival.id}
                  to={`/f/${festival.slug}`}
                  className="group overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md"
                >
                  {/* Banner */}
                  <div className="aspect-[16/9] bg-gradient-to-br from-primary/20 to-secondary/20">
                    {festival.banner_url ? (
                      <img
                        src={festival.banner_url}
                        alt={festival.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <span className="text-3xl font-bold text-primary/30">
                          {festival.name.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="p-4">
                    <h3 className="text-base font-semibold text-foreground group-hover:text-primary">
                      {festival.name}
                    </h3>
                    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {festival.location_name}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays className="h-3 w-3" />
                      {festival.next_date}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {festival.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
