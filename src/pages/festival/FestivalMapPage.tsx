import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Map,
  Store,
  Music,
  DoorOpen,
  Utensils,
  HelpCircle,
  Loader2,
  ParkingCircle,
  HeartPulse,
  Accessibility,
  ZoomIn,
  ZoomOut,
  X,
  ShoppingBag,
  User,
  ExternalLink,
} from 'lucide-react';
import { useTenantStore } from '@/stores/tenant-store';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import type { FloorPlan } from '@/types/venue';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlanElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  label: string;
  color: string;
  opacity: number;
  isVisible: boolean;
  layer?: number;
  points?: { x: number; y: number }[];
  strokeWidth?: number;
  boothId?: string;
  boothCode?: string;
  priceCents?: number;
  zone?: string;
}

interface CanvasState {
  elements: PlanElement[];
}

interface BoothOccupant {
  exhibitor_name: string;
  exhibitor_id: string;
  is_paid: boolean;
}

interface PublicBoothLocation {
  id: string;
  code: string;
  zone: string | null;
  width_m: number | null;
  depth_m: number | null;
  price_cents: number | null;
  is_available: boolean;
  plan_position: { x: number; y: number; width?: number; height?: number; floor_plan_id?: string } | null;
  occupant: BoothOccupant | null;
}

interface TooltipState {
  element: PlanElement;
  booth: PublicBoothLocation | null;
  x: number;
  y: number;
}

// ---------------------------------------------------------------------------
// Legend
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FestivalMapPage() {
  const { festival, activeEdition } = useTenantStore();
  const { user } = useAuthStore();
  const slug = festival?.slug ?? '';
  const containerRef = useRef<HTMLDivElement>(null);

  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [boothLocations, setBoothLocations] = useState<PublicBoothLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(0);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [zoom, setZoom] = useState(1);
  const [hoveredBoothId, setHoveredBoothId] = useState<string | null>(null);

  // Determine user type
  const isExhibitor = !!user; // Connected users can see prices and reserve
  // In reality, you'd check user type from profile. For now, any logged-in user can reserve.

  useEffect(() => {
    if (!activeEdition?.id) return;

    setLoading(true);
    Promise.all([
      api.get<FloorPlan[]>(`/floor-plans/edition/${activeEdition.id}`),
      api.get<PublicBoothLocation[]>(`/exhibitors/edition/${activeEdition.id}/locations/public`),
    ]).then(([plansRes, boothsRes]) => {
      if (plansRes.success && plansRes.data) setFloorPlans(plansRes.data);
      if (boothsRes.success && boothsRes.data) setBoothLocations(boothsRes.data);
      setLoading(false);
    });
  }, [activeEdition?.id]);

  const selectedPlan = floorPlans[selectedPlanIndex] ?? null;
  const canvasWidth = selectedPlan?.width_px || 1200;
  const canvasHeight = selectedPlan?.height_px || 800;

  const elements: PlanElement[] = (() => {
    if (!selectedPlan?.canvas_data) return [];
    const cd = selectedPlan.canvas_data as unknown as CanvasState;
    return Array.isArray(cd.elements) ? cd.elements.filter((e) => e.isVisible !== false) : [];
  })();

  const handleBoothClick = useCallback(
    (e: React.MouseEvent, el: PlanElement) => {
      e.stopPropagation();
      if (el.type !== 'booth') return;

      const booth = el.boothId
        ? boothLocations.find((b) => b.id === el.boothId) ?? null
        : null;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const tooltipX = e.clientX - rect.left;
      const tooltipY = e.clientY - rect.top;

      setTooltip({ element: el, booth, x: tooltipX, y: tooltipY });
    },
    [boothLocations]
  );

  const closeTooltip = useCallback(() => setTooltip(null), []);

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

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

  const hasElements = elements.length > 0;
  const hasPlan = selectedPlan && (hasElements || selectedPlan.background_url);

  // Booth status helper
  const getBoothStatus = (el: PlanElement): 'available' | 'reserved' | 'occupied' => {
    if (!el.boothId) return 'available';
    const booth = boothLocations.find((b) => b.id === el.boothId);
    if (!booth) return 'available';
    if (booth.is_available !== false) return 'available';
    if (booth.occupant?.is_paid) return 'occupied';
    return 'reserved';
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Plan du site</h1>
        <p className="mt-2 text-muted-foreground">
          Retrouvez l&apos;emplacement des stands, scenes et points d&apos;interet.
          {hasElements && (
            <span className="ml-1">Cliquez sur un stand pour voir les details.</span>
          )}
        </p>
      </div>

      {/* Floor plan selector */}
      {floorPlans.length > 1 && (
        <div className="mb-6 flex gap-2 overflow-x-auto border-b border-border pb-2">
          {floorPlans.map((plan, index) => (
            <button
              key={plan.id}
              onClick={() => {
                setSelectedPlanIndex(index);
                setTooltip(null);
              }}
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
        {hasPlan ? (
          <div className="relative overflow-hidden rounded-xl border border-border bg-white dark:bg-neutral-900">
            {/* Zoom controls */}
            <div className="absolute right-3 top-3 z-10 flex flex-col gap-1 rounded-md border border-border bg-background/90 shadow-sm backdrop-blur">
              <button
                onClick={() => setZoom((z) => Math.min(z + 0.2, 3))}
                className="rounded-t-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <div className="border-t border-border" />
              <button
                onClick={() => setZoom((z) => Math.max(z - 0.2, 0.5))}
                className="rounded-b-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
            </div>

            {/* SVG Canvas */}
            <div
              ref={containerRef}
              className="relative overflow-auto"
              style={{ maxHeight: '70vh' }}
              onClick={() => setTooltip(null)}
            >
              <svg
                viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
                className="h-auto w-full"
                style={{
                  minWidth: canvasWidth * zoom,
                  minHeight: canvasHeight * zoom,
                }}
              >
                <rect x={0} y={0} width={canvasWidth} height={canvasHeight} fill="white" />

                {selectedPlan?.background_url && (
                  <image
                    href={selectedPlan.background_url}
                    x={0}
                    y={0}
                    width={canvasWidth}
                    height={canvasHeight}
                    preserveAspectRatio="xMidYMid meet"
                  />
                )}

                {(Array.isArray(elements) ? [...elements] : [])
                  .sort((a, b) => (a.layer ?? 0) - (b.layer ?? 0))
                  .map((el) => {
                    const isBooth = el.type === 'booth';
                    const isHovered = el.id === hoveredBoothId;
                    const status = isBooth ? getBoothStatus(el) : null;

                    // Color: available=original, reserved=grayed, occupied=darker
                    let fillColor = el.color === 'transparent' ? 'none' : el.color;
                    let fillOpacity = el.opacity;
                    if (isBooth && status === 'reserved') {
                      fillColor = '#9CA3AF'; // gray
                      fillOpacity = 0.6;
                    }

                    // Wall polyline rendering
                    if (el.type === 'wall' && Array.isArray(el.points) && el.points.length >= 2) {
                      const pointsStr = el.points.map((p) => `${p.x},${p.y}`).join(' ');
                      return (
                        <polyline
                          key={el.id}
                          points={pointsStr}
                          fill="none"
                          stroke={el.color}
                          strokeWidth={el.strokeWidth ?? 4}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity={el.opacity}
                        />
                      );
                    }

                    return (
                      <g
                        key={el.id}
                        transform={`translate(${el.x}, ${el.y})${el.rotation ? ` rotate(${el.rotation} ${el.width / 2} ${el.height / 2})` : ''}`}
                        style={{ cursor: isBooth ? 'pointer' : 'default' }}
                        onClick={(e) => isBooth && handleBoothClick(e, el)}
                        onMouseEnter={() => isBooth && setHoveredBoothId(el.id)}
                        onMouseLeave={() => setHoveredBoothId(null)}
                      >
                        <rect
                          x={0}
                          y={0}
                          width={el.width}
                          height={el.height}
                          fill={fillColor}
                          opacity={fillOpacity}
                          stroke={isHovered ? '#1d4ed8' : (isBooth ? 'rgba(0,0,0,0.15)' : 'none')}
                          strokeWidth={isHovered ? 2.5 : (isBooth ? 1 : 0)}
                          rx={isBooth ? 4 : (el.type === 'decoration' ? 8 : 0)}
                          className="transition-all duration-150"
                        />

                        {isBooth && isHovered && (
                          <rect
                            x={-2}
                            y={-2}
                            width={el.width + 4}
                            height={el.height + 4}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth={1}
                            strokeOpacity={0.4}
                            rx={6}
                          />
                        )}

                        {/* Label */}
                        {el.label && (
                          <text
                            x={el.width / 2}
                            y={el.height / 2}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize={Math.min(el.width / (el.label.length * 0.7), el.height * 0.4, 14)}
                            fontWeight={isBooth ? '600' : '400'}
                            fill={el.type === 'label' ? '#111' : '#fff'}
                            pointerEvents="none"
                            style={{ userSelect: 'none' }}
                          >
                            {el.label}
                          </text>
                        )}

                        {/* Reserved X overlay */}
                        {isBooth && status === 'reserved' && (
                          <>
                            <line
                              x1={4} y1={4}
                              x2={el.width - 4} y2={el.height - 4}
                              stroke="rgba(255,255,255,0.5)"
                              strokeWidth={1.5}
                            />
                            <line
                              x1={el.width - 4} y1={4}
                              x2={4} y2={el.height - 4}
                              stroke="rgba(255,255,255,0.5)"
                              strokeWidth={1.5}
                            />
                          </>
                        )}
                      </g>
                    );
                  })}
              </svg>

              {/* Tooltip popup */}
              {tooltip && (() => {
                const status = getBoothStatus(tooltip.element);
                const booth = tooltip.booth;
                const occupant = booth?.occupant;

                return (
                  <div
                    className="absolute z-20 w-64 rounded-xl border border-border bg-card shadow-xl"
                    style={{
                      left: Math.min(tooltip.x, (containerRef.current?.clientWidth ?? 400) - 280),
                      top: tooltip.y + 10,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-4">
                      <div className="mb-3 flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-sm"
                              style={{ backgroundColor: tooltip.element.color }}
                            />
                            <h3 className="text-sm font-bold text-foreground">
                              Stand {tooltip.element.boothCode || tooltip.element.label}
                            </h3>
                          </div>
                          {tooltip.element.zone && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Zone: {tooltip.element.zone}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={closeTooltip}
                          className="rounded p-0.5 text-muted-foreground hover:bg-accent"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Status badge */}
                      <div className="mb-3">
                        {status === 'available' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Disponible
                          </span>
                        )}
                        {status === 'reserved' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            Reserve
                          </span>
                        )}
                        {status === 'occupied' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            Occupe
                          </span>
                        )}
                      </div>

                      {/* Occupant info — visible to everyone when paid */}
                      {status === 'occupied' && occupant && occupant.is_paid && (
                        <div className="mb-3 flex items-center gap-2 rounded-md border border-border p-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {occupant.exhibitor_name}
                            </p>
                            <Link
                              to={`/f/${slug}/exhibitors`}
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              Voir la fiche
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </div>
                        </div>
                      )}

                      {/* Price — only visible to connected users */}
                      {isExhibitor && status === 'available' && (tooltip.element.priceCents ?? 0) > 0 && (
                        <div className="mb-3 rounded-md bg-primary/10 px-3 py-2">
                          <p className="text-xs text-muted-foreground">A partir de</p>
                          <p className="text-lg font-bold text-primary">
                            {formatPrice(tooltip.element.priceCents!)}
                          </p>
                        </div>
                      )}

                      {/* Actions */}
                      {status === 'available' && (
                        <>
                          {isExhibitor ? (
                            <Link
                              to={`/f/${slug}/apply${tooltip.element.boothId ? `?booth=${tooltip.element.boothId}` : ''}`}
                              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                            >
                              <ShoppingBag className="h-4 w-4" />
                              Reserver cet emplacement
                            </Link>
                          ) : (
                            <Link
                              to="/login"
                              className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                            >
                              Connectez-vous pour reserver
                            </Link>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {selectedPlan?.name && (
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
            </div>
          </div>
        )}

        {/* Sidebar */}
        <div className="space-y-6">
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

            {/* Booth status legend */}
            {elements.some((e) => e.type === 'booth') && (
              <div className="mt-4 border-t border-border pt-4">
                <h4 className="mb-2 text-xs font-semibold text-muted-foreground">Statut des stands</h4>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-sm bg-blue-500" />
                    <span className="text-xs text-foreground">Disponible</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-sm bg-gray-400" />
                    <span className="text-xs text-foreground">Reserve</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-sm bg-blue-500 opacity-80" />
                    <span className="text-xs text-foreground">Occupe (confirme)</span>
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Available booths summary */}
          {elements.filter((e) => e.type === 'booth').length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Emplacements</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total stands</span>
                  <span className="font-medium text-foreground">
                    {elements.filter((e) => e.type === 'booth').length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Disponibles</span>
                  <span className="font-medium text-green-600">
                    {elements.filter((e) => e.type === 'booth' && getBoothStatus(e) === 'available').length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Reserves</span>
                  <span className="font-medium text-amber-600">
                    {elements.filter((e) => e.type === 'booth' && getBoothStatus(e) !== 'available').length}
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <Link
                  to={isExhibitor ? `/f/${slug}/apply` : '/login'}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <ShoppingBag className="h-4 w-4" />
                  {isExhibitor ? 'Candidater' : 'Se connecter pour candidater'}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
