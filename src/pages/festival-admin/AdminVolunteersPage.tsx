import { Plus, Users, Clock, Calendar, Pencil, Trash2, UserPlus } from 'lucide-react';

// TODO: Wire up to service layer - fetch volunteers and shifts

const PLACEHOLDER_VOLUNTEERS = [
  {
    id: '1',
    name: 'Jean Dupont',
    email: 'jean@example.com',
    shiftsCount: 3,
    totalHours: '12h',
    status: 'active',
  },
  {
    id: '2',
    name: 'Marie Lefevre',
    email: 'marie@example.com',
    shiftsCount: 2,
    totalHours: '8h',
    status: 'active',
  },
  {
    id: '3',
    name: 'Pierre Martin',
    email: 'pierre@example.com',
    shiftsCount: 4,
    totalHours: '16h',
    status: 'active',
  },
  {
    id: '4',
    name: 'Sophie Durand',
    email: 'sophie@example.com',
    shiftsCount: 1,
    totalHours: '4h',
    status: 'pending',
  },
];

const PLACEHOLDER_SHIFTS = [
  {
    id: '1',
    name: 'Accueil du public',
    date: '2026-06-12',
    time: '09:00 - 13:00',
    volunteers: 2,
    maxVolunteers: 4,
  },
  {
    id: '2',
    name: 'Securite parking',
    date: '2026-06-12',
    time: '13:00 - 17:00',
    volunteers: 1,
    maxVolunteers: 3,
  },
  {
    id: '3',
    name: 'Bar / Buvette',
    date: '2026-06-13',
    time: '11:00 - 15:00',
    volunteers: 3,
    maxVolunteers: 3,
  },
  {
    id: '4',
    name: 'Rangement / Nettoyage',
    date: '2026-06-14',
    time: '18:00 - 22:00',
    volunteers: 0,
    maxVolunteers: 6,
  },
];

export function AdminVolunteersPage() {
  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Benevoles</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerez les benevoles et les creneaux de votre festival.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <UserPlus className="h-4 w-4" />
          Inviter un benevole
        </button>
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        {/* Volunteers List */}
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
            <Users className="h-5 w-5" />
            Equipe ({PLACEHOLDER_VOLUNTEERS.length})
          </h2>
          <div className="rounded-xl border border-border bg-card">
            <div className="divide-y divide-border">
              {PLACEHOLDER_VOLUNTEERS.map((vol) => (
                <div key={vol.id} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">{vol.name}</p>
                    <p className="text-xs text-muted-foreground">{vol.email}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {vol.shiftsCount} creneaux
                      </p>
                      <p className="text-xs font-medium text-foreground">{vol.totalHours}</p>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        vol.status === 'active'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                      }`}
                    >
                      {vol.status === 'active' ? 'Actif' : 'En attente'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Shifts Management */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Calendar className="h-5 w-5" />
              Creneaux
            </h2>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
            >
              <Plus className="h-3 w-3" />
              Ajouter un creneau
            </button>
          </div>
          <div className="space-y-3">
            {PLACEHOLDER_SHIFTS.map((shift) => {
              const isFull = shift.volunteers >= shift.maxVolunteers;
              return (
                <div
                  key={shift.id}
                  className="rounded-xl border border-border bg-card p-5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{shift.name}</h3>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {shift.date}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {shift.time}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* TODO: Wire up to service layer - implement shift edit/delete */}
                      <button
                        type="button"
                        className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {shift.volunteers} / {shift.maxVolunteers} benevoles
                      </span>
                      <span
                        className={`font-medium ${
                          isFull ? 'text-green-600' : 'text-yellow-600'
                        }`}
                      >
                        {isFull ? 'Complet' : 'Places disponibles'}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isFull ? 'bg-green-500' : 'bg-yellow-500'
                        }`}
                        style={{
                          width: `${(shift.volunteers / shift.maxVolunteers) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
