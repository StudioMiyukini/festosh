import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Loader2,
  AlertCircle,
  X,
  Trash2,
  Key,
  Webhook,
  Copy,
  Check,
  Eye,
  Shield,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { useTenantStore } from '@/stores/tenant-store';
import { api } from '@/lib/api-client';
import { formatTimestamp } from '@/lib/format-utils';

interface ApiKey {
  id: string;
  festival_id: string;
  name: string;
  key_prefix: string;
  last_used_at: number | null;
  is_active: boolean;
  created_at: number;
}

interface WebhookConfig {
  id: string;
  festival_id: string;
  url: string;
  events: string[];
  is_active: boolean;
  failure_count: number;
  last_triggered_at: number | null;
  created_at: number;
}

interface WebhookLog {
  id: string;
  webhook_id: string;
  event: string;
  status_code: number | null;
  success: boolean;
  error: string | null;
  created_at: number;
}

const AVAILABLE_EVENTS = [
  'ticket.sold',
  'order.created',
  'application.submitted',
  'vote.cast',
  'sale.completed',
];

const EVENT_LABELS: Record<string, string> = {
  'ticket.sold': 'Billet vendu',
  'order.created': 'Commande creee',
  'application.submitted': 'Candidature soumise',
  'vote.cast': 'Vote enregistre',
  'sale.completed': 'Vente terminee',
};

export function AdminApiPage() {
  const { festival } = useTenantStore();

  const [activeTab, setActiveTab] = useState<'keys' | 'webhooks'>('keys');

  // API Keys state
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [keysLoading, setKeysLoading] = useState(true);
  const [keysError, setKeysError] = useState<string | null>(null);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [keyFormName, setKeyFormName] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);

  // Webhooks state
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [webhooksLoading, setWebhooksLoading] = useState(true);
  const [webhooksError, setWebhooksError] = useState<string | null>(null);
  const [showWebhookDialog, setShowWebhookDialog] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookConfig | null>(null);
  const [webhookFormUrl, setWebhookFormUrl] = useState('');
  const [webhookFormEvents, setWebhookFormEvents] = useState<string[]>([]);
  const [submittingWebhook, setSubmittingWebhook] = useState(false);

  // Webhook logs
  const [selectedWebhookId, setSelectedWebhookId] = useState<string | null>(null);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch API Keys
  const fetchKeys = useCallback(async () => {
    if (!festival) return;
    setKeysLoading(true);
    setKeysError(null);

    const res = await api.get<ApiKey[]>(`/api-management/festival/${festival.id}/keys`);
    if (res.success && res.data) {
      setKeys(res.data);
    } else {
      setKeysError(res.error || 'Impossible de charger les cles API.');
    }
    setKeysLoading(false);
  }, [festival]);

  // Fetch Webhooks
  const fetchWebhooks = useCallback(async () => {
    if (!festival) return;
    setWebhooksLoading(true);
    setWebhooksError(null);

    const res = await api.get<WebhookConfig[]>(`/api-management/festival/${festival.id}/webhooks`);
    if (res.success && res.data) {
      setWebhooks(res.data);
    } else {
      setWebhooksError(res.error || 'Impossible de charger les webhooks.');
    }
    setWebhooksLoading(false);
  }, [festival]);

  useEffect(() => {
    fetchKeys();
    fetchWebhooks();
  }, [fetchKeys, fetchWebhooks]);

  // Fetch webhook logs
  const fetchLogs = useCallback(async (webhookId: string) => {
    setLogsLoading(true);
    const res = await api.get<WebhookLog[]>(
      `/api-management/webhooks/${webhookId}/logs?limit=50`
    );
    if (res.success && res.data) {
      setLogs(res.data);
    }
    setLogsLoading(false);
  }, []);

  useEffect(() => {
    if (selectedWebhookId) {
      fetchLogs(selectedWebhookId);
    } else {
      setLogs([]);
    }
  }, [selectedWebhookId, fetchLogs]);

  // API Key actions
  const handleCreateKey = async () => {
    if (!festival || !keyFormName.trim()) return;
    setCreatingKey(true);
    setMessage(null);

    const res = await api.post<{ key: ApiKey; full_key: string }>(
      `/api-management/festival/${festival.id}/keys`,
      { name: keyFormName.trim() }
    );

    if (res.success && res.data) {
      setKeys((prev) => [...prev, res.data!.key]);
      setNewKeyValue(res.data.full_key);
      setKeyFormName('');
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la creation.' });
    }
    setCreatingKey(false);
  };

  const handleDeleteKey = async (key: ApiKey) => {
    if (!confirm(`Revoquer la cle "${key.name}" ? Cette action est irreversible.`)) return;
    setMessage(null);

    const res = await api.delete(`/api-management/keys/${key.id}`);
    if (res.success) {
      setKeys((prev) => prev.filter((k) => k.id !== key.id));
      setMessage({ type: 'success', text: 'Cle API revoquee.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la revocation.' });
    }
  };

  const handleCopyKey = async () => {
    if (!newKeyValue) return;
    try {
      await navigator.clipboard.writeText(newKeyValue);
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
    } catch {
      // Fallback: select text
    }
  };

  const closeKeyDialog = () => {
    setShowKeyDialog(false);
    setKeyFormName('');
    setNewKeyValue(null);
    setKeyCopied(false);
  };

  // Webhook actions
  const resetWebhookForm = () => {
    setWebhookFormUrl('');
    setWebhookFormEvents([]);
    setEditingWebhook(null);
  };

  const openCreateWebhookDialog = () => {
    resetWebhookForm();
    setShowWebhookDialog(true);
  };

  const openEditWebhookDialog = (webhook: WebhookConfig) => {
    setEditingWebhook(webhook);
    setWebhookFormUrl(webhook.url);
    setWebhookFormEvents([...webhook.events]);
    setShowWebhookDialog(true);
  };

  const toggleEvent = (event: string) => {
    setWebhookFormEvents((prev) =>
      prev.includes(event)
        ? prev.filter((e) => e !== event)
        : [...prev, event]
    );
  };

  const handleSubmitWebhook = async () => {
    if (!festival || !webhookFormUrl.trim() || webhookFormEvents.length === 0) return;
    setSubmittingWebhook(true);
    setMessage(null);

    const payload = {
      url: webhookFormUrl.trim(),
      events: webhookFormEvents,
    };

    if (editingWebhook) {
      const res = await api.put<WebhookConfig>(
        `/api-management/webhooks/${editingWebhook.id}`,
        payload
      );
      if (res.success && res.data) {
        setWebhooks((prev) => prev.map((w) => (w.id === editingWebhook.id ? res.data! : w)));
        setShowWebhookDialog(false);
        resetWebhookForm();
        setMessage({ type: 'success', text: 'Webhook mis a jour.' });
      } else {
        setMessage({ type: 'error', text: res.error || 'Erreur lors de la mise a jour.' });
      }
    } else {
      const res = await api.post<WebhookConfig>(
        `/api-management/festival/${festival.id}/webhooks`,
        payload
      );
      if (res.success && res.data) {
        setWebhooks((prev) => [...prev, res.data!]);
        setShowWebhookDialog(false);
        resetWebhookForm();
        setMessage({ type: 'success', text: 'Webhook cree.' });
      } else {
        setMessage({ type: 'error', text: res.error || 'Erreur lors de la creation.' });
      }
    }
    setSubmittingWebhook(false);
  };

  const handleDeleteWebhook = async (webhook: WebhookConfig) => {
    if (!confirm(`Supprimer le webhook "${webhook.url}" ?`)) return;
    setMessage(null);

    const res = await api.delete(`/api-management/webhooks/${webhook.id}`);
    if (res.success) {
      setWebhooks((prev) => prev.filter((w) => w.id !== webhook.id));
      if (selectedWebhookId === webhook.id) {
        setSelectedWebhookId(null);
      }
      setMessage({ type: 'success', text: 'Webhook supprime.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la suppression.' });
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">API &amp; Webhooks</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerez les cles API et les webhooks de votre festival.
        </p>
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

      {/* Tabs */}
      <div className="mb-6 flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab('keys')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'keys'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Key className="h-4 w-4" />
          Cles API
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('webhooks')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'webhooks'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Webhook className="h-4 w-4" />
          Webhooks
        </button>
      </div>

      {/* Tab: API Keys */}
      {activeTab === 'keys' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Cles API</h2>
            <button
              type="button"
              onClick={() => setShowKeyDialog(true)}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Nouvelle cle
            </button>
          </div>

          {/* Create Key Dialog */}
          {showKeyDialog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">
                    {newKeyValue ? 'Cle API creee' : 'Nouvelle cle API'}
                  </h2>
                  <button
                    type="button"
                    onClick={closeKeyDialog}
                    className="rounded-md p-1 text-muted-foreground hover:bg-accent"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {newKeyValue ? (
                  <div>
                    <div className="mb-4 rounded-md border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                        <span>Copiez cette cle maintenant. Elle ne sera plus affichee.</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 overflow-x-auto rounded-md border border-border bg-muted px-3 py-2 text-sm font-mono text-foreground">
                        {newKeyValue}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyKey}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                      >
                        {keyCopied ? (
                          <>
                            <Check className="h-4 w-4 text-green-600" />
                            Copie
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copier
                          </>
                        )}
                      </button>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={closeKeyDialog}
                        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                      >
                        Fermer
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="space-y-4">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-foreground">
                          Nom de la cle *
                        </label>
                        <input
                          type="text"
                          value={keyFormName}
                          onChange={(e) => setKeyFormName(e.target.value)}
                          placeholder="Ex : Integration CRM, App mobile..."
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={closeKeyDialog}
                        className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateKey}
                        disabled={creatingKey || !keyFormName.trim()}
                        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        {creatingKey && <Loader2 className="h-4 w-4 animate-spin" />}
                        Creer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {keysLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : keysError ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="mb-3 h-6 w-6 text-destructive" />
              <p className="text-sm text-destructive">{keysError}</p>
              <button
                type="button"
                onClick={fetchKeys}
                className="mt-3 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Reessayer
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Nom
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Prefixe
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Derniere utilisation
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {keys.map((key) => (
                      <tr key={key.id} className="hover:bg-muted/50">
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-muted-foreground" />
                            {key.name}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <code className="rounded bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
                            {key.key_prefix}...
                          </code>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                          {key.last_used_at ? formatTimestamp(key.last_used_at) : 'Jamais'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              key.is_active
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                            }`}
                          >
                            {key.is_active ? 'Active' : 'Revoquee'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteKey(key)}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            title="Revoquer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {keys.length === 0 && (
                <div className="p-12 text-center">
                  <Key className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Aucune cle API. Creez-en une pour integrer vos systemes.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab: Webhooks */}
      {activeTab === 'webhooks' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Webhooks</h2>
            <button
              type="button"
              onClick={openCreateWebhookDialog}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Nouveau webhook
            </button>
          </div>

          {/* Webhook Create/Edit Dialog */}
          {showWebhookDialog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="mx-4 w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-lg">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">
                    {editingWebhook ? 'Modifier le webhook' : 'Nouveau webhook'}
                  </h2>
                  <button
                    type="button"
                    onClick={() => { setShowWebhookDialog(false); resetWebhookForm(); }}
                    className="rounded-md p-1 text-muted-foreground hover:bg-accent"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">URL *</label>
                    <input
                      type="url"
                      value={webhookFormUrl}
                      onChange={(e) => setWebhookFormUrl(e.target.value)}
                      placeholder="https://example.com/webhook"
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      Evenements *
                    </label>
                    <div className="space-y-2">
                      {AVAILABLE_EVENTS.map((event) => (
                        <label
                          key={event}
                          className="flex cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2 transition-colors hover:bg-muted/50"
                        >
                          <input
                            type="checkbox"
                            checked={webhookFormEvents.includes(event)}
                            onChange={() => toggleEvent(event)}
                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary/50"
                          />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-foreground">
                              {EVENT_LABELS[event] || event}
                            </span>
                            <span className="ml-2 text-xs text-muted-foreground font-mono">
                              {event}
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowWebhookDialog(false); resetWebhookForm(); }}
                    className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitWebhook}
                    disabled={submittingWebhook || !webhookFormUrl.trim() || webhookFormEvents.length === 0}
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {submittingWebhook && <Loader2 className="h-4 w-4 animate-spin" />}
                    {editingWebhook ? 'Enregistrer' : 'Creer'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {webhooksLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : webhooksError ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="mb-3 h-6 w-6 text-destructive" />
              <p className="text-sm text-destructive">{webhooksError}</p>
              <button
                type="button"
                onClick={fetchWebhooks}
                className="mt-3 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Reessayer
              </button>
            </div>
          ) : (
            <>
              {/* Webhooks Table */}
              <div className="rounded-xl border border-border bg-card">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          URL
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Evenements
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Statut
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Echecs
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Dernier declenchement
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {webhooks.map((webhook) => (
                        <tr key={webhook.id} className="hover:bg-muted/50">
                          <td className="max-w-[200px] truncate px-6 py-4 text-sm font-medium text-foreground">
                            <code className="text-xs">{webhook.url}</code>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {webhook.events.map((event) => (
                                <span
                                  key={event}
                                  className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                                >
                                  {EVENT_LABELS[event] || event}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-center">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                webhook.is_active
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                              }`}
                            >
                              {webhook.is_active ? 'Actif' : 'Inactif'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-center">
                            <span
                              className={`text-sm font-medium ${
                                webhook.failure_count > 0 ? 'text-red-600' : 'text-muted-foreground'
                              }`}
                            >
                              {webhook.failure_count}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                            {webhook.last_triggered_at
                              ? formatTimestamp(webhook.last_triggered_at)
                              : 'Jamais'}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedWebhookId(
                                    selectedWebhookId === webhook.id ? null : webhook.id
                                  )
                                }
                                className={`rounded-md p-1.5 transition-colors ${
                                  selectedWebhookId === webhook.id
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                                }`}
                                title="Voir les logs"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditWebhookDialog(webhook)}
                                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                                title="Modifier"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteWebhook(webhook)}
                                className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                title="Supprimer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {webhooks.length === 0 && (
                  <div className="p-12 text-center">
                    <Webhook className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Aucun webhook configure. Creez-en un pour recevoir des notifications.
                    </p>
                  </div>
                )}
              </div>

              {/* Webhook Logs */}
              {selectedWebhookId && (
                <div className="mt-6">
                  <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
                    <Clock className="h-4 w-4" />
                    Logs (50 derniers)
                  </h3>
                  {logsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : logs.length === 0 ? (
                    <div className="rounded-xl border border-border bg-card p-8 text-center">
                      <p className="text-sm text-muted-foreground">Aucun log pour ce webhook.</p>
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto rounded-xl border border-border bg-card">
                      <table className="w-full">
                        <thead className="sticky top-0 bg-card">
                          <tr className="border-b border-border">
                            <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                              Evenement
                            </th>
                            <th className="px-4 py-2 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                              Statut HTTP
                            </th>
                            <th className="px-4 py-2 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                              Resultat
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                              Date
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {logs.map((log) => (
                            <tr key={log.id} className="hover:bg-muted/50">
                              <td className="whitespace-nowrap px-4 py-2 text-xs font-mono text-foreground">
                                {log.event}
                              </td>
                              <td className="whitespace-nowrap px-4 py-2 text-center text-xs text-muted-foreground">
                                {log.status_code ?? '\u2014'}
                              </td>
                              <td className="whitespace-nowrap px-4 py-2 text-center">
                                {log.success ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                                    <Check className="h-3 w-3" />
                                    OK
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600" title={log.error || undefined}>
                                    <AlertCircle className="h-3 w-3" />
                                    Echec
                                  </span>
                                )}
                              </td>
                              <td className="whitespace-nowrap px-4 py-2 text-xs text-muted-foreground">
                                {formatTimestamp(log.created_at)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
