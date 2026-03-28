import { useState } from 'react';
import { Clock, MapPin, Filter } from 'lucide-react';

// TODO: Wire up to service layer - fetch schedule from edition
const PLACEHOLDER_DATES = ['Vendredi 12 juin', 'Samedi 13 juin', 'Dimanche 14 juin'];

const PLACEHOLDER_CATEGORIES = ['Concert', 'Conference', 'Atelier', 'Spectacle'];

const PLACEHOLDER_EVENTS = [
  {
    id: '1',
    title: 'Ouverture officielle',
    time: '10:00 - 11:00',
    venue: 'Scene principale',
    category: 'Conference',
    description: 'Discours d\'ouverture par les organisateurs.',
  },
  {
    id: '2',
    title: 'Concert acoustique',
    time: '14:00 - 15:30',
    venue: 'Scene principale',
    category: 'Concert',
    description: 'Session acoustique avec artistes locaux.',
  },
  {
    id: '3',
    title: 'Atelier poterie',
    time: '11:00 - 12:30',
    venue: 'Espace ateliers',
    category: 'Atelier',
    description: 'Initiation a la poterie pour tous les ages.',
  },
  {
    id: '4',
    title: 'Spectacle de rue',
    time: '16:00 - 17:00',
    venue: 'Allee centrale',
    category: 'Spectacle',
    description: 'Performance de jonglage et acrobaties.',
  },
  {
    id: '5',
    title: 'DJ Set',
    time: '21:00 - 00:00',
    venue: 'Scene principale',
    category: 'Concert',
    description: 'Soiree electro avec DJ invite.',
  },
];

export function FestivalSchedulePage() {
  const [activeDate, setActiveDate] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredEvents = selectedCategory
    ? PLACEHOLDER_EVENTS.filter((e) => e.category === selectedCategory)
    : PLACEHOLDER_EVENTS;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Programme</h1>
        <p className="mt-2 text-muted-foreground">
          Decouvrez les evenements et activites prevus.
        </p>
      </div>

      {/* Date Tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto border-b border-border pb-2">
        {PLACEHOLDER_DATES.map((date, index) => (
          <button
            key={date}
            onClick={() => setActiveDate(index)}
            className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeDate === index
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            {date}
          </button>
        ))}
      </div>

      {/* Category Filter */}
      <div className="mb-8 flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
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

      {/* Events List */}
      <div className="space-y-4">
        {filteredEvents.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-12 text-center">
            <p className="text-sm text-muted-foreground">
              Aucun evenement pour cette categorie.
            </p>
          </div>
        ) : (
          filteredEvents.map((event) => (
            <div
              key={event.id}
              className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <div className="mb-2 inline-block rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {event.category}
                  </div>
                  <h3 className="text-base font-semibold text-foreground">{event.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
                </div>
                <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:text-right">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {event.time}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {event.venue}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
