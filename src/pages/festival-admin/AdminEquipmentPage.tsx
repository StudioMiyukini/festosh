import { Plus, Package, Search, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

// TODO: Wire up to service layer - fetch equipment from equipment service

const PLACEHOLDER_EQUIPMENT = [
  {
    id: '1',
    name: 'Tables pliantes',
    quantity: 50,
    available: 12,
    assigned: 38,
    category: 'Mobilier',
  },
  {
    id: '2',
    name: 'Chaises',
    quantity: 200,
    available: 45,
    assigned: 155,
    category: 'Mobilier',
  },
  {
    id: '3',
    name: 'Rallonges electriques (10m)',
    quantity: 30,
    available: 8,
    assigned: 22,
    category: 'Electricite',
  },
  {
    id: '4',
    name: 'Multiprise 6 prises',
    quantity: 40,
    available: 15,
    assigned: 25,
    category: 'Electricite',
  },
  {
    id: '5',
    name: 'Barnum 3x3m',
    quantity: 15,
    available: 3,
    assigned: 12,
    category: 'Structure',
  },
  {
    id: '6',
    name: 'Panneau de signalisation',
    quantity: 25,
    available: 25,
    assigned: 0,
    category: 'Signalisation',
  },
  {
    id: '7',
    name: 'Poubelle tri selectif',
    quantity: 20,
    available: 6,
    assigned: 14,
    category: 'Logistique',
  },
];

const PLACEHOLDER_ASSIGNMENTS = [
  {
    id: '1',
    equipment: 'Tables pliantes',
    quantity: 2,
    assignedTo: 'Atelier du Bois',
    booth: 'A-12',
  },
  {
    id: '2',
    equipment: 'Chaises',
    quantity: 4,
    assignedTo: 'La Fabrique Gourmande',
    booth: 'B-03',
  },
  {
    id: '3',
    equipment: 'Rallonge electrique',
    quantity: 1,
    assignedTo: 'TechLab',
    booth: 'D-01',
  },
  {
    id: '4',
    equipment: 'Barnum 3x3m',
    quantity: 1,
    assignedTo: 'EcoStyle',
    booth: 'A-05',
  },
];

export function AdminEquipmentPage() {
  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Materiel</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerez l&apos;inventaire et les affectations de materiel.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Ajouter du materiel
        </button>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1fr_380px]">
        {/* Equipment Inventory */}
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
            <Package className="h-5 w-5" />
            Inventaire
          </h2>
          <div className="rounded-xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Materiel
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Categorie
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Total
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Affecte
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Disponible
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Statut
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {PLACEHOLDER_EQUIPMENT.map((item) => {
                    const isLow = item.available <= item.quantity * 0.2;
                    return (
                      <tr key={item.id} className="hover:bg-muted/50">
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground">
                              {item.name}
                            </span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                          {item.category}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center text-sm text-foreground">
                          {item.quantity}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center text-sm text-muted-foreground">
                          {item.assigned}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center text-sm font-medium text-foreground">
                          {item.available}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center">
                          {item.available === 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                              <AlertCircle className="h-3 w-3" />
                              Epuise
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-600">
                              <AlertCircle className="h-3 w-3" />
                              Stock bas
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                              <CheckCircle2 className="h-3 w-3" />
                              OK
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Recent Assignments */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Affectations recentes
          </h2>
          <div className="space-y-3">
            {PLACEHOLDER_ASSIGNMENTS.map((assignment) => (
              <div
                key={assignment.id}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-foreground">
                    {assignment.equipment}
                  </span>
                  <span className="text-muted-foreground">x{assignment.quantity}</span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{assignment.assignedTo}</span>
                  <ArrowRight className="h-3 w-3" />
                  <span className="font-medium">{assignment.booth}</span>
                </div>
              </div>
            ))}
          </div>
          {/* TODO: Wire up to service layer - link to full assignment management */}
        </div>
      </div>
    </div>
  );
}
