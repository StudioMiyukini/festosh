import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2,
  User,
  ClipboardList,
  Search,
  Heart,
  Save,
  X,
  Plus,
  Tent,
  MapPin,
  Car,
  Accessibility,
  Shirt,
  Phone,
  AlertCircle,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatTimestamp } from '@/lib/format-utils';
import { EmptyState } from '@/components/shared/EmptyState';
import type { Festival } from '@/types/festival';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VolunteerAction {
  id: string;
  label: string;
}

interface VolunteerProfile {
  bio: string;
  skills: string[];
  certifications: string[];
  preferred_actions: string[];
  availability: Record<string, string[]>;
  constraints: string;
  is_pmr: boolean;
  tshirt_size: string;
  has_vehicle: boolean;
  emergency_contact_name: string;
  emergency_contact_phone: string;
}

interface MyApplication {
  id: string;
  festival_id: string;
  festival_name: string;
  edition_name: string;
  status: string;
  created_at: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TabId = 'profile' | 'applications' | 'apply';

const DAYS = [
  { key: 'lundi', label: 'Lundi' },
  { key: 'mardi', label: 'Mardi' },
  { key: 'mercredi', label: 'Mercredi' },
  { key: 'jeudi', label: 'Jeudi' },
  { key: 'vendredi', label: 'Vendredi' },
  { key: 'samedi', label: 'Samedi' },
  { key: 'dimanche', label: 'Dimanche' },
];

const TIME_SLOTS = [
  { key: 'matin', label: 'Matin' },
  { key: 'apres-midi', label: 'Apres-midi' },
  { key: 'soir', label: 'Soir' },
];

const TSHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const APPLICATION_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const APPLICATION_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  accepted: 'Acceptee',
  rejected: 'Refusee',
};

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}>
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Tag Input Component
// ---------------------------------------------------------------------------

function TagInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState('');

  const addTags = () => {
    const newTags = input
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && !value.includes(t));
    if (newTags.length > 0) {
      onChange([...value, ...newTags]);
    }
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTags();
    }
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="rounded-full p-0.5 hover:bg-primary/20"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || 'Separez par des virgules, puis Entree'}
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <button
          type="button"
          onClick={addTags}
          className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab content: Profile
// ---------------------------------------------------------------------------

function ProfileTab() {
  const [profile, setProfile] = useState<VolunteerProfile | null>(null);
  const [actions, setActions] = useState<VolunteerAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hasProfile, setHasProfile] = useState(true);

  // Form state
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [certifications, setCertifications] = useState<string[]>([]);
  const [preferredActions, setPreferredActions] = useState<string[]>([]);
  const [availability, setAvailability] = useState<Record<string, string[]>>({});
  const [constraints, setConstraints] = useState('');
  const [isPmr, setIsPmr] = useState(false);
  const [tshirtSize, setTshirtSize] = useState('M');
  const [hasVehicle, setHasVehicle] = useState(false);
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [profileRes, actionsRes] = await Promise.all([
      api.get<VolunteerProfile | null>('/volunteer-hub/my-profile'),
      api.get<VolunteerAction[]>('/volunteer-hub/actions'),
    ]);

    if (actionsRes.success && actionsRes.data) {
      setActions(Array.isArray(actionsRes.data) ? actionsRes.data : []);
    }

    if (profileRes.success) {
      const p = profileRes.data;
      if (p) {
        setHasProfile(true);
        setProfile(p);
        setBio(p.bio || '');
        setSkills(p.skills || []);
        setCertifications(p.certifications || []);
        setPreferredActions(p.preferred_actions || []);
        setAvailability(p.availability || {});
        setConstraints(p.constraints || '');
        setIsPmr(!!p.is_pmr);
        setTshirtSize(p.tshirt_size || 'M');
        setHasVehicle(!!p.has_vehicle);
        setEmergencyName(p.emergency_contact_name || '');
        setEmergencyPhone(p.emergency_contact_phone || '');
      } else {
        setHasProfile(false);
        setProfile(null);
      }
    } else {
      setError(profileRes.error || 'Erreur lors du chargement du profil.');
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleAction = (actionId: string) => {
    setPreferredActions((prev) =>
      prev.includes(actionId) ? prev.filter((a) => a !== actionId) : [...prev, actionId],
    );
  };

  const toggleDaySlot = (day: string, slot: string) => {
    setAvailability((prev) => {
      const current = prev[day] || [];
      const updated = current.includes(slot)
        ? current.filter((s) => s !== slot)
        : [...current, slot];
      return { ...prev, [day]: updated };
    });
  };

  const isDayEnabled = (day: string) => {
    return (availability[day] || []).length > 0;
  };

  const toggleDay = (day: string) => {
    setAvailability((prev) => {
      if ((prev[day] || []).length > 0) {
        return { ...prev, [day]: [] };
      }
      return { ...prev, [day]: TIME_SLOTS.map((s) => s.key) };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    const payload = {
      bio,
      skills,
      certifications,
      preferred_actions: preferredActions,
      availability,
      constraints,
      is_pmr: isPmr,
      tshirt_size: tshirtSize,
      has_vehicle: hasVehicle,
      emergency_contact_name: emergencyName,
      emergency_contact_phone: emergencyPhone,
    };

    const res = await api.put('/volunteer-hub/my-profile', payload);
    if (res.success) {
      setMessage({ type: 'success', text: 'Profil benevole enregistre avec succes.' });
      setHasProfile(true);
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la sauvegarde.' });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!hasProfile && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
          <AlertCircle className="mb-1 inline-block h-4 w-4 mr-1.5" />
          Vous n'avez pas encore de profil benevole. Remplissez le formulaire ci-dessous pour en creer un.
        </div>
      )}

      {message && (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400'
              : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Bio */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Informations generales</h3>

        <div className="mb-4">
          <label htmlFor="vol-bio" className="mb-1.5 block text-sm font-medium text-foreground">
            Bio
          </label>
          <textarea
            id="vol-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="Presentez-vous brievement..."
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="mb-4">
          <TagInput
            label="Competences"
            value={skills}
            onChange={setSkills}
            placeholder="Ex: Accueil, Logistique, Premiers secours..."
          />
        </div>

        <div>
          <TagInput
            label="Diplomes / Certificats"
            value={certifications}
            onChange={setCertifications}
            placeholder="Ex: PSC1, BAFA, Permis B..."
          />
        </div>
      </div>

      {/* Preferred actions */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Actions preferees</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Selectionnez les types d'actions qui vous interessent.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map((action) => (
            <label
              key={action.id}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 transition-colors hover:bg-accent"
            >
              <input
                type="checkbox"
                checked={preferredActions.includes(action.id)}
                onChange={() => toggleAction(action.id)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary/50"
              />
              <span className="text-sm text-foreground">{action.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Availability */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Disponibilites</h3>
        <div className="space-y-3">
          {DAYS.map((day) => (
            <div key={day.key} className="rounded-lg border border-border px-4 py-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => toggleDay(day.key)}
                  className="flex items-center gap-3"
                >
                  <div
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      isDayEnabled(day.key) ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${
                        isDayEnabled(day.key) ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </div>
                  <span className="text-sm font-medium text-foreground">{day.label}</span>
                </button>
                {isDayEnabled(day.key) && (
                  <div className="flex gap-2">
                    {TIME_SLOTS.map((slot) => (
                      <label
                        key={slot.key}
                        className="flex cursor-pointer items-center gap-1.5"
                      >
                        <input
                          type="checkbox"
                          checked={(availability[day.key] || []).includes(slot.key)}
                          onChange={() => toggleDaySlot(day.key, slot.key)}
                          className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary/50"
                        />
                        <span className="text-xs text-muted-foreground">{slot.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Constraints & extras */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Contraintes et informations complementaires</h3>

        <div className="mb-4">
          <label htmlFor="vol-constraints" className="mb-1.5 block text-sm font-medium text-foreground">
            Contraintes (allergies, restrictions...)
          </label>
          <textarea
            id="vol-constraints"
            value={constraints}
            onChange={(e) => setConstraints(e.target.value)}
            rows={2}
            placeholder="Allergies alimentaires, restrictions de mobilite..."
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* PMR */}
          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Accessibility className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Personne a mobilite reduite (PMR)</span>
            </div>
            <button
              type="button"
              onClick={() => setIsPmr(!isPmr)}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                isPmr ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${
                  isPmr ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Vehicle */}
          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Vehicule disponible</span>
            </div>
            <button
              type="button"
              onClick={() => setHasVehicle(!hasVehicle)}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                hasVehicle ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${
                  hasVehicle ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* T-shirt size */}
          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Shirt className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Taille T-shirt</span>
            </div>
            <select
              value={tshirtSize}
              onChange={(e) => setTshirtSize(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {TSHIRT_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Emergency contact */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold text-foreground">
          <Phone className="mr-1.5 inline-block h-4 w-4" />
          Contact d'urgence
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="emergency-name" className="mb-1.5 block text-sm font-medium text-foreground">
              Nom
            </label>
            <input
              id="emergency-name"
              type="text"
              value={emergencyName}
              onChange={(e) => setEmergencyName(e.target.value)}
              placeholder="Nom du contact"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label htmlFor="emergency-phone" className="mb-1.5 block text-sm font-medium text-foreground">
              Telephone
            </label>
            <input
              id="emergency-phone"
              type="tel"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
              placeholder="06 12 34 56 78"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab content: Applications
// ---------------------------------------------------------------------------

function ApplicationsTab() {
  const [applications, setApplications] = useState<MyApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      const result = await api.get<MyApplication[]>('/volunteer-hub/my-applications');
      if (result.success && result.data) {
        setApplications(Array.isArray(result.data) ? result.data : []);
      } else {
        setError(result.error || 'Erreur lors du chargement des candidatures.');
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Aucune candidature"
        description="Vous n'avez pas encore postule comme benevole a un festival."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">Festival</th>
            <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">Edition</th>
            <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">Statut</th>
            <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">Date</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((app) => (
            <tr key={app.id} className="border-b border-border last:border-0 hover:bg-muted/40">
              <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">
                {app.festival_name}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                {app.edition_name}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <Badge className={APPLICATION_STATUS_STYLES[app.status] || 'bg-gray-100 text-gray-600'}>
                  {APPLICATION_STATUS_LABELS[app.status] || app.status}
                </Badge>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                {formatTimestamp(app.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab content: Apply
// ---------------------------------------------------------------------------

function ApplyTab() {
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [actions, setActions] = useState<VolunteerAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFestival, setSelectedFestival] = useState<Festival | null>(null);
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [motivation, setMotivation] = useState('');
  const [availabilityOverride, setAvailabilityOverride] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [festRes, actRes] = await Promise.all([
      api.get<Festival[]>('/directory'),
      api.get<VolunteerAction[]>('/volunteer-hub/actions'),
    ]);
    if (festRes.success && festRes.data) {
      setFestivals(Array.isArray(festRes.data) ? festRes.data : []);
    }
    if (actRes.success && actRes.data) {
      setActions(Array.isArray(actRes.data) ? actRes.data : []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredFestivals = festivals.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.location_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.description || '').toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const openDialog = (festival: Festival) => {
    setSelectedFestival(festival);
    setSelectedActions([]);
    setMotivation('');
    setAvailabilityOverride('');
    setSubmitMessage(null);
    setDialogOpen(true);
  };

  const toggleDialogAction = (actionId: string) => {
    setSelectedActions((prev) =>
      prev.includes(actionId) ? prev.filter((a) => a !== actionId) : [...prev, actionId],
    );
  };

  const handleSubmit = async () => {
    if (!selectedFestival) return;
    setSubmitting(true);
    setSubmitMessage(null);

    const res = await api.post(`/volunteer-hub/apply/${selectedFestival.id}`, {
      preferred_actions: selectedActions,
      availability_override: availabilityOverride,
      motivation,
    });

    if (res.success) {
      setSubmitMessage({ type: 'success', text: 'Candidature envoyee avec succes !' });
      setTimeout(() => {
        setDialogOpen(false);
      }, 1500);
    } else {
      setSubmitMessage({ type: 'error', text: res.error || 'Erreur lors de la candidature.' });
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Rechercher un festival..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-border bg-background py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {filteredFestivals.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Search className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {searchQuery
              ? 'Aucun festival ne correspond a votre recherche.'
              : 'Aucun festival publie pour le moment.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredFestivals.map((festival) => (
            <div
              key={festival.id}
              className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
            >
              <div className="mb-3 flex items-start gap-3">
                {festival.logo_url ? (
                  <img
                    src={festival.logo_url}
                    alt={festival.name}
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Tent className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-foreground">{festival.name}</h3>
                  {festival.location_name && (
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {festival.location_name}
                    </div>
                  )}
                </div>
              </div>
              {festival.description && (
                <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">{festival.description}</p>
              )}
              <button
                type="button"
                onClick={() => openDialog(festival)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Heart className="h-4 w-4" />
                Postuler
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Apply dialog */}
      {dialogOpen && selectedFestival && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                Postuler - {selectedFestival.name}
              </h3>
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {submitMessage && (
              <div
                className={`mb-4 rounded-md border px-4 py-3 text-sm ${
                  submitMessage.type === 'success'
                    ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400'
                    : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'
                }`}
              >
                {submitMessage.text}
              </div>
            )}

            {/* Preferred actions */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-foreground">
                Actions preferees
              </label>
              <div className="grid grid-cols-2 gap-2">
                {actions.map((action) => (
                  <label
                    key={action.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 transition-colors hover:bg-accent"
                  >
                    <input
                      type="checkbox"
                      checked={selectedActions.includes(action.id)}
                      onChange={() => toggleDialogAction(action.id)}
                      className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary/50"
                    />
                    <span className="text-xs text-foreground">{action.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Availability override */}
            <div className="mb-4">
              <label htmlFor="avail-override" className="mb-1.5 block text-sm font-medium text-foreground">
                Disponibilites specifiques (optionnel)
              </label>
              <textarea
                id="avail-override"
                value={availabilityOverride}
                onChange={(e) => setAvailabilityOverride(e.target.value)}
                rows={2}
                placeholder="Precisions sur vos disponibilites pour ce festival..."
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Motivation */}
            <div className="mb-6">
              <label htmlFor="motivation" className="mb-1.5 block text-sm font-medium text-foreground">
                Motivation
              </label>
              <textarea
                id="motivation"
                value={motivation}
                onChange={(e) => setMotivation(e.target.value)}
                rows={3}
                placeholder="Pourquoi souhaitez-vous etre benevole pour ce festival ?"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Heart className="h-4 w-4" />
                )}
                Envoyer la candidature
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Mon profil', icon: User },
  { id: 'applications', label: 'Mes candidatures', icon: ClipboardList },
  { id: 'apply', label: 'Postuler', icon: Heart },
];

export function VolunteerDashboardPage() {
  const { isAuthenticated, isLoading, profile } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [mountedTabs, setMountedTabs] = useState<Set<TabId>>(new Set(['profile']));

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  const selectTab = (tab: TabId) => {
    setActiveTab(tab);
    setMountedTabs((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated || !profile) {
    return null;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Espace benevole
        </h1>
        <p className="mt-2 text-muted-foreground">
          Gerez votre profil benevole, suivez vos candidatures et postulez aux festivals.
        </p>
      </div>

      {/* Tab navigation */}
      <div className="mb-6 border-b border-border">
        <nav className="-mb-px flex gap-6 overflow-x-auto" aria-label="Onglets">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => selectTab(tab.id)}
                className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab panels */}
      <div>
        {mountedTabs.has('profile') && (
          <div className={activeTab === 'profile' ? '' : 'hidden'}>
            <ProfileTab />
          </div>
        )}
        {mountedTabs.has('applications') && (
          <div className={activeTab === 'applications' ? '' : 'hidden'}>
            <ApplicationsTab />
          </div>
        )}
        {mountedTabs.has('apply') && (
          <div className={activeTab === 'apply' ? '' : 'hidden'}>
            <ApplyTab />
          </div>
        )}
      </div>
    </div>
  );
}
