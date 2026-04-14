import { useState, useEffect, useCallback } from 'react';
import {
  Store,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  X,
  Zap,
  Droplets,
  Euro,
  Tag,
  Layers,
  Package,
} from 'lucide-react';
import { useTenantStore } from '@/stores/tenant-store';
import { api } from '@/lib/api-client';
import type { ApplicationStatus } from '@/types/enums';
import type { BoothApplication, ExhibitorProfile, BoothLocation, BoothType, BoothEquipmentOption } from '@/types/exhibitor';
import type { EquipmentItem } from '@/types/equipment';

type TabKey = 'applications' | 'exhibitors' | 'booths';

const STATUS_OPTIONS: { value: ApplicationStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'submitted', label: 'Soumises' },
  { value: 'under_review', label: 'En cours' },
  { value: 'approved', label: 'Approuvees' },
  { value: 'rejected', label: 'Refusees' },
  { value: 'waitlisted', label: "Liste d'attente" },
];

const statusConfig: Record<
  ApplicationStatus,
  { label: string; className: string; icon: typeof Clock }
> = {
  draft: {
    label: 'Brouillon',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400',
    icon: Clock,
  },
  submitted: {
    label: 'Soumise',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
    icon: Clock,
  },
  under_review: {
    label: 'En cours',
    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
    icon: Clock,
  },
  approved: {
    label: 'Approuvee',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
    icon: CheckCircle,
  },
  rejected: {
    label: 'Refusee',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
    icon: XCircle,
  },
  waitlisted: {
    label: 'Attente',
    className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
    icon: Clock,
  },
  cancelled: {
    label: 'Annulee',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400',
    icon: XCircle,
  },
};

const formatPrice = (cents: number | null | undefined) => {
  if (cents == null) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
};

export function AdminExhibitorsPage() {
  const { festival, activeEdition } = useTenantStore();

  const [activeTab, setActiveTab] = useState<TabKey>('applications');
  const [applications, setApplications] = useState<BoothApplication[]>([]);
  const [profiles, setProfiles] = useState<ExhibitorProfile[]>([]);
  const [booths, setBooths] = useState<BoothLocation[]>([]);
  const [boothTypesList, setBoothTypesList] = useState<BoothType[]>([]);
  const [equipmentItems, setEquipmentItems] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // ─── Booth Type Dialog ──────────────────────────────────────────────────
  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const [editingType, setEditingType] = useState<BoothType | null>(null);
  const [typeName, setTypeName] = useState('');
  const [typeDescription, setTypeDescription] = useState('');
  const [typeWidth, setTypeWidth] = useState('');
  const [typeDepth, setTypeDepth] = useState('');
  const [typePriceCents, setTypePriceCents] = useState('');
  const [typePricingMode, setTypePricingMode] = useState<'flat' | 'per_day'>('flat');
  const [typeHasElectricity, setTypeHasElectricity] = useState(false);
  const [typeElecPrice, setTypeElecPrice] = useState('');
  const [typeHasWater, setTypeHasWater] = useState(false);
  const [typeWaterPrice, setTypeWaterPrice] = useState('');
  const [typeMaxWattage, setTypeMaxWattage] = useState('');
  const [typeEquipOpts, setTypeEquipOpts] = useState<BoothEquipmentOption[]>([]);
  const [typeColor, setTypeColor] = useState('#6366f1');
  const [typeSubmitting, setTypeSubmitting] = useState(false);

  // ─── Booth Location Dialog ──────────────────────────────────────────────
  const [showBoothDialog, setShowBoothDialog] = useState(false);
  const [editingBooth, setEditingBooth] = useState<BoothLocation | null>(null);
  const [boothCode, setBoothCode] = useState('');
  const [boothZone, setBoothZone] = useState('');
  const [boothTypeId, setBoothTypeId] = useState('');
  const [boothWidth, setBoothWidth] = useState('');
  const [boothDepth, setBoothDepth] = useState('');
  const [boothPriceCents, setBoothPriceCents] = useState('');
  const [boothPricingMode, setBoothPricingMode] = useState<'flat' | 'per_day'>('flat');
  const [boothHasElectricity, setBoothHasElectricity] = useState(false);
  const [boothElecPrice, setBoothElecPrice] = useState('');
  const [boothHasWater, setBoothHasWater] = useState(false);
  const [boothWaterPrice, setBoothWaterPrice] = useState('');
  const [boothNotes, setBoothNotes] = useState('');
  const [boothEquipOpts, setBoothEquipOpts] = useState<BoothEquipmentOption[]>([]);
  const [boothSubmitting, setBoothSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!festival) return;
    setLoading(true);
    setError(null);

    const editionId = activeEdition?.id;
    const [appsRes, profilesRes, boothsRes, typesRes, equipRes] = await Promise.all([
      editionId
        ? api.get<BoothApplication[]>(`/exhibitors/edition/${editionId}/applications`)
        : Promise.resolve({ success: true, data: [] as BoothApplication[], error: undefined }),
      api.get<ExhibitorProfile[]>(`/exhibitors/festival/${festival.id}/profiles`),
      api.get<BoothLocation[]>(`/exhibitors/festival/${festival.id}/booths`),
      editionId
        ? api.get<BoothType[]>(`/exhibitors/edition/${editionId}/booth-types`)
        : Promise.resolve({ success: true, data: [] as BoothType[], error: undefined }),
      api.get<EquipmentItem[]>(`/equipment/festival/${festival.id}/items`),
    ]);

    if (appsRes.success && appsRes.data) setApplications(appsRes.data);
    else setError(appsRes.error || 'Impossible de charger les candidatures.');
    if (profilesRes.success && profilesRes.data) setProfiles(profilesRes.data);
    if (boothsRes.success && boothsRes.data) setBooths(boothsRes.data);
    if (typesRes.success && typesRes.data) setBoothTypesList(typesRes.data);
    if (equipRes.success && equipRes.data) setEquipmentItems(equipRes.data);
    setLoading(false);
  }, [festival, activeEdition]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Application helpers ────────────────────────────────────────────────
  const handleUpdateStatus = async (applicationId: string, newStatus: ApplicationStatus) => {
    if (!festival) return;
    setUpdatingId(applicationId);
    setMessage(null);

    const res = await api.put<BoothApplication>(
      `/exhibitors/applications/${applicationId}/status`,
      { status: newStatus }
    );

    if (res.success && res.data) {
      setApplications((prev) => prev.map((a) => (a.id === applicationId ? res.data! : a)));
      setMessage({ type: 'success', text: `Candidature ${newStatus === 'approved' ? 'approuvee' : 'refusee'}.` });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la mise a jour.' });
    }
    setUpdatingId(null);
  };

  const getProfileName = (exhibitorId: string) => {
    const profile = profiles.find((p) => p.id === exhibitorId);
    return profile?.company_name || 'Inconnu';
  };

  const filteredApplications = applications.filter((app) => {
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    const profileName = getProfileName(app.exhibitor_id).toLowerCase();
    const matchesSearch = searchQuery === '' || profileName.includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // ─── Booth Type helpers ─────────────────────────────────────────────────
  const resetTypeForm = () => {
    setTypeName('');
    setTypeDescription('');
    setTypeWidth('');
    setTypeDepth('');
    setTypePriceCents('');
    setTypePricingMode('flat');
    setTypeHasElectricity(false);
    setTypeElecPrice('');
    setTypeHasWater(false);
    setTypeWaterPrice('');
    setTypeMaxWattage('');
    setTypeEquipOpts([]);
    setTypeColor('#6366f1');
    setEditingType(null);
  };

  const openCreateType = () => {
    resetTypeForm();
    setShowTypeDialog(true);
  };

  const openEditType = (t: BoothType) => {
    setEditingType(t);
    setTypeName(t.name);
    setTypeDescription(t.description || '');
    setTypeWidth(t.width_m ? String(t.width_m) : '');
    setTypeDepth(t.depth_m ? String(t.depth_m) : '');
    setTypePriceCents(t.price_cents ? String(t.price_cents / 100) : '');
    setTypePricingMode(t.pricing_mode);
    setTypeHasElectricity(!!t.has_electricity);
    setTypeElecPrice(t.electricity_price_cents ? String(t.electricity_price_cents / 100) : '');
    setTypeHasWater(!!t.has_water);
    setTypeWaterPrice(t.water_price_cents ? String(t.water_price_cents / 100) : '');
    setTypeMaxWattage(t.max_wattage ? String(t.max_wattage) : '');
    setTypeEquipOpts(t.equipment_options || []);
    setTypeColor(t.color);
    setShowTypeDialog(true);
  };

  const handleSubmitType = async () => {
    if (!activeEdition || !typeName.trim()) return;
    setTypeSubmitting(true);
    setMessage(null);

    const payload = {
      name: typeName.trim(),
      description: typeDescription.trim() || null,
      width_m: typeWidth ? Number(typeWidth) : null,
      depth_m: typeDepth ? Number(typeDepth) : null,
      price_cents: typePriceCents ? Math.round(Number(typePriceCents) * 100) : 0,
      pricing_mode: typePricingMode,
      has_electricity: typeHasElectricity,
      electricity_price_cents: typeElecPrice ? Math.round(Number(typeElecPrice) * 100) : 0,
      has_water: typeHasWater,
      water_price_cents: typeWaterPrice ? Math.round(Number(typeWaterPrice) * 100) : 0,
      max_wattage: typeMaxWattage ? Number(typeMaxWattage) : null,
      equipment_options: typeEquipOpts.length > 0 ? typeEquipOpts : null,
      color: typeColor,
    };

    if (editingType) {
      const res = await api.put<BoothType>(`/exhibitors/booth-types/${editingType.id}`, payload);
      if (res.success && res.data) {
        setBoothTypesList((prev) => prev.map((t) => (t.id === editingType.id ? res.data! : t)));
        setShowTypeDialog(false);
        resetTypeForm();
        setMessage({ type: 'success', text: 'Type mis a jour.' });
      } else {
        setMessage({ type: 'error', text: res.error || 'Erreur.' });
      }
    } else {
      const res = await api.post<BoothType>(`/exhibitors/edition/${activeEdition.id}/booth-types`, payload);
      if (res.success && res.data) {
        setBoothTypesList((prev) => [...prev, res.data!]);
        setShowTypeDialog(false);
        resetTypeForm();
        setMessage({ type: 'success', text: 'Type cree.' });
      } else {
        setMessage({ type: 'error', text: res.error || 'Erreur.' });
      }
    }
    setTypeSubmitting(false);
  };

  const handleDeleteType = async (t: BoothType) => {
    if (!confirm(`Supprimer le type "${t.name}" ?`)) return;
    const res = await api.delete(`/exhibitors/booth-types/${t.id}`);
    if (res.success) {
      setBoothTypesList((prev) => prev.filter((x) => x.id !== t.id));
      setMessage({ type: 'success', text: 'Type supprime.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur.' });
    }
  };

  // ─── Booth Location helpers ─────────────────────────────────────────────
  const resetBoothForm = () => {
    setBoothCode('');
    setBoothZone('');
    setBoothTypeId('');
    setBoothWidth('');
    setBoothDepth('');
    setBoothPriceCents('');
    setBoothPricingMode('flat');
    setBoothHasElectricity(false);
    setBoothElecPrice('');
    setBoothHasWater(false);
    setBoothWaterPrice('');
    setBoothNotes('');
    setBoothEquipOpts([]);
    setEditingBooth(null);
  };

  const openCreateBooth = () => {
    resetBoothForm();
    setShowBoothDialog(true);
  };

  const openEditBooth = (b: BoothLocation) => {
    setEditingBooth(b);
    setBoothCode(b.code || '');
    setBoothZone(b.zone || '');
    setBoothTypeId(b.booth_type_id || '');
    setBoothWidth(b.width_m ? String(b.width_m) : '');
    setBoothDepth(b.depth_m ? String(b.depth_m) : '');
    setBoothPriceCents(b.price_cents ? String(b.price_cents / 100) : '');
    setBoothPricingMode(b.pricing_mode || 'flat');
    setBoothHasElectricity(!!b.has_electricity);
    setBoothElecPrice(b.electricity_price_cents ? String(b.electricity_price_cents / 100) : '');
    setBoothHasWater(!!b.has_water);
    setBoothWaterPrice(b.water_price_cents ? String(b.water_price_cents / 100) : '');
    setBoothNotes(b.notes || '');
    // Rebuild equipment options from the type or stored IDs
    if (b.booth_type_id) {
      const bt = boothTypesList.find((t) => t.id === b.booth_type_id);
      setBoothEquipOpts(bt?.equipment_options || []);
    } else {
      setBoothEquipOpts((b.equipment_included || []).map((id) => ({ item_id: id, included: true, price_cents: 0 })));
    }
    setShowBoothDialog(true);
  };

  // When selecting a type, prefill form
  const handleTypeSelect = (typeId: string) => {
    setBoothTypeId(typeId);
    if (!typeId) return;
    const t = boothTypesList.find((x) => x.id === typeId);
    if (!t) return;
    if (t.width_m) setBoothWidth(String(t.width_m));
    if (t.depth_m) setBoothDepth(String(t.depth_m));
    setBoothPriceCents(t.price_cents ? String(t.price_cents / 100) : '');
    setBoothPricingMode(t.pricing_mode);
    setBoothHasElectricity(!!t.has_electricity);
    setBoothElecPrice(t.electricity_price_cents ? String(t.electricity_price_cents / 100) : '');
    setBoothHasWater(!!t.has_water);
    setBoothWaterPrice(t.water_price_cents ? String(t.water_price_cents / 100) : '');
    setBoothEquipOpts(t.equipment_options ? [...t.equipment_options] : []);
  };

  const handleSubmitBooth = async () => {
    if (!activeEdition || !boothCode.trim()) return;
    setBoothSubmitting(true);
    setMessage(null);

    const payload = {
      code: boothCode.trim(),
      zone: boothZone.trim() || null,
      booth_type_id: boothTypeId || null,
      width_m: boothWidth ? Number(boothWidth) : null,
      depth_m: boothDepth ? Number(boothDepth) : null,
      price_cents: boothPriceCents ? Math.round(Number(boothPriceCents) * 100) : 0,
      pricing_mode: boothPricingMode,
      has_electricity: boothHasElectricity,
      electricity_price_cents: boothElecPrice ? Math.round(Number(boothElecPrice) * 100) : 0,
      has_water: boothHasWater,
      water_price_cents: boothWaterPrice ? Math.round(Number(boothWaterPrice) * 100) : 0,
      notes: boothNotes.trim() || null,
      equipment_included: boothEquipOpts.map((o) => o.item_id),
    };

    if (editingBooth) {
      const res = await api.put<BoothLocation>(`/exhibitors/locations/${editingBooth.id}`, payload);
      if (res.success && res.data) {
        setBooths((prev) => prev.map((b) => (b.id === editingBooth.id ? res.data! : b)));
        setShowBoothDialog(false);
        resetBoothForm();
        setMessage({ type: 'success', text: 'Emplacement mis a jour.' });
      } else {
        setMessage({ type: 'error', text: res.error || 'Erreur.' });
      }
    } else {
      const res = await api.post<BoothLocation>(`/exhibitors/edition/${activeEdition.id}/locations`, payload);
      if (res.success && res.data) {
        setBooths((prev) => [...prev, res.data!]);
        setShowBoothDialog(false);
        resetBoothForm();
        setMessage({ type: 'success', text: 'Emplacement cree.' });
      } else {
        setMessage({ type: 'error', text: res.error || 'Erreur.' });
      }
    }
    setBoothSubmitting(false);
  };

  const handleDeleteBooth = async (b: BoothLocation) => {
    if (!confirm(`Supprimer l'emplacement "${b.code}" ?`)) return;
    const res = await api.delete(`/exhibitors/locations/${b.id}`);
    if (res.success) {
      setBooths((prev) => prev.filter((x) => x.id !== b.id));
      setMessage({ type: 'success', text: 'Emplacement supprime.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur.' });
    }
  };

  // Equipment option helpers for type dialog
  const toggleTypeEquip = (itemId: string) => {
    setTypeEquipOpts((prev) => {
      const exists = prev.find((o) => o.item_id === itemId);
      if (exists) return prev.filter((o) => o.item_id !== itemId);
      return [...prev, { item_id: itemId, included: true, price_cents: 0 }];
    });
  };

  const setTypeEquipIncluded = (itemId: string, included: boolean) => {
    setTypeEquipOpts((prev) =>
      prev.map((o) => (o.item_id === itemId ? { ...o, included, price_cents: included ? 0 : o.price_cents } : o))
    );
  };

  const setTypeEquipPrice = (itemId: string, euros: string) => {
    setTypeEquipOpts((prev) =>
      prev.map((o) => (o.item_id === itemId ? { ...o, price_cents: euros ? Math.round(Number(euros) * 100) : 0 } : o))
    );
  };

  // Equipment option helpers for booth dialog
  const toggleBoothEquip = (itemId: string) => {
    setBoothEquipOpts((prev) => {
      const exists = prev.find((o) => o.item_id === itemId);
      if (exists) return prev.filter((o) => o.item_id !== itemId);
      return [...prev, { item_id: itemId, included: true, price_cents: 0 }];
    });
  };

  const setBoothEquipIncluded = (itemId: string, included: boolean) => {
    setBoothEquipOpts((prev) =>
      prev.map((o) => (o.item_id === itemId ? { ...o, included, price_cents: included ? 0 : o.price_cents } : o))
    );
  };

  const setBoothEquipPrice = (itemId: string, euros: string) => {
    setBoothEquipOpts((prev) =>
      prev.map((o) => (o.item_id === itemId ? { ...o, price_cents: euros ? Math.round(Number(euros) * 100) : 0 } : o))
    );
  };

  const getEquipItemName = (itemId: string) => equipmentItems.find((i) => i.id === itemId)?.name || 'Inconnu';

  const getTypeName = (typeId: string | null) => {
    if (!typeId) return null;
    return boothTypesList.find((t) => t.id === typeId)?.name || null;
  };

  const getTypeColor = (typeId: string | null) => {
    if (!typeId) return '#94a3b8';
    return boothTypesList.find((t) => t.id === typeId)?.color || '#94a3b8';
  };

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'applications', label: 'Candidatures', count: applications.length },
    { key: 'exhibitors', label: 'Exposants', count: profiles.length },
    { key: 'booths', label: 'Emplacements', count: booths.length },
  ];

  if (!festival || !activeEdition) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="mb-3 h-8 w-8 text-amber-500" />
        <p className="text-sm text-muted-foreground">
          {!festival ? 'Chargement du festival...' : 'Aucune edition active. Activez une edition dans les parametres.'}
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="mb-3 h-8 w-8 text-destructive" />
        <p className="text-sm text-destructive">{error}</p>
        <button type="button" onClick={fetchData} className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Reessayer
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Exposants</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerez les candidatures et les exposants de votre festival.
        </p>
      </div>

      {message && (
        <div className={`mb-6 rounded-md border px-4 py-3 text-sm ${message.type === 'success' ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400' : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'}`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === tab.key ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {tab.label}{' '}
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Tab: Candidatures                                                  */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'applications' && (
        <>
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Rechercher par nom..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${statusFilter === opt.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Exposant</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Statut</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Paiement</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredApplications.map((app) => {
                    const config = statusConfig[app.status];
                    const isUpdating = updatingId === app.id;
                    return (
                      <tr key={app.id} className="hover:bg-muted/50">
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Store className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground">{getProfileName(app.exhibitor_id)}</span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}>{config.label}</span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                          {new Date(Number(app.created_at) * 1000).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                          {app.payment_received ? (
                            <span className="inline-flex items-center gap-1 text-green-600"><CheckCircle className="h-3 w-3" />Recu</span>
                          ) : (
                            <span className="text-muted-foreground">En attente</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {(app.status === 'submitted' || app.status === 'under_review') && (
                              <>
                                <button type="button" onClick={() => handleUpdateStatus(app.id, 'approved')} disabled={isUpdating} className="inline-flex items-center gap-1 rounded-md bg-green-100 px-3 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-200 disabled:opacity-50 dark:bg-green-900/20 dark:text-green-400">
                                  {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                                  Approuver
                                </button>
                                <button type="button" onClick={() => handleUpdateStatus(app.id, 'rejected')} disabled={isUpdating} className="inline-flex items-center gap-1 rounded-md bg-red-100 px-3 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-200 disabled:opacity-50 dark:bg-red-900/20 dark:text-red-400">
                                  {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                                  Refuser
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredApplications.length === 0 && (
              <div className="p-12 text-center">
                <p className="text-sm text-muted-foreground">Aucune candidature ne correspond aux filtres.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Tab: Exposants                                                     */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'exhibitors' && (
        <div className="rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Entreprise</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Ville</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Site web</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {profiles.map((profile) => (
                  <tr key={profile.id} className="hover:bg-muted/50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{profile.company_name}</p>
                          {profile.legal_name && <p className="text-xs text-muted-foreground">{profile.legal_name}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <p className="text-sm text-foreground">{profile.contact_email}</p>
                      {profile.contact_phone && <p className="text-xs text-muted-foreground">{profile.contact_phone}</p>}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">{profile.city || '—'}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                      {profile.website_url ? (
                        <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Voir le site</a>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {profiles.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-sm text-muted-foreground">Aucun profil exposant.</p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Tab: Emplacements                                                  */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'booths' && (
        <>
          {/* Reminder: create equipment first */}
          {equipmentItems.length === 0 && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  Pensez a creer votre inventaire materiel en amont
                </p>
                <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
                  Pour proposer des options materiel (tables, chaises, grilles...) dans vos types de stand, rendez-vous d&apos;abord dans{' '}
                  <a href={`/f/${festival?.slug}/admin/equipment`} className="font-medium underline hover:no-underline">Materiel</a>{' '}
                  pour creer la liste du materiel disponible.
                </p>
              </div>
            </div>
          )}

          {/* ── Booth Types Section ─────────────────────────────────────── */}
          <div className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Layers className="h-5 w-5" />
                Types d&apos;emplacement
              </h2>
              <button type="button" onClick={openCreateType} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent">
                <Plus className="h-4 w-4" />
                Nouveau type
              </button>
            </div>

            {boothTypesList.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
                <Tag className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Aucun type d&apos;emplacement. Creez-en un pour definir les tailles et tarifs.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {boothTypesList.map((t) => (
                  <div key={t.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: t.color }} />
                        <span className="text-sm font-semibold text-foreground">{t.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => openEditType(t)} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => handleDeleteType(t)} className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                    {t.description && <p className="mb-2 text-xs text-muted-foreground">{t.description}</p>}
                    <div className="flex flex-wrap gap-2 text-xs">
                      {t.width_m && t.depth_m && (
                        <span className="rounded-md bg-muted px-2 py-0.5 text-muted-foreground">{t.width_m}m x {t.depth_m}m</span>
                      )}
                      <span className="rounded-md bg-muted px-2 py-0.5 font-medium text-foreground">
                        {formatPrice(t.price_cents)} {t.pricing_mode === 'per_day' ? '/ jour' : '/ evenement'}
                      </span>
                      {!!t.has_electricity && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-yellow-100 px-2 py-0.5 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
                          <Zap className="h-3 w-3" />Elec{t.max_wattage ? ` ${t.max_wattage}W` : ''}{t.electricity_price_cents ? ` ${formatPrice(t.electricity_price_cents)}` : ' (compris)'}
                        </span>
                      )}
                      {!!t.has_water && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                          <Droplets className="h-3 w-3" />Eau{t.water_price_cents ? ` ${formatPrice(t.water_price_cents)}` : ' (compris)'}
                        </span>
                      )}
                    </div>
                    {/* Equipment options */}
                    {t.equipment_options && t.equipment_options.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {t.equipment_options.map((opt) => (
                          <span key={opt.item_id} className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] ${opt.included ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'}`}>
                            <Package className="h-2.5 w-2.5" />
                            {getEquipItemName(opt.item_id)}
                            {opt.included ? ' (compris)' : ` +${formatPrice(opt.price_cents)}`}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 text-xs text-muted-foreground">
                      {booths.filter((b) => b.booth_type_id === t.id).length} emplacement(s)
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Booth Locations Section ─────────────────────────────────── */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <MapPin className="h-5 w-5" />
              Emplacements ({booths.length})
            </h2>
            <button type="button" onClick={openCreateBooth} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              Ajouter un emplacement
            </button>
          </div>

          <div className="rounded-xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Zone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Dimensions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Prix</th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Options</th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Dispo</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {booths.map((booth) => {
                    const typeName = getTypeName(booth.booth_type_id);
                    const typeColor = getTypeColor(booth.booth_type_id);
                    const eqCount = (booth.equipment_included || []).length;
                    return (
                      <tr key={booth.id} className="hover:bg-muted/50">
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground">{booth.code}</span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          {typeName ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: typeColor }} />
                              {typeName}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">{booth.zone || '—'}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                          {booth.width_m && booth.depth_m ? `${booth.width_m}m x ${booth.depth_m}m` : '—'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                          {booth.price_cents ? (
                            <>
                              {formatPrice(booth.price_cents)}
                              <span className="ml-1 text-xs text-muted-foreground/70">
                                {booth.pricing_mode === 'per_day' ? '/ jour' : '/ evt'}
                              </span>
                            </>
                          ) : '—'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {!!booth.has_electricity && <Zap className="h-3.5 w-3.5 text-yellow-500" aria-label="Electricite" />}
                            {!!booth.has_water && <Droplets className="h-3.5 w-3.5 text-blue-500" aria-label="Eau" />}
                            {eqCount > 0 && (
                              <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground" title="Materiel inclus">
                                <Package className="h-3.5 w-3.5" />{eqCount}
                              </span>
                            )}
                            {!booth.has_electricity && !booth.has_water && eqCount === 0 && (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center">
                          {!!booth.is_available ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600"><CheckCircle className="h-3 w-3" />Oui</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600"><XCircle className="h-3 w-3" />Non</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button type="button" onClick={() => openEditBooth(booth)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" title="Modifier"><Pencil className="h-4 w-4" /></button>
                            <button type="button" onClick={() => handleDeleteBooth(booth)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Supprimer"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {booths.length === 0 && (
              <div className="p-12 text-center">
                <MapPin className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Aucun emplacement defini.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Booth Type Dialog                                                  */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {showTypeDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">{editingType ? 'Modifier le type' : 'Nouveau type d\'emplacement'}</h2>
              <button type="button" onClick={() => { setShowTypeDialog(false); resetTypeForm(); }} className="rounded-md p-1 text-muted-foreground hover:bg-accent"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-[1fr_60px]">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Nom</label>
                  <input type="text" value={typeName} onChange={(e) => setTypeName(e.target.value)} placeholder="Ex : Standard, Premium, Ilot..." className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Couleur</label>
                  <input type="color" value={typeColor} onChange={(e) => setTypeColor(e.target.value)} className="h-[38px] w-full cursor-pointer rounded-md border border-border bg-background" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
                <input type="text" value={typeDescription} onChange={(e) => setTypeDescription(e.target.value)} placeholder="Description optionnelle" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Largeur (m)</label>
                  <input type="number" min="0" step="0.5" value={typeWidth} onChange={(e) => setTypeWidth(e.target.value)} placeholder="3" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Profondeur (m)</label>
                  <input type="number" min="0" step="0.5" value={typeDepth} onChange={(e) => setTypeDepth(e.target.value)} placeholder="3" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Prix (€)</label>
                  <input type="number" min="0" step="0.01" value={typePriceCents} onChange={(e) => setTypePriceCents(e.target.value)} placeholder="0.00" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Tarification</label>
                  <select value={typePricingMode} onChange={(e) => setTypePricingMode(e.target.value as 'flat' | 'per_day')} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option value="flat">Pour tout l&apos;evenement</option>
                    <option value="per_day">Par jour</option>
                  </select>
                </div>
              </div>
              {/* Electricity */}
              <div className="rounded-md border border-border p-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
                  <input type="checkbox" checked={typeHasElectricity} onChange={(e) => setTypeHasElectricity(e.target.checked)} className="rounded border-border" />
                  <Zap className="h-4 w-4 text-yellow-500" />Electricite
                </label>
                {typeHasElectricity && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Puissance max (W)</label>
                      <input type="number" min="0" value={typeMaxWattage} onChange={(e) => setTypeMaxWattage(e.target.value)} placeholder="2000" className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Supplement (€) — vide si gratuit</label>
                      <input type="number" min="0" step="0.01" value={typeElecPrice} onChange={(e) => setTypeElecPrice(e.target.value)} placeholder="Gratuit" className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                  </div>
                )}
              </div>

              {/* Water */}
              <div className="rounded-md border border-border p-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
                  <input type="checkbox" checked={typeHasWater} onChange={(e) => setTypeHasWater(e.target.checked)} className="rounded border-border" />
                  <Droplets className="h-4 w-4 text-blue-500" />Eau
                </label>
                {typeHasWater && (
                  <div className="mt-3">
                    <label className="mb-1 block text-xs text-muted-foreground">Supplement (€) — vide si gratuit</label>
                    <input type="number" min="0" step="0.01" value={typeWaterPrice} onChange={(e) => setTypeWaterPrice(e.target.value)} placeholder="Gratuit" className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                )}
              </div>

              {/* Equipment options */}
              {equipmentItems.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    <Package className="mr-1 inline h-4 w-4" />Options materiel
                  </label>
                  <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border bg-background p-2">
                    {equipmentItems.map((item) => {
                      const opt = typeEquipOpts.find((o) => o.item_id === item.id);
                      const isSelected = !!opt;
                      return (
                        <div key={item.id} className={`rounded-md px-2 py-1.5 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}>
                          <label className="flex cursor-pointer items-center gap-2 text-sm">
                            <input type="checkbox" checked={isSelected} onChange={() => toggleTypeEquip(item.id)} className="rounded border-border" />
                            <span className={isSelected ? 'text-foreground' : 'text-muted-foreground'}>{item.name}</span>
                            <span className="text-xs text-muted-foreground">({item.total_quantity} dispo)</span>
                          </label>
                          {isSelected && (
                            <div className="ml-6 mt-1.5 flex items-center gap-3">
                              <label className="flex items-center gap-1.5 text-xs">
                                <input type="radio" name={`type-eq-${item.id}`} checked={opt.included} onChange={() => setTypeEquipIncluded(item.id, true)} className="border-border" />
                                <span className="text-green-600">Compris</span>
                              </label>
                              <label className="flex items-center gap-1.5 text-xs">
                                <input type="radio" name={`type-eq-${item.id}`} checked={!opt.included} onChange={() => setTypeEquipIncluded(item.id, false)} className="border-border" />
                                <span className="text-orange-600">Payant</span>
                              </label>
                              {!opt.included && (
                                <input type="number" min="0" step="0.01" value={opt.price_cents ? String(opt.price_cents / 100) : ''} onChange={(e) => setTypeEquipPrice(item.id, e.target.value)} placeholder="Prix €" className="w-20 rounded border border-border bg-background px-2 py-0.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => { setShowTypeDialog(false); resetTypeForm(); }} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">Annuler</button>
              <button type="button" onClick={handleSubmitType} disabled={typeSubmitting || !typeName.trim()} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {typeSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingType ? 'Enregistrer' : 'Creer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Booth Location Dialog                                              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {showBoothDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">{editingBooth ? 'Modifier l\'emplacement' : 'Nouvel emplacement'}</h2>
              <button type="button" onClick={() => { setShowBoothDialog(false); resetBoothForm(); }} className="rounded-md p-1 text-muted-foreground hover:bg-accent"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              {/* Type selector */}
              {boothTypesList.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Type d&apos;emplacement</label>
                  <select value={boothTypeId} onChange={(e) => handleTypeSelect(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option value="">— Sans type</option>
                    {boothTypesList.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.width_m}x{t.depth_m}m — {formatPrice(t.price_cents)}{t.pricing_mode === 'per_day' ? '/jour' : ''})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Code *</label>
                  <input type="text" value={boothCode} onChange={(e) => setBoothCode(e.target.value)} placeholder="Ex : A1, B12..." className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Zone</label>
                  <input type="text" value={boothZone} onChange={(e) => setBoothZone(e.target.value)} placeholder="Ex : Hall A" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Largeur (m)</label>
                  <input type="number" min="0" step="0.5" value={boothWidth} onChange={(e) => setBoothWidth(e.target.value)} placeholder="3" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Profondeur (m)</label>
                  <input type="number" min="0" step="0.5" value={boothDepth} onChange={(e) => setBoothDepth(e.target.value)} placeholder="3" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Prix (€)</label>
                  <div className="relative">
                    <input type="number" min="0" step="0.01" value={boothPriceCents} onChange={(e) => setBoothPriceCents(e.target.value)} placeholder="0.00" className="w-full rounded-md border border-border bg-background px-3 py-2 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    <Euro className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Tarification</label>
                  <select value={boothPricingMode} onChange={(e) => setBoothPricingMode(e.target.value as 'flat' | 'per_day')} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option value="flat">Pour tout l&apos;evenement</option>
                    <option value="per_day">Par jour</option>
                  </select>
                </div>
              </div>

              {/* Electricity */}
              <div className="rounded-md border border-border p-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
                  <input type="checkbox" checked={boothHasElectricity} onChange={(e) => setBoothHasElectricity(e.target.checked)} className="rounded border-border" />
                  <Zap className="h-4 w-4 text-yellow-500" />Electricite
                </label>
                {boothHasElectricity && (
                  <div className="mt-2">
                    <label className="mb-1 block text-xs text-muted-foreground">Supplement (€) — vide si gratuit</label>
                    <input type="number" min="0" step="0.01" value={boothElecPrice} onChange={(e) => setBoothElecPrice(e.target.value)} placeholder="Gratuit" className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                )}
              </div>

              {/* Water */}
              <div className="rounded-md border border-border p-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
                  <input type="checkbox" checked={boothHasWater} onChange={(e) => setBoothHasWater(e.target.checked)} className="rounded border-border" />
                  <Droplets className="h-4 w-4 text-blue-500" />Eau
                </label>
                {boothHasWater && (
                  <div className="mt-2">
                    <label className="mb-1 block text-xs text-muted-foreground">Supplement (€) — vide si gratuit</label>
                    <input type="number" min="0" step="0.01" value={boothWaterPrice} onChange={(e) => setBoothWaterPrice(e.target.value)} placeholder="Gratuit" className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                )}
              </div>

              {/* Equipment options */}
              {equipmentItems.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    <Package className="mr-1 inline h-4 w-4" />Options materiel
                  </label>
                  <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border bg-background p-2">
                    {equipmentItems.map((item) => {
                      const opt = boothEquipOpts.find((o) => o.item_id === item.id);
                      const isSelected = !!opt;
                      return (
                        <div key={item.id} className={`rounded-md px-2 py-1.5 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}>
                          <label className="flex cursor-pointer items-center gap-2 text-sm">
                            <input type="checkbox" checked={isSelected} onChange={() => toggleBoothEquip(item.id)} className="rounded border-border" />
                            <span className={isSelected ? 'text-foreground' : 'text-muted-foreground'}>{item.name}</span>
                            <span className="text-xs text-muted-foreground">({item.total_quantity} dispo)</span>
                          </label>
                          {isSelected && (
                            <div className="ml-6 mt-1.5 flex items-center gap-3">
                              <label className="flex items-center gap-1.5 text-xs">
                                <input type="radio" name={`booth-eq-${item.id}`} checked={opt.included} onChange={() => setBoothEquipIncluded(item.id, true)} className="border-border" />
                                <span className="text-green-600">Compris</span>
                              </label>
                              <label className="flex items-center gap-1.5 text-xs">
                                <input type="radio" name={`booth-eq-${item.id}`} checked={!opt.included} onChange={() => setBoothEquipIncluded(item.id, false)} className="border-border" />
                                <span className="text-orange-600">Payant</span>
                              </label>
                              {!opt.included && (
                                <input type="number" min="0" step="0.01" value={opt.price_cents ? String(opt.price_cents / 100) : ''} onChange={(e) => setBoothEquipPrice(item.id, e.target.value)} placeholder="Prix €" className="w-20 rounded border border-border bg-background px-2 py-0.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Notes</label>
                <textarea value={boothNotes} onChange={(e) => setBoothNotes(e.target.value)} rows={2} placeholder="Notes internes..." className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => { setShowBoothDialog(false); resetBoothForm(); }} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">Annuler</button>
              <button type="button" onClick={handleSubmitBooth} disabled={boothSubmitting || !boothCode.trim()} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {boothSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingBooth ? 'Enregistrer' : 'Creer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
