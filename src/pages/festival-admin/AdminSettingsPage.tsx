import { useState } from 'react';
import { Save, Loader2, Globe, Palette, Type, Link as LinkIcon, AlertTriangle } from 'lucide-react';
import { useTenantStore } from '@/stores/tenant-store';

export function AdminSettingsPage() {
  const { festival } = useTenantStore();

  // TODO: Wire up to service layer - pre-fill with real festival data and save via service
  const [name, setName] = useState(festival?.name ?? '');
  const [slug, setSlug] = useState(festival?.slug ?? '');
  const [description, setDescription] = useState(festival?.description ?? '');
  const [locationName, setLocationName] = useState(festival?.location_name ?? '');
  const [primaryColor, setPrimaryColor] = useState(festival?.theme_colors?.primary ?? '#6366f1');
  const [secondaryColor, setSecondaryColor] = useState(festival?.theme_colors?.secondary ?? '#8b5cf6');
  const [accentColor, setAccentColor] = useState(festival?.theme_colors?.accent ?? '#f59e0b');
  const [website, setWebsite] = useState(festival?.social_links?.website ?? '');
  const [instagram, setInstagram] = useState(festival?.social_links?.instagram ?? '');
  const [facebook, setFacebook] = useState(festival?.social_links?.facebook ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);

    try {
      // TODO: Wire up to service layer - call updateFestival
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSaveMessage('Parametres enregistres avec succes.');
    } catch {
      setSaveMessage('Erreur lors de la sauvegarde.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Parametres</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configurez les informations et l&apos;apparence de votre festival.
        </p>
      </div>

      {saveMessage && (
        <div className="mb-6 rounded-md border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
          {saveMessage}
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
            <div>
              <label htmlFor="location" className="mb-1.5 block text-sm font-medium text-foreground">
                Lieu / Ville
              </label>
              <input
                id="location"
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="Ex: Paris, Parc des Expositions"
                className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
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
          </div>
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
          {/* TODO: Wire up to service layer - implement archive/delete */}
          <div className="flex gap-3">
            <button
              type="button"
              className="rounded-md border border-destructive px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground"
            >
              Archiver le festival
            </button>
            <button
              type="button"
              className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90"
            >
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
