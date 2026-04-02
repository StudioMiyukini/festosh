import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  Users,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Heading,
  Type,
  ListChecks,
  BarChart3,
  ClipboardPlus,
  Clock,
  MapPin,
  Calendar,
} from 'lucide-react';
import { useTenantStore } from '@/stores/tenant-store';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import type { Task, TaskStatus, TaskPriority } from '@/types/task';
import type {
  Meeting,
  MeetingBlock,
  MeetingBlockType,
  MeetingBlockContent,
  HeadingContent,
  TextContent,
  ChecklistContent,
  ChecklistItem,
  PollContent,
  PollOption,
  MeetingStatus,
} from '@/types/meeting';

// ─── Constants ─────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'A faire',
  in_progress: 'En cours',
  done: 'Termine',
  cancelled: 'Annule',
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
  urgent: 'Urgente',
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const MEETING_STATUS_LABELS: Record<MeetingStatus, string> = {
  planned: 'Planifiee',
  in_progress: 'En cours',
  completed: 'Terminee',
  cancelled: 'Annulee',
};

const MEETING_STATUS_COLORS: Record<MeetingStatus, string> = {
  planned: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Component ─────────────────────────────────────────────────────────────

export function AdminTasksMeetingsPage() {
  const { festival } = useTenantStore();
  const { profile } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'tasks' | 'meetings'>('tasks');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ─── Task state ──────────────────────────────────────────────────────
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('todo');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [submittingTask, setSubmittingTask] = useState(false);

  // ─── Meeting state ───────────────────────────────────────────────────
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [showMeetingDialog, setShowMeetingDialog] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDescription, setMeetingDescription] = useState('');
  const [meetingScheduledAt, setMeetingScheduledAt] = useState('');
  const [meetingDuration, setMeetingDuration] = useState('60');
  const [meetingLocation, setMeetingLocation] = useState('');
  const [submittingMeeting, setSubmittingMeeting] = useState(false);

  // ─── Meeting detail state ────────────────────────────────────────────
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [meetingBlocks, setMeetingBlocks] = useState<MeetingBlock[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // ─── Quick task from meeting ─────────────────────────────────────────
  const [showQuickTaskDialog, setShowQuickTaskDialog] = useState(false);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskBlockId, setQuickTaskBlockId] = useState<string | null>(null);

  // ─── Data fetching ───────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!festival) return;
    setLoading(true);
    setError(null);
    try {
      const [tasksRes, meetingsRes] = await Promise.all([
        api.get<Task[]>(`/tasks/festival/${festival.id}`),
        api.get<Meeting[]>(`/meetings/festival/${festival.id}`),
      ]);
      if (tasksRes.success) setTasks(tasksRes.data || []);
      if (meetingsRes.success) setMeetings(meetingsRes.data || []);
    } catch {
      setError('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [festival]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [message]);

  // ─── Meeting detail ──────────────────────────────────────────────────

  const openMeetingDetail = async (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setLoadingDetail(true);
    try {
      const res = await api.get<Meeting>(`/meetings/${meeting.id}`);
      if (res.success && res.data) {
        setMeetingBlocks(res.data.blocks || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingDetail(false);
    }
  };

  // ─── Task CRUD ───────────────────────────────────────────────────────

  const resetTaskForm = () => {
    setTaskTitle('');
    setTaskDescription('');
    setTaskStatus('todo');
    setTaskPriority('medium');
    setTaskDueDate('');
    setEditingTask(null);
  };

  const openCreateTask = () => {
    resetTaskForm();
    setShowTaskDialog(true);
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDescription(task.description || '');
    setTaskStatus(task.status);
    setTaskPriority(task.priority);
    setTaskDueDate(task.due_date || '');
    setShowTaskDialog(true);
  };

  const handleSaveTask = async () => {
    if (!festival || !taskTitle.trim()) return;
    setSubmittingTask(true);
    try {
      const payload = {
        title: taskTitle.trim(),
        description: taskDescription.trim() || null,
        status: taskStatus,
        priority: taskPriority,
        due_date: taskDueDate || null,
      };

      if (editingTask) {
        const res = await api.put(`/tasks/${editingTask.id}`, payload);
        if (res.success) {
          setMessage({ type: 'success', text: 'Tache mise a jour' });
        } else {
          setMessage({ type: 'error', text: res.error || 'Erreur' });
        }
      } else {
        const res = await api.post(`/tasks/festival/${festival.id}`, payload);
        if (res.success) {
          setMessage({ type: 'success', text: 'Tache creee' });
        } else {
          setMessage({ type: 'error', text: res.error || 'Erreur' });
        }
      }

      setShowTaskDialog(false);
      resetTaskForm();
      fetchData();
    } catch {
      setMessage({ type: 'error', text: 'Erreur' });
    } finally {
      setSubmittingTask(false);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      const res = await api.delete(`/tasks/${id}`);
      if (res.success) {
        setMessage({ type: 'success', text: 'Tache supprimee' });
        fetchData();
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur' });
    }
  };

  const handleToggleTaskDone = async (task: Task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    try {
      await api.put(`/tasks/${task.id}`, { status: newStatus });
      fetchData();
    } catch {
      // ignore
    }
  };

  // ─── Meeting CRUD ────────────────────────────────────────────────────

  const resetMeetingForm = () => {
    setMeetingTitle('');
    setMeetingDescription('');
    setMeetingScheduledAt('');
    setMeetingDuration('60');
    setMeetingLocation('');
    setEditingMeeting(null);
  };

  const openCreateMeeting = () => {
    resetMeetingForm();
    setShowMeetingDialog(true);
  };

  const openEditMeeting = (m: Meeting) => {
    setEditingMeeting(m);
    setMeetingTitle(m.title);
    setMeetingDescription(m.description || '');
    if (m.scheduled_at) {
      const d = new Date(m.scheduled_at * 1000);
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
      setMeetingScheduledAt(local.toISOString().slice(0, 16));
    } else {
      setMeetingScheduledAt('');
    }
    setMeetingDuration(String(m.duration_minutes));
    setMeetingLocation(m.location || '');
    setShowMeetingDialog(true);
  };

  const handleSaveMeeting = async () => {
    if (!festival || !meetingTitle.trim()) return;
    setSubmittingMeeting(true);
    try {
      const scheduledTs = meetingScheduledAt
        ? Math.floor(new Date(meetingScheduledAt).getTime() / 1000)
        : null;

      const payload = {
        title: meetingTitle.trim(),
        description: meetingDescription.trim() || null,
        scheduled_at: scheduledTs,
        duration_minutes: parseInt(meetingDuration) || 60,
        location: meetingLocation.trim() || null,
      };

      if (editingMeeting) {
        const res = await api.put(`/meetings/${editingMeeting.id}`, payload);
        if (res.success) setMessage({ type: 'success', text: 'Reunion mise a jour' });
        else setMessage({ type: 'error', text: res.error || 'Erreur' });
      } else {
        const res = await api.post(`/meetings/festival/${festival.id}`, payload);
        if (res.success) setMessage({ type: 'success', text: 'Reunion creee' });
        else setMessage({ type: 'error', text: res.error || 'Erreur' });
      }

      setShowMeetingDialog(false);
      resetMeetingForm();
      fetchData();
    } catch {
      setMessage({ type: 'error', text: 'Erreur' });
    } finally {
      setSubmittingMeeting(false);
    }
  };

  const handleDeleteMeeting = async (id: string) => {
    try {
      const res = await api.delete(`/meetings/${id}`);
      if (res.success) {
        setMessage({ type: 'success', text: 'Reunion supprimee' });
        if (selectedMeeting?.id === id) {
          setSelectedMeeting(null);
          setMeetingBlocks([]);
        }
        fetchData();
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur' });
    }
  };

  const handleUpdateMeetingStatus = async (id: string, status: MeetingStatus) => {
    try {
      await api.put(`/meetings/${id}`, { status });
      fetchData();
      if (selectedMeeting?.id === id) {
        setSelectedMeeting({ ...selectedMeeting!, status });
      }
    } catch {
      // ignore
    }
  };

  // ─── Block operations ────────────────────────────────────────────────

  const addBlock = async (type: MeetingBlockType) => {
    if (!selectedMeeting) return;

    let content: MeetingBlockContent;
    if (type === 'heading') content = { text: '', level: 2 } as HeadingContent;
    else if (type === 'text') content = { text: '' } as TextContent;
    else if (type === 'checklist') content = { items: [] } as ChecklistContent;
    else content = { question: '', options: [], allow_multiple: false } as PollContent;

    try {
      const res = await api.post<MeetingBlock>(`/meetings/${selectedMeeting.id}/blocks`, {
        block_type: type,
        content,
      });
      if (res.success && res.data) {
        setMeetingBlocks([...meetingBlocks, res.data]);
      }
    } catch {
      // ignore
    }
  };

  const updateBlock = async (blockId: string, content: MeetingBlockContent) => {
    try {
      await api.put(`/meetings/blocks/${blockId}`, { content });
      setMeetingBlocks(meetingBlocks.map((b) =>
        b.id === blockId ? { ...b, content } : b
      ));
    } catch {
      // ignore
    }
  };

  const deleteBlock = async (blockId: string) => {
    try {
      await api.delete(`/meetings/blocks/${blockId}`);
      setMeetingBlocks(meetingBlocks.filter((b) => b.id !== blockId));
    } catch {
      // ignore
    }
  };

  // ─── Quick task creation from meeting ────────────────────────────────

  const openQuickTask = (blockId: string | null) => {
    setQuickTaskTitle('');
    setQuickTaskBlockId(blockId);
    setShowQuickTaskDialog(true);
  };

  const handleCreateQuickTask = async () => {
    if (!festival || !selectedMeeting || !quickTaskTitle.trim()) return;
    try {
      const res = await api.post(`/tasks/festival/${festival.id}`, {
        title: quickTaskTitle.trim(),
        meeting_id: selectedMeeting.id,
        meeting_block_id: quickTaskBlockId,
        status: 'todo',
        priority: 'medium',
      });
      if (res.success) {
        setMessage({ type: 'success', text: 'Tache creee depuis la reunion' });
        setShowQuickTaskDialog(false);
        fetchData();
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur' });
    }
  };

  // ─── Render helpers ──────────────────────────────────────────────────

  const formatDateTime = (ts: number) => {
    return new Date(ts * 1000).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ─── Headings summary (ordre du jour) ────────────────────────────────

  const headings = meetingBlocks.filter((b) => b.block_type === 'heading');

  if (!festival) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-2">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Aucun festival selectionne</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Taches et reunions</h2>
          <p className="text-sm text-muted-foreground">
            Gestion des taches et reunions d'organisation
          </p>
        </div>
      </div>

      {/* Toast message */}
      {message && (
        <div className={`rounded-lg border p-3 text-sm ${
          message.type === 'success'
            ? 'border-green-200 bg-green-50 text-green-700'
            : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        <button
          type="button"
          onClick={() => { setActiveTab('tasks'); setSelectedMeeting(null); }}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'tasks'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <CheckSquare className="mr-2 inline h-4 w-4" />
          Taches ({tasks.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('meetings')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'meetings'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="mr-2 inline h-4 w-4" />
          Reunions ({meetings.length})
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : (
        <>
          {/* ═══════════════ TASKS TAB ═══════════════ */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={openCreateTask}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" /> Nouvelle tache
                </button>
              </div>

              {tasks.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <CheckSquare className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">Aucune tache</p>
                </div>
              ) : (
                <div className="rounded-lg border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="w-10 px-3 py-2" />
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Tache</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Statut</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Priorite</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Echeance</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Assignee</th>
                        <th className="w-20 px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.map((task) => (
                        <tr key={task.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleTaskDone(task)}
                              className={`inline-flex h-5 w-5 items-center justify-center rounded border ${
                                task.status === 'done'
                                  ? 'border-green-500 bg-green-500 text-white'
                                  : 'border-gray-300 hover:border-primary'
                              }`}
                            >
                              {task.status === 'done' && <CheckSquare className="h-3 w-3" />}
                            </button>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                              {task.title}
                            </span>
                            {task.meeting_title && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                (de: {task.meeting_title})
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[task.status]}`}>
                              {STATUS_LABELS[task.status]}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[task.priority]}`}>
                              {PRIORITY_LABELS[task.priority]}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">
                            {task.due_date || '—'}
                          </td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">
                            {task.assignee_name || '—'}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditTask(task)}
                                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTask(task.id)}
                                className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════ MEETINGS TAB ═══════════════ */}
          {activeTab === 'meetings' && !selectedMeeting && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={openCreateMeeting}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" /> Nouvelle reunion
                </button>
              </div>

              {meetings.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <Users className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">Aucune reunion</p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {meetings.map((m) => (
                    <div
                      key={m.id}
                      className="rounded-lg border bg-card p-4 space-y-3 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <button
                          type="button"
                          onClick={() => openMeetingDetail(m)}
                          className="text-left"
                        >
                          <h3 className="font-semibold text-foreground hover:text-primary">
                            {m.title}
                          </h3>
                        </button>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${MEETING_STATUS_COLORS[m.status]}`}>
                          {MEETING_STATUS_LABELS[m.status]}
                        </span>
                      </div>

                      {m.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{m.description}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {m.scheduled_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDateTime(m.scheduled_at)}
                          </span>
                        )}
                        {m.duration_minutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {m.duration_minutes} min
                          </span>
                        )}
                        {m.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {m.location}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 border-t pt-2">
                        <button
                          type="button"
                          onClick={() => openMeetingDetail(m)}
                          className="rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                        >
                          Ouvrir
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditMeeting(m)}
                          className="rounded p-1 text-muted-foreground hover:bg-accent"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMeeting(m.id)}
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        {m.status === 'planned' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateMeetingStatus(m.id, 'in_progress')}
                            className="ml-auto rounded px-2 py-1 text-xs font-medium text-yellow-700 hover:bg-yellow-100"
                          >
                            Demarrer
                          </button>
                        )}
                        {m.status === 'in_progress' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateMeetingStatus(m.id, 'completed')}
                            className="ml-auto rounded px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
                          >
                            Terminer
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════ MEETING DETAIL VIEW ═══════════════ */}
          {activeTab === 'meetings' && selectedMeeting && (
            <div className="space-y-4">
              {/* Back button + header */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => { setSelectedMeeting(null); setMeetingBlocks([]); }}
                  className="rounded-md p-1.5 hover:bg-accent"
                >
                  <ChevronRight className="h-5 w-5 rotate-180" />
                </button>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{selectedMeeting.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {selectedMeeting.scheduled_at && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDateTime(selectedMeeting.scheduled_at)}
                      </span>
                    )}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${MEETING_STATUS_COLORS[selectedMeeting.status]}`}>
                      {MEETING_STATUS_LABELS[selectedMeeting.status]}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openQuickTask(null)}
                  className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                >
                  <ClipboardPlus className="h-3.5 w-3.5" />
                  Creer une tache
                </button>
              </div>

              {/* Ordre du jour (headings summary) */}
              {headings.length > 0 && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Ordre du jour</h4>
                  <ul className="space-y-1">
                    {headings.map((block) => {
                      const content = block.content as HeadingContent;
                      return (
                        <li key={block.id} className="flex items-center gap-2 text-sm">
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                          {content.text || '(sans titre)'}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {loadingDetail ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Block editor */}
                  <div className="space-y-3">
                    {meetingBlocks.map((block) => (
                      <MeetingBlockEditor
                        key={block.id}
                        block={block}
                        onUpdate={(content) => updateBlock(block.id, content)}
                        onDelete={() => deleteBlock(block.id)}
                        onCreateTask={() => openQuickTask(block.id)}
                      />
                    ))}
                  </div>

                  {/* Add block toolbar */}
                  <div className="flex items-center gap-2 rounded-lg border border-dashed p-3">
                    <span className="text-xs text-muted-foreground">Ajouter un bloc :</span>
                    <button
                      type="button"
                      onClick={() => addBlock('heading')}
                      className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium hover:bg-accent"
                    >
                      <Heading className="h-3.5 w-3.5" /> Titre
                    </button>
                    <button
                      type="button"
                      onClick={() => addBlock('text')}
                      className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium hover:bg-accent"
                    >
                      <Type className="h-3.5 w-3.5" /> Texte
                    </button>
                    <button
                      type="button"
                      onClick={() => addBlock('checklist')}
                      className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium hover:bg-accent"
                    >
                      <ListChecks className="h-3.5 w-3.5" /> Checklist
                    </button>
                    <button
                      type="button"
                      onClick={() => addBlock('poll')}
                      className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium hover:bg-accent"
                    >
                      <BarChart3 className="h-3.5 w-3.5" /> Sondage
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* ═══════════════ TASK DIALOG ═══════════════ */}
      {showTaskDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-lg bg-background p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {editingTask ? 'Modifier la tache' : 'Nouvelle tache'}
              </h3>
              <button type="button" onClick={() => setShowTaskDialog(false)} className="rounded p-1 hover:bg-accent">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Titre *</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="Titre de la tache"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Description</label>
                <textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  rows={3}
                  placeholder="Description optionnelle"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Statut</label>
                  <select
                    value={taskStatus}
                    onChange={(e) => setTaskStatus(e.target.value as TaskStatus)}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  >
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Priorite</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  >
                    {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Date d'echeance</label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowTaskDialog(false)}
                className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveTask}
                disabled={submittingTask || !taskTitle.trim()}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {submittingTask && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingTask ? 'Enregistrer' : 'Creer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ MEETING DIALOG ═══════════════ */}
      {showMeetingDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-lg bg-background p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {editingMeeting ? 'Modifier la reunion' : 'Nouvelle reunion'}
              </h3>
              <button type="button" onClick={() => setShowMeetingDialog(false)} className="rounded p-1 hover:bg-accent">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Titre *</label>
                <input
                  type="text"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="Titre de la reunion"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Description</label>
                <textarea
                  value={meetingDescription}
                  onChange={(e) => setMeetingDescription(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  rows={2}
                  placeholder="Description optionnelle"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Date et heure</label>
                  <input
                    type="datetime-local"
                    value={meetingScheduledAt}
                    onChange={(e) => setMeetingScheduledAt(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Duree (min)</label>
                  <input
                    type="number"
                    value={meetingDuration}
                    onChange={(e) => setMeetingDuration(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    min="15"
                    step="15"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Lieu</label>
                <input
                  type="text"
                  value={meetingLocation}
                  onChange={(e) => setMeetingLocation(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="Salle, lien visio..."
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowMeetingDialog(false)}
                className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveMeeting}
                disabled={submittingMeeting || !meetingTitle.trim()}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {submittingMeeting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingMeeting ? 'Enregistrer' : 'Creer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ QUICK TASK DIALOG ═══════════════ */}
      {showQuickTaskDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-lg bg-background p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Creer une tache</h3>
              <button type="button" onClick={() => setShowQuickTaskDialog(false)} className="rounded p-1 hover:bg-accent">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Titre de la tache *</label>
              <input
                type="text"
                value={quickTaskTitle}
                onChange={(e) => setQuickTaskTitle(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Que faut-il faire ?"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && quickTaskTitle.trim()) handleCreateQuickTask();
                }}
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowQuickTaskDialog(false)}
                className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleCreateQuickTask}
                disabled={!quickTaskTitle.trim()}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Creer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MEETING BLOCK EDITOR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function MeetingBlockEditor({
  block,
  onUpdate,
  onDelete,
  onCreateTask,
}: {
  block: MeetingBlock;
  onUpdate: (content: MeetingBlockContent) => void;
  onDelete: () => void;
  onCreateTask: () => void;
}) {
  const content = block.content;

  return (
    <div className="group rounded-lg border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
          <span className="text-[10px] font-medium uppercase text-muted-foreground">
            {block.block_type === 'heading' ? 'Titre' :
             block.block_type === 'text' ? 'Texte' :
             block.block_type === 'checklist' ? 'Checklist' : 'Sondage'}
          </span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
          <button
            type="button"
            onClick={onCreateTask}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            title="Creer une tache"
          >
            <ClipboardPlus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Heading block */}
      {block.block_type === 'heading' && (
        <input
          type="text"
          value={(content as HeadingContent).text}
          onChange={(e) => onUpdate({ ...(content as HeadingContent), text: e.target.value })}
          className="w-full border-0 bg-transparent text-lg font-bold focus:outline-none focus:ring-0"
          placeholder="Titre de la section..."
        />
      )}

      {/* Text block */}
      {block.block_type === 'text' && (
        <textarea
          value={(content as TextContent).text}
          onChange={(e) => onUpdate({ text: e.target.value })}
          className="w-full border-0 bg-transparent text-sm focus:outline-none focus:ring-0 resize-none"
          rows={3}
          placeholder="Contenu texte..."
        />
      )}

      {/* Checklist block */}
      {block.block_type === 'checklist' && (
        <ChecklistEditor
          items={(content as ChecklistContent).items || []}
          onChange={(items) => onUpdate({ items })}
        />
      )}

      {/* Poll block */}
      {block.block_type === 'poll' && (
        <PollEditor
          content={content as PollContent}
          onChange={onUpdate}
        />
      )}
    </div>
  );
}

// ─── Checklist Editor ──────────────────────────────────────────────────────

function ChecklistEditor({
  items,
  onChange,
}: {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
}) {
  const addItem = () => {
    onChange([...items, { id: uid(), text: '', checked: false }]);
  };

  const updateItem = (id: string, changes: Partial<ChecklistItem>) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  };

  const removeItem = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-1">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={item.checked}
            onChange={(e) => updateItem(item.id, { checked: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300"
          />
          <input
            type="text"
            value={item.text}
            onChange={(e) => updateItem(item.id, { text: e.target.value })}
            className={`flex-1 border-0 bg-transparent text-sm focus:outline-none focus:ring-0 ${
              item.checked ? 'line-through text-muted-foreground' : ''
            }`}
            placeholder="Element..."
          />
          <button
            type="button"
            onClick={() => removeItem(item.id)}
            className="rounded p-0.5 text-muted-foreground hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Plus className="h-3 w-3" /> Ajouter un element
      </button>
    </div>
  );
}

// ─── Poll Editor ───────────────────────────────────────────────────────────

function PollEditor({
  content,
  onChange,
}: {
  content: PollContent;
  onChange: (content: MeetingBlockContent) => void;
}) {
  const addOption = () => {
    onChange({
      ...content,
      options: [...content.options, { id: uid(), text: '', votes: [] }],
    });
  };

  const updateOption = (id: string, text: string) => {
    onChange({
      ...content,
      options: content.options.map((o) => (o.id === id ? { ...o, text } : o)),
    });
  };

  const removeOption = (id: string) => {
    onChange({
      ...content,
      options: content.options.filter((o) => o.id !== id),
    });
  };

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={content.question}
        onChange={(e) => onChange({ ...content, question: e.target.value })}
        className="w-full border-0 bg-transparent text-sm font-medium focus:outline-none focus:ring-0"
        placeholder="Question du sondage..."
      />
      <div className="space-y-1 pl-2">
        {content.options.map((opt) => (
          <div key={opt.id} className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full border border-gray-300" />
            <input
              type="text"
              value={opt.text}
              onChange={(e) => updateOption(opt.id, e.target.value)}
              className="flex-1 border-0 bg-transparent text-sm focus:outline-none focus:ring-0"
              placeholder="Option..."
            />
            <span className="text-xs text-muted-foreground">{opt.votes.length}</span>
            <button
              type="button"
              onClick={() => removeOption(opt.id)}
              className="rounded p-0.5 text-muted-foreground hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={addOption}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Plus className="h-3 w-3" /> Ajouter une option
        </button>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={content.allow_multiple}
            onChange={(e) => onChange({ ...content, allow_multiple: e.target.checked })}
            className="h-3 w-3 rounded border-gray-300"
          />
          Choix multiple
        </label>
      </div>
    </div>
  );
}
