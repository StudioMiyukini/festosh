import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Table2,
  Calendar,
  LayoutList,
  Plus,
  Loader2,
  AlertCircle,
  ChevronRight,
  Clock,
  User,
} from 'lucide-react';
import { useTenantStore } from '@/stores/tenant-store';
import { api, ApiClient } from '@/lib/api-client';
import { formatTimestamp } from '@/lib/format-utils';

// ─── Types ──────────────────────────────────────────────────────────────────

interface WorkspaceDoc {
  id: string;
  title: string;
  last_editor_name: string | null;
  updated_at: number;
}

interface WorkspaceSheet {
  id: string;
  title: string;
  row_count: number;
  updated_at: number;
}

interface WorkspaceCalendarEvent {
  id: string;
  title: string;
  starts_at: number;
  ends_at: number;
  color: string | null;
}

interface WorkspaceTaskBoard {
  id: string;
  title: string;
  task_count: number;
  updated_at: number;
}

// ─── Section Card Component ─────────────────────────────────────────────────

function SectionCard({
  icon: Icon,
  title,
  count,
  loading,
  error,
  onRetry,
  onCreate,
  createLabel,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  count: number;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onCreate: () => void;
  createLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm flex flex-col">
      {/* Card header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900">{title}</h3>
          {!loading && !error && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              {count}
            </span>
          )}
        </div>
        <button
          onClick={onCreate}
          className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          {createLabel}
        </button>
      </div>

      {/* Card body */}
      <div className="flex-1 p-4 min-h-[160px]">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
            <button
              onClick={onRetry}
              className="text-xs text-blue-600 underline hover:text-blue-800"
            >
              Reessayer
            </button>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function AdminWorkspacePage() {
  const { festival } = useTenantStore();
  const navigate = useNavigate();

  // Docs state
  const [docs, setDocs] = useState<WorkspaceDoc[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [docsError, setDocsError] = useState<string | null>(null);

  // Sheets state
  const [sheets, setSheets] = useState<WorkspaceSheet[]>([]);
  const [sheetsLoading, setSheetsLoading] = useState(true);
  const [sheetsError, setSheetsError] = useState<string | null>(null);

  // Calendar state
  const [calEvents, setCalEvents] = useState<WorkspaceCalendarEvent[]>([]);
  const [calLoading, setCalLoading] = useState(true);
  const [calError, setCalError] = useState<string | null>(null);

  // Tasks state
  const [taskBoards, setTaskBoards] = useState<WorkspaceTaskBoard[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);

  // Creating state
  const [creating, setCreating] = useState<string | null>(null);

  const slug = festival?.slug;
  const festivalId = festival?.id;

  // ─── Fetch functions ────────────────────────────────────────────────────

  const fetchDocs = useCallback(async () => {
    if (!festivalId) return;
    setDocsLoading(true);
    setDocsError(null);
    const res = await api.get<WorkspaceDoc[]>(`/workspace-docs/festival/${festivalId}`);
    if (res.success && res.data) {
      setDocs(res.data);
    } else {
      setDocsError(res.error || 'Impossible de charger les documents.');
    }
    setDocsLoading(false);
  }, [festivalId]);

  const fetchSheets = useCallback(async () => {
    if (!festivalId) return;
    setSheetsLoading(true);
    setSheetsError(null);
    const res = await api.get<WorkspaceSheet[]>(`/workspace-sheets/festival/${festivalId}`);
    if (res.success && res.data) {
      setSheets(res.data);
    } else {
      setSheetsError(res.error || 'Impossible de charger les tableurs.');
    }
    setSheetsLoading(false);
  }, [festivalId]);

  const fetchCalendar = useCallback(async () => {
    if (!festivalId) return;
    setCalLoading(true);
    setCalError(null);
    const now = new Date();
    const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const qs = ApiClient.queryString({
      start: now.toISOString(),
      end: end.toISOString(),
    });
    const res = await api.get<WorkspaceCalendarEvent[]>(
      `/workspace-calendar/festival/${festivalId}/events${qs}`
    );
    if (res.success && res.data) {
      setCalEvents(res.data);
    } else {
      setCalError(res.error || 'Impossible de charger le calendrier.');
    }
    setCalLoading(false);
  }, [festivalId]);

  const fetchTaskBoards = useCallback(async () => {
    if (!festivalId) return;
    setTasksLoading(true);
    setTasksError(null);
    const res = await api.get<WorkspaceTaskBoard[]>(`/workspace-tasks/festival/${festivalId}`);
    if (res.success && res.data) {
      setTaskBoards(res.data);
    } else {
      setTasksError(res.error || 'Impossible de charger les tableaux.');
    }
    setTasksLoading(false);
  }, [festivalId]);

  useEffect(() => {
    fetchDocs();
    fetchSheets();
    fetchCalendar();
    fetchTaskBoards();
  }, [fetchDocs, fetchSheets, fetchCalendar, fetchTaskBoards]);

  // ─── Create functions ───────────────────────────────────────────────────

  const createDoc = async () => {
    if (!festivalId || creating) return;
    setCreating('doc');
    const res = await api.post<WorkspaceDoc>(`/workspace-docs/festival/${festivalId}`, {
      title: 'Sans titre',
    });
    if (res.success && res.data) {
      navigate(`/f/${slug}/admin/workspace/docs/${res.data.id}`);
    } else {
      setDocsError(res.error || 'Impossible de creer le document.');
    }
    setCreating(null);
  };

  const createSheet = async () => {
    if (!festivalId || creating) return;
    setCreating('sheet');
    const res = await api.post<WorkspaceSheet>(`/workspace-sheets/festival/${festivalId}`, {
      title: 'Sans titre',
    });
    if (res.success && res.data) {
      navigate(`/f/${slug}/admin/workspace/sheets/${res.data.id}`);
    } else {
      setSheetsError(res.error || 'Impossible de creer le tableur.');
    }
    setCreating(null);
  };

  const createTaskBoard = async () => {
    if (!festivalId || creating) return;
    setCreating('task');
    const res = await api.post<WorkspaceTaskBoard>(`/workspace-tasks/festival/${festivalId}`, {
      title: 'Nouveau tableau',
    });
    if (res.success && res.data) {
      navigate(`/f/${slug}/admin/workspace/tasks/${res.data.id}`);
    } else {
      setTasksError(res.error || 'Impossible de creer le tableau.');
    }
    setCreating(null);
  };

  // ─── Helpers ────────────────────────────────────────────────────────────

  function formatEventTime(ts: number): string {
    return new Date(ts * 1000).toLocaleString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // ─── Guard ──────────────────────────────────────────────────────────────

  if (!festival) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Chargement du festival...
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Espace de travail</h1>
        <p className="mt-1 text-sm text-gray-500">
          Documents, tableurs, calendrier et tableaux de taches collaboratifs pour votre equipe.
        </p>
      </div>

      {/* 2x2 Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ── Documents ─────────────────────────────────────────────── */}
        <SectionCard
          icon={FileText}
          title="Documents"
          count={docs.length}
          loading={docsLoading}
          error={docsError}
          onRetry={fetchDocs}
          onCreate={createDoc}
          createLabel={creating === 'doc' ? 'Creation...' : 'Nouveau document'}
        >
          {docs.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">
              Aucun document. Creez votre premier document collaboratif.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {docs.map((doc) => (
                <li key={doc.id}>
                  <button
                    onClick={() => navigate(`/f/${slug}/admin/workspace/docs/${doc.id}`)}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-gray-50 transition-colors"
                  >
                    <FileText className="h-4 w-4 flex-shrink-0 text-blue-500" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{doc.title}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {doc.last_editor_name && (
                          <>
                            <User className="h-3 w-3" />
                            <span>{doc.last_editor_name}</span>
                            <span>·</span>
                          </>
                        )}
                        <Clock className="h-3 w-3" />
                        <span>{formatTimestamp(doc.updated_at)}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* ── Tableurs ──────────────────────────────────────────────── */}
        <SectionCard
          icon={Table2}
          title="Tableurs"
          count={sheets.length}
          loading={sheetsLoading}
          error={sheetsError}
          onRetry={fetchSheets}
          onCreate={createSheet}
          createLabel={creating === 'sheet' ? 'Creation...' : 'Nouveau tableur'}
        >
          {sheets.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">
              Aucun tableur. Creez votre premier tableur collaboratif.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {sheets.map((sheet) => (
                <li key={sheet.id}>
                  <button
                    onClick={() => navigate(`/f/${slug}/admin/workspace/sheets/${sheet.id}`)}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-gray-50 transition-colors"
                  >
                    <Table2 className="h-4 w-4 flex-shrink-0 text-green-500" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{sheet.title}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{sheet.row_count} lignes</span>
                        <span>·</span>
                        <Clock className="h-3 w-3" />
                        <span>{formatTimestamp(sheet.updated_at)}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* ── Calendrier ────────────────────────────────────────────── */}
        <SectionCard
          icon={Calendar}
          title="Calendrier"
          count={calEvents.length}
          loading={calLoading}
          error={calError}
          onRetry={fetchCalendar}
          onCreate={() => navigate(`/f/${slug}/admin/workspace/calendar`)}
          createLabel="Voir le calendrier"
        >
          {calEvents.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">
              Aucun evenement dans les 7 prochains jours.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {calEvents.map((event) => (
                <li key={event.id} className="flex items-center gap-3 px-2 py-2">
                  <div
                    className="h-3 w-3 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: event.color || '#3b82f6' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{event.title}</p>
                    <p className="text-xs text-gray-500">{formatEventTime(event.starts_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* ── Tableaux de taches ─────────────────────────────────────── */}
        <SectionCard
          icon={LayoutList}
          title="Tableaux de taches"
          count={taskBoards.length}
          loading={tasksLoading}
          error={tasksError}
          onRetry={fetchTaskBoards}
          onCreate={createTaskBoard}
          createLabel={creating === 'task' ? 'Creation...' : 'Nouveau tableau'}
        >
          {taskBoards.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">
              Aucun tableau. Creez votre premier tableau de taches.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {taskBoards.map((board) => (
                <li key={board.id}>
                  <button
                    onClick={() => navigate(`/f/${slug}/admin/workspace/tasks/${board.id}`)}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-gray-50 transition-colors"
                  >
                    <LayoutList className="h-4 w-4 flex-shrink-0 text-purple-500" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{board.title}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{board.task_count} taches</span>
                        <span>·</span>
                        <Clock className="h-3 w-3" />
                        <span>{formatTimestamp(board.updated_at)}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
