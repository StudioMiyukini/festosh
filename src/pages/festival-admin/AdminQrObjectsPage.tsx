import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  QrCode,
  BarChart3,
  Search,
  Eye,
  Copy,
  CheckCircle2,
  Package,
  Zap,
  Coins,
  ToggleLeft,
  ToggleRight,
  Layers,
} from 'lucide-react';
import { useTenantStore } from '@/stores/tenant-store';
import { api } from '@/lib/api-client';
import { formatTimestamp } from '@/lib/format-utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

const QR_TYPES = [
  { value: 'trophy', label: 'Trophee' },
  { value: 'entry_ticket', label: 'Billet d\'entree' },
  { value: 'drink_ticket', label: 'Ticket boisson' },
  { value: 'food_ticket', label: 'Ticket nourriture' },
  { value: 'hunt_checkpoint', label: 'Point de chasse' },
  { value: 'voucher', label: 'Bon de reduction' },
  { value: 'stamp_point', label: 'Point tampon' },
  { value: 'custom', label: 'Personnalise' },
] as const;

type QrType = (typeof QR_TYPES)[number]['value'];

const TYPE_COLORS: Record<QrType, string> = {
  trophy: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  entry_ticket: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  drink_ticket: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  food_ticket: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  hunt_checkpoint: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  voucher: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
  stamp_point: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  custom: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

const CONSUMABLE_DEFAULTS: Record<QrType, boolean> = {
  trophy: false,
  entry_ticket: true,
  drink_ticket: true,
  food_ticket: true,
  hunt_checkpoint: false,
  voucher: true,
  stamp_point: false,
  custom: false,
};

interface QrObject {
  id: string;
  edition_id: string;
  type: QrType;
  type_label: string;
  name: string;
  description: string | null;
  qr_code: string;
  max_scans: number | null;
  max_scans_per_user: number | null;
  scan_count: number;
  xp_reward: number;
  coins_reward: number;
  is_consumable: number;
  is_active: number;
  valid_from: number | null;
  valid_until: number | null;
  batch_id: string | null;
  image_url: string | null;
  created_at: number;
}

interface QrObjectStats {
  total_objects: number;
  total_scans: number;
  active_objects: number;
  types: { type: QrType; type_label: string; count: number }[];
  batches: { batch_id: string; name: string; type: QrType; count: number; created_at: number }[];
}

interface ScanRecord {
  id: string;
  user_id: string;
  username: string;
  scanned_at: number;
  xp_earned: number;
  coins_earned: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const tsToDateInput = (ts: number | null): string => {
  if (!ts) return '';
  return new Date(ts * 1000).toISOString().slice(0, 16);
};

const dateInputToTs = (val: string): number | null => {
  if (!val) return null;
  return Math.floor(new Date(val).getTime() / 1000);
};

function getTypeLabel(type: QrType): string {
  return QR_TYPES.find((t) => t.value === type)?.label ?? type;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AdminQrObjectsPage() {
  const { activeEdition } = useTenantStore();

  // Data
  const [objects, setObjects] = useState<QrObject[]>([]);
  const [stats, setStats] = useState<QrObjectStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters
  const [filterType, setFilterType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Create dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingObject, setEditingObject] = useState<QrObject | null>(null);
  const [formType, setFormType] = useState<QrType>('custom');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formMaxScans, setFormMaxScans] = useState('');
  const [formMaxScansPerUser, setFormMaxScansPerUser] = useState('');
  const [formXpReward, setFormXpReward] = useState('0');
  const [formCoinsReward, setFormCoinsReward] = useState('0');
  const [formConsumable, setFormConsumable] = useState(false);
  const [formValidFrom, setFormValidFrom] = useState('');
  const [formValidUntil, setFormValidUntil] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Batch dialog
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [batchFormType, setBatchFormType] = useState<QrType>('drink_ticket');
  const [batchFormName, setBatchFormName] = useState('');
  const [batchFormDescription, setBatchFormDescription] = useState('');
  const [batchFormMaxScans, setBatchFormMaxScans] = useState('1');
  const [batchFormMaxScansPerUser, setBatchFormMaxScansPerUser] = useState('1');
  const [batchFormXpReward, setBatchFormXpReward] = useState('0');
  const [batchFormCoinsReward, setBatchFormCoinsReward] = useState('0');
  const [batchFormConsumable, setBatchFormConsumable] = useState(true);
  const [batchFormValidFrom, setBatchFormValidFrom] = useState('');
  const [batchFormValidUntil, setBatchFormValidUntil] = useState('');
  const [batchFormQuantity, setBatchFormQuantity] = useState('10');
  const [batchSubmitting, setBatchSubmitting] = useState(false);

  // Batch result (generated QR codes)
  const [showBatchResult, setShowBatchResult] = useState(false);
  const [batchResultCodes, setBatchResultCodes] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Scan history dialog
  const [showScansDialog, setShowScansDialog] = useState(false);
  const [scansObject, setScansObject] = useState<QrObject | null>(null);
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [scansLoading, setScansLoading] = useState(false);

  /* ---- data fetching ---- */

  const fetchData = useCallback(async () => {
    if (!activeEdition) return;
    setLoading(true);
    setError(null);

    const [objectsRes, statsRes] = await Promise.all([
      api.get<QrObject[]>(`/qr-objects/edition/${activeEdition.id}`),
      api.get<QrObjectStats>(`/qr-objects/edition/${activeEdition.id}/stats`),
    ]);

    if (objectsRes.success && objectsRes.data) {
      setObjects(objectsRes.data);
    } else {
      setError(objectsRes.error || 'Impossible de charger les objets QR.');
    }

    if (statsRes.success && statsRes.data) {
      setStats(statsRes.data);
    }

    setLoading(false);
  }, [activeEdition]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ---- filtered list ---- */

  const filteredObjects = objects.filter((obj) => {
    if (filterType && obj.type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!obj.name.toLowerCase().includes(q) && !obj.qr_code.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  /* ---- form helpers ---- */

  const resetCreateForm = () => {
    setFormType('custom');
    setFormName('');
    setFormDescription('');
    setFormMaxScans('');
    setFormMaxScansPerUser('');
    setFormXpReward('0');
    setFormCoinsReward('0');
    setFormConsumable(false);
    setFormValidFrom('');
    setFormValidUntil('');
    setEditingObject(null);
  };

  const openCreateDialog = () => {
    resetCreateForm();
    setShowCreateDialog(true);
  };

  const openEditDialog = (obj: QrObject) => {
    setEditingObject(obj);
    setFormType(obj.type);
    setFormName(obj.name);
    setFormDescription(obj.description || '');
    setFormMaxScans(obj.max_scans != null ? String(obj.max_scans) : '');
    setFormMaxScansPerUser(obj.max_scans_per_user != null ? String(obj.max_scans_per_user) : '');
    setFormXpReward(String(obj.xp_reward));
    setFormCoinsReward(String(obj.coins_reward));
    setFormConsumable(!!obj.is_consumable);
    setFormValidFrom(tsToDateInput(obj.valid_from));
    setFormValidUntil(tsToDateInput(obj.valid_until));
    setShowCreateDialog(true);
  };

  const resetBatchForm = () => {
    setBatchFormType('drink_ticket');
    setBatchFormName('');
    setBatchFormDescription('');
    setBatchFormMaxScans('1');
    setBatchFormMaxScansPerUser('1');
    setBatchFormXpReward('0');
    setBatchFormCoinsReward('0');
    setBatchFormConsumable(true);
    setBatchFormValidFrom('');
    setBatchFormValidUntil('');
    setBatchFormQuantity('10');
  };

  const openBatchDialog = () => {
    resetBatchForm();
    setShowBatchDialog(true);
  };

  /* ---- CRUD handlers ---- */

  const handleCreateOrUpdate = async () => {
    if (!activeEdition || !formName.trim()) return;
    setSubmitting(true);
    setMessage(null);

    const payload = {
      type: formType,
      name: formName.trim(),
      description: formDescription.trim() || null,
      max_scans: formMaxScans ? Number(formMaxScans) : null,
      max_scans_per_user: formMaxScansPerUser ? Number(formMaxScansPerUser) : null,
      xp_reward: Number(formXpReward) || 0,
      coins_reward: Number(formCoinsReward) || 0,
      is_consumable: formConsumable ? 1 : 0,
      is_active: 1,
      valid_from: dateInputToTs(formValidFrom),
      valid_until: dateInputToTs(formValidUntil),
    };

    if (editingObject) {
      const res = await api.put<QrObject>(
        `/qr-objects/${editingObject.id}`,
        payload,
      );
      if (res.success) {
        setShowCreateDialog(false);
        resetCreateForm();
        setMessage({ type: 'success', text: 'Objet QR mis a jour.' });
        fetchData();
      } else {
        setMessage({ type: 'error', text: res.error || 'Erreur lors de la mise a jour.' });
      }
    } else {
      const res = await api.post<QrObject>(
        `/qr-objects/edition/${activeEdition.id}`,
        payload,
      );
      if (res.success) {
        setShowCreateDialog(false);
        resetCreateForm();
        setMessage({ type: 'success', text: 'Objet QR cree.' });
        fetchData();
      } else {
        setMessage({ type: 'error', text: res.error || 'Erreur lors de la creation.' });
      }
    }
    setSubmitting(false);
  };

  const handleDelete = async (obj: QrObject) => {
    if (!confirm(`Supprimer l'objet QR "${obj.name}" ?`)) return;
    setMessage(null);

    const res = await api.delete(`/qr-objects/${obj.id}`);
    if (res.success) {
      setObjects((prev) => prev.filter((o) => o.id !== obj.id));
      setMessage({ type: 'success', text: 'Objet QR supprime.' });
      fetchData();
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la suppression.' });
    }
  };

  const handleToggleActive = async (obj: QrObject) => {
    const res = await api.put<QrObject>(`/qr-objects/${obj.id}`, {
      is_active: obj.is_active ? 0 : 1,
    });
    if (res.success) {
      setObjects((prev) =>
        prev.map((o) => (o.id === obj.id ? { ...o, is_active: obj.is_active ? 0 : 1 } : o)),
      );
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur.' });
    }
  };

  /* ---- batch creation ---- */

  const handleBatchCreate = async () => {
    if (!activeEdition || !batchFormName.trim() || !batchFormQuantity) return;
    setBatchSubmitting(true);
    setMessage(null);

    const qty = Math.max(1, Math.min(500, Number(batchFormQuantity)));

    const payload = {
      type: batchFormType,
      name: batchFormName.trim(),
      description: batchFormDescription.trim() || null,
      max_scans: batchFormMaxScans ? Number(batchFormMaxScans) : null,
      max_scans_per_user: batchFormMaxScansPerUser ? Number(batchFormMaxScansPerUser) : null,
      xp_reward: Number(batchFormXpReward) || 0,
      coins_reward: Number(batchFormCoinsReward) || 0,
      is_consumable: batchFormConsumable ? 1 : 0,
      valid_from: dateInputToTs(batchFormValidFrom),
      valid_until: dateInputToTs(batchFormValidUntil),
      quantity: qty,
    };

    const res = await api.post<{ qr_codes: string[] }>(
      `/qr-objects/edition/${activeEdition.id}/batch`,
      payload,
    );
    if (res.success && res.data) {
      setShowBatchDialog(false);
      resetBatchForm();
      setBatchResultCodes(res.data.qr_codes);
      setShowBatchResult(true);
      setMessage({ type: 'success', text: `${res.data.qr_codes.length} objets QR crees.` });
      fetchData();
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la creation par lot.' });
    }
    setBatchSubmitting(false);
  };

  const handleDeleteBatch = async (batchId: string, batchName: string) => {
    if (!confirm(`Supprimer tout le lot "${batchName}" ?`)) return;
    setMessage(null);

    const res = await api.delete(`/qr-objects/batch/${batchId}`);
    if (res.success) {
      setMessage({ type: 'success', text: 'Lot supprime.' });
      fetchData();
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la suppression du lot.' });
    }
  };

  /* ---- scan history ---- */

  const openScansDialog = async (obj: QrObject) => {
    setScansObject(obj);
    setScansLoading(true);
    setScans([]);
    setShowScansDialog(true);

    const res = await api.get<ScanRecord[]>(`/qr-objects/${obj.id}/scans`);
    if (res.success && res.data) {
      setScans(res.data);
    }
    setScansLoading(false);
  };

  /* ---- copy to clipboard ---- */

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // fallback
    }
  };

  const copyAllCodes = async () => {
    try {
      await navigator.clipboard.writeText(batchResultCodes.join('\n'));
      setCopiedIndex(-1);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // fallback
    }
  };

  /* ---- rendering ---- */

  if (!activeEdition) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Aucune edition active. Veuillez selectionner ou creer une edition.
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
        <button
          type="button"
          onClick={fetchData}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Reessayer
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Objets QR</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerez les objets QR : trophees, tickets, points de chasse et plus.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openBatchDialog}
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Layers className="h-4 w-4" />
            Creation par lot
          </button>
          <button
            type="button"
            onClick={openCreateDialog}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Nouvel objet
          </button>
        </div>
      </div>

      {/* Feedback */}
      {message && (
        <div
          className={`mb-6 rounded-md border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400'
              : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* ============================================================ */}
      {/*  Stats Cards                                                  */}
      {/* ============================================================ */}
      {stats && (
        <div className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
            <BarChart3 className="h-5 w-5" />
            Statistiques
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-6">
              <p className="text-sm font-medium text-muted-foreground">Total objets</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{stats.total_objects}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <p className="text-sm font-medium text-muted-foreground">Total scans</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{stats.total_scans}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <p className="text-sm font-medium text-muted-foreground">Objets actifs</p>
              <p className="mt-2 text-2xl font-bold text-green-600">{stats.active_objects}</p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  Filter Bar                                                   */}
      {/* ============================================================ */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom ou code QR..."
            className="w-full rounded-md border border-border bg-background py-2 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">Tous les types</option>
          {(stats?.types || QR_TYPES).map((t) => (
            <option key={'value' in t ? t.value : t.type} value={'value' in t ? t.value : t.type}>
              {'label' in t ? t.label : t.type_label} {'count' in t ? `(${t.count})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* ============================================================ */}
      {/*  Objects Table                                                */}
      {/* ============================================================ */}
      <div className="mb-8 rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Nom
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  QR Code
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Scans
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  XP / Pieces
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Consommable
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Actif
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredObjects.map((obj) => (
                <tr key={obj.id} className="hover:bg-muted/50">
                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        TYPE_COLORS[obj.type] || TYPE_COLORS.custom
                      }`}
                    >
                      {obj.type_label || getTypeLabel(obj.type)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-foreground">
                    {obj.name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                      {obj.qr_code}
                    </code>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => openScansDialog(obj)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-foreground hover:bg-accent"
                      title="Voir l'historique des scans"
                    >
                      <span className="font-medium">{obj.scan_count}</span>
                      {obj.max_scans != null && (
                        <span className="text-muted-foreground">/ {obj.max_scans}</span>
                      )}
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-center text-sm">
                    <div className="flex items-center justify-center gap-2">
                      {obj.xp_reward > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-purple-600 dark:text-purple-400">
                          <Zap className="h-3 w-3" />
                          {obj.xp_reward}
                        </span>
                      )}
                      {obj.coins_reward > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                          <Coins className="h-3 w-3" />
                          {obj.coins_reward}
                        </span>
                      )}
                      {obj.xp_reward === 0 && obj.coins_reward === 0 && (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-center text-xs">
                    {obj.is_consumable ? (
                      <span className="font-medium text-orange-600 dark:text-orange-400">Oui</span>
                    ) : (
                      <span className="text-muted-foreground">Non</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(obj)}
                      title={obj.is_active ? 'Desactiver' : 'Activer'}
                    >
                      {obj.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                          <ToggleRight className="h-4 w-4" />
                          Oui
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                          <ToggleLeft className="h-4 w-4" />
                          Non
                        </span>
                      )}
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openScansDialog(obj)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        title="Historique des scans"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditDialog(obj)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(obj)}
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

        {filteredObjects.length === 0 && (
          <div className="p-12 text-center">
            <QrCode className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {objects.length === 0
                ? 'Aucun objet QR. Creez-en un pour commencer.'
                : 'Aucun objet ne correspond aux filtres.'}
            </p>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/*  Batch Management                                             */}
      {/* ============================================================ */}
      {stats && stats.batches.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
            <Layers className="h-5 w-5" />
            Lots
          </h2>
          <div className="rounded-xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Nom
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Type
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Quantite
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Cree le
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats.batches.map((batch) => (
                    <tr key={batch.batch_id} className="hover:bg-muted/50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-foreground">
                        {batch.name}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            TYPE_COLORS[batch.type] || TYPE_COLORS.custom
                          }`}
                        >
                          {getTypeLabel(batch.type)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-foreground">
                        {batch.count}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                        {formatTimestamp(batch.created_at)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteBatch(batch.batch_id, batch.name)}
                          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Supprimer le lot
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  Create / Edit Dialog                                         */}
      {/* ============================================================ */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {editingObject ? 'Modifier l\'objet QR' : 'Nouvel objet QR'}
              </h2>
              <button
                type="button"
                onClick={() => { setShowCreateDialog(false); resetCreateForm(); }}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Type */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Type</label>
                <select
                  value={formType}
                  onChange={(e) => {
                    const t = e.target.value as QrType;
                    setFormType(t);
                    if (!editingObject) {
                      setFormConsumable(CONSUMABLE_DEFAULTS[t]);
                    }
                  }}
                  disabled={!!editingObject}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60"
                >
                  {QR_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Name */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Nom</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex : Trophee champion, Ticket biere..."
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Description optionnelle..."
                  rows={3}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Max scans */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Max scans (total)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formMaxScans}
                    onChange={(e) => setFormMaxScans(e.target.value)}
                    placeholder="Illimite"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Max scans / utilisateur
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formMaxScansPerUser}
                    onChange={(e) => setFormMaxScansPerUser(e.target.value)}
                    placeholder="Illimite"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              {/* Rewards */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Recompense XP
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formXpReward}
                    onChange={(e) => setFormXpReward(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Recompense Pieces
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formCoinsReward}
                    onChange={(e) => setFormCoinsReward(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              {/* Consumable toggle */}
              <div className="flex items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={formConsumable}
                    onChange={(e) => setFormConsumable(e.target.checked)}
                    className="rounded border-border"
                  />
                  Consommable (le scan consomme le ticket)
                </label>
              </div>

              {/* Validity */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Valide a partir de
                  </label>
                  <input
                    type="datetime-local"
                    value={formValidFrom}
                    onChange={(e) => setFormValidFrom(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Valide jusqu'au
                  </label>
                  <input
                    type="datetime-local"
                    value={formValidUntil}
                    onChange={(e) => setFormValidUntil(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowCreateDialog(false); resetCreateForm(); }}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleCreateOrUpdate}
                disabled={submitting || !formName.trim()}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingObject ? 'Enregistrer' : 'Creer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  Batch Creation Dialog                                        */}
      {/* ============================================================ */}
      {showBatchDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Creation par lot</h2>
              <button
                type="button"
                onClick={() => { setShowBatchDialog(false); resetBatchForm(); }}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Quantity */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Quantite (1 - 500)
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={batchFormQuantity}
                  onChange={(e) => setBatchFormQuantity(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Type */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Type</label>
                <select
                  value={batchFormType}
                  onChange={(e) => {
                    const t = e.target.value as QrType;
                    setBatchFormType(t);
                    setBatchFormConsumable(CONSUMABLE_DEFAULTS[t]);
                  }}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {QR_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Name */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Nom</label>
                <input
                  type="text"
                  value={batchFormName}
                  onChange={(e) => setBatchFormName(e.target.value)}
                  placeholder="Ex : Ticket boisson samedi..."
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
                <textarea
                  value={batchFormDescription}
                  onChange={(e) => setBatchFormDescription(e.target.value)}
                  placeholder="Description optionnelle..."
                  rows={2}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Max scans */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Max scans (total)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={batchFormMaxScans}
                    onChange={(e) => setBatchFormMaxScans(e.target.value)}
                    placeholder="Illimite"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Max scans / utilisateur
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={batchFormMaxScansPerUser}
                    onChange={(e) => setBatchFormMaxScansPerUser(e.target.value)}
                    placeholder="Illimite"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              {/* Rewards */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Recompense XP
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={batchFormXpReward}
                    onChange={(e) => setBatchFormXpReward(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Recompense Pieces
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={batchFormCoinsReward}
                    onChange={(e) => setBatchFormCoinsReward(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              {/* Consumable toggle */}
              <div className="flex items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={batchFormConsumable}
                    onChange={(e) => setBatchFormConsumable(e.target.checked)}
                    className="rounded border-border"
                  />
                  Consommable (le scan consomme le ticket)
                </label>
              </div>

              {/* Validity */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Valide a partir de
                  </label>
                  <input
                    type="datetime-local"
                    value={batchFormValidFrom}
                    onChange={(e) => setBatchFormValidFrom(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Valide jusqu'au
                  </label>
                  <input
                    type="datetime-local"
                    value={batchFormValidUntil}
                    onChange={(e) => setBatchFormValidUntil(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowBatchDialog(false); resetBatchForm(); }}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleBatchCreate}
                disabled={batchSubmitting || !batchFormName.trim() || !batchFormQuantity}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {batchSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Creer {batchFormQuantity || 0} objets
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  Batch Result Dialog (generated QR codes)                     */}
      {/* ============================================================ */}
      {showBatchResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Codes QR generes ({batchResultCodes.length})
              </h2>
              <button
                type="button"
                onClick={() => { setShowBatchResult(false); setBatchResultCodes([]); }}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4">
              <button
                type="button"
                onClick={copyAllCodes}
                className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
              >
                {copiedIndex === -1 ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Copie !
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copier tous les codes
                  </>
                )}
              </button>
            </div>

            <div className="max-h-80 space-y-1 overflow-y-auto">
              {batchResultCodes.map((code, i) => (
                <div
                  key={code}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                >
                  <code className="font-mono text-sm text-foreground">{code}</code>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(code, i)}
                    className="rounded p-1 text-muted-foreground hover:text-foreground"
                    title="Copier"
                  >
                    {copiedIndex === i ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => { setShowBatchResult(false); setBatchResultCodes([]); }}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  Scan History Dialog                                          */}
      {/* ============================================================ */}
      {showScansDialog && scansObject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Historique des scans
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {scansObject.name} ({scansObject.qr_code})
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setShowScansDialog(false); setScansObject(null); }}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {scansLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : scans.length === 0 ? (
              <div className="py-12 text-center">
                <Package className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Aucun scan enregistre.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Utilisateur
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Date
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        XP
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Pieces
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {scans.map((scan) => (
                      <tr key={scan.id} className="hover:bg-muted/50">
                        <td className="whitespace-nowrap px-3 py-2 text-sm font-medium text-foreground">
                          {scan.username}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-sm text-muted-foreground">
                          {formatTimestamp(scan.scanned_at)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-center text-sm">
                          {scan.xp_earned > 0 ? (
                            <span className="text-purple-600 dark:text-purple-400">+{scan.xp_earned}</span>
                          ) : (
                            <span className="text-muted-foreground">--</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-center text-sm">
                          {scan.coins_earned > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400">+{scan.coins_earned}</span>
                          ) : (
                            <span className="text-muted-foreground">--</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => { setShowScansDialog(false); setScansObject(null); }}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
