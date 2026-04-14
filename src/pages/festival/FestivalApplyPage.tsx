import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Loader2,
  Building2,
  LogIn,
  CheckCircle2,
  AlertCircle,
  Store,
  MapPin,
  FileCheck,
  Scale,
  ArrowRight,
  Zap,
  Droplets,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useTenantStore } from '@/stores/tenant-store';
import { api } from '@/lib/api-client';
import { formatCurrency } from '@/lib/format-utils';

interface BoothType {
  id: string; name: string; description: string | null;
  width_m: number | null; depth_m: number | null;
  price_cents: number; pricing_mode: string;
  has_electricity: number; has_water: number;
  color: string | null; is_active: number;
}

interface BoothLocation {
  id: string; code: string; zone: string | null;
  booth_type_id: string | null; is_available: number;
  is_assigned: boolean; is_selected: boolean;
  price_cents: number | null;
}

interface ExhibitorProfile {
  id: string; company_name: string | null;
  contact_email: string | null; siret: string | null;
}

interface Regulation {
  id: string; title: string; category: string;
  requires_acceptance: number; content: string;
}

export function FestivalApplyPage() {
  const { isAuthenticated, isLoading: authLoading, profile } = useAuthStore();
  const { festival, activeEdition } = useTenantStore();

  const [boothTypes, setBoothTypes] = useState<BoothType[]>([]);
  const [locations, setLocations] = useState<BoothLocation[]>([]);
  const [exhibitorProfile, setExhibitorProfile] = useState<ExhibitorProfile | null>(null);
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [allowBoothSelection, setAllowBoothSelection] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selectedBoothTypeId, setSelectedBoothTypeId] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [specialRequests, setSpecialRequests] = useState('');
  const [acceptedRegulations, setAcceptedRegulations] = useState<Set<string>>(new Set());

  // Load data
  useEffect(() => {
    if (!festival || !activeEdition) return;

    Promise.all([
      api.get<BoothType[]>(`/exhibitors/edition/${activeEdition.id}/booth-types`),
      api.get<{ allow_booth_selection: boolean }>(`/exhibitors/edition/${activeEdition.id}/booth-config`),
      api.get<Regulation[]>(`/regulations/festival/${festival.id}/public`),
      isAuthenticated ? api.get<ExhibitorProfile>('/exhibitors/profile') : Promise.resolve({ success: true, data: null }),
      isAuthenticated ? api.get<BoothLocation[]>(`/exhibitors/edition/${activeEdition.id}/available-booths`) : Promise.resolve({ success: true, data: [] }),
    ]).then(([typesRes, configRes, regsRes, profileRes, locsRes]) => {
      setBoothTypes(Array.isArray(typesRes.data) ? typesRes.data.filter((t) => t.is_active) : []);
      setAllowBoothSelection(!!(configRes.data as any)?.allow_booth_selection);
      const allRegs = Array.isArray(regsRes.data) ? regsRes.data : [];
      setRegulations(allRegs.filter((r) => r.category === 'exhibitor' && r.requires_acceptance));
      setExhibitorProfile(profileRes.data || null);
      setLocations(Array.isArray(locsRes.data) ? locsRes.data : []);
      setLoading(false);
    });
  }, [festival, activeEdition, isAuthenticated]);

  // Submit candidature
  const handleSubmit = async () => {
    if (!activeEdition) return;
    setSubmitting(true);
    setError(null);

    // Accept regulations first
    for (const regId of acceptedRegulations) {
      await api.post(`/regulations/${regId}/accept`, {});
    }

    const payload: Record<string, unknown> = {
      special_requests: specialRequests.trim() || null,
      selected_booth_id: selectedLocationId || null,
    };

    if (selectedBoothTypeId) {
      const bt = boothTypes.find((t) => t.id === selectedBoothTypeId);
      if (bt) {
        payload.requested_width_m = bt.width_m;
        payload.requested_depth_m = bt.depth_m;
        payload.needs_electricity = bt.has_electricity;
        payload.needs_water = bt.has_water;
      }
    }

    const res = await api.post(`/exhibitors/edition/${activeEdition.id}/apply`, payload);
    setSubmitting(false);

    if (res.success) {
      setSubmitted(true);
    } else {
      setError(res.error || 'Erreur lors de la soumission.');
    }
  };

  // Profile completeness check
  const profileIssues: string[] = [];
  if (exhibitorProfile) {
    if (!exhibitorProfile.company_name) profileIssues.push('Nom de l\'entreprise manquant');
    if (!exhibitorProfile.contact_email) profileIssues.push('Email de contact manquant');
    if (!exhibitorProfile.siret) profileIssues.push('SIRET / INSEE manquant');
  }

  const allRegulationsAccepted = regulations.length === 0 || regulations.every((r) => acceptedRegulations.has(r.id));
  const canSubmit = exhibitorProfile && profileIssues.length === 0 && allRegulationsAccepted && !submitting;

  // ─── Auth gate ────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <LogIn className="mx-auto mb-4 h-10 w-10 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Connexion requise</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Connectez-vous avec un compte exposant pour deposer votre candidature.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link to="/login" className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <LogIn className="h-4 w-4" /> Se connecter
            </Link>
            <Link to="/signup" className="text-sm text-primary hover:underline">
              Creer un compte exposant
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || (profile?.user_type !== 'exhibitor' && profile?.user_type !== 'organizer' && profile?.platform_role !== 'admin')) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Building2 className="mx-auto mb-4 h-10 w-10 text-amber-500" />
          <h2 className="text-lg font-bold text-foreground">Profil exposant requis</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Creez votre profil exposant pour pouvoir candidater.
          </p>
          <Link to="/exhibitor" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Building2 className="h-4 w-4" /> Creer mon profil exposant
          </Link>
        </div>
      </div>
    );
  }

  // ─── Success ──────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center dark:border-green-800 dark:bg-green-900/20">
          <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-600" />
          <h2 className="text-xl font-bold text-green-800 dark:text-green-300">Candidature envoyee !</h2>
          <p className="mt-3 text-sm text-green-700 dark:text-green-400">
            Votre candidature a ete soumise avec succes. L'organisateur l'examinera et vous contactera par email.
          </p>
          <Link
            to={`/f/${festival?.slug}`}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 text-sm font-medium text-white hover:bg-green-700"
          >
            Retour au festival
          </Link>
        </div>
      </div>
    );
  }

  // ─── Loading ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ─── Main form ────────────────────────────────────────────────────────

  const availableLocations = locations.filter((l) => l.is_available);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Candidature exposant</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Deposez votre candidature pour participer a {festival?.name} — {activeEdition?.name}.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          <AlertCircle className="mr-2 inline h-4 w-4" />{error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── LEFT: Stand types + locations ────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Booth types */}
          {boothTypes.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
                <Store className="h-5 w-5 text-primary" /> Types de stands disponibles
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {boothTypes.map((bt) => (
                  <button
                    key={bt.id}
                    type="button"
                    onClick={() => setSelectedBoothTypeId(selectedBoothTypeId === bt.id ? null : bt.id)}
                    className={`rounded-lg border p-4 text-left transition-all ${
                      selectedBoothTypeId === bt.id
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/30 hover:bg-accent/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-foreground">{bt.name}</p>
                      <span className="text-sm font-bold text-primary">
                        {formatCurrency(bt.price_cents)}
                        {bt.pricing_mode === 'per_day' && <span className="text-xs font-normal text-muted-foreground">/jour</span>}
                      </span>
                    </div>
                    {bt.description && (
                      <p className="mt-1 text-xs text-muted-foreground">{bt.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {bt.width_m && bt.depth_m && (
                        <span>{bt.width_m}m x {bt.depth_m}m</span>
                      )}
                      {bt.has_electricity ? (
                        <span className="flex items-center gap-0.5 text-amber-600"><Zap className="h-3 w-3" /> Electricite</span>
                      ) : null}
                      {bt.has_water ? (
                        <span className="flex items-center gap-0.5 text-blue-600"><Droplets className="h-3 w-3" /> Eau</span>
                      ) : null}
                    </div>
                    {selectedBoothTypeId === bt.id && (
                      <div className="mt-2 flex items-center gap-1 text-xs font-medium text-primary">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Selectionne
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Available locations (if booth selection enabled) */}
          {allowBoothSelection && availableLocations.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
                <MapPin className="h-5 w-5 text-primary" /> Emplacements disponibles
              </h2>
              <p className="mb-3 text-xs text-muted-foreground">
                Selectionnez votre emplacement prefere (optionnel — l'organisateur peut le modifier).
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                {availableLocations.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => setSelectedLocationId(selectedLocationId === loc.id ? null : loc.id)}
                    className={`rounded-lg border p-3 text-left transition-all ${
                      selectedLocationId === loc.id
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <p className="font-mono text-sm font-bold text-foreground">{loc.code}</p>
                    {loc.zone && <p className="text-xs text-muted-foreground">{loc.zone}</p>}
                    {loc.price_cents ? (
                      <p className="mt-1 text-xs font-medium text-primary">{formatCurrency(loc.price_cents)}</p>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Special requests */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-3 text-base font-semibold text-foreground">Demandes particulieres</h2>
            <textarea
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              rows={3}
              placeholder="Besoins specifiques, preferences de placement, remarques..."
              className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Regulations acceptance */}
          {regulations.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
                <Scale className="h-5 w-5 text-primary" /> Reglements a accepter
              </h2>
              <div className="space-y-3">
                {regulations.map((reg) => (
                  <label key={reg.id} className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-accent/50">
                    <input
                      type="checkbox"
                      checked={acceptedRegulations.has(reg.id)}
                      onChange={(e) => {
                        const next = new Set(acceptedRegulations);
                        if (e.target.checked) next.add(reg.id);
                        else next.delete(reg.id);
                        setAcceptedRegulations(next);
                      }}
                      className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">{reg.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        J'ai lu et j'accepte ce reglement.
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Profile summary + CTA ────────────────────────────── */}
        <div className="space-y-4">
          {/* Profile card */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <FileCheck className="h-4 w-4 text-primary" /> Votre profil exposant
            </h3>

            {!exhibitorProfile ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-900/20">
                <p className="font-medium text-amber-700 dark:text-amber-400">Profil incomplet</p>
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">
                  Vous devez creer votre profil exposant avant de candidater.
                </p>
                <Link to="/exhibitor" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                  Completer mon profil <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ) : profileIssues.length > 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-900/20">
                <p className="font-medium text-amber-700 dark:text-amber-400">Informations manquantes</p>
                <ul className="mt-1 space-y-0.5 text-xs text-amber-600 dark:text-amber-500">
                  {profileIssues.map((issue) => (
                    <li key={issue}>• {issue}</li>
                  ))}
                </ul>
                <Link to="/exhibitor" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                  Completer mon profil <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ) : (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm dark:border-green-800 dark:bg-green-900/20">
                <p className="flex items-center gap-1.5 font-medium text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" /> Profil complet
                </p>
                <p className="mt-1 text-xs text-green-600 dark:text-green-500">
                  {exhibitorProfile.company_name}
                </p>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Recapitulatif</h3>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Type de stand</span>
                <span className="font-medium text-foreground">
                  {selectedBoothTypeId ? boothTypes.find((t) => t.id === selectedBoothTypeId)?.name || '—' : 'Non selectionne'}
                </span>
              </div>
              {allowBoothSelection && (
                <div className="flex justify-between">
                  <span>Emplacement</span>
                  <span className="font-medium text-foreground">
                    {selectedLocationId ? locations.find((l) => l.id === selectedLocationId)?.code || '—' : 'Au choix de l\'organisateur'}
                  </span>
                </div>
              )}
              {regulations.length > 0 && (
                <div className="flex justify-between">
                  <span>Reglements</span>
                  <span className={`font-medium ${allRegulationsAccepted ? 'text-green-600' : 'text-amber-600'}`}>
                    {acceptedRegulations.size}/{regulations.length} acceptes
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Submit CTA */}
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="w-full rounded-xl bg-primary px-6 py-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 disabled:opacity-50 disabled:shadow-none"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Envoi en cours...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Store className="h-4 w-4" /> Je depose ma candidature
              </span>
            )}
          </button>

          {!canSubmit && !submitting && (
            <p className="text-center text-xs text-muted-foreground">
              {!exhibitorProfile
                ? 'Completez votre profil exposant pour candidater.'
                : profileIssues.length > 0
                  ? 'Completez les informations manquantes.'
                  : !allRegulationsAccepted
                    ? 'Acceptez tous les reglements pour continuer.'
                    : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
