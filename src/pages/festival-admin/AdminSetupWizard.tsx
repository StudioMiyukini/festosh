import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Settings,
  Building2,
  FileText,
  ScrollText,
  Mail,
  Store,
  Rocket,
  PartyPopper,
  X,
  ExternalLink,
} from 'lucide-react';
import { api } from '@/lib/api-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AdminSetupWizardProps {
  festival: any;
  activeEdition: any;
  onComplete: () => void;
}

interface StepDef {
  key: string;
  title: string;
  description: string;
  icon: React.ElementType;
  check: (festival: any, activeEdition: any, manualChecks: Record<string, boolean>) => boolean;
}

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------

const STEPS: StepDef[] = [
  {
    key: 'info',
    title: 'Informations du festival',
    description:
      'Renseignez le nom, la ville et la description de votre festival.',
    icon: Settings,
    check: (f) => !!(f?.name && f?.city),
  },
  {
    key: 'org',
    title: "Identification de l'organisateur",
    description:
      "Identifiez votre structure (nom, SIRET, adresse, email). Ces informations apparaitront sur les factures et la messagerie.",
    icon: Building2,
    check: (f) => !!(f?.org_name && f?.org_siret && f?.org_email),
  },
  {
    key: 'pages',
    title: 'Pages obligatoires',
    description:
      'Generez les pages de base de votre site public : Accueil, Exposants, Candidature.',
    icon: FileText,
    check: (f) => (f?._system_pages_count ?? 0) >= 3,
  },
  {
    key: 'regulations',
    title: 'Reglements types',
    description:
      'Creez les reglements essentiels pour votre festival a partir de nos modeles.',
    icon: ScrollText,
    check: (f) => (f?._regulations_count ?? 0) >= 1,
  },
  {
    key: 'smtp',
    title: 'Configuration SMTP (email)',
    description:
      "Configurez l'envoi d'emails pour les notifications et confirmations.",
    icon: Mail,
    check: (_f, _e, manual) => !!manual['smtp'],
  },
  {
    key: 'booths',
    title: 'Types de stands',
    description:
      'Definissez les types de stands que vous proposez (taille, prix, options). Les exposants pourront choisir lors de leur candidature.',
    icon: Store,
    check: (_f, edition) => (edition?._booth_types_count ?? 0) >= 1,
  },
  {
    key: 'publish',
    title: 'Publier le festival',
    description:
      "Quand tout est pret, publiez votre festival pour le rendre visible dans l'annuaire et permettre les candidatures.",
    icon: Rocket,
    check: (f) => f?.status === 'published',
  },
];

// ---------------------------------------------------------------------------
// Regulation templates
// ---------------------------------------------------------------------------

const REGULATION_TEMPLATES = [
  { id: 'visitors', label: 'Reglement visiteurs' },
  { id: 'exhibitors', label: 'Conditions exposants' },
  { id: 'image_rights', label: "Droit a l'image" },
  { id: 'security', label: 'Securite' },
  { id: 'privacy', label: 'Confidentialite' },
];

const SYSTEM_PAGES = [
  { slug: 'accueil', title: 'Accueil' },
  { slug: 'exposants', title: 'Exposants' },
  { slug: 'candidature', title: 'Candidature' },
];

// ---------------------------------------------------------------------------
// SMTP tutorial steps
// ---------------------------------------------------------------------------

const SMTP_TUTORIAL = [
  'Allez dans les parametres de votre compte Google : myaccount.google.com',
  "Activez la verification en 2 etapes si ce n'est pas fait",
  'Allez dans Securite > Mots de passe des applications',
  "Creez un mot de passe pour 'Autre (nom personnalise)' → nommez-le 'Festosh'",
  'Copiez le mot de passe genere (16 caracteres)',
  'Dans Parametres > Communication, renseignez :',
  '  Serveur SMTP : smtp.gmail.com',
  '  Port : 587',
  '  Utilisateur : votre.email@gmail.com',
  "  Mot de passe : le mot de passe d'application copie",
  '  Chiffrement : TLS',
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AdminSetupWizard({
  festival,
  activeEdition,
  onComplete,
}: AdminSetupWizardProps) {
  const navigate = useNavigate();
  const storageKey = `festosh_setup_${festival?.id}_dismissed`;

  // ── State ───────────────────────────────────────────────────────────────
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === 'true';
    } catch {
      return false;
    }
  });
  const [expandedStep, setExpandedStep] = useState<string | null>('info');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Manual checks (for steps that can't be auto-verified, e.g. SMTP)
  const [manualChecks, setManualChecks] = useState<Record<string, boolean>>(
    () => {
      try {
        const raw = localStorage.getItem(
          `festosh_setup_${festival?.id}_manual`,
        );
        return raw ? JSON.parse(raw) : {};
      } catch {
        return {};
      }
    },
  );

  // Regulation template checkboxes
  const [selectedRegulations, setSelectedRegulations] = useState<string[]>(
    REGULATION_TEMPLATES.map((r) => r.id),
  );

  // SMTP tutorial expanded
  const [smtpTutorialOpen, setSmtpTutorialOpen] = useState(false);

  // ── Computed ────────────────────────────────────────────────────────────
  const stepStatuses = useMemo(
    () =>
      STEPS.map((step) => ({
        ...step,
        completed: step.check(festival, activeEdition, manualChecks),
      })),
    [festival, activeEdition, manualChecks],
  );

  const completedCount = stepStatuses.filter((s) => s.completed).length;
  const totalSteps = STEPS.length;
  const progressPercent = Math.round((completedCount / totalSteps) * 100);
  const allDone = completedCount === totalSteps;

  // ── Helpers ─────────────────────────────────────────────────────────────
  const persistManualCheck = useCallback(
    (key: string, value: boolean) => {
      const next = { ...manualChecks, [key]: value };
      setManualChecks(next);
      try {
        localStorage.setItem(
          `festosh_setup_${festival?.id}_manual`,
          JSON.stringify(next),
        );
      } catch {
        /* ignore */
      }
    },
    [manualChecks, festival?.id],
  );

  const clearMessages = () => {
    setActionError(null);
    setActionSuccess(null);
  };

  const toggleStep = (key: string) => {
    clearMessages();
    setExpandedStep((prev) => (prev === key ? null : key));
  };

  const dismiss = () => {
    try {
      localStorage.setItem(storageKey, 'true');
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  // ── Actions ─────────────────────────────────────────────────────────────

  const generateSystemPages = async () => {
    if (!festival) return;
    setLoadingAction('pages');
    clearMessages();
    const res = await api.post(
      `/cms/festival/${festival.id}/generate-system-pages`,
    );
    if (res.success) {
      setActionSuccess('Pages generees avec succes !');
      // Force re-render by updating festival data
      if (festival) {
        festival._system_pages_count = 3;
      }
    } else {
      setActionError(res.error || 'Erreur lors de la generation des pages.');
    }
    setLoadingAction(null);
  };

  const generateRegulations = async () => {
    if (!festival || selectedRegulations.length === 0) return;
    setLoadingAction('regulations');
    clearMessages();
    let successCount = 0;
    let lastError: string | null = null;

    for (const templateId of selectedRegulations) {
      const res = await api.post(
        `/regulations/festival/${festival.id}/from-template`,
        { template_id: templateId },
      );
      if (res.success) {
        successCount++;
      } else {
        lastError = res.error || 'Erreur';
      }
    }

    if (successCount > 0) {
      setActionSuccess(
        `${successCount} reglement${successCount > 1 ? 's' : ''} genere${successCount > 1 ? 's' : ''} avec succes !`,
      );
      if (festival) {
        festival._regulations_count =
          (festival._regulations_count ?? 0) + successCount;
      }
    }
    if (lastError && successCount < selectedRegulations.length) {
      setActionError(lastError);
    }
    setLoadingAction(null);
  };

  const publishFestival = async () => {
    if (!festival) return;
    setLoadingAction('publish');
    clearMessages();
    const res = await api.put(`/festivals/${festival.id}`, {
      status: 'published',
    });
    if (res.success) {
      setActionSuccess('Festival publie avec succes !');
      if (festival) {
        festival.status = 'published';
      }
      onComplete();
    } else {
      setActionError(
        res.error || 'Erreur lors de la publication du festival.',
      );
    }
    setLoadingAction(null);
  };

  // ── Early return if dismissed ───────────────────────────────────────────
  if (dismissed) return null;

  // ── Render ──────────────────────────────────────────────────────────────

  const renderStepContent = (step: (typeof stepStatuses)[number]) => {
    switch (step.key) {
      // ─── Step 1: Festival info ───
      case 'info':
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{step.description}</p>
            <button
              type="button"
              onClick={() => navigate('settings')}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Settings className="h-4 w-4" />
              Configurer
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        );

      // ─── Step 2: Org info ───
      case 'org':
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{step.description}</p>
            <button
              type="button"
              onClick={() => navigate('settings')}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Building2 className="h-4 w-4" />
              Completer
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        );

      // ─── Step 3: System pages ───
      case 'pages':
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{step.description}</p>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Pages qui seront creees :
              </p>
              <ul className="space-y-1">
                {SYSTEM_PAGES.map((page) => (
                  <li
                    key={page.slug}
                    className="flex items-center gap-2 text-sm text-foreground"
                  >
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    {page.title}
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              disabled={loadingAction === 'pages'}
              onClick={generateSystemPages}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loadingAction === 'pages' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              Generer les pages
            </button>
          </div>
        );

      // ─── Step 4: Regulations ───
      case 'regulations':
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{step.description}</p>
            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
              {REGULATION_TEMPLATES.map((tpl) => (
                <label
                  key={tpl.id}
                  className="flex items-center gap-2 text-sm text-foreground cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedRegulations.includes(tpl.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRegulations((prev) => [...prev, tpl.id]);
                      } else {
                        setSelectedRegulations((prev) =>
                          prev.filter((id) => id !== tpl.id),
                        );
                      }
                    }}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary/50"
                  />
                  {tpl.label}
                </label>
              ))}
            </div>
            <button
              type="button"
              disabled={
                loadingAction === 'regulations' ||
                selectedRegulations.length === 0
              }
              onClick={generateRegulations}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loadingAction === 'regulations' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ScrollText className="h-4 w-4" />
              )}
              Generer les reglements selectionnes
            </button>
          </div>
        );

      // ─── Step 5: SMTP ───
      case 'smtp':
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{step.description}</p>

            {/* Tutorial toggle */}
            <button
              type="button"
              onClick={() => setSmtpTutorialOpen((prev) => !prev)}
              className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              {smtpTutorialOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              Tutoriel : configurer Gmail SMTP
            </button>

            {smtpTutorialOpen && (
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <ol className="space-y-2 text-sm text-foreground">
                  {SMTP_TUTORIAL.map((step, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="flex-shrink-0 font-mono text-xs text-muted-foreground">
                        {step.startsWith('  ') ? '' : `${i + 1}.`}
                      </span>
                      <span className={step.startsWith('  ') ? 'pl-4 text-muted-foreground' : ''}>
                        {step.trimStart()}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigate('settings/communication')}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Mail className="h-4 w-4" />
                Configurer SMTP
                <ExternalLink className="h-3 w-3" />
              </button>
              {!manualChecks['smtp'] && (
                <button
                  type="button"
                  onClick={() => persistManualCheck('smtp', true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
                >
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Marquer comme fait
                </button>
              )}
            </div>
          </div>
        );

      // ─── Step 6: Booth types ───
      case 'booths':
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{step.description}</p>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Mini-tutoriel :
              </p>
              <ol className="space-y-1 text-sm text-foreground">
                <li className="flex gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    1.
                  </span>
                  Cliquez sur &laquo; Nouveau type &raquo;
                </li>
                <li className="flex gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    2.
                  </span>
                  Renseignez nom, dimensions, prix
                </li>
                <li className="flex gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    3.
                  </span>
                  Activez les options (electricite, eau) si besoin
                </li>
              </ol>
            </div>
            <button
              type="button"
              onClick={() => navigate('exhibitors')}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Store className="h-4 w-4" />
              Creer des types de stands
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        );

      // ─── Step 7: Publish ───
      case 'publish':
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{step.description}</p>
            <button
              type="button"
              disabled={loadingAction === 'publish'}
              onClick={publishFestival}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
            >
              {loadingAction === 'publish' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4" />
              )}
              Publier
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="mb-8 rounded-xl border border-border bg-card shadow-sm">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 border-b border-border px-6 pt-6 pb-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-foreground">
            Guide de configuration
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Completez ces etapes pour mettre en ligne votre festival.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="flex-shrink-0 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          title="Fermer le guide"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* ── Progress bar ───────────────────────────────────────────────── */}
      <div className="px-6 pt-4 pb-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span>
            {completedCount} / {totalSteps} etapes completees
          </span>
          <span className="font-medium">{progressPercent}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* ── All done ───────────────────────────────────────────────────── */}
      {allDone && (
        <div className="mx-6 mt-4 mb-2 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-900/20">
          <PartyPopper className="h-6 w-6 text-green-600 dark:text-green-400" />
          <div>
            <p className="text-sm font-semibold text-green-700 dark:text-green-400">
              Votre festival est pret !
            </p>
            <p className="text-xs text-green-600 dark:text-green-500">
              Toutes les etapes de configuration sont completees.
            </p>
          </div>
        </div>
      )}

      {/* ── Feedback messages ──────────────────────────────────────────── */}
      {actionSuccess && (
        <div className="mx-6 mt-3 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
          {actionSuccess}
        </div>
      )}
      {actionError && (
        <div className="mx-6 mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {actionError}
        </div>
      )}

      {/* ── Steps ──────────────────────────────────────────────────────── */}
      <div className="px-6 py-4 space-y-1">
        {stepStatuses.map((step, index) => {
          const isExpanded = expandedStep === step.key;
          const Icon = step.icon;

          return (
            <div
              key={step.key}
              className={`rounded-lg border transition-colors ${
                isExpanded
                  ? 'border-primary/30 bg-primary/5 dark:border-primary/20 dark:bg-primary/5'
                  : 'border-transparent hover:bg-accent/50'
              }`}
            >
              {/* Step header */}
              <button
                type="button"
                onClick={() => toggleStep(step.key)}
                className="flex w-full items-center gap-3 px-3 py-3 text-left"
              >
                {/* Number / check */}
                <div className="flex-shrink-0">
                  {step.completed ? (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                      <CheckCircle2 className="h-4.5 w-4.5 text-green-600 dark:text-green-400" />
                    </div>
                  ) : (
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                        isExpanded
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {index + 1}
                    </div>
                  )}
                </div>

                {/* Title + icon */}
                <div className="flex flex-1 items-center gap-2 min-w-0">
                  <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <span
                    className={`text-sm font-medium truncate ${
                      step.completed
                        ? 'text-muted-foreground line-through'
                        : 'text-foreground'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>

                {/* Status badge */}
                <span
                  className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    step.completed
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}
                >
                  {step.completed ? 'Fait' : 'A faire'}
                </span>

                {/* Chevron */}
                <div className="flex-shrink-0 text-muted-foreground">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </div>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-3 pb-4 pl-13">
                  {renderStepContent(step)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <div className="border-t border-border px-6 py-4">
        <button
          type="button"
          onClick={dismiss}
          className="text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          Passer le guide
        </button>
      </div>
    </div>
  );
}
