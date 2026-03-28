import { Store, Users, DollarSign, Calendar, Activity } from 'lucide-react';

// TODO: Wire up to service layer - fetch real stats from festival services

const STATS = [
  { label: 'Exposants', value: '47', change: '+5 cette semaine', icon: Store },
  { label: 'Benevoles', value: '23', change: '+2 cette semaine', icon: Users },
  { label: 'Budget total', value: '12 450 EUR', change: 'Solde positif', icon: DollarSign },
  { label: 'Evenements', value: '18', change: '3 a venir', icon: Calendar },
];

const RECENT_ACTIVITY = [
  {
    id: '1',
    text: 'Nouvelle candidature exposant de "Atelier du Bois"',
    time: 'Il y a 2 heures',
  },
  {
    id: '2',
    text: 'Jean Dupont a rejoint l\'equipe benevoles',
    time: 'Il y a 5 heures',
  },
  {
    id: '3',
    text: 'Depense ajoutee : Location scene - 2 500 EUR',
    time: 'Hier',
  },
  {
    id: '4',
    text: 'Page "A propos" mise a jour dans le CMS',
    time: 'Hier',
  },
  {
    id: '5',
    text: 'Evenement "Concert d\'ouverture" cree',
    time: 'Il y a 2 jours',
  },
];

export function AdminOverviewPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Vue d&apos;ensemble
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tableau de bord de votre festival.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl border border-border bg-card p-6"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.change}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Activity className="h-4 w-4" />
            Activite recente
          </h2>
        </div>
        <div className="divide-y divide-border">
          {RECENT_ACTIVITY.map((activity) => (
            <div key={activity.id} className="flex items-start justify-between px-6 py-4">
              <p className="text-sm text-foreground">{activity.text}</p>
              <span className="ml-4 flex-shrink-0 text-xs text-muted-foreground">
                {activity.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
