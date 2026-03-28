import { Plus, Calendar, Clock, MapPin, Pencil, Trash2 } from 'lucide-react';

// TODO: Wire up to service layer - fetch events from programming service

const PLACEHOLDER_EVENTS = [
  {
    id: '1',
    title: 'Concert d\'ouverture',
    date: '2026-06-12',
    time: '20:00 - 22:00',
    venue: 'Scene principale',
    category: 'Concert',
  },
  {
    id: '2',
    title: 'Atelier poterie',
    date: '2026-06-13',
    time: '10:00 - 12:00',
    venue: 'Espace ateliers',
    category: 'Atelier',
  },
  {
    id: '3',
    title: 'Conference developpement durable',
    date: '2026-06-13',
    time: '14:00 - 15:30',
    venue: 'Salle conference',
    category: 'Conference',
  },
  {
    id: '4',
    title: 'DJ Set cloture',
    date: '2026-06-14',
    time: '21:00 - 01:00',
    venue: 'Scene principale',
    category: 'Concert',
  },
  {
    id: '5',
    title: 'Spectacle de marionnettes',
    date: '2026-06-13',
    time: '16:00 - 17:00',
    venue: 'Espace enfants',
    category: 'Spectacle',
  },
];

export function AdminProgrammingPage() {
  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Programmation</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerez les evenements et le programme de votre festival.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Ajouter un evenement
        </button>
      </div>

      {/* Events Table */}
      <div className="rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Evenement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Horaire
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Lieu
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Categorie
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {PLACEHOLDER_EVENTS.map((event) => (
                <tr key={event.id} className="hover:bg-muted/50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">{event.title}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                    {event.date}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {event.time}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {event.venue}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {event.category}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* TODO: Wire up to service layer - implement event edit/delete */}
                      <button
                        type="button"
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
