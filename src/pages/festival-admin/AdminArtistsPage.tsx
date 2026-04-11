import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Loader2,
  AlertCircle,
  X,
  Pencil,
  Trash2,
  Users,
  Euro,
  CheckCircle2,
  Eye,
  EyeOff,
  Music,
} from 'lucide-react';
import { useTenantStore } from '@/stores/tenant-store';
import { api } from '@/lib/api-client';
import { formatCurrency } from '@/lib/format-utils';

interface Artist {
  id: string;
  edition_id: string;
  name: string;
  bio: string | null;
  photo_url: string | null;
  website: string | null;
  category: string | null;
  role: string | null;
  fee_cents: number;
  is_paid: boolean;
  travel_info: string | null;
  accommodation: string | null;
  technical_rider: string | null;
  dietary_requirements: string | null;
  arrival_date: string | null;
  departure_date: string | null;
  is_public: boolean;
  created_at: string;
}

export function AdminArtistsPage() {
  const { activeEdition } = useTenantStore();

  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Dialog state
  const [showDialog, setShowDialog] = useState(false);
  const [editingArtist, setEditingArtist] = useState<Artist | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formBio, setFormBio] = useState('');
  const [formPhotoUrl, setFormPhotoUrl] = useState('');
  const [formWebsite, setFormWebsite] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formFeeEuros, setFormFeeEuros] = useState('');
  const [formTravelInfo, setFormTravelInfo] = useState('');
  const [formAccommodation, setFormAccommodation] = useState('');
  const [formTechnicalRider, setFormTechnicalRider] = useState('');
  const [formDietaryRequirements, setFormDietaryRequirements] = useState('');
  const [formArrivalDate, setFormArrivalDate] = useState('');
  const [formDepartureDate, setFormDepartureDate] = useState('');
  const [formIsPublic, setFormIsPublic] = useState(true);

  const fetchData = useCallback(async () => {
    if (!activeEdition) return;
    setLoading(true);
    setError(null);

    const res = await api.get<Artist[]>(`/artists/edition/${activeEdition.id}/all`);
    if (res.success && res.data) {
      setArtists(res.data);
    } else {
      setError(res.error || 'Impossible de charger les artistes.');
    }
    setLoading(false);
  }, [activeEdition]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setFormName('');
    setFormBio('');
    setFormPhotoUrl('');
    setFormWebsite('');
    setFormCategory('');
    setFormRole('');
    setFormFeeEuros('');
    setFormTravelInfo('');
    setFormAccommodation('');
    setFormTechnicalRider('');
    setFormDietaryRequirements('');
    setFormArrivalDate('');
    setFormDepartureDate('');
    setFormIsPublic(true);
    setEditingArtist(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEditDialog = (artist: Artist) => {
    setEditingArtist(artist);
    setFormName(artist.name);
    setFormBio(artist.bio || '');
    setFormPhotoUrl(artist.photo_url || '');
    setFormWebsite(artist.website || '');
    setFormCategory(artist.category || '');
    setFormRole(artist.role || '');
    setFormFeeEuros(artist.fee_cents ? String(artist.fee_cents / 100) : '');
    setFormTravelInfo(artist.travel_info || '');
    setFormAccommodation(artist.accommodation || '');
    setFormTechnicalRider(artist.technical_rider || '');
    setFormDietaryRequirements(artist.dietary_requirements || '');
    setFormArrivalDate(artist.arrival_date || '');
    setFormDepartureDate(artist.departure_date || '');
    setFormIsPublic(artist.is_public);
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!activeEdition || !formName.trim()) return;
    setSubmitting(true);
    setMessage(null);

    const payload = {
      edition_id: activeEdition.id,
      name: formName.trim(),
      bio: formBio.trim() || null,
      photo_url: formPhotoUrl.trim() || null,
      website: formWebsite.trim() || null,
      category: formCategory.trim() || null,
      role: formRole.trim() || null,
      fee_cents: formFeeEuros ? Math.round(Number(formFeeEuros) * 100) : 0,
      travel_info: formTravelInfo.trim() || null,
      accommodation: formAccommodation.trim() || null,
      technical_rider: formTechnicalRider.trim() || null,
      dietary_requirements: formDietaryRequirements.trim() || null,
      arrival_date: formArrivalDate || null,
      departure_date: formDepartureDate || null,
      is_public: formIsPublic,
    };

    if (editingArtist) {
      const res = await api.put<Artist>(`/artists/${editingArtist.id}`, payload);
      if (res.success && res.data) {
        setArtists((prev) => prev.map((a) => (a.id === editingArtist.id ? res.data! : a)));
        setShowDialog(false);
        resetForm();
        setMessage({ type: 'success', text: 'Artiste mis a jour.' });
      } else {
        setMessage({ type: 'error', text: res.error || 'Erreur lors de la mise a jour.' });
      }
    } else {
      const res = await api.post<Artist>(`/artists`, payload);
      if (res.success && res.data) {
        setArtists((prev) => [...prev, res.data!]);
        setShowDialog(false);
        resetForm();
        setMessage({ type: 'success', text: 'Artiste ajoute.' });
      } else {
        setMessage({ type: 'error', text: res.error || 'Erreur lors de la creation.' });
      }
    }
    setSubmitting(false);
  };

  const handleDelete = async (artist: Artist) => {
    if (!confirm(`Supprimer "${artist.name}" ?`)) return;
    setMessage(null);

    const res = await api.delete(`/artists/${artist.id}`);
    if (res.success) {
      setArtists((prev) => prev.filter((a) => a.id !== artist.id));
      setMessage({ type: 'success', text: 'Artiste supprime.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la suppression.' });
    }
  };

  const handleTogglePayment = async (artist: Artist) => {
    setMessage(null);
    const res = await api.put<Artist>(`/artists/${artist.id}`, {
      is_paid: !artist.is_paid,
    });
    if (res.success && res.data) {
      setArtists((prev) => prev.map((a) => (a.id === artist.id ? res.data! : a)));
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la mise a jour du paiement.' });
    }
  };

  // Stats
  const totalArtists = artists.length;
  const totalFeeCents = artists.reduce((sum, a) => sum + a.fee_cents, 0);
  const paidCount = artists.filter((a) => a.is_paid).length;

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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Artistes &amp; Invites</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerez les artistes, invites et leurs cachets.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateDialog}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Ajouter un artiste
        </button>
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

      {/* Stats Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Total artistes</p>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{totalArtists}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Total cachets</p>
            <Euro className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{formatCurrency(totalFeeCents)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Payes</p>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {paidCount}/{totalArtists}
          </p>
        </div>
      </div>

      {/* Create / Edit Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {editingArtist ? 'Modifier l\'artiste' : 'Nouvel artiste'}
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
                <label className="mb-1.5 block text-sm font-medium text-foreground">Nom *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Nom de l'artiste"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Bio</label>
                <textarea
                  value={formBio}
                  onChange={(e) => setFormBio(e.target.value)}
                  rows={3}
                  placeholder="Biographie de l'artiste"
                  className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Photo URL</label>
                  <input
                    type="url"
                    value={formPhotoUrl}
                    onChange={(e) => setFormPhotoUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Site web</label>
                  <input
                    type="url"
                    value={formWebsite}
                    onChange={(e) => setFormWebsite(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Categorie</label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="Ex : Musique, Cosplay..."
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Role</label>
                  <input
                    type="text"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    placeholder="Ex : Tete d'affiche, Invite..."
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Cachet (EUR)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formFeeEuros}
                    onChange={(e) => setFormFeeEuros(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <Euro className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Transport</label>
                <input
                  type="text"
                  value={formTravelInfo}
                  onChange={(e) => setFormTravelInfo(e.target.value)}
                  placeholder="Infos de transport"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Hebergement</label>
                <input
                  type="text"
                  value={formAccommodation}
                  onChange={(e) => setFormAccommodation(e.target.value)}
                  placeholder="Infos d'hebergement"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Fiche technique</label>
                <textarea
                  value={formTechnicalRider}
                  onChange={(e) => setFormTechnicalRider(e.target.value)}
                  rows={3}
                  placeholder="Besoins techniques de l'artiste"
                  className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Regime alimentaire</label>
                <input
                  type="text"
                  value={formDietaryRequirements}
                  onChange={(e) => setFormDietaryRequirements(e.target.value)}
                  placeholder="Ex : Vegetarien, sans gluten..."
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Date d&apos;arrivee</label>
                  <input
                    type="date"
                    value={formArrivalDate}
                    onChange={(e) => setFormArrivalDate(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Date de depart</label>
                  <input
                    type="date"
                    value={formDepartureDate}
                    onChange={(e) => setFormDepartureDate(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFormIsPublic(!formIsPublic)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formIsPublic ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formIsPublic ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <label className="text-sm font-medium text-foreground">
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
                disabled={submitting || !formName.trim()}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingArtist ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Artists Table */}
      <div className="rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Photo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Nom
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Categorie
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Role
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Cachet
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Paye
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Public
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {artists.map((artist) => (
                <tr key={artist.id} className="hover:bg-muted/50">
                  <td className="whitespace-nowrap px-6 py-4">
                    {artist.photo_url ? (
                      <img
                        src={artist.photo_url}
                        alt={artist.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <Music className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-foreground">
                    {artist.name}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                    {artist.category || '\u2014'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                    {artist.role || '\u2014'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-foreground">
                    {artist.fee_cents > 0 ? formatCurrency(artist.fee_cents) : '\u2014'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-center">
                    <button
                      type="button"
                      onClick={() => handleTogglePayment(artist)}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                        artist.is_paid
                          ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                      }`}
                      title={artist.is_paid ? 'Marquer comme non paye' : 'Marquer comme paye'}
                    >
                      {artist.is_paid ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" />
                          Paye
                        </>
                      ) : (
                        'Non paye'
                      )}
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-center">
                    {artist.is_public ? (
                      <Eye className="mx-auto h-4 w-4 text-green-600" />
                    ) : (
                      <EyeOff className="mx-auto h-4 w-4 text-muted-foreground" />
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEditDialog(artist)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(artist)}
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
        {artists.length === 0 && (
          <div className="p-12 text-center">
            <Music className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Aucun artiste ou invite. Ajoutez votre premier artiste.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
