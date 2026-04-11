import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus,
  Loader2,
  AlertCircle,
  X,
  Pencil,
  Trash2,
  ListOrdered,
  Play,
  CheckCircle2,
  Clock,
  PhoneCall,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { useTenantStore } from '@/stores/tenant-store';
import { api } from '@/lib/api-client';

interface Queue {
  id: string;
  edition_id: string;
  name: string;
  description: string | null;
  location: string | null;
  avg_service_minutes: number;
  is_active: boolean;
  created_at: string;
}

interface QueueEntry {
  id: string;
  queue_id: string;
  ticket_number: number;
  visitor_name: string | null;
  status: 'waiting' | 'called' | 'served';
  called_at: string | null;
  served_at: string | null;
  created_at: string;
}

export function AdminQueuesPage() {
  const { activeEdition } = useTenantStore();

  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Queue CRUD dialog
  const [showQueueDialog, setShowQueueDialog] = useState(false);
  const [editingQueue, setEditingQueue] = useState<Queue | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formAvgMinutes, setFormAvgMinutes] = useState('5');

  // Live board
  const [selectedQueueId, setSelectedQueueId] = useState<string | null>(null);
  const [boardEntries, setBoardEntries] = useState<QueueEntry[]>([]);
  const [boardLoading, setBoardLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchQueues = useCallback(async () => {
    if (!activeEdition) return;
    setLoading(true);
    setError(null);

    const res = await api.get<Queue[]>(`/queues/edition/${activeEdition.id}`);
    if (res.success && res.data) {
      setQueues(res.data);
    } else {
      setError(res.error || 'Impossible de charger les files d\'attente.');
    }
    setLoading(false);
  }, [activeEdition]);

  useEffect(() => {
    fetchQueues();
  }, [fetchQueues]);

  const fetchBoard = useCallback(async (queueId: string) => {
    const res = await api.get<QueueEntry[]>(`/queues/${queueId}/board`);
    if (res.success && res.data) {
      setBoardEntries(res.data);
    }
  }, []);

  // Auto-refresh board every 5 seconds
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (selectedQueueId) {
      setBoardLoading(true);
      fetchBoard(selectedQueueId).then(() => setBoardLoading(false));

      intervalRef.current = setInterval(() => {
        fetchBoard(selectedQueueId);
      }, 5000);
    } else {
      setBoardEntries([]);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [selectedQueueId, fetchBoard]);

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormLocation('');
    setFormAvgMinutes('5');
    setEditingQueue(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setShowQueueDialog(true);
  };

  const openEditDialog = (queue: Queue) => {
    setEditingQueue(queue);
    setFormName(queue.name);
    setFormDescription(queue.description || '');
    setFormLocation(queue.location || '');
    setFormAvgMinutes(String(queue.avg_service_minutes));
    setShowQueueDialog(true);
  };

  const handleSubmitQueue = async () => {
    if (!activeEdition || !formName.trim()) return;
    setSubmitting(true);
    setMessage(null);

    const payload = {
      edition_id: activeEdition.id,
      name: formName.trim(),
      description: formDescription.trim() || null,
      location: formLocation.trim() || null,
      avg_service_minutes: Number(formAvgMinutes) || 5,
    };

    if (editingQueue) {
      const res = await api.put<Queue>(`/queues/${editingQueue.id}`, payload);
      if (res.success && res.data) {
        setQueues((prev) => prev.map((q) => (q.id === editingQueue.id ? res.data! : q)));
        setShowQueueDialog(false);
        resetForm();
        setMessage({ type: 'success', text: 'File d\'attente mise a jour.' });
      } else {
        setMessage({ type: 'error', text: res.error || 'Erreur lors de la mise a jour.' });
      }
    } else {
      const res = await api.post<Queue>(`/queues/edition/${activeEdition.id}`, payload);
      if (res.success && res.data) {
        setQueues((prev) => [...prev, res.data!]);
        setShowQueueDialog(false);
        resetForm();
        setMessage({ type: 'success', text: 'File d\'attente creee.' });
      } else {
        setMessage({ type: 'error', text: res.error || 'Erreur lors de la creation.' });
      }
    }
    setSubmitting(false);
  };

  const handleDeleteQueue = async (queue: Queue) => {
    if (!confirm(`Supprimer la file "${queue.name}" ?`)) return;
    setMessage(null);

    const res = await api.delete(`/queues/${queue.id}`);
    if (res.success) {
      setQueues((prev) => prev.filter((q) => q.id !== queue.id));
      if (selectedQueueId === queue.id) {
        setSelectedQueueId(null);
      }
      setMessage({ type: 'success', text: 'File d\'attente supprimee.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la suppression.' });
    }
  };

  const handleToggleActive = async (queue: Queue) => {
    setMessage(null);
    const res = await api.put<Queue>(`/queues/${queue.id}`, {
      is_active: !queue.is_active,
    });
    if (res.success && res.data) {
      setQueues((prev) => prev.map((q) => (q.id === queue.id ? res.data! : q)));
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors du changement de statut.' });
    }
  };

  const handleCallNext = async (entryId: string) => {
    setMessage(null);
    const res = await api.post(`/queues/entries/${entryId}/call`);
    if (res.success && selectedQueueId) {
      fetchBoard(selectedQueueId);
    } else if (!res.success) {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de l\'appel.' });
    }
  };

  const handleServe = async (entryId: string) => {
    setMessage(null);
    const res = await api.post(`/queues/entries/${entryId}/serve`);
    if (res.success && selectedQueueId) {
      fetchBoard(selectedQueueId);
    } else if (!res.success) {
      setMessage({ type: 'error', text: res.error || 'Erreur lors du marquage.' });
    }
  };

  const getStatusColor = (status: QueueEntry['status']) => {
    switch (status) {
      case 'waiting':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
      case 'called':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'served':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    }
  };

  const getStatusLabel = (status: QueueEntry['status']) => {
    switch (status) {
      case 'waiting':
        return 'En attente';
      case 'called':
        return 'Appele';
      case 'served':
        return 'Servi';
    }
  };

  const selectedQueue = queues.find((q) => q.id === selectedQueueId);

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
        <p className="text-sm text-destructive">{error}</p>
        <button
          type="button"
          onClick={fetchQueues}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Reessayer
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Files d&apos;attente</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerez les files d&apos;attente et suivez le service en temps reel.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateDialog}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nouvelle file
        </button>
      </div>

      {/* Feedback message */}
      {message && (
        <div
          className={`mb-6 rounded-md border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400'
              : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Queue CRUD Dialog */}
      {showQueueDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {editingQueue ? 'Modifier la file' : 'Nouvelle file d\'attente'}
              </h2>
              <button
                type="button"
                onClick={() => { setShowQueueDialog(false); resetForm(); }}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Nom *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex : Caisse principale"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Description optionnelle"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Emplacement</label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="Ex : Hall A, Stand 3"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Temps moyen de service (min)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formAvgMinutes}
                  onChange={(e) => setFormAvgMinutes(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowQueueDialog(false); resetForm(); }}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSubmitQueue}
                disabled={submitting || !formName.trim()}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingQueue ? 'Enregistrer' : 'Creer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
        {/* Section 1: Queue Management */}
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
            <ListOrdered className="h-5 w-5" />
            Files ({queues.length})
          </h2>

          {queues.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <ListOrdered className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Aucune file d&apos;attente. Creez-en une pour commencer.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {queues.map((queue) => (
                <div
                  key={queue.id}
                  className={`rounded-xl border bg-card p-4 transition-colors ${
                    selectedQueueId === queue.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <button
                      type="button"
                      onClick={() => setSelectedQueueId(selectedQueueId === queue.id ? null : queue.id)}
                      className="flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{queue.name}</span>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            queue.is_active
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                          }`}
                        >
                          {queue.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      {queue.description && (
                        <p className="mt-1 text-xs text-muted-foreground">{queue.description}</p>
                      )}
                      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                        {queue.location && <span>Lieu : {queue.location}</span>}
                        <span>~{queue.avg_service_minutes} min/service</span>
                      </div>
                    </button>
                    <div className="ml-2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(queue)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        title={queue.is_active ? 'Desactiver' : 'Activer'}
                      >
                        {queue.is_active ? (
                          <ToggleRight className="h-4 w-4 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditDialog(queue)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteQueue(queue)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Live Board */}
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
            <Play className="h-5 w-5" />
            Tableau en direct
            {selectedQueue && (
              <span className="text-sm font-normal text-muted-foreground">
                &mdash; {selectedQueue.name}
              </span>
            )}
          </h2>

          {!selectedQueueId ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <ListOrdered className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Selectionnez une file pour voir le tableau en direct.
              </p>
            </div>
          ) : boardLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : boardEntries.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <Clock className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Aucune entree dans cette file.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {boardEntries.map((entry) => (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between rounded-lg border border-border p-3 ${
                    entry.status === 'called'
                      ? 'bg-blue-50 dark:bg-blue-900/10'
                      : entry.status === 'served'
                        ? 'bg-green-50 dark:bg-green-900/10'
                        : 'bg-card'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold text-foreground">
                      {entry.ticket_number}
                    </span>
                    <div>
                      <span className="text-sm font-medium text-foreground">
                        {entry.visitor_name || `Ticket #${entry.ticket_number}`}
                      </span>
                      <span
                        className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(entry.status)}`}
                      >
                        {getStatusLabel(entry.status)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {entry.status === 'waiting' && (
                      <button
                        type="button"
                        onClick={() => handleCallNext(entry.id)}
                        className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                      >
                        <PhoneCall className="h-3 w-3" />
                        Appeler suivant
                      </button>
                    )}
                    {entry.status === 'called' && (
                      <button
                        type="button"
                        onClick={() => handleServe(entry.id)}
                        className="inline-flex items-center gap-1 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Servi
                      </button>
                    )}
                    {entry.status === 'served' && (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
