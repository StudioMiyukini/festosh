import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  ArrowLeft,
  GripVertical,
  Copy,
  Save,
  BarChart3,
  FileText,
  ChevronDown,
  ChevronRight,
  Type,
  AlignLeft,
  TextCursorInput,
  AlignJustify,
  CircleDot,
  CheckSquare,
  List,
  Star,
  SlidersHorizontal,
  Calendar,
  Mail,
  Hash,
  Minus,
  ThumbsUp,
  X,
} from 'lucide-react';
import { useTenantStore } from '@/stores/tenant-store';
import { api } from '@/lib/api-client';
import { formatTimestamp } from '@/lib/format-utils';

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

interface Survey {
  id: string;
  festival_id: string;
  title: string;
  description: string | null;
  blocks: SurveyBlock[];
  is_active: boolean;
  is_public: boolean;
  response_count: number;
  created_at: number;
}

interface SurveyResponse {
  id: string;
  respondent_name: string | null;
  respondent_email: string | null;
  answers: Record<string, unknown>;
  created_at: number;
}

interface BlockAnalytics {
  block_id: string;
  block_type: BlockType;
  label: string;
  average?: number;
  nps_score?: number;
  distribution?: Record<string, number>;
  sample_answers?: string[];
  total_answers: number;
}

interface SurveyAnalytics {
  total_responses: number;
  completion_rate: number;
  blocks: BlockAnalytics[];
}

// --- Constants ---

const BLOCK_TYPE_META: Record<BlockType, { label: string; icon: typeof Type }> = {
  title: { label: 'Titre', icon: Type },
  description: { label: 'Description', icon: AlignLeft },
  short_text: { label: 'Texte court', icon: TextCursorInput },
  long_text: { label: 'Texte long', icon: AlignJustify },
  single_choice: { label: 'Choix unique', icon: CircleDot },
  multiple_choice: { label: 'Choix multiple', icon: CheckSquare },
  dropdown: { label: 'Liste deroulante', icon: List },
  rating: { label: 'Notation', icon: Star },
  scale: { label: 'Echelle', icon: SlidersHorizontal },
  date: { label: 'Date', icon: Calendar },
  email: { label: 'Email', icon: Mail },
  number: { label: 'Nombre', icon: Hash },
  separator: { label: 'Separateur', icon: Minus },
  nps: { label: 'NPS', icon: ThumbsUp },
};

let _blockIdCounter = 0;
function generateBlockId(): string {
  _blockIdCounter += 1;
  return `block_${Date.now()}_${_blockIdCounter}`;
}

function createEmptyBlock(type: BlockType): SurveyBlock {
  const base: SurveyBlock = { id: generateBlockId(), type };
  switch (type) {
    case 'title':
      return { ...base, content: '', size: 'h2' };
    case 'description':
      return { ...base, content: '' };
    case 'short_text':
    case 'long_text':
    case 'date':
    case 'email':
      return { ...base, label: '', placeholder: '', required: false };
    case 'single_choice':
    case 'multiple_choice':
    case 'dropdown':
      return { ...base, label: '', options: ['Option 1'], required: false };
    case 'rating':
      return { ...base, label: '', max_stars: 5, required: false };
    case 'scale':
      return { ...base, label: '', min: 1, max: 10, min_label: '', max_label: '', required: false };
    case 'number':
      return { ...base, label: '', min: undefined, max: undefined, required: false };
    case 'nps':
      return { ...base, label: '', required: false };
    case 'separator':
      return base;
    default:
      return base;
  }
}

// --- Component ---

export function AdminSurveysPage() {
  const { festival } = useTenantStore();

  // List state
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editor state
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorDescription, setEditorDescription] = useState('');
  const [editorBlocks, setEditorBlocks] = useState<SurveyBlock[]>([]);
  const [editorActive, setEditorActive] = useState(false);
  const [editorPublic, setEditorPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editorTab, setEditorTab] = useState<'editor' | 'responses'>('editor');
  const [showAddBlock, setShowAddBlock] = useState(false);

  // Responses state
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [responsesLoading, setResponsesLoading] = useState(false);
  const [expandedResponse, setExpandedResponse] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<SurveyAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // --- Fetchers ---

  const fetchSurveys = useCallback(async () => {
    if (!festival) return;
    setLoading(true);
    setError(null);
    const res = await api.get<Survey[]>(`/surveys/festival/${festival.id}`);
    if (res.success && res.data) {
      setSurveys(res.data);
    } else {
      setError(res.error || 'Impossible de charger les questionnaires.');
    }
    setLoading(false);
  }, [festival]);

  useEffect(() => {
    fetchSurveys();
  }, [fetchSurveys]);

  const fetchResponses = useCallback(async (surveyId: string) => {
    setResponsesLoading(true);
    const res = await api.get<SurveyResponse[]>(`/surveys/${surveyId}/responses`);
    if (res.success && res.data) {
      setResponses(res.data);
    }
    setResponsesLoading(false);
  }, []);

  const fetchAnalytics = useCallback(async (surveyId: string) => {
    setAnalyticsLoading(true);
    const res = await api.get<SurveyAnalytics>(`/surveys/${surveyId}/analytics`);
    if (res.success && res.data) {
      setAnalytics(res.data);
    }
    setAnalyticsLoading(false);
  }, []);

  // --- Handlers ---

  const openEditor = async (survey: Survey) => {
    const res = await api.get<Survey>(`/surveys/${survey.id}`);
    const data = res.success && res.data ? res.data : survey;
    setSelectedSurvey(data);
    setEditorTitle(data.title);
    setEditorDescription(data.description || '');
    setEditorBlocks(data.blocks || []);
    setEditorActive(data.is_active);
    setEditorPublic(data.is_public);
    setEditorTab('editor');
    setResponses([]);
    setAnalytics(null);
  };

  const handleCreate = async () => {
    if (!festival) return;
    const res = await api.post<Survey>(`/surveys/festival/${festival.id}`, {
      title: 'Nouveau questionnaire',
      description: '',
      blocks: [],
      is_active: false,
      is_public: false,
    });
    if (res.success && res.data) {
      await fetchSurveys();
      openEditor(res.data);
    }
  };

  const handleSave = async () => {
    if (!selectedSurvey) return;
    setSaving(true);
    await api.put(`/surveys/${selectedSurvey.id}`, {
      title: editorTitle,
      description: editorDescription || null,
      blocks: editorBlocks,
      is_active: editorActive,
      is_public: editorPublic,
    });
    setSaving(false);
    await fetchSurveys();
  };

  const handleDelete = async (survey: Survey) => {
    if (!confirm(`Supprimer le questionnaire "${survey.title}" ?`)) return;
    await api.delete(`/surveys/${survey.id}`);
    if (selectedSurvey?.id === survey.id) {
      setSelectedSurvey(null);
    }
    await fetchSurveys();
  };

  const handleDuplicate = async (survey: Survey) => {
    if (!festival) return;
    const source = await api.get<Survey>(`/surveys/${survey.id}`);
    const data = source.success && source.data ? source.data : survey;
    await api.post(`/surveys/festival/${festival.id}`, {
      title: `${data.title} (copie)`,
      description: data.description,
      blocks: data.blocks,
      is_active: false,
      is_public: data.is_public,
    });
    await fetchSurveys();
  };

  const goBackToList = () => {
    setSelectedSurvey(null);
  };

  const switchToResponses = () => {
    if (!selectedSurvey) return;
    setEditorTab('responses');
    fetchResponses(selectedSurvey.id);
    fetchAnalytics(selectedSurvey.id);
  };

  // --- Block manipulation ---

  const addBlock = (type: BlockType) => {
    setEditorBlocks((prev) => [...prev, createEmptyBlock(type)]);
    setShowAddBlock(false);
  };

  const removeBlock = (blockId: string) => {
    setEditorBlocks((prev) => prev.filter((b) => b.id !== blockId));
  };

  const updateBlock = (blockId: string, patch: Partial<SurveyBlock>) => {
    setEditorBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, ...patch } : b)));
  };

  const addOption = (blockId: string) => {
    setEditorBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId
          ? { ...b, options: [...(b.options || []), `Option ${(b.options?.length || 0) + 1}`] }
          : b
      )
    );
  };

  const removeOption = (blockId: string, index: number) => {
    setEditorBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId ? { ...b, options: (b.options || []).filter((_, i) => i !== index) } : b
      )
    );
  };

  const updateOption = (blockId: string, index: number, value: string) => {
    setEditorBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId
          ? { ...b, options: (b.options || []).map((o, i) => (i === index ? value : o)) }
          : b
      )
    );
  };

  // --- Guard ---

  if (!festival) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // --- Editor View ---

  if (selectedSurvey) {
    return (
      <div className="space-y-0">
        {/* Sticky top bar */}
        <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <button
              onClick={goBackToList}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </button>
            <div className="mx-2 h-5 w-px bg-border" />
            <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
              <input
                type="text"
                value={editorTitle}
                onChange={(e) => setEditorTitle(e.target.value)}
                className="border-none bg-transparent text-lg font-semibold outline-none focus:ring-0"
                placeholder="Titre du questionnaire"
              />
              <input
                type="text"
                value={editorDescription}
                onChange={(e) => setEditorDescription(e.target.value)}
                className="border-none bg-transparent text-sm text-muted-foreground outline-none focus:ring-0"
                placeholder="Description (optionnelle)"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={editorActive}
                  onChange={(e) => setEditorActive(e.target.checked)}
                  className="rounded"
                />
                Actif
              </label>
              <label className="flex items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={editorPublic}
                  onChange={(e) => setEditorPublic(e.target.checked)}
                  className="rounded"
                />
                Public
              </label>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Enregistrer
              </button>
            </div>
          </div>
          {/* Tab toggle */}
          <div className="flex gap-0 border-t px-4 sm:px-6">
            <button
              onClick={() => setEditorTab('editor')}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                editorTab === 'editor'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText className="mr-1.5 inline h-4 w-4" />
              Editeur
            </button>
            <button
              onClick={switchToResponses}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                editorTab === 'responses'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <BarChart3 className="mr-1.5 inline h-4 w-4" />
              Reponses
            </button>
          </div>
        </div>

        {editorTab === 'editor' ? (
          <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6">
            {/* Blocks */}
            {editorBlocks.map((block, idx) => (
              <BlockEditor
                key={block.id}
                block={block}
                index={idx}
                onUpdate={(patch) => updateBlock(block.id, patch)}
                onRemove={() => removeBlock(block.id)}
                onAddOption={() => addOption(block.id)}
                onRemoveOption={(i) => removeOption(block.id, i)}
                onUpdateOption={(i, v) => updateOption(block.id, i, v)}
              />
            ))}

            {editorBlocks.length === 0 && (
              <div className="rounded-lg border-2 border-dashed p-12 text-center text-muted-foreground">
                <FileText className="mx-auto mb-3 h-10 w-10 opacity-40" />
                <p className="text-sm">Aucun bloc. Ajoutez des blocs pour construire votre questionnaire.</p>
              </div>
            )}

            {/* Add block */}
            <div className="relative">
              <button
                onClick={() => setShowAddBlock(!showAddBlock)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-3 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary"
              >
                <Plus className="h-4 w-4" />
                Ajouter un bloc
              </button>
              {showAddBlock && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-80 overflow-y-auto rounded-lg border bg-popover p-2 shadow-lg">
                  {(Object.keys(BLOCK_TYPE_META) as BlockType[]).map((type) => {
                    const meta = BLOCK_TYPE_META[type];
                    const Icon = meta.icon;
                    return (
                      <button
                        key={type}
                        onClick={() => addBlock(type)}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                      >
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <ResponsesView
            surveyId={selectedSurvey.id}
            blocks={editorBlocks}
            responses={responses}
            responsesLoading={responsesLoading}
            analytics={analytics}
            analyticsLoading={analyticsLoading}
            expandedResponse={expandedResponse}
            setExpandedResponse={setExpandedResponse}
          />
        )}
      </div>
    );
  }

  // --- List View ---

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
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Questionnaires</h1>
        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nouveau questionnaire
        </button>
      </div>

      {surveys.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed p-12 text-center text-muted-foreground">
          <FileText className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p className="mb-1 text-sm font-medium">Aucun questionnaire</p>
          <p className="text-xs">Creez votre premier questionnaire pour commencer a collecter des reponses.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {surveys.map((survey) => (
            <div
              key={survey.id}
              className="group rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-3 flex items-start justify-between">
                <button
                  onClick={() => openEditor(survey)}
                  className="text-left"
                >
                  <h3 className="font-semibold group-hover:text-primary">{survey.title}</h3>
                </button>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    survey.is_active
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  {survey.is_active ? 'Actif' : 'Inactif'}
                </span>
              </div>
              <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
                <span>{survey.blocks?.length ?? 0} blocs</span>
                <span>{survey.response_count ?? 0} reponses</span>
              </div>
              <p className="mb-4 text-xs text-muted-foreground">
                Cree le {formatTimestamp(survey.created_at)}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditor(survey)}
                  className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                >
                  Modifier
                </button>
                <button
                  onClick={() => handleDuplicate(survey)}
                  className="rounded-md border p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                  title="Dupliquer"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(survey)}
                  className="rounded-md border p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title="Supprimer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Block Editor Component ---

function BlockEditor({
  block,
  index,
  onUpdate,
  onRemove,
  onAddOption,
  onRemoveOption,
  onUpdateOption,
}: {
  block: SurveyBlock;
  index: number;
  onUpdate: (patch: Partial<SurveyBlock>) => void;
  onRemove: () => void;
  onAddOption: () => void;
  onRemoveOption: (i: number) => void;
  onUpdateOption: (i: number, v: string) => void;
}) {
  const meta = BLOCK_TYPE_META[block.type];
  const Icon = meta.icon;

  const renderContent = () => {
    switch (block.type) {
      case 'title':
        return (
          <div className="space-y-2">
            <input
              type="text"
              value={block.content || ''}
              onChange={(e) => onUpdate({ content: e.target.value })}
              className="w-full rounded-md border bg-background px-3 py-2 text-lg font-bold outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Texte du titre"
            />
            <select
              value={block.size || 'h2'}
              onChange={(e) => onUpdate({ size: e.target.value as 'h1' | 'h2' | 'h3' })}
              className="rounded-md border bg-background px-2 py-1 text-xs"
            >
              <option value="h1">H1 - Grand</option>
              <option value="h2">H2 - Moyen</option>
              <option value="h3">H3 - Petit</option>
            </select>
          </div>
        );

      case 'description':
        return (
          <textarea
            value={block.content || ''}
            onChange={(e) => onUpdate({ content: e.target.value })}
            className="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Texte descriptif"
            rows={3}
          />
        );

      case 'short_text':
      case 'long_text':
      case 'date':
      case 'email':
        return (
          <div className="space-y-2">
            <input
              type="text"
              value={block.label || ''}
              onChange={(e) => onUpdate({ label: e.target.value })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Libelle de la question"
            />
            {(block.type === 'short_text' || block.type === 'long_text') && (
              <input
                type="text"
                value={block.placeholder || ''}
                onChange={(e) => onUpdate({ placeholder: e.target.value })}
                className="w-full rounded-md border bg-background px-3 py-1.5 text-xs text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Placeholder (optionnel)"
              />
            )}
          </div>
        );

      case 'single_choice':
      case 'multiple_choice':
      case 'dropdown':
        return (
          <div className="space-y-2">
            <input
              type="text"
              value={block.label || ''}
              onChange={(e) => onUpdate({ label: e.target.value })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Libelle de la question"
            />
            <div className="space-y-1.5 pl-1">
              {(block.options || []).map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  {block.type === 'single_choice' && (
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                  )}
                  {block.type === 'multiple_choice' && (
                    <div className="h-4 w-4 rounded border-2 border-muted-foreground/30" />
                  )}
                  {block.type === 'dropdown' && (
                    <span className="text-xs text-muted-foreground">{i + 1}.</span>
                  )}
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => onUpdateOption(i, e.target.value)}
                    className="flex-1 rounded border bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    onClick={() => onRemoveOption(i)}
                    className="p-1 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={onAddOption}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Plus className="h-3 w-3" />
                Ajouter une option
              </button>
            </div>
          </div>
        );

      case 'rating':
        return (
          <div className="space-y-2">
            <input
              type="text"
              value={block.label || ''}
              onChange={(e) => onUpdate({ label: e.target.value })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Libelle de la question"
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Nombre d'etoiles :</span>
              <select
                value={block.max_stars ?? 5}
                onChange={(e) => onUpdate({ max_stars: Number(e.target.value) })}
                className="rounded-md border bg-background px-2 py-1 text-xs"
              >
                <option value={3}>3</option>
                <option value={5}>5</option>
                <option value={10}>10</option>
              </select>
              <div className="ml-2 flex gap-0.5">
                {Array.from({ length: block.max_stars ?? 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 text-yellow-400" />
                ))}
              </div>
            </div>
          </div>
        );

      case 'scale':
        return (
          <div className="space-y-2">
            <input
              type="text"
              value={block.label || ''}
              onChange={(e) => onUpdate({ label: e.target.value })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Libelle de la question"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-0.5 block text-xs text-muted-foreground">Min</label>
                <input
                  type="number"
                  value={block.min ?? 1}
                  onChange={(e) => onUpdate({ min: Number(e.target.value) })}
                  className="w-full rounded-md border bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="mb-0.5 block text-xs text-muted-foreground">Max</label>
                <input
                  type="number"
                  value={block.max ?? 10}
                  onChange={(e) => onUpdate({ max: Number(e.target.value) })}
                  className="w-full rounded-md border bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="mb-0.5 block text-xs text-muted-foreground">Label min</label>
                <input
                  type="text"
                  value={block.min_label || ''}
                  onChange={(e) => onUpdate({ min_label: e.target.value })}
                  className="w-full rounded-md border bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="ex: Pas du tout"
                />
              </div>
              <div>
                <label className="mb-0.5 block text-xs text-muted-foreground">Label max</label>
                <input
                  type="text"
                  value={block.max_label || ''}
                  onChange={(e) => onUpdate({ max_label: e.target.value })}
                  className="w-full rounded-md border bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="ex: Tout a fait"
                />
              </div>
            </div>
          </div>
        );

      case 'number':
        return (
          <div className="space-y-2">
            <input
              type="text"
              value={block.label || ''}
              onChange={(e) => onUpdate({ label: e.target.value })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Libelle de la question"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-0.5 block text-xs text-muted-foreground">Min (optionnel)</label>
                <input
                  type="number"
                  value={block.min ?? ''}
                  onChange={(e) =>
                    onUpdate({ min: e.target.value === '' ? undefined : Number(e.target.value) })
                  }
                  className="w-full rounded-md border bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="mb-0.5 block text-xs text-muted-foreground">Max (optionnel)</label>
                <input
                  type="number"
                  value={block.max ?? ''}
                  onChange={(e) =>
                    onUpdate({ max: e.target.value === '' ? undefined : Number(e.target.value) })
                  }
                  className="w-full rounded-md border bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          </div>
        );

      case 'separator':
        return <hr className="my-2 border-muted-foreground/20" />;

      case 'nps':
        return (
          <div className="space-y-2">
            <input
              type="text"
              value={block.label || ''}
              onChange={(e) => onUpdate({ label: e.target.value })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Libelle de la question (ex: Recommanderiez-vous cet evenement ?)"
            />
            <div className="flex gap-1">
              {Array.from({ length: 11 }).map((_, i) => (
                <div
                  key={i}
                  className={`flex h-8 w-8 items-center justify-center rounded text-xs font-medium text-white ${
                    i <= 6 ? 'bg-red-400' : i <= 8 ? 'bg-yellow-400 text-yellow-900' : 'bg-green-500'
                  }`}
                >
                  {i}
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const hasRequired = [
    'short_text',
    'long_text',
    'single_choice',
    'multiple_choice',
    'dropdown',
    'rating',
    'scale',
    'date',
    'email',
    'number',
    'nps',
  ].includes(block.type);

  return (
    <div className="group rounded-lg border bg-card p-4 shadow-sm">
      {/* Block header */}
      <div className="mb-3 flex items-center gap-2">
        <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground/40" />
        <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          <Icon className="h-3 w-3" />
          {meta.label}
        </span>
        <span className="text-xs text-muted-foreground">#{index + 1}</span>
        <div className="flex-1" />
        {hasRequired && (
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={block.required ?? false}
              onChange={(e) => onUpdate({ required: e.target.checked })}
              className="rounded"
            />
            Obligatoire
          </label>
        )}
        <button
          onClick={onRemove}
          className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {/* Block content */}
      {renderContent()}
    </div>
  );
}

// --- Responses View Component ---

function ResponsesView({
  surveyId,
  blocks,
  responses,
  responsesLoading,
  analytics,
  analyticsLoading,
  expandedResponse,
  setExpandedResponse,
}: {
  surveyId: string;
  blocks: SurveyBlock[];
  responses: SurveyResponse[];
  responsesLoading: boolean;
  analytics: SurveyAnalytics | null;
  analyticsLoading: boolean;
  expandedResponse: string | null;
  setExpandedResponse: (id: string | null) => void;
}) {
  const blockLabelMap = blocks.reduce<Record<string, string>>((acc, b) => {
    acc[b.id] = b.label || b.content || BLOCK_TYPE_META[b.type].label;
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
      {/* Stats cards */}
      {analytics && (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">Total reponses</p>
            <p className="text-2xl font-bold">{analytics.total_responses}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">Taux de completion</p>
            <p className="text-2xl font-bold">{Math.round(analytics.completion_rate)}%</p>
          </div>
        </div>
      )}

      {/* Responses table */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Reponses individuelles</h2>
        {responsesLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : responses.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Aucune reponse pour le moment.</p>
        ) : (
          <div className="space-y-2">
            {responses.map((resp) => (
              <div key={resp.id} className="rounded-lg border bg-card">
                <button
                  onClick={() =>
                    setExpandedResponse(expandedResponse === resp.id ? null : resp.id)
                  }
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  {expandedResponse === resp.id ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="flex-1 text-sm font-medium">
                    {resp.respondent_name || resp.respondent_email || 'Anonyme'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatTimestamp(resp.created_at)}
                  </span>
                </button>
                {expandedResponse === resp.id && (
                  <div className="border-t px-4 py-3">
                    <div className="space-y-2">
                      {Object.entries(resp.answers).map(([blockId, value]) => (
                        <div key={blockId} className="text-sm">
                          <span className="font-medium text-muted-foreground">
                            {blockLabelMap[blockId] || blockId} :
                          </span>{' '}
                          <span>
                            {Array.isArray(value) ? (value as string[]).join(', ') : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Analytics */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Analytiques</h2>
        {analyticsLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !analytics || analytics.blocks.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Pas assez de donnees pour afficher les analytiques.
          </p>
        ) : (
          <div className="space-y-4">
            {analytics.blocks.map((ba) => (
              <div key={ba.block_id} className="rounded-lg border bg-card p-4">
                <h3 className="mb-2 text-sm font-semibold">{ba.label}</h3>
                <p className="mb-2 text-xs text-muted-foreground">{ba.total_answers} reponses</p>

                {/* Average (rating, scale, number) */}
                {ba.average !== undefined && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Moyenne :</span>
                    <span className="text-lg font-bold text-primary">{ba.average.toFixed(1)}</span>
                    {ba.block_type === 'rating' && (
                      <div className="ml-1 flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < Math.round(ba.average!)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-muted-foreground/30'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* NPS score */}
                {ba.nps_score !== undefined && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Score NPS :</span>
                    <span
                      className={`text-lg font-bold ${
                        ba.nps_score >= 50
                          ? 'text-green-600'
                          : ba.nps_score >= 0
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}
                    >
                      {ba.nps_score}
                    </span>
                  </div>
                )}

                {/* Distribution (choices) */}
                {ba.distribution && (
                  <div className="mt-2 space-y-1.5">
                    {Object.entries(ba.distribution).map(([option, count]) => {
                      const maxCount = Math.max(...Object.values(ba.distribution!), 1);
                      const pct = Math.round((count / maxCount) * 100);
                      return (
                        <div key={option} className="flex items-center gap-2">
                          <span className="w-32 truncate text-xs">{option}</span>
                          <div className="flex-1">
                            <div className="h-5 overflow-hidden rounded bg-muted">
                              <div
                                className="h-full rounded bg-primary/70 transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                          <span className="w-10 text-right text-xs font-medium">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Sample text answers */}
                {ba.sample_answers && ba.sample_answers.length > 0 && (
                  <div className="mt-2">
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      Exemples de reponses :
                    </p>
                    <ul className="space-y-1">
                      {ba.sample_answers.map((ans, i) => (
                        <li key={i} className="rounded bg-muted px-2 py-1 text-xs italic">
                          "{ans}"
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
