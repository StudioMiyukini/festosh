import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, ChevronLeft, Loader2, Building2, Ruler, FileUp, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

const STEPS = [
  { id: 1, label: 'Info entreprise', icon: Building2 },
  { id: 2, label: 'Besoins stand', icon: Ruler },
  { id: 3, label: 'Documents', icon: FileUp },
  { id: 4, label: 'Confirmation', icon: CheckCircle2 },
];

export function FestivalApplyPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isAuthenticated, isLoading } = useAuthStore();
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </div>
    );
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
    setIsSubmitting(true);
    // TODO: Wire up to service layer - submit application
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    setCurrentStep(STEPS.length); // Go to confirmation
  };

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
        {/* Step 1: Info entreprise */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              Informations sur votre entreprise
            </h2>
            {/* TODO: Wire up to service layer - use react-hook-form + zod validation */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Nom de l&apos;entreprise / marque
              </label>
              <input
                type="text"
                placeholder="Mon Entreprise"
                className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                SIRET / Numero d&apos;identification
              </label>
              <input
                type="text"
                placeholder="123 456 789 00012"
                className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Categorie d&apos;activite
              </label>
              <select className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="">Selectionnez une categorie</option>
                <option value="artisanat">Artisanat</option>
                <option value="gastronomie">Gastronomie</option>
                <option value="mode">Mode</option>
                <option value="art">Art</option>
                <option value="technologie">Technologie</option>
                <option value="bien-etre">Bien-etre</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Description de votre activite
              </label>
              <textarea
                rows={3}
                placeholder="Decrivez votre activite et vos produits..."
                className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>
          </div>
        )}

        {/* Step 2: Besoins stand */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              Besoins pour votre stand
            </h2>
            {/* TODO: Wire up to service layer */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Taille de stand souhaitee
              </label>
              <select className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="">Selectionnez une taille</option>
                <option value="small">Petit (2m x 2m)</option>
                <option value="medium">Moyen (3m x 3m)</option>
                <option value="large">Grand (4m x 4m)</option>
                <option value="xl">Tres grand (6m x 3m)</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Besoin en electricite
              </label>
              <div className="flex items-center gap-4">
                <label className="inline-flex items-center gap-2 text-sm text-foreground">
                  <input type="radio" name="electricity" value="no" className="accent-primary" />
                  Non
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-foreground">
                  <input type="radio" name="electricity" value="standard" className="accent-primary" />
                  Standard (220V)
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-foreground">
                  <input type="radio" name="electricity" value="high" className="accent-primary" />
                  Renforcee
                </label>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Besoin en eau
              </label>
              <div className="flex items-center gap-4">
                <label className="inline-flex items-center gap-2 text-sm text-foreground">
                  <input type="radio" name="water" value="no" className="accent-primary" />
                  Non
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-foreground">
                  <input type="radio" name="water" value="yes" className="accent-primary" />
                  Oui
                </label>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Commentaires supplementaires
              </label>
              <textarea
                rows={3}
                placeholder="Equipement specifique, contraintes d'installation..."
                className="w-full rounded-md border border-border bg-background py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>
          </div>
        )}

        {/* Step 3: Documents */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Documents</h2>
            {/* TODO: Wire up to service layer - file upload */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Logo / Photo de vos produits
              </label>
              <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-border p-8">
                <div className="text-center">
                  <FileUp className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Glissez vos fichiers ici ou{' '}
                    <span className="font-medium text-primary">parcourez</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    PNG, JPG jusqu&apos;a 5 Mo
                  </p>
                </div>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Attestation d&apos;assurance (optionnel)
              </label>
              <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-border p-8">
                <div className="text-center">
                  <FileUp className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Glissez votre fichier ici ou{' '}
                    <span className="font-medium text-primary">parcourez</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">PDF jusqu&apos;a 10 Mo</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {currentStep === 4 && (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 inline-flex rounded-full bg-green-100 p-4 dark:bg-green-900/20">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="mb-2 text-lg font-semibold text-foreground">
              Candidature prete a etre envoyee
            </h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Verifiez vos informations puis cliquez sur &laquo; Envoyer &raquo; pour
              soumettre votre candidature.
            </p>
            {/* TODO: Wire up to service layer - show summary of entered data */}
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
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
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
