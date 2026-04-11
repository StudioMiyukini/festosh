import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Ticket,
  QrCode,
  BarChart3,
  Loader2,
  AlertCircle,
  X,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { useTenantStore } from '@/stores/tenant-store';
import { api } from '@/lib/api-client';
import { formatCurrency, formatTimestamp } from '@/lib/format-utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TicketType {
  id: string;
  edition_id: string;
  name: string;
  price_cents: number;
  total_quantity: number;
  sold_quantity: number;
  sale_start: number | null;
  sale_end: number | null;
  is_active: number;
  created_at: number;
}

interface TicketingStats {
  total_sold: number;
  total_revenue: number;
  scan_rate: number;
}

interface ScanResult {
  status: 'valid' | 'already_used' | 'invalid';
  message: string;
  ticket?: {
    holder_name?: string;
    type_name?: string;
  };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AdminTicketingPage() {
  const { activeEdition } = useTenantStore();

  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [stats, setStats] = useState<TicketingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // CRUD dialog
  const [showDialog, setShowDialog] = useState(false);
  const [editingType, setEditingType] = useState<TicketType | null>(null);
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formTotal, setFormTotal] = useState('');
  const [formSaleStart, setFormSaleStart] = useState('');
  const [formSaleEnd, setFormSaleEnd] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Scanner
  const [qrCode, setQrCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  /* ---- data fetching ---- */

  const fetchData = useCallback(async () => {
    if (!activeEdition) return;
    setLoading(true);
    setError(null);

    const [typesRes, statsRes] = await Promise.all([
      api.get<TicketType[]>(`/ticketing/edition/${activeEdition.id}/types`),
      api.get<TicketingStats>(`/ticketing/edition/${activeEdition.id}/stats`),
    ]);

    if (typesRes.success && typesRes.data) {
      setTicketTypes(typesRes.data);
    } else {
      setError(typesRes.error || 'Impossible de charger les types de billets.');
    }

    if (statsRes.success && statsRes.data) {
      setStats(statsRes.data);
    }

    setLoading(false);
  }, [activeEdition]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ---- form helpers ---- */

  const resetForm = () => {
    setFormName('');
    setFormPrice('');
    setFormTotal('');
    setFormSaleStart('');
    setFormSaleEnd('');
    setFormActive(true);
    setEditingType(null);
  };

  const tsToDateInput = (ts: number | null): string => {
    if (!ts) return '';
    return new Date(ts * 1000).toISOString().slice(0, 16);
  };

  const dateInputToTs = (val: string): number | null => {
    if (!val) return null;
    return Math.floor(new Date(val).getTime() / 1000);
  };

  const openCreateDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEditDialog = (t: TicketType) => {
    setEditingType(t);
    setFormName(t.name);
    setFormPrice(String(t.price_cents / 100));
    setFormTotal(String(t.total_quantity));
    setFormSaleStart(tsToDateInput(t.sale_start));
    setFormSaleEnd(tsToDateInput(t.sale_end));
    setFormActive(!!t.is_active);
    setShowDialog(true);
  };

  /* ---- CRUD handlers ---- */

  const handleSubmit = async () => {
    if (!activeEdition || !formName.trim() || !formPrice || !formTotal) return;
    setSubmitting(true);
    setMessage(null);

    const payload = {
      edition_id: activeEdition.id,
      name: formName.trim(),
      price_cents: Math.round(parseFloat(formPrice) * 100),
      total_quantity: Number(formTotal),
      sale_start: dateInputToTs(formSaleStart),
      sale_end: dateInputToTs(formSaleEnd),
      is_active: formActive ? 1 : 0,
    };

    if (editingType) {
      const res = await api.put<TicketType>(
        `/ticketing/edition/${activeEdition.id}/types/${editingType.id}`,
        payload,
      );
      if (res.success) {
        setShowDialog(false);
        resetForm();
        setMessage({ type: 'success', text: 'Type de billet mis a jour.' });
        fetchData();
      } else {
        setMessage({ type: 'error', text: res.error || 'Erreur lors de la mise a jour.' });
      }
    } else {
      const res = await api.post<TicketType>(
        `/ticketing/edition/${activeEdition.id}/types`,
        payload,
      );
      if (res.success) {
        setShowDialog(false);
        resetForm();
        setMessage({ type: 'success', text: 'Type de billet cree.' });
        fetchData();
      } else {
        setMessage({ type: 'error', text: res.error || 'Erreur lors de la creation.' });
      }
    }
    setSubmitting(false);
  };

  const handleDelete = async (t: TicketType) => {
    if (!activeEdition) return;
    if (!confirm(`Supprimer le type de billet "${t.name}" ?`)) return;
    setMessage(null);

    const res = await api.delete(`/ticketing/edition/${activeEdition.id}/types/${t.id}`);
    if (res.success) {
      setTicketTypes((prev) => prev.filter((x) => x.id !== t.id));
      setMessage({ type: 'success', text: 'Type de billet supprime.' });
      fetchData();
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la suppression.' });
    }
  };

  /* ---- scanner ---- */

  const handleScan = async () => {
    if (!qrCode.trim()) return;
    setScanning(true);
    setScanResult(null);

    const res = await api.post<ScanResult>('/ticketing/scan', { qr_code: qrCode.trim() });
    if (res.success && res.data) {
      setScanResult(res.data);
    } else {
      setScanResult({ status: 'invalid', message: res.error || 'Erreur lors du scan.' });
    }
    setScanning(false);
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Billetterie</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerez les types de billets, scannez les entrees et suivez les ventes.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateDialog}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nouveau type de billet
        </button>
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
      {/*  Section 1 — Statistiques                                     */}
      {/* ============================================================ */}
      {stats && (
        <div className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
            <BarChart3 className="h-5 w-5" />
            Statistiques
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-6">
              <p className="text-sm font-medium text-muted-foreground">Billets vendus</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{stats.total_sold}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <p className="text-sm font-medium text-muted-foreground">Revenus</p>
              <p className="mt-2 text-2xl font-bold text-green-600">
                {formatCurrency(stats.total_revenue)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <p className="text-sm font-medium text-muted-foreground">Taux de scan</p>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {Math.round(stats.scan_rate * 100)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  Section 2 — Types de billets                                 */}
      {/* ============================================================ */}
      <div className="mb-8">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
          <Ticket className="h-5 w-5" />
          Types de billets
        </h2>

        <div className="rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Nom
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Prix
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Vendus / Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Periode de vente
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Actif
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ticketTypes.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-foreground">
                      {t.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-foreground">
                      {formatCurrency(t.price_cents)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{t.sold_quantity}</span>
                      {' / '}
                      {t.total_quantity}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                      {t.sale_start || t.sale_end ? (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {t.sale_start ? formatTimestamp(t.sale_start) : '...'}
                          {' — '}
                          {t.sale_end ? formatTimestamp(t.sale_end) : '...'}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center">
                      {t.is_active ? (
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
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEditDialog(t)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                          title="Modifier"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(t)}
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

          {ticketTypes.length === 0 && (
            <div className="p-12 text-center">
              <Ticket className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Aucun type de billet. Creez-en un pour commencer la vente.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Section 3 — Scanner                                          */}
      {/* ============================================================ */}
      <div className="mb-8">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
          <QrCode className="h-5 w-5" />
          Scanner
        </h2>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Code QR du billet
              </label>
              <input
                type="text"
                value={qrCode}
                onChange={(e) => {
                  setQrCode(e.target.value);
                  setScanResult(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleScan();
                }}
                placeholder="Scannez ou saisissez le code QR..."
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <button
              type="button"
              onClick={handleScan}
              disabled={scanning || !qrCode.trim()}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {scanning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <QrCode className="h-4 w-4" />
              )}
              Scanner
            </button>
          </div>

          {/* Scan result */}
          {scanResult && (
            <div
              className={`mt-4 flex items-start gap-3 rounded-lg border px-4 py-3 ${
                scanResult.status === 'valid'
                  ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                  : scanResult.status === 'already_used'
                    ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20'
                    : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
              }`}
            >
              {scanResult.status === 'valid' && (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              )}
              {scanResult.status === 'already_used' && (
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600" />
              )}
              {scanResult.status === 'invalid' && (
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              )}
              <div>
                <p
                  className={`text-sm font-medium ${
                    scanResult.status === 'valid'
                      ? 'text-green-700 dark:text-green-400'
                      : scanResult.status === 'already_used'
                        ? 'text-yellow-700 dark:text-yellow-400'
                        : 'text-red-700 dark:text-red-400'
                  }`}
                >
                  {scanResult.status === 'valid' && 'Billet valide'}
                  {scanResult.status === 'already_used' && 'Billet deja utilise'}
                  {scanResult.status === 'invalid' && 'Billet invalide'}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">{scanResult.message}</p>
                {scanResult.ticket && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {scanResult.ticket.holder_name && (
                      <span className="mr-3">Titulaire : {scanResult.ticket.holder_name}</span>
                    )}
                    {scanResult.ticket.type_name && (
                      <span>Type : {scanResult.ticket.type_name}</span>
                    )}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Create / Edit Dialog                                         */}
      {/* ============================================================ */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {editingType ? 'Modifier le type de billet' : 'Nouveau type de billet'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowDialog(false);
                  resetForm();
                }}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Nom</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex : Pass journee, VIP..."
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Prix (EUR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Quantite totale
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formTotal}
                    onChange={(e) => setFormTotal(e.target.value)}
                    placeholder="100"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Debut des ventes
                  </label>
                  <input
                    type="datetime-local"
                    value={formSaleStart}
                    onChange={(e) => setFormSaleStart(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Fin des ventes
                  </label>
                  <input
                    type="datetime-local"
                    value={formSaleEnd}
                    onChange={(e) => setFormSaleEnd(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="rounded border-border"
                  />
                  Actif (visible a la vente)
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDialog(false);
                  resetForm();
                }}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !formName.trim() || !formPrice || !formTotal}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingType ? 'Enregistrer' : 'Creer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
