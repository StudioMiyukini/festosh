import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Package,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  X,
  Pencil,
  Trash2,
  Users,
  Euro,
} from 'lucide-react';
import { useTenantStore } from '@/stores/tenant-store';
import { api } from '@/lib/api-client';
import type { EquipmentItem, EquipmentAssignment, EquipmentOwner } from '@/types/equipment';

export function AdminEquipmentPage() {
  const { festival, activeEdition } = useTenantStore();

  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [assignments, setAssignments] = useState<EquipmentAssignment[]>([]);
  const [owners, setOwners] = useState<EquipmentOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Create / Edit dialog
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<EquipmentItem | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formUnit, setFormUnit] = useState('piece');
  const [formTotalQuantity, setFormTotalQuantity] = useState('1');
  const [formOwnerName, setFormOwnerName] = useState('');
  const [formValueEuros, setFormValueEuros] = useState('');
  const [formAcquisitionType, setFormAcquisitionType] = useState('owned');
  const [submitting, setSubmitting] = useState(false);

  // Owner management dialog
  const [showOwnerDialog, setShowOwnerDialog] = useState(false);
  const [ownerFormName, setOwnerFormName] = useState('');
  const [ownerFormContact, setOwnerFormContact] = useState('');
  const [ownerFormNotes, setOwnerFormNotes] = useState('');
  const [ownerSubmitting, setOwnerSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!festival) return;
    setLoading(true);
    setError(null);

    const editionId = activeEdition?.id;
    const [itemsRes, assignmentsRes, ownersRes] = await Promise.all([
      api.get<EquipmentItem[]>(`/equipment/festival/${festival.id}/items`),
      editionId
        ? api.get<EquipmentAssignment[]>(`/equipment/edition/${editionId}/assignments`)
        : Promise.resolve({ success: true, data: [] as EquipmentAssignment[] }),
      api.get<EquipmentOwner[]>(`/equipment/festival/${festival.id}/owners`),
    ]);

    if (itemsRes.success && itemsRes.data) {
      setItems(itemsRes.data);
    } else {
      setError(itemsRes.error || 'Impossible de charger le materiel.');
    }
    if (assignmentsRes.success && assignmentsRes.data) {
      setAssignments(assignmentsRes.data);
    }
    if (ownersRes.success && ownersRes.data) {
      setOwners(ownersRes.data);
    }
    setLoading(false);
  }, [festival, activeEdition]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getAssignedQuantity = (itemId: string) =>
    assignments
      .filter((a) => a.item_id === itemId)
      .reduce((sum, a) => sum + a.quantity, 0);

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormCategory('');
    setFormUnit('piece');
    setFormTotalQuantity('1');
    setFormOwnerName('');
    setFormValueEuros('');
    setFormAcquisitionType('owned');
    setEditingItem(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEditDialog = (item: EquipmentItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormDescription(item.description || '');
    setFormCategory(item.category || '');
    setFormUnit(item.unit);
    setFormTotalQuantity(String(item.total_quantity));
    setFormOwnerName(item.owner_name || '');
    setFormValueEuros(item.value_cents ? String(item.value_cents / 100) : '');
    setFormAcquisitionType(item.acquisition_type || 'owned');
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!festival || !formName.trim() || !formTotalQuantity) return;
    setSubmitting(true);
    setMessage(null);

    const payload = {
      name: formName.trim(),
      description: formDescription.trim() || null,
      category: formCategory.trim() || null,
      unit: formUnit,
      total_quantity: Number(formTotalQuantity),
      owner_name: formOwnerName.trim() || null,
      value_cents: formValueEuros ? Math.round(Number(formValueEuros) * 100) : 0,
      acquisition_type: formAcquisitionType,
    };

    if (editingItem) {
      const res = await api.put<EquipmentItem>(
        `/equipment/items/${editingItem.id}`,
        payload
      );
      if (res.success && res.data) {
        setItems((prev) => prev.map((i) => (i.id === editingItem.id ? res.data! : i)));
        setShowDialog(false);
        resetForm();
        setMessage({ type: 'success', text: 'Materiel mis a jour.' });
      } else {
        setMessage({ type: 'error', text: res.error || 'Erreur lors de la mise a jour.' });
      }
    } else {
      const res = await api.post<EquipmentItem>(`/equipment/festival/${festival.id}/items`, payload);
      if (res.success && res.data) {
        setItems((prev) => [...prev, res.data!]);
        setShowDialog(false);
        resetForm();
        setMessage({ type: 'success', text: 'Materiel ajoute.' });
      } else {
        setMessage({ type: 'error', text: res.error || 'Erreur lors de la creation.' });
      }
    }
    setSubmitting(false);
  };

  const handleDelete = async (item: EquipmentItem) => {
    if (!festival) return;
    if (!confirm(`Supprimer "${item.name}" de l'inventaire ?`)) return;
    setMessage(null);

    const res = await api.delete(`/equipment/items/${item.id}`);
    if (res.success) {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setMessage({ type: 'success', text: 'Materiel supprime.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la suppression.' });
    }
  };

  const getItemName = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    return item?.name || 'Inconnu';
  };

  const handleCreateOwner = async () => {
    if (!festival || !ownerFormName.trim()) return;
    setOwnerSubmitting(true);

    const res = await api.post<EquipmentOwner>(`/equipment/festival/${festival.id}/owners`, {
      name: ownerFormName.trim(),
      contact_info: ownerFormContact.trim() || null,
      notes: ownerFormNotes.trim() || null,
    });

    if (res.success && res.data) {
      setOwners((prev) => [...prev, res.data!]);
      setFormOwnerName(res.data.name);
      setOwnerFormName('');
      setOwnerFormContact('');
      setOwnerFormNotes('');
      setShowOwnerDialog(false);
      setMessage({ type: 'success', text: 'Proprietaire ajoute.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la creation du proprietaire.' });
    }
    setOwnerSubmitting(false);
  };

  const handleDeleteOwner = async (owner: EquipmentOwner) => {
    if (!confirm(`Supprimer le proprietaire "${owner.name}" ?`)) return;
    const res = await api.delete(`/equipment/owners/${owner.id}`);
    if (res.success) {
      setOwners((prev) => prev.filter((o) => o.id !== owner.id));
      setMessage({ type: 'success', text: 'Proprietaire supprime.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la suppression.' });
    }
  };

  const ACQUISITION_LABELS: Record<string, string> = {
    owned: 'Achat',
    loaned: 'Pret',
    rented: 'Location',
  };

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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Materiel</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerez l&apos;inventaire et les affectations de materiel.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowOwnerDialog(true)}
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Users className="h-4 w-4" />
            Proprietaires
          </button>
          <button
            type="button"
            onClick={openCreateDialog}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Ajouter du materiel
          </button>
        </div>
      </div>

      {/* Feedback message */}
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

      {/* Create / Edit Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {editingItem ? 'Modifier le materiel' : 'Nouveau materiel'}
              </h2>
              <button
                type="button"
                onClick={() => { setShowDialog(false); resetForm(); }}
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
                  placeholder="Ex : Tables pliantes"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  placeholder="Description optionnelle"
                  className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Categorie</label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="Ex : Mobilier"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Unite</label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="piece">Piece</option>
                    <option value="metre">Metre</option>
                    <option value="box">Carton</option>
                    <option value="lot">Lot</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Quantite totale</label>
                <input
                  type="number"
                  min="0"
                  value={formTotalQuantity}
                  onChange={(e) => setFormTotalQuantity(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Separator */}
              <div className="border-t border-border pt-2">
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Propriete & valeur</p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Proprietaire</label>
                <select
                  value={formOwnerName}
                  onChange={(e) => setFormOwnerName(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">— Festival (par defaut)</option>
                  {owners.map((o) => (
                    <option key={o.id} value={o.name}>{o.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Valeur (€)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formValueEuros}
                      onChange={(e) => setFormValueEuros(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-md border border-border bg-background px-3 py-2 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <Euro className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Acquisition</label>
                  <select
                    value={formAcquisitionType}
                    onChange={(e) => setFormAcquisitionType(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="owned">Achat</option>
                    <option value="loaned">Pret</option>
                    <option value="rented">Location</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowDialog(false); resetForm(); }}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !formName.trim() || !formTotalQuantity}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingItem ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Owner Management Dialog */}
      {showOwnerDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                <Users className="mr-2 inline h-5 w-5" />
                Proprietaires de materiel
              </h2>
              <button
                type="button"
                onClick={() => setShowOwnerDialog(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Existing owners list */}
            {owners.length > 0 && (
              <div className="mb-4 max-h-48 space-y-2 overflow-y-auto">
                {owners.map((owner) => (
                  <div key={owner.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <div>
                      <span className="text-sm font-medium text-foreground">{owner.name}</span>
                      {owner.contact_info && (
                        <span className="ml-2 text-xs text-muted-foreground">{owner.contact_info}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteOwner(owner)}
                      className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {owners.length === 0 && (
              <p className="mb-4 text-sm text-muted-foreground">Aucun proprietaire enregistre.</p>
            )}

            {/* Add new owner form */}
            <div className="border-t border-border pt-4">
              <p className="mb-3 text-sm font-medium text-foreground">Nouveau proprietaire</p>
              <div className="space-y-3">
                <input
                  type="text"
                  value={ownerFormName}
                  onChange={(e) => setOwnerFormName(e.target.value)}
                  placeholder="Nom du proprietaire"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <input
                  type="text"
                  value={ownerFormContact}
                  onChange={(e) => setOwnerFormContact(e.target.value)}
                  placeholder="Contact (email, tel...)"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <textarea
                  value={ownerFormNotes}
                  onChange={(e) => setOwnerFormNotes(e.target.value)}
                  rows={2}
                  placeholder="Notes (optionnel)"
                  className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  type="button"
                  onClick={handleCreateOwner}
                  disabled={ownerSubmitting || !ownerFormName.trim()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {ownerSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Plus className="h-4 w-4" />
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-8 xl:grid-cols-[1fr_380px]">
        {/* Equipment Inventory */}
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
            <Package className="h-5 w-5" />
            Inventaire ({items.length})
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
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Proprietaire
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Valeur
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Type
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Qte
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item) => {
                    const assigned = getAssignedQuantity(item.id);
                    const available = item.total_quantity - assigned;
                    const isLow = available > 0 && available <= item.total_quantity * 0.2;
                    return (
                      <tr key={item.id} className="hover:bg-muted/50">
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <span className="text-sm font-medium text-foreground">
                                {item.name}
                              </span>
                              <span className="ml-1 text-xs text-muted-foreground">
                                ({item.unit})
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                          {item.category || '—'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                          {item.owner_name || '—'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center text-sm text-muted-foreground">
                          {item.value_cents ? `${(item.value_cents / 100).toFixed(2)} €` : '—'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            item.acquisition_type === 'loaned' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                            item.acquisition_type === 'rented' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                            'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                          }`}>
                            {ACQUISITION_LABELS[item.acquisition_type] || item.acquisition_type}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center text-sm text-foreground">
                          {available}/{item.total_quantity}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center">
                          {available === 0 ? (
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
                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEditDialog(item)}
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                              title="Modifier"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item)}
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {items.length === 0 && (
              <div className="p-12 text-center">
                <Package className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Aucun materiel dans l&apos;inventaire.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Assignments */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Affectations ({assignments.length})
          </h2>
          {assignments.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">Aucune affectation.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-foreground">
                      {getItemName(assignment.item_id)}
                    </span>
                    <span className="text-muted-foreground">x{assignment.quantity}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="capitalize">{assignment.assigned_to_type}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span className="font-medium">{assignment.assigned_to_id}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="capitalize">{assignment.status}</span>
                    {assignment.notes && (
                      <span className="truncate max-w-[150px]" title={assignment.notes}>
                        {assignment.notes}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
