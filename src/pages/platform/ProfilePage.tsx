import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Save, Loader2, Moon, Sun } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { authService } from '@/services/auth.service';

export function ProfilePage() {
  const { isAuthenticated, isLoading, profile, setProfile } = useAuthStore();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(
    document.documentElement.classList.contains('dark')
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '');
      setBio(profile.bio ?? '');
    }
  }, [profile]);

  if (isLoading || !profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);

    const result = await authService.updateProfile({
      display_name: displayName || null,
      bio: bio || null,
    });

    if (result.data) {
      setProfile(result.data);
      setSaveMessage({ type: 'success', text: 'Profil mis a jour avec succes.' });
    } else {
      setSaveMessage({ type: 'error', text: result.error?.message || 'Erreur lors de la mise a jour.' });
    }

    setIsSaving(false);
  };

  const toggleTheme = () => {
    const newDark = !isDarkMode;
    setIsDarkMode(newDark);
    document.documentElement.classList.toggle('dark', newDark);
    localStorage.setItem('festosh-theme', newDark ? 'dark' : 'light');
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold tracking-tight text-foreground">Mon profil</h1>

      {/* Avatar Section */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.username}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <User className="h-8 w-8 text-primary" />
          )}
        </div>
        <div>
          <p className="text-lg font-semibold text-foreground">
            {profile.display_name || profile.username}
          </p>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
          <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {profile.platform_role}
          </span>
        </div>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div className={`mb-6 rounded-md border px-4 py-3 text-sm ${
          saveMessage.type === 'success'
            ? 'border-primary/20 bg-primary/10 text-primary'
            : 'border-destructive/20 bg-destructive/10 text-destructive'
        }`}>
          {saveMessage.text}
        </div>
      )}

      {/* Edit Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Informations personnelles
          </h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Nom d&apos;utilisateur
              </label>
              <input
                type="text"
                value={profile.username}
                disabled
                className="w-full rounded-md border border-border bg-muted py-2.5 px-4 text-sm text-muted-foreground"
              />
            </div>

            <div>
              <label htmlFor="displayName" className="mb-1.5 block text-sm font-medium text-foreground">
                Nom d&apos;affichage
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Votre nom public"
                className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
              <input
                type="email"
                value={profile.email ?? ''}
                disabled
                className="w-full rounded-md border border-border bg-muted py-2.5 px-4 text-sm text-muted-foreground"
              />
            </div>

            <div>
              <label htmlFor="bio" className="mb-1.5 block text-sm font-medium text-foreground">
                Biographie
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="Parlez-nous de vous..."
                className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Theme Preference */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Preferences</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Theme sombre</p>
              <p className="text-xs text-muted-foreground">
                Basculer entre le mode clair et sombre
              </p>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-accent"
            >
              {isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              {isDarkMode ? 'Sombre' : 'Clair'}
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
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}
