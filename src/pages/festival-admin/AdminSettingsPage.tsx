import { useState, useEffect, useCallback } from 'react';
import {
  Save,
  Loader2,
  Globe,
  Palette,
  Type,
  Link as LinkIcon,
  AlertTriangle,
  AlertCircle,
  Users,
  Trash2,
  Shield,
} from 'lucide-react';
import { useTenantStore } from '@/stores/tenant-store';
import { api } from '@/lib/api-client';
import type { FestivalMember } from '@/types/festival';
import type { FestivalStatus } from '@/types/enums';

export function AdminSettingsPage() {
  const { festival, setFestival } = useTenantStore();

  // General info
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [status, setStatus] = useState<FestivalStatus>('draft');

  // Theme colors
  const [primaryColor, setPrimaryColor] = useState('#6366f1');
  const [secondaryColor, setSecondaryColor] = useState('#8b5cf6');
  const [accentColor, setAccentColor] = useState('#f59e0b');

  // Social links
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [twitter, setTwitter] = useState('');
  const [discord, setDiscord] = useState('');

  // Members
  const [members, setMembers] = useState<FestivalMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Initialize form from festival data
  useEffect(() => {
    if (!festival) return;
    setName(festival.name);
    setSlug(festival.slug);
    setDescription(festival.description || '');
    setLocationName(festival.location_name || '');
    setLocationAddress(festival.location_address || '');
    setStatus(festival.status);
    setPrimaryColor(festival.theme_colors?.primary || '#6366f1');
    setSecondaryColor(festival.theme_colors?.secondary || '#8b5cf6');
    setAccentColor(festival.theme_colors?.accent || '#f59e0b');
    setWebsite(festival.social_links?.website || '');
    setInstagram(festival.social_links?.instagram || '');
    setFacebook(festival.social_links?.facebook || '');
    setTwitter(festival.social_links?.twitter || '');
    setDiscord(festival.social_links?.discord || '');
  }, [festival]);

  const fetchMembers = useCallback(async () => {
    if (!festival) return;
    setLoadingMembers(true);

    const res = await api.get<FestivalMember[]>(`/festivals/${festival.id}/members`);
    if (res.success && res.data) {
      setMembers(res.data);
    }
    setLoadingMembers(false);
  }, [festival]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!festival) return;
    setIsSaving(true);
    setMessage(null);

    const res = await api.put(`/festivals/${festival.id}`, {
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim() || null,
      location_name: locationName.trim() || null,
      location_address: locationAddress.trim() || null,
      status,
      theme_colors: {
        primary: primaryColor,
        secondary: secondaryColor,
        accent: accentColor,
        background: festival.theme_colors?.background || '#ffffff',
        text: festival.theme_colors?.text || '#000000',
      },
      social_links: {
        website: website.trim() || undefined,
        instagram: instagram.trim() || undefined,
        facebook: facebook.trim() || undefined,
        twitter: twitter.trim() || undefined,
        discord: discord.trim() || undefined,
      },
    });

    if (res.success) {
      setMessage({ type: 'success', text: 'Parametres enregistres avec succes.' });
      // Update tenant store with new festival data if returned
      if (res.data && typeof res.data === 'object') {
        setFestival(res.data as typeof festival);
      }
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la sauvegarde.' });
    }
    setIsSaving(false);
  };

  const handleDeleteFestival = async () => {
    if (!festival) return;
    const confirmation = prompt(
      `Pour confirmer la suppression, tapez le nom du festival : "${festival.name}"`
    );
    if (confirmation !== festival.name) {
      setMessage({ type: 'error', text: 'Le nom ne correspond pas. Suppression annulee.' });
      return;
    }
    setIsDeleting(true);
    setMessage(null);

    const res = await api.delete(`/festivals/${festival.id}`);
    if (res.success) {
      setMessage({ type: 'success', text: 'Festival supprime. Vous allez etre redirige.' });
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la suppression.' });
    }
    setIsDeleting(false);
  };

  const handleArchive = async () => {
    if (!festival) return;
    if (!confirm('Archiver le festival ? Il ne sera plus visible publiquement.')) return;
    setMessage(null);

    const res = await api.put(`/festivals/${festival.id}`, { status: 'archived' });
    if (res.success) {
      setStatus('archived');
      setMessage({ type: 'success', text: 'Festival archive.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de l\'archivage.' });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!festival) return;
    if (!confirm('Retirer ce membre de l\'equipe ?')) return;
    setMessage(null);

    const res = await api.delete(`/festivals/${festival.id}/members/${memberId}`);
    if (res.success) {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      setMessage({ type: 'success', text: 'Membre retire.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la suppression du membre.' });
    }
  };

  if (!festival) {
    return (
      <div className="flex items-center justify-center py-20">
        <AlertCircle className="mr-2 h-5 w-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Aucun festival selectionne.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Parametres</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configurez les informations et l&apos;apparence de votre festival.
        </p>
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

      <form onSubmit={handleSave} className="space-y-8">
        {/* General Settings */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
            <Type className="h-5 w-5" />
            Informations generales
          </h2>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-foreground">
                  Nom du festival
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label htmlFor="slug" className="mb-1.5 block text-sm font-medium text-foreground">
                  Slug (URL)
                </label>
                <div className="flex items-center">
                  <span className="rounded-l-md border border-r-0 border-border bg-muted px-3 py-2.5 text-sm text-muted-foreground">
                    festosh.app/f/
                  </span>
                  <input
                    id="slug"
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full rounded-r-md border border-border bg-background py-2.5 px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            </div>
            <div>
              <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-foreground">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="location" className="mb-1.5 block text-sm font-medium text-foreground">
                  Lieu / Ville
                </label>
                <input
                  id="location"
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="Ex: Paris"
                  className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label htmlFor="address" className="mb-1.5 block text-sm font-medium text-foreground">
                  Adresse
                </label>
                <input
                  id="address"
                  type="text"
                  value={locationAddress}
                  onChange={(e) => setLocationAddress(e.target.value)}
                  placeholder="Adresse complete"
                  className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="contact_email" className="mb-1.5 block text-sm font-medium text-foreground">
                  Email de contact
                </label>
                <input
                  id="contact_email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="contact@festival.com"
                  className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label htmlFor="status" className="mb-1.5 block text-sm font-medium text-foreground">
                  Statut du festival
                </label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as FestivalStatus)}
                  className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="draft">Brouillon</option>
                  <option value="published">Publie</option>
                  <option value="archived">Archive</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Theme Colors */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
            <Palette className="h-5 w-5" />
            Couleurs du theme
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Couleur principale
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-10 cursor-pointer rounded-md border border-border"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 rounded-md border border-border bg-background py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Couleur secondaire
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="h-10 w-10 cursor-pointer rounded-md border border-border"
                />
                <input
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="flex-1 rounded-md border border-border bg-background py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Couleur d&apos;accentuation
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="h-10 w-10 cursor-pointer rounded-md border border-border"
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="flex-1 rounded-md border border-border bg-background py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
          </div>
          {/* Preview */}
          <div className="mt-4 flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Apercu :</span>
            <div className="h-6 w-12 rounded" style={{ backgroundColor: primaryColor }} />
            <div className="h-6 w-12 rounded" style={{ backgroundColor: secondaryColor }} />
            <div className="h-6 w-12 rounded" style={{ backgroundColor: accentColor }} />
          </div>
        </div>

        {/* Social Links */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
            <Globe className="h-5 w-5" />
            Liens et reseaux sociaux
          </h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Site web
              </label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://www.example.com"
                  className="w-full rounded-md border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Instagram
                </label>
                <input
                  type="url"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="https://instagram.com/..."
                  className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Facebook
                </label>
                <input
                  type="url"
                  value={facebook}
                  onChange={(e) => setFacebook(e.target.value)}
                  placeholder="https://facebook.com/..."
                  className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Twitter / X
                </label>
                <input
                  type="url"
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  placeholder="https://twitter.com/..."
                  className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Discord
                </label>
                <input
                  type="url"
                  value={discord}
                  onChange={(e) => setDiscord(e.target.value)}
                  placeholder="https://discord.gg/..."
                  className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Team Members */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
            <Users className="h-5 w-5" />
            Membres de l&apos;equipe ({members.length})
          </h2>
          {loadingMembers ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">Aucun membre.</p>
          ) : (
            <div className="divide-y divide-border">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{member.user_id}</p>
                      <p className="text-xs text-muted-foreground">
                        Role : <span className="capitalize">{member.role}</span>
                        {' — '}
                        Rejoint le {new Date(member.joined_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  {member.role !== 'owner' && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.id)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title="Retirer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Danger Zone */}
        <div className="rounded-xl border border-destructive/30 bg-card p-6">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Zone dangereuse
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Attention, ces actions sont irreversibles.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleArchive}
              disabled={status === 'archived'}
              className="rounded-md border border-destructive px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50"
            >
              Archiver le festival
            </button>
            <button
              type="button"
              onClick={handleDeleteFestival}
              disabled={isDeleting}
              className="inline-flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
            >
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Supprimer le festival
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Enregistrer les parametres
          </button>
        </div>
      </form>
    </div>
  );
}
