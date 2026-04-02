import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Building2,
  Ruler,
  CheckCircle2,
  LogIn,
  AlertCircle,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useTenantStore } from '@/stores/tenant-store';
import { api } from '@/lib/api-client';
import type { BoothApplication } from '@/types/exhibitor';

interface FormData {
  // Step 1: Company info
  company_name: string;
  description: string;
  website: string;
  contact_email: string;
  contact_phone: string;
  // Step 2: Booth preferences
  preferred_zone: string;
  space_needed: string;
  booth_type: string;
  special_requirements: string;
}

const INITIAL_FORM: FormData = {
  company_name: '',
  description: '',
  website: '',
  contact_email: '',
  contact_phone: '',
  preferred_zone: '',
  space_needed: '',
  booth_type: '',
  special_requirements: '',
};

const STEPS = [
  { id: 1, label: 'Informations entreprise', icon: Building2 },
  { id: 2, label: 'Preferences stand', icon: Ruler },
  { id: 3, label: 'Confirmation', icon: CheckCircle2 },
];

const BOOTH_TYPES = [
  { value: 'standard', label: 'Standard' },
  { value: 'corner', label: 'Angle' },
  { value: 'island', label: 'Ilot' },
  { value: 'outdoor', label: 'Exterieur' },
];

const SPACE_OPTIONS = [
  { value: 'small', label: 'Petit (2m x 2m)' },
  { value: 'medium', label: 'Moyen (3m x 3m)' },
  { value: 'large', label: 'Grand (4m x 4m)' },
  { value: 'xl', label: 'Tres grand (6m x 3m)' },
];

export function FestivalApplyPage() {
  const { isAuthenticated, isLoading: authLoading, profile } = useAuthStore();
  const { festival, activeEdition } = useTenantStore();
  const slug = festival?.slug ?? '';

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    ...INITIAL_FORM,
    contact_email: profile?.email ?? '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /** Update a single form field. */
  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  /** Validate Step 1 fields. */
  function validateStep1(): boolean {
    return formData.company_name.trim() !== '' && formData.contact_email.trim() !== '';
  }

  /** Validate Step 2 fields. */
  function validateStep2(): boolean {
    return formData.space_needed !== '';
  }

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!festival?.id || !activeEdition?.id) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const payload = {
      edition_id: activeEdition.id,
      company_name: formData.company_name,
      description: formData.description || null,
      website: formData.website || null,
      contact_email: formData.contact_email,
      contact_phone: formData.contact_phone || null,
      preferences: [
        formData.preferred_zone ? `Zone: ${formData.preferred_zone}` : '',
        formData.space_needed ? `Espace: ${formData.space_needed}` : '',
        formData.booth_type ? `Type: ${formData.booth_type}` : '',
        formData.special_requirements ? `Besoins: ${formData.special_requirements}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    };

    const res = await api.post<BoothApplication>(
      `/exhibitors/festival/${festival.id}/applications`,
      payload
    );

    setIsSubmitting(false);

    if (res.success) {
      setIsSubmitted(true);
    } else {
      setSubmitError(res.error ?? 'Une erreur est survenue lors de la soumission.');
    }
  };

  // Show login prompt if not authenticated
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <div className="mx-auto mb-4 inline-flex rounded-full bg-primary/10 p-4">
            <LogIn className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-foreground">
            Connexion requise
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Vous devez etre connecte pour soumettre une candidature exposant.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <LogIn className="h-4 w-4" />
            Se connecter
          </Link>
          <p className="mt-4 text-xs text-muted-foreground">
            Pas encore de compte ?{' '}
            <Link to="/signup" className="text-primary hover:underline">
              Creer un compte
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Chargement...</span>
        </div>
      </div>
    );
  }

  // Success screen after submission
  if (isSubmitted) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <div className="mx-auto mb-4 inline-flex rounded-full bg-green-100 p-4 dark:bg-green-900/20">
            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-foreground">
            Candidature envoyee !
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Votre candidature a bien ete soumise. L&apos;equipe organisatrice la
            examinera dans les meilleurs delais. Vous recevrez une notification par
            email a <strong>{formData.contact_email}</strong>.
          </p>
          <Link
            to={`/f/${slug}`}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Retour a l&apos;accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Candidature exposant
        </h1>
        <p className="mt-2 text-muted-foreground">
          Remplissez le formulaire pour soumettre votre candidature.
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="mb-10">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;

            return (
              <div key={step.id} className="flex flex-1 items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                      isCompleted
                        ? 'border-primary bg-primary text-primary-foreground'
                        : isCurrent
                          ? 'border-primary bg-background text-primary'
                          : 'border-border bg-background text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <span
                    className={`mt-2 hidden text-xs font-medium sm:block ${
                      isCurrent ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`mx-2 h-0.5 flex-1 ${
                      isCompleted ? 'bg-primary' : 'bg-border'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="rounded-xl border border-border bg-card p-6">
        {/* Step 1: Company Info */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              Informations sur votre entreprise
            </h2>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Nom de l&apos;entreprise / marque <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                placeholder="Mon Entreprise"
                value={formData.company_name}
                onChange={(e) => updateField('company_name', e.target.value)}
                className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Description de votre activite
              </label>
              <textarea
                rows={3}
                placeholder="Decrivez votre activite et vos produits..."
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                className="w-full resize-none rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Site web
              </label>
              <input
                type="url"
                placeholder="https://mon-entreprise.fr"
                value={formData.website}
                onChange={(e) => updateField('website', e.target.value)}
                className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Email de contact <span className="text-destructive">*</span>
                </label>
                <input
                  type="email"
                  placeholder="contact@entreprise.fr"
                  value={formData.contact_email}
                  onChange={(e) => updateField('contact_email', e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Telephone
                </label>
                <input
                  type="tel"
                  placeholder="06 12 34 56 78"
                  value={formData.contact_phone}
                  onChange={(e) => updateField('contact_phone', e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Booth Preferences */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              Preferences pour votre stand
            </h2>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Zone preferee
              </label>
              <input
                type="text"
                placeholder="Ex: Hall A, Zone exterieure..."
                value={formData.preferred_zone}
                onChange={(e) => updateField('preferred_zone', e.target.value)}
                className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Taille de stand souhaitee <span className="text-destructive">*</span>
              </label>
              <select
                value={formData.space_needed}
                onChange={(e) => updateField('space_needed', e.target.value)}
                className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Selectionnez une taille</option>
                {SPACE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Type de stand
              </label>
              <select
                value={formData.booth_type}
                onChange={(e) => updateField('booth_type', e.target.value)}
                className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Selectionnez un type</option>
                {BOOTH_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Besoins specifiques
              </label>
              <textarea
                rows={3}
                placeholder="Electricite, eau, equipement specifique, contraintes d'installation..."
                value={formData.special_requirements}
                onChange={(e) => updateField('special_requirements', e.target.value)}
                className="w-full resize-none rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        )}

        {/* Step 3: Review and Submit */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-foreground">
              Recapitulatif de votre candidature
            </h2>

            {/* Company Info Summary */}
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                Informations entreprise
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Entreprise</dt>
                  <dd className="font-medium text-foreground">{formData.company_name || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="font-medium text-foreground">{formData.contact_email || '—'}</dd>
                </div>
                {formData.contact_phone && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Telephone</dt>
                    <dd className="font-medium text-foreground">{formData.contact_phone}</dd>
                  </div>
                )}
                {formData.website && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Site web</dt>
                    <dd className="font-medium text-foreground">{formData.website}</dd>
                  </div>
                )}
                {formData.description && (
                  <div>
                    <dt className="mb-1 text-muted-foreground">Description</dt>
                    <dd className="text-foreground">{formData.description}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Booth Preferences Summary */}
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                Preferences stand
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Taille</dt>
                  <dd className="font-medium text-foreground">
                    {SPACE_OPTIONS.find((o) => o.value === formData.space_needed)?.label || '—'}
                  </dd>
                </div>
                {formData.booth_type && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Type</dt>
                    <dd className="font-medium text-foreground">
                      {BOOTH_TYPES.find((o) => o.value === formData.booth_type)?.label || formData.booth_type}
                    </dd>
                  </div>
                )}
                {formData.preferred_zone && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Zone preferee</dt>
                    <dd className="font-medium text-foreground">{formData.preferred_zone}</dd>
                  </div>
                )}
                {formData.special_requirements && (
                  <div>
                    <dt className="mb-1 text-muted-foreground">Besoins specifiques</dt>
                    <dd className="text-foreground">{formData.special_requirements}</dd>
                  </div>
                )}
              </dl>
            </div>

            {submitError && (
              <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                <p className="text-sm text-destructive">{submitError}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentStep === 1}
          className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" />
          Precedent
        </button>

        {currentStep < STEPS.length ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={
              (currentStep === 1 && !validateStep1()) ||
              (currentStep === 2 && !validateStep2())
            }
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            Suivant
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Envoyer ma candidature
          </button>
        )}
      </div>
    </div>
  );
}
