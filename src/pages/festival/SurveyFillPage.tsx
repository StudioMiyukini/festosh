import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Star,
  ChevronLeft,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';

// --- Types ---

type BlockType =
  | 'title'
  | 'description'
  | 'short_text'
  | 'long_text'
  | 'single_choice'
  | 'multiple_choice'
  | 'dropdown'
  | 'rating'
  | 'scale'
  | 'date'
  | 'email'
  | 'number'
  | 'separator'
  | 'nps';

interface SurveyBlock {
  id: string;
  type: BlockType;
  label?: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  max_stars?: number;
  min?: number;
  max?: number;
  min_label?: string;
  max_label?: string;
  size?: 'h1' | 'h2' | 'h3';
  content?: string;
}

interface SurveyFillData {
  id: string;
  title: string;
  description: string | null;
  blocks: SurveyBlock[];
  is_active: boolean;
  is_public: boolean;
}

// --- Component ---

export function SurveyFillPage() {
  const { surveyId } = useParams<{ slug: string; surveyId: string }>();
  const { isAuthenticated, profile } = useAuthStore();

  const [survey, setSurvey] = useState<SurveyFillData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const fetchSurvey = useCallback(async () => {
    if (!surveyId) return;
    setLoading(true);
    setError(null);
    const res = await api.get<SurveyFillData>(`/surveys/${surveyId}/fill`);
    if (res.success && res.data) {
      if (!res.data.is_active) {
        setError('Ce questionnaire n\'est plus actif.');
      } else {
        setSurvey(res.data);
      }
    } else {
      setError(res.error || 'Impossible de charger le questionnaire.');
    }
    setLoading(false);
  }, [surveyId]);

  useEffect(() => {
    fetchSurvey();
  }, [fetchSurvey]);

  const setAnswer = (blockId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [blockId]: value }));
    setValidationErrors((prev) => {
      const next = { ...prev };
      delete next[blockId];
      return next;
    });
  };

  const validate = (): boolean => {
    if (!survey) return false;
    const errors: Record<string, string> = {};

    for (const block of survey.blocks) {
      if (!block.required) continue;
      const val = answers[block.id];
      if (val === undefined || val === null || val === '') {
        errors[block.id] = 'Ce champ est obligatoire.';
      } else if (Array.isArray(val) && val.length === 0) {
        errors[block.id] = 'Veuillez selectionner au moins une option.';
      }
    }

    // Guest fields for public surveys when not logged in
    if (!isAuthenticated && survey.is_public) {
      if (!guestName.trim()) {
        errors['__guest_name'] = 'Veuillez indiquer votre nom.';
      }
      if (!guestEmail.trim()) {
        errors['__guest_email'] = 'Veuillez indiquer votre email.';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!surveyId || !validate()) return;
    setSubmitting(true);
    setSubmitError(null);

    const payload: Record<string, unknown> = { answers };
    if (!isAuthenticated) {
      payload.guest_name = guestName.trim();
      payload.guest_email = guestEmail.trim();
    }

    const res = await api.post(`/surveys/${surveyId}/respond`, payload);
    setSubmitting(false);

    if (res.success) {
      setSubmitted(true);
    } else {
      if (res.error?.includes('409') || res.error?.toLowerCase().includes('already')) {
        setSubmitError('Vous avez deja repondu a ce questionnaire.');
      } else {
        setSubmitError(res.error || 'Une erreur est survenue lors de l\'envoi.');
      }
    }
  };

  // --- Loading ---
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // --- Error ---
  if (error || !survey) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <AlertCircle className="mb-3 h-10 w-10 text-destructive" />
        <p className="text-sm text-muted-foreground">{error || 'Questionnaire introuvable.'}</p>
      </div>
    );
  }

  // --- Success screen ---
  if (submitted) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="mb-2 text-xl font-bold">Merci pour votre reponse !</h2>
        <p className="text-sm text-muted-foreground">
          Votre reponse a bien ete enregistree.
        </p>
      </div>
    );
  }

  // --- Fill form ---
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{survey.title}</h1>
        {survey.description && (
          <p className="mt-2 text-sm text-muted-foreground">{survey.description}</p>
        )}
      </div>

      {/* Guest info for public + not authenticated */}
      {!isAuthenticated && survey.is_public && (
        <div className="mb-6 space-y-3 rounded-lg border bg-card p-4">
          <h3 className="text-sm font-semibold">Vos informations</h3>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Nom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={guestName}
              onChange={(e) => {
                setGuestName(e.target.value);
                setValidationErrors((prev) => {
                  const next = { ...prev };
                  delete next['__guest_name'];
                  return next;
                });
              }}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Votre nom"
            />
            {validationErrors['__guest_name'] && (
              <p className="mt-1 text-xs text-red-500">{validationErrors['__guest_name']}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={guestEmail}
              onChange={(e) => {
                setGuestEmail(e.target.value);
                setValidationErrors((prev) => {
                  const next = { ...prev };
                  delete next['__guest_email'];
                  return next;
                });
              }}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="votre@email.com"
            />
            {validationErrors['__guest_email'] && (
              <p className="mt-1 text-xs text-red-500">{validationErrors['__guest_email']}</p>
            )}
          </div>
        </div>
      )}

      {/* Blocks */}
      <div className="space-y-6">
        {survey.blocks.map((block) => (
          <FillBlock
            key={block.id}
            block={block}
            value={answers[block.id]}
            onChange={(val) => setAnswer(block.id, val)}
            error={validationErrors[block.id]}
          />
        ))}
      </div>

      {/* Submit */}
      {submitError && (
        <div className="mt-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {submitError}
        </div>
      )}

      <div className="mt-8">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 sm:w-auto"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Envoyer mes reponses
        </button>
      </div>
    </div>
  );
}

// --- Fill Block Component ---

function FillBlock({
  block,
  value,
  onChange,
  error,
}: {
  block: SurveyBlock;
  value: unknown;
  onChange: (val: unknown) => void;
  error?: string;
}) {
  switch (block.type) {
    // --- Display-only blocks ---

    case 'title': {
      const Tag = block.size === 'h1' ? 'h1' : block.size === 'h3' ? 'h3' : 'h2';
      const sizeClass =
        block.size === 'h1'
          ? 'text-2xl font-bold'
          : block.size === 'h3'
          ? 'text-lg font-semibold'
          : 'text-xl font-bold';
      return <Tag className={sizeClass}>{block.content}</Tag>;
    }

    case 'description':
      return <p className="text-sm text-muted-foreground leading-relaxed">{block.content}</p>;

    case 'separator':
      return <hr className="border-muted-foreground/20" />;

    // --- Input blocks ---

    case 'short_text':
      return (
        <FieldWrapper label={block.label} required={block.required} error={error}>
          <input
            type="text"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={block.placeholder || ''}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </FieldWrapper>
      );

    case 'long_text':
      return (
        <FieldWrapper label={block.label} required={block.required} error={error}>
          <textarea
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={block.placeholder || ''}
            rows={4}
            className="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </FieldWrapper>
      );

    case 'single_choice':
      return (
        <FieldWrapper label={block.label} required={block.required} error={error}>
          <div className="space-y-2">
            {(block.options || []).map((opt, i) => (
              <label key={i} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={`radio_${block.id}`}
                  checked={value === opt}
                  onChange={() => onChange(opt)}
                  className="h-4 w-4 text-primary"
                />
                {opt}
              </label>
            ))}
          </div>
        </FieldWrapper>
      );

    case 'multiple_choice': {
      const selected = (value as string[]) ?? [];
      return (
        <FieldWrapper label={block.label} required={block.required} error={error}>
          <div className="space-y-2">
            {(block.options || []).map((opt, i) => (
              <label key={i} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onChange([...selected, opt]);
                    } else {
                      onChange(selected.filter((s) => s !== opt));
                    }
                  }}
                  className="h-4 w-4 rounded text-primary"
                />
                {opt}
              </label>
            ))}
          </div>
        </FieldWrapper>
      );
    }

    case 'dropdown':
      return (
        <FieldWrapper label={block.label} required={block.required} error={error}>
          <select
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">-- Selectionnez --</option>
            {(block.options || []).map((opt, i) => (
              <option key={i} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </FieldWrapper>
      );

    case 'rating': {
      const maxStars = block.max_stars ?? 5;
      const currentRating = (value as number) ?? 0;
      return (
        <FieldWrapper label={block.label} required={block.required} error={error}>
          <div className="flex gap-1">
            {Array.from({ length: maxStars }).map((_, i) => {
              const starVal = i + 1;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onChange(starVal)}
                  className="p-0.5 transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-7 w-7 ${
                      starVal <= currentRating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground/30 hover:text-yellow-300'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </FieldWrapper>
      );
    }

    case 'scale': {
      const min = block.min ?? 1;
      const max = block.max ?? 10;
      const currentVal = value as number | undefined;
      const count = max - min + 1;
      return (
        <FieldWrapper label={block.label} required={block.required} error={error}>
          <div>
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: count }).map((_, i) => {
                const num = min + i;
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => onChange(num)}
                    className={`flex h-9 min-w-[2.25rem] items-center justify-center rounded border text-sm font-medium transition-colors ${
                      currentVal === num
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background hover:bg-accent'
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
            {(block.min_label || block.max_label) && (
              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <span>{block.min_label || ''}</span>
                <span>{block.max_label || ''}</span>
              </div>
            )}
          </div>
        </FieldWrapper>
      );
    }

    case 'date':
      return (
        <FieldWrapper label={block.label} required={block.required} error={error}>
          <input
            type="date"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </FieldWrapper>
      );

    case 'email':
      return (
        <FieldWrapper label={block.label} required={block.required} error={error}>
          <input
            type="email"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="email@exemple.com"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </FieldWrapper>
      );

    case 'number':
      return (
        <FieldWrapper label={block.label} required={block.required} error={error}>
          <input
            type="number"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
            min={block.min}
            max={block.max}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </FieldWrapper>
      );

    case 'nps': {
      const npsVal = value as number | undefined;
      return (
        <FieldWrapper label={block.label} required={block.required} error={error}>
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: 11 }).map((_, i) => {
              const bgColor =
                i <= 6
                  ? npsVal === i
                    ? 'bg-red-500 text-white border-red-500'
                    : 'border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950'
                  : i <= 8
                  ? npsVal === i
                    ? 'bg-yellow-500 text-white border-yellow-500'
                    : 'border-yellow-300 text-yellow-700 hover:bg-yellow-50 dark:border-yellow-800 dark:text-yellow-400 dark:hover:bg-yellow-950'
                  : npsVal === i
                  ? 'bg-green-500 text-white border-green-500'
                  : 'border-green-300 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950';

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onChange(i)}
                  className={`flex h-10 min-w-[2.5rem] items-center justify-center rounded border text-sm font-semibold transition-colors ${bgColor}`}
                >
                  {i}
                </button>
              );
            })}
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>Pas du tout probable</span>
            <span>Tres probable</span>
          </div>
        </FieldWrapper>
      );
    }

    default:
      return null;
  }
}

// --- Field Wrapper ---

function FieldWrapper({
  label,
  required,
  error,
  children,
}: {
  label?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
