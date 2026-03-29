import { useEffect, useState } from 'react';
import {
  Map,
  Eye,
  Store,
  Music,
  DoorOpen,
  Utensils,
  HelpCircle,
  Loader2,
  ParkingCircle,
  HeartPulse,
  Accessibility,
} from 'lucide-react';
import { useTenantStore } from '@/stores/tenant-store';
import { api } from '@/lib/api-client';
import type { FloorPlan } from '@/types/venue';

const LEGEND_ITEMS = [
  { icon: Store, label: 'Stand exposant', color: 'bg-blue-500' },
  { icon: Music, label: 'Scene', color: 'bg-purple-500' },
  { icon: DoorOpen, label: 'Entree / Sortie', color: 'bg-green-500' },
  { icon: Utensils, label: 'Restauration', color: 'bg-orange-500' },
  { icon: HelpCircle, label: "Point d'information", color: 'bg-gray-500' },
  { icon: ParkingCircle, label: 'Parking', color: 'bg-slate-500' },
  { icon: HeartPulse, label: 'Premiers secours', color: 'bg-red-500' },
  { icon: Accessibility, label: 'Acces PMR', color: 'bg-teal-500' },
];

export function FestivalMapPage() {
  const { festival } = useTenantStore();

  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(0);

  useEffect(() => {
    if (!festival?.id) return;

    setLoading(true);
    api
      .get<FloorPlan[]>(`/floor-plans/festival/${festival.id}`)
      .then((res) => {
        if (res.success && res.data) {
          setFloorPlans(res.data);
        }
      })
      .finally(() => setLoading(false));
  }, [festival?.id]);

  const selectedPlan = floorPlans[selectedPlanIndex] ?? null;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Chargement du plan...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Plan du site</h1>
        <p className="mt-2 text-muted-foreground">
          Retrouvez l&apos;emplacement des stands, scenes et points d&apos;interet.
        </p>
      </div>

      {/* Floor plan selector (if multiple plans) */}
      {floorPlans.length > 1 && (
        <div className="mb-6 flex gap-2 overflow-x-auto border-b border-border pb-2">
          {floorPlans.map((plan, index) => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlanIndex(index)}
              className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                selectedPlanIndex === index
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {plan.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        {/* Map Area */}
        {selectedPlan && selectedPlan.background_url ? (
          <div className="overflow-hidden rounded-xl border border-border bg-muted/30">
            <div className="relative">
              <img
                src={selectedPlan.background_url}
                alt={selectedPlan.name}
                className="h-auto w-full object-contain"
              />
              <div className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-md bg-background/90 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
                <Eye className="h-3 w-3" />
                Consultation en lecture seule
              </div>
            </div>
            {selectedPlan.name && (
              <div className="border-t border-border px-4 py-3">
                <p className="text-sm font-medium text-foreground">{selectedPlan.name}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex min-h-[500px] items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30">
            <div className="text-center">
              <div className="mx-auto mb-4 inline-flex rounded-full bg-muted p-4">
                <Map className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">
                Plan bientot disponible
              </h2>
              <p className="mb-4 max-w-xs text-sm text-muted-foreground">
                Le plan interactif du festival sera bientot disponible. Revenez plus tard pour
                explorer les emplacements.
              </p>
              <div className="inline-flex items-center gap-2 rounded-md bg-muted px-4 py-2 text-xs font-medium text-muted-foreground">
                <Eye className="h-3 w-3" />
                Consultation en lecture seule
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Legende</h3>
          <ul className="space-y-3">
            {LEGEND_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.label} className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-md ${item.color}`}
                  >
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm text-foreground">{item.label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
