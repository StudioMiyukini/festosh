import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  CalendarClock,
  Loader2,
  AlertCircle,
  X,
  MapPin,
  Users,
} from 'lucide-react';
import { useTenantStore } from '@/stores/tenant-store';
import { api } from '@/lib/api-client';
import { formatCurrency, formatTimestamp } from '@/lib/format-utils';

interface ReservationSlot {
  id: string;
  edition_id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  capacity: number;
  price: number;
  booked: number;
  created_at: number;
}

type SlotForm = {
  title: string;
  description: string;
  location: string;
  start_time: string;
  end_time: string;
  capacity: string;
  price: string;
};

const emptyForm: SlotForm = {
  title: '',
  description: '',
  location: '',
  start_time: '',
  end_time: '',
  capacity: '1',
  price: '0',
};

export function AdminReservationsPage() {
  const { activeEdition } = useTenantStore();

  const [slots, setSlots] = useState<ReservationSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showDialog, setShowDialog] = useState(false);
  const [editingSlot, setEditingSlot] = useState<ReservationSlot | null>(null);
  const [form, setForm] = useState<SlotForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchSlots = useCallback(async () => {
    if (!activeEdition) return;
    setLoading(true);
    setError(null);
    const res = await api.get<ReservationSlot[]>(
      `/reservations/edition/${activeEdition.id}/slots`
    );
    if (res.success && res.data) {
      setSlots(res.data);
    } else {
      setError(res.error || 'Impossible de charger les creneaux.');
    }
    setLoading(false);
  }, [activeEdition]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const openCreate = () => {
    setEditingSlot(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const openEdit = (slot: ReservationSlot) => {
    setEditingSlot(slot);
    setForm({
      title: slot.title,
      description: slot.description || '',
      location: slot.location || '',
      start_time: slot.start_time,
      end_time: slot.end_time,
      capacity: String(slot.capacity),
      price: String(slot.price / 100),
    });
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingSlot(null);
    setForm(emptyForm);
  };

  const handleSubmit = async () => {
    if (!activeEdition || !form.title.trim()) return;
    setSubmitting(true);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      location: form.location.trim() || null,
      start_time: form.start_time,
      end_time: form.end_time,
      capacity: Number(form.capacity),
      price: Math.round(Number(form.price) * 100),
    };

    if (editingSlot) {
      const res = await api.put(`/reservations/edition/${activeEdition.id}/slots/${editingSlot.id}`, payload);
      if (res.success) {
        closeDialog();
        await fetchSlots();
      }
    } else {
      const res = await api.post(`/reservations/edition/${activeEdition.id}/slots`, payload);
      if (res.success) {
        closeDialog();
        await fetchSlots();
      }
    }
    setSubmitting(false);
  };

  const handleDelete = async (slot: ReservationSlot) => {
    if (!activeEdition) return;
    if (!confirm(`Supprimer le creneau "${slot.title}" ?`)) return;
    const res = await api.delete(`/reservations/edition/${activeEdition.id}/slots/${slot.id}`);
    if (res.success) {
      setSlots((prev) => prev.filter((s) => s.id !== slot.id));
    }
  };

  const formatDatetime = (dt: string) => {
    if (!dt) return '';
    try {
      return new Date(dt).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dt;
    }
  };

  if (!activeEdition) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Aucune edition active selectionnee.</p>
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
          onClick={fetchSlots}
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Reservations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerez les creneaux reservables pour cette edition.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nouveau creneau
        </button>
      </div>

      {/* Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {editingSlot ? 'Modifier le creneau' : 'Nouveau creneau'}
              </h2>
              <button type="button" onClick={closeDialog} className="rounded-md p-1 text-muted-foreground hover:bg-accent">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Titre</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex : Atelier origami"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  placeholder="Description optionnelle"
                  className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Lieu</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Ex : Salle A"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Debut</label>
                  <input
                    type="datetime-local"
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Fin</label>
                  <input
                    type="datetime-local"
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Capacite</label>
                  <input
                    type="number"
                    min="1"
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Prix (EUR)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDialog}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !form.title.trim()}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingSlot ? 'Enregistrer' : 'Creer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {slots.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-12 text-center">
          <CalendarClock className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Aucun creneau de reservation.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Creez un creneau pour permettre aux visiteurs de reserver.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Creneau
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Lieu
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Horaires
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Reservations
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Prix
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {slots.map((slot) => {
                  const pct = slot.capacity > 0 ? Math.round((slot.booked / slot.capacity) * 100) : 0;
                  const isFull = slot.booked >= slot.capacity;
                  return (
                    <tr key={slot.id} className="hover:bg-muted/50">
                      <td className="px-6 py-4">
                        <div>
                          <span className="text-sm font-medium text-foreground">{slot.title}</span>
                          {slot.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{slot.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                        {slot.location ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {slot.location}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                        <div>{formatDatetime(slot.start_time)}</div>
                        <div>{formatDatetime(slot.end_time)}</div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className={`text-sm font-medium ${isFull ? 'text-red-600' : 'text-foreground'}`}>
                            {slot.booked}/{slot.capacity}
                          </span>
                        </div>
                        <div className="mx-auto mt-1 h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${isFull ? 'bg-red-500' : pct > 75 ? 'bg-yellow-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-center text-sm text-foreground">
                        {slot.price > 0 ? formatCurrency(slot.price) : 'Gratuit'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(slot)}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                            title="Modifier"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(slot)}
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
        </div>
      )}
    </div>
  );
}
