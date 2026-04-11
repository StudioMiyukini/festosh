import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Loader2, List, Map as MapIcon, Tent } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { Festival } from '@/types/festival';

// Lazy-load map to avoid SSR issues with Leaflet
let MapContainer: any;
let TileLayer: any;
let Marker: any;
let Popup: any;
let useMap: any;
let L: any;
let leafletLoaded = false;

async function loadLeaflet() {
  if (leafletLoaded) return;
  const leaflet = await import('leaflet');
  const rl = await import('react-leaflet');
  L = leaflet.default || leaflet;
  MapContainer = rl.MapContainer;
  TileLayer = rl.TileLayer;
  Marker = rl.Marker;
  Popup = rl.Popup;
  useMap = rl.useMap;
  // Fix default marker icons
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
  leafletLoaded = true;
}

// France/Benelux/Switzerland center & bounds
const MAP_CENTER: [number, number] = [47.0, 3.0];
const MAP_ZOOM = 6;

type ViewMode = 'list' | 'map';

export function DirectoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    loadFestivals();
  }, []);

  const loadFestivals = async (search?: string) => {
    setLoading(true);
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    const result = await api.get<Festival[]>(`/directory${qs}`);
    if (result.data) {
      setFestivals(result.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadFestivals(searchQuery || undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load Leaflet when switching to map view
  useEffect(() => {
    if (viewMode === 'map' && !mapReady) {
      loadLeaflet().then(() => setMapReady(true));
    }
  }, [viewMode, mapReady]);

  // Festivals with coordinates
  const mappableFestivals = useMemo(
    () => festivals.filter((f) => f.location_lat && f.location_lng),
    [festivals],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Annuaire des festivals
          </h1>
          <p className="mt-2 text-muted-foreground">
            Decouvrez les festivals et evenements sur Festosh.
          </p>
        </div>

        {/* View toggle */}
        <div className="flex rounded-lg border border-border bg-card">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`inline-flex items-center gap-1.5 rounded-l-lg px-3 py-2 text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <List className="h-4 w-4" />
            Liste
          </button>
          <button
            type="button"
            onClick={() => setViewMode('map')}
            className={`inline-flex items-center gap-1.5 rounded-r-lg px-3 py-2 text-sm font-medium transition-colors ${
              viewMode === 'map'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <MapIcon className="h-4 w-4" />
            Carte
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Rechercher un festival..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-border bg-background py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : viewMode === 'list' ? (
        /* ═══ LIST VIEW ═══ */
        festivals.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-12 text-center">
            <Search className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {searchQuery
                ? 'Aucun festival ne correspond a votre recherche.'
                : 'Aucun festival publie pour le moment.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {festivals.map((festival) => (
              <FestivalCard key={festival.id} festival={festival} />
            ))}
          </div>
        )
      ) : (
        /* ═══ MAP VIEW ═══ */
        <div className="overflow-hidden rounded-xl border border-border">
          {!mapReady ? (
            <div className="flex h-[600px] items-center justify-center bg-card">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : mappableFestivals.length === 0 ? (
            <div className="flex h-[600px] flex-col items-center justify-center bg-card gap-3">
              <MapPin className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Aucun festival avec coordonnees GPS.
              </p>
            </div>
          ) : (
            <FestivalMap festivals={mappableFestivals} />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Festival Card ──────────────────────────────────────────────────────

function FestivalCard({ festival }: { festival: Festival }) {
  return (
    <Link
      to={`/f/${festival.slug}`}
      className="group overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md"
    >
      <div className="aspect-[16/9] bg-gradient-to-br from-primary/20 to-secondary/20">
        {festival.banner_url ? (
          <img
            src={festival.banner_url}
            alt={festival.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Tent className="h-10 w-10 text-primary/30" />
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-base font-semibold text-foreground group-hover:text-primary">
          {festival.name}
        </h3>
        {(festival.location_name || festival.city) && (
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {festival.location_name || [festival.city, festival.country].filter(Boolean).join(', ')}
          </div>
        )}
        {festival.description && (
          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
            {festival.description}
          </p>
        )}
        {festival.tags && festival.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {(() => { try { const t = typeof festival.tags === 'string' ? JSON.parse(festival.tags) : festival.tags; return Array.isArray(t) ? t : []; } catch { return []; } })().map((tag: string) => (
              <span
                key={tag}
                className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

// ─── Map View ───────────────────────────────────────────────────────────

function FestivalMap({ festivals }: { festivals: Festival[] }) {
  if (!MapContainer || !TileLayer || !Marker || !Popup || !L) return null;

  const createIcon = (festival: Festival) => {
    const hasLogo = !!festival.logo_url;
    return L.divIcon({
      className: 'festival-map-marker',
      html: `
        <div style="
          display:flex;align-items:center;gap:6px;
          background:white;border-radius:20px;padding:3px 10px 3px 3px;
          box-shadow:0 2px 8px rgba(0,0,0,0.15);border:2px solid #6366f1;
          white-space:nowrap;font-size:12px;font-weight:600;color:#1f2937;
          cursor:pointer;transform:translate(-50%,-100%);
        ">
          ${
            hasLogo
              ? `<img src="${festival.logo_url}" style="width:24px;height:24px;border-radius:50%;object-fit:cover;" />`
              : `<div style="width:24px;height:24px;border-radius:50%;background:#6366f1;display:flex;align-items:center;justify-content:center;color:white;font-size:11px;">${festival.name.charAt(0)}</div>`
          }
          <span>${festival.name.length > 20 ? festival.name.slice(0, 18) + '...' : festival.name}</span>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });
  };

  return (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin=""
      />
      <MapContainer
        center={MAP_CENTER}
        zoom={MAP_ZOOM}
        style={{ height: '600px', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {festivals.map((festival) => (
          <Marker
            key={festival.id}
            position={[festival.location_lat!, festival.location_lng!]}
            icon={createIcon(festival)}
          >
            <Popup>
              <div style={{ minWidth: 180 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  {festival.logo_url && (
                    <img
                      src={festival.logo_url}
                      alt=""
                      style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }}
                    />
                  )}
                  <strong style={{ fontSize: 14 }}>{festival.name}</strong>
                </div>
                {(festival.location_name || festival.city) && (
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                    {festival.location_name || [festival.city, festival.country].filter(Boolean).join(', ')}
                  </div>
                )}
                {festival.description && (
                  <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8, lineHeight: 1.4 }}>
                    {festival.description.slice(0, 100)}{festival.description.length > 100 ? '...' : ''}
                  </div>
                )}
                <a
                  href={`/f/${festival.slug}`}
                  style={{
                    display: 'inline-block', padding: '4px 12px', background: '#6366f1',
                    color: 'white', borderRadius: 6, fontSize: 12, fontWeight: 600, textDecoration: 'none',
                  }}
                >
                  Voir le festival
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </>
  );
}
