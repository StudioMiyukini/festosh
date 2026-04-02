import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Calendar,
  Clock,
  MapPin,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react';
import { useTenantStore } from '@/stores/tenant-store';
import { api } from '@/lib/api-client';
import type { Event } from '@/types/programming';
import type { Venue } from '@/types/programming';

export function AdminProgrammingPage() {
  const { festival, activeEdition } = useTenantStore();

  const [events, setEvents] = useState<Event[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Create / edit dialog state
  const [showDialog, setShowDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStartTime, setFormStartTime] = useState('');
  const [formEndTime, setFormEndTime] = useState('');
  const [formVenueId, setFormVenueId] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formIsPublic, setFormIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Venue create dialog
  const [showVenueDialog, setShowVenueDialog] = useState(false);
  const [venueFormName, setVenueFormName] = useState('');
  const [venueFormType, setVenueFormType] = useState('stage');
  const [venueFormCapacity, setVenueFormCapacity] = useState('');
  const [creatingVenue, setCreatingVenue] = useState(false);

  const fetchData = useCallback(async () => {
    if (!festival) return;
    setLoading(true);
    setError(null);

    const editionId = activeEdition?.id;
    const [eventsRes, venuesRes] = await Promise.all([
      editionId
        ? api.get<Event[]>(`/events/edition/${editionId}`)
        : Promise.resolve({ success: true, data: [] as Event[], error: undefined }),
      api.get<Venue[]>(`/venues/festival/${festival.id}`),
    ]);

    if (eventsRes.success && eventsRes.data) {
      setEvents(eventsRes.data);
    } else {
      setError(eventsRes.error || 'Impossible de charger les evenements.');
    }
    if (venuesRes.success && venuesRes.data) {
      setVenues(venuesRes.data);
    }
    setLoading(false);
  }, [festival, activeEdition]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormStartTime('');
    setFormEndTime('');
    setFormVenueId('');
    setFormCategory('');
    setFormIsPublic(true);
    setEditingEvent(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEditDialog = (event: Event) => {
    setEditingEvent(event);
    setFormTitle(event.title);
    setFormDescription(event.description || '');
    // Convert Unix timestamp to datetime-local format
    const toLocalDatetime = (ts: number | string) => {
      const d = new Date(Number(ts) * 1000);
      return d.toISOString().slice(0, 16);
    };
    setFormStartTime(toLocalDatetime(event.start_time));
    setFormEndTime(toLocalDatetime(event.end_time));
    setFormVenueId(event.venue_id || '');
    setFormCategory(event.category || '');
    setFormIsPublic(event.is_public);
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!festival || !activeEdition || !formTitle.trim() || !formStartTime || !formEndTime) return;
    setSubmitting(true);
    setMessage(null);

    const payload = {
      title: formTitle.trim(),
      description: formDescription.trim() || null,
      start_time: Math.floor(new Date(formStartTime).getTime() / 1000),
      end_time: Math.floor(new Date(formEndTime).getTime() / 1000),
      venue_id: formVenueId || null,
      category: formCategory.trim() || null,
      is_public: formIsPublic,
    };

    if (editingEvent) {
      const res = await api.put<Event>(`/events/${editingEvent.id}`, payload);
      if (res.success && res.data) {
        setEvents((prev) => prev.map((e) => (e.id === editingEvent.id ? res.data! : e)));
        setShowDialog(false);
        resetForm();
        setMessage({ type: 'success', text: 'Evenement mis a jour.' });
      } else {
        setMessage({ type: 'error', text: res.error || 'Erreur lors de la mise a jour.' });
      }
    } else {
      const res = await api.post<Event>(`/events/edition/${activeEdition.id}`, payload);
      if (res.success && res.data) {
        setEvents((prev) => [...prev, res.data!]);
        setShowDialog(false);
        resetForm();
        setMessage({ type: 'success', text: 'Evenement cree avec succes.' });
      } else {
        setMessage({ type: 'error', text: res.error || 'Erreur lors de la creation.' });
      }
    }
    setSubmitting(false);
  };

  const handleDelete = async (event: Event) => {
    if (!festival) return;
    if (!confirm(`Supprimer l'evenement "${event.title}" ?`)) return;
    setMessage(null);

    const res = await api.delete(`/events/${event.id}`);
    if (res.success) {
      setEvents((prev) => prev.filter((e) => e.id !== event.id));
      setMessage({ type: 'success', text: 'Evenement supprime.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la suppression.' });
    }
  };

  const handleCreateVenue = async () => {
    if (!festival || !venueFormName.trim()) return;
    setCreatingVenue(true);
    setMessage(null);

    const res = await api.post<Venue>(`/venues/festival/${festival.id}`, {
      name: venueFormName.trim(),
      venue_type: venueFormType,
      capacity: venueFormCapacity ? Number(venueFormCapacity) : null,
    });

    if (res.success && res.data) {
      setVenues((prev) => [...prev, res.data!]);
      setShowVenueDialog(false);
      setVenueFormName('');
      setVenueFormType('stage');
      setVenueFormCapacity('');
      setMessage({ type: 'success', text: 'Lieu cree avec succes.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la creation du lieu.' });
    }
    setCreatingVenue(false);
  };

  const handleDeleteVenue = async (venue: Venue) => {
    if (!confirm(`Supprimer le lieu "${venue.name}" ?`)) return;
    setMessage(null);
    const res = await api.delete(`/venues/${venue.id}`);
    if (res.success) {
      setVenues((prev) => prev.filter((v) => v.id !== venue.id));
      setMessage({ type: 'success', text: 'Lieu supprime.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la suppression du lieu.' });
    }
  };

  const getVenueName = (venueId: string | null) => {
    if (!venueId) return '—';
    const venue = venues.find((v) => v.id === venueId);
    return venue?.name || '—';
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Programmation</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerez les evenements et le programme de votre festival.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowVenueDialog(true)}
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <MapPin className="h-4 w-4" />
            Ajouter un lieu
          </button>
          <button
            type="button"
            onClick={openCreateDialog}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Ajouter un evenement
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

      {/* Venue Create Dialog */}
      {showVenueDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Nouveau lieu</h2>
              <button
                type="button"
                onClick={() => setShowVenueDialog(false)}
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
                  value={venueFormName}
                  onChange={(e) => setVenueFormName(e.target.value)}
                  placeholder="Ex : Scene principale"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Type</label>
                <select
                  value={venueFormType}
                  onChange={(e) => setVenueFormType(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="stage">Scene</option>
                  <option value="hall">Salle</option>
                  <option value="room">Piece</option>
                  <option value="outdoor">Exterieur</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Capacite</label>
                <input
                  type="number"
                  value={venueFormCapacity}
                  onChange={(e) => setVenueFormCapacity(e.target.value)}
                  placeholder="Optionnel"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowVenueDialog(false)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleCreateVenue}
                disabled={creatingVenue || !venueFormName.trim()}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {creatingVenue && <Loader2 className="h-4 w-4 animate-spin" />}
                Creer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Create/Edit Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {editingEvent ? 'Modifier l\'evenement' : 'Nouvel evenement'}
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
                <label className="mb-1.5 block text-sm font-medium text-foreground">Titre</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Titre de l'evenement"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  placeholder="Description optionnelle"
                  className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Debut</label>
                  <input
                    type="datetime-local"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Fin</label>
                  <input
                    type="datetime-local"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Lieu</label>
                  <select
                    value={formVenueId}
                    onChange={(e) => setFormVenueId(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Aucun lieu</option>
                    {venues.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Categorie</label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="Ex : Concert, Atelier..."
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={formIsPublic}
                  onChange={(e) => setFormIsPublic(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/50"
                />
                <label htmlFor="is_public" className="text-sm text-foreground">
                  Visible publiquement
                </label>
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
                disabled={submitting || !formTitle.trim() || !formStartTime || !formEndTime}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingEvent ? 'Enregistrer' : 'Creer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-8 xl:grid-cols-[1fr_280px]">
        {/* Events Table */}
        <div className="rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Evenement
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Horaire
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Lieu
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Categorie
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-muted/50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">{event.title}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                      {new Date(Number(event.start_time) * 1000).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(Number(event.start_time) * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        {' - '}
                        {new Date(Number(event.end_time) * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {getVenueName(event.venue_id)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {event.category ? (
                        <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {event.category}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEditDialog(event)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                          title="Modifier"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(event)}
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
          {events.length === 0 && (
            <div className="p-12 text-center">
              <Calendar className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Aucun evenement. Ajoutez le premier evenement de votre festival.
              </p>
            </div>
          )}
        </div>

        {/* Venues Sidebar */}
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
            <MapPin className="h-5 w-5" />
            Lieux ({venues.length})
          </h2>
          <div className="space-y-2">
            {venues.map((venue) => (
              <div
                key={venue.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{venue.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {venue.venue_type}
                    {venue.capacity ? ` — ${venue.capacity} places` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteVenue(venue)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title="Supprimer le lieu"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {venues.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun lieu defini.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
