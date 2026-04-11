import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  Gift,
  Trophy,
  Dices,
  Users,
  ChevronDown,
  ChevronRight,
  PartyPopper,
} from 'lucide-react';
import { useTenantStore } from '@/stores/tenant-store';
import { api } from '@/lib/api-client';
import { formatTimestamp } from '@/lib/format-utils';

// --- Types ---

interface Raffle {
  id: string;
  edition_id: string;
  name: string;
  description: string | null;
  draw_date: string;
  entry_count: number;
  drawn: boolean;
  created_at: number;
}

interface Prize {
  id: string;
  raffle_id: string;
  name: string;
  description: string | null;
  sponsor: string | null;
  winner_name: string | null;
  created_at: number;
}

interface DrawResult {
  prizes: Prize[];
}

type RaffleForm = {
  name: string;
  description: string;
  draw_date: string;
};

type PrizeForm = {
  name: string;
  description: string;
  sponsor: string;
};

const emptyRaffleForm: RaffleForm = { name: '', description: '', draw_date: '' };
const emptyPrizeForm: PrizeForm = { name: '', description: '', sponsor: '' };

export function AdminRafflesPage() {
  const { activeEdition } = useTenantStore();

  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Raffle CRUD
  const [showRaffleDialog, setShowRaffleDialog] = useState(false);
  const [editingRaffle, setEditingRaffle] = useState<Raffle | null>(null);
  const [raffleForm, setRaffleForm] = useState<RaffleForm>(emptyRaffleForm);
  const [raffleSubmitting, setRaffleSubmitting] = useState(false);

  // Prizes
  const [expandedRaffle, setExpandedRaffle] = useState<string | null>(null);
  const [prizes, setPrizes] = useState<Record<string, Prize[]>>({});
  const [prizesLoading, setPrizesLoading] = useState<Record<string, boolean>>({});

  // Prize dialog
  const [showPrizeDialog, setShowPrizeDialog] = useState(false);
  const [prizeRaffleId, setPrizeRaffleId] = useState<string | null>(null);
  const [prizeForm, setPrizeForm] = useState<PrizeForm>(emptyPrizeForm);
  const [prizeSubmitting, setPrizeSubmitting] = useState(false);

  // Draw
  const [drawing, setDrawing] = useState<string | null>(null);
  const [drawResults, setDrawResults] = useState<Record<string, Prize[]>>({});

  // ---------- Fetch ----------

  const fetchRaffles = useCallback(async () => {
    if (!activeEdition) return;
    setLoading(true);
    setError(null);
    const res = await api.get<Raffle[]>(`/raffles/edition/${activeEdition.id}/raffles`);
    if (res.success && res.data) {
      setRaffles(res.data);
    } else {
      setError(res.error || 'Impossible de charger les tombolas.');
    }
    setLoading(false);
  }, [activeEdition]);

  useEffect(() => {
    fetchRaffles();
  }, [fetchRaffles]);

  const fetchPrizes = async (raffleId: string) => {
    setPrizesLoading((prev) => ({ ...prev, [raffleId]: true }));
    const res = await api.get<Prize[]>(`/raffles/raffles/${raffleId}/prizes`);
    if (res.success && res.data) {
      setPrizes((prev) => ({ ...prev, [raffleId]: res.data! }));
    }
    setPrizesLoading((prev) => ({ ...prev, [raffleId]: false }));
  };

  const toggleExpand = async (raffleId: string) => {
    if (expandedRaffle === raffleId) {
      setExpandedRaffle(null);
    } else {
      setExpandedRaffle(raffleId);
      if (!prizes[raffleId]) {
        await fetchPrizes(raffleId);
      }
    }
  };

  // ---------- Raffle CRUD ----------

  const openRaffleCreate = () => {
    setEditingRaffle(null);
    setRaffleForm(emptyRaffleForm);
    setShowRaffleDialog(true);
  };

  const openRaffleEdit = (raffle: Raffle) => {
    setEditingRaffle(raffle);
    setRaffleForm({
      name: raffle.name,
      description: raffle.description || '',
      draw_date: raffle.draw_date,
    });
    setShowRaffleDialog(true);
  };

  const closeRaffleDialog = () => {
    setShowRaffleDialog(false);
    setEditingRaffle(null);
    setRaffleForm(emptyRaffleForm);
  };

  const submitRaffle = async () => {
    if (!activeEdition || !raffleForm.name.trim()) return;
    setRaffleSubmitting(true);

    const payload = {
      name: raffleForm.name.trim(),
      description: raffleForm.description.trim() || null,
      draw_date: raffleForm.draw_date,
    };

    if (editingRaffle) {
      await api.put(`/raffles/edition/${activeEdition.id}/raffles/${editingRaffle.id}`, payload);
    } else {
      await api.post(`/raffles/edition/${activeEdition.id}/raffles`, payload);
    }
    setRaffleSubmitting(false);
    closeRaffleDialog();
    await fetchRaffles();
  };

  const deleteRaffle = async (raffle: Raffle) => {
    if (!activeEdition) return;
    if (!confirm(`Supprimer la tombola "${raffle.name}" ?`)) return;
    await api.delete(`/raffles/edition/${activeEdition.id}/raffles/${raffle.id}`);
    if (expandedRaffle === raffle.id) setExpandedRaffle(null);
    await fetchRaffles();
  };

  // ---------- Prize CRUD ----------

  const openPrizeCreate = (raffleId: string) => {
    setPrizeRaffleId(raffleId);
    setPrizeForm(emptyPrizeForm);
    setShowPrizeDialog(true);
  };

  const closePrizeDialog = () => {
    setShowPrizeDialog(false);
    setPrizeRaffleId(null);
    setPrizeForm(emptyPrizeForm);
  };

  const submitPrize = async () => {
    if (!prizeRaffleId || !prizeForm.name.trim()) return;
    setPrizeSubmitting(true);
    await api.post(`/raffles/raffles/${prizeRaffleId}/prizes`, {
      name: prizeForm.name.trim(),
      description: prizeForm.description.trim() || null,
      sponsor: prizeForm.sponsor.trim() || null,
    });
    setPrizeSubmitting(false);
    closePrizeDialog();
    await fetchPrizes(prizeRaffleId);
  };

  const deletePrize = async (raffleId: string, prizeId: string) => {
    if (!confirm('Supprimer ce lot ?')) return;
    await api.delete(`/raffles/raffles/${raffleId}/prizes/${prizeId}`);
    await fetchPrizes(raffleId);
  };

  // ---------- Draw ----------

  const handleDraw = async (raffle: Raffle) => {
    if (!confirm(`Lancer le tirage au sort pour "${raffle.name}" ? Cette action est irreversible.`)) return;
    setDrawing(raffle.id);
    const res = await api.post<DrawResult>(`/raffles/raffles/${raffle.id}/draw`);
    if (res.success && res.data) {
      setDrawResults((prev) => ({ ...prev, [raffle.id]: res.data!.prizes }));
      // Refresh prizes to show winners
      await fetchPrizes(raffle.id);
      // Refresh raffle list to update drawn status
      await fetchRaffles();
    }
    setDrawing(null);
  };

  // ---------- Helpers ----------

  const formatDate = (dt: string) => {
    if (!dt) return '—';
    try {
      return new Date(dt).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dt;
    }
  };

  if (!activeEdition) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Aucune edition active selectionnee.</p>
      </div>
    );
  }

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
        <button type="button" onClick={fetchRaffles} className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Reessayer
        </button>
      </div>
    );
  }

if (!activeEdition) {    return <div className="flex items-center justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;  }
  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Tombolas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerez les tombolas, lots et tirages au sort.
          </p>
        </div>
        <button
          type="button"
          onClick={openRaffleCreate}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nouvelle tombola
        </button>
      </div>

      {/* Raffle Dialog */}
      {showRaffleDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {editingRaffle ? 'Modifier la tombola' : 'Nouvelle tombola'}
              </h2>
              <button type="button" onClick={closeRaffleDialog} className="rounded-md p-1 text-muted-foreground hover:bg-accent">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Nom</label>
                <input
                  type="text"
                  value={raffleForm.name}
                  onChange={(e) => setRaffleForm({ ...raffleForm, name: e.target.value })}
                  placeholder="Ex : Grande tombola du samedi"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
                <textarea
                  value={raffleForm.description}
                  onChange={(e) => setRaffleForm({ ...raffleForm, description: e.target.value })}
                  rows={2}
                  placeholder="Description optionnelle"
                  className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Date du tirage</label>
                <input
                  type="datetime-local"
                  value={raffleForm.draw_date}
                  onChange={(e) => setRaffleForm({ ...raffleForm, draw_date: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={closeRaffleDialog} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">
                Annuler
              </button>
              <button
                type="button"
                onClick={submitRaffle}
                disabled={raffleSubmitting || !raffleForm.name.trim()}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {raffleSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingRaffle ? 'Enregistrer' : 'Creer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prize Dialog */}
      {showPrizeDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Nouveau lot</h2>
              <button type="button" onClick={closePrizeDialog} className="rounded-md p-1 text-muted-foreground hover:bg-accent">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Nom du lot</label>
                <input
                  type="text"
                  value={prizeForm.name}
                  onChange={(e) => setPrizeForm({ ...prizeForm, name: e.target.value })}
                  placeholder="Ex : Figurine collector"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
                <textarea
                  value={prizeForm.description}
                  onChange={(e) => setPrizeForm({ ...prizeForm, description: e.target.value })}
                  rows={2}
                  placeholder="Description optionnelle"
                  className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Sponsor</label>
                <input
                  type="text"
                  value={prizeForm.sponsor}
                  onChange={(e) => setPrizeForm({ ...prizeForm, sponsor: e.target.value })}
                  placeholder="Nom du sponsor (optionnel)"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={closePrizeDialog} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">
                Annuler
              </button>
              <button
                type="button"
                onClick={submitPrize}
                disabled={prizeSubmitting || !prizeForm.name.trim()}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {prizeSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Raffles list */}
      {raffles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-12 text-center">
          <Gift className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Aucune tombola.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Creez une tombola pour organiser des tirages au sort.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {raffles.map((raffle) => {
            const isExpanded = expandedRaffle === raffle.id;
            const rafflePrizes = prizes[raffle.id] || [];
            const isLoadingPrizes = prizesLoading[raffle.id];
            const drawnPrizes = drawResults[raffle.id];

            return (
              <div key={raffle.id} className="rounded-xl border border-border bg-card">
                {/* Raffle header */}
                <div className="flex items-center justify-between p-5">
                  <button
                    type="button"
                    onClick={() => toggleExpand(raffle.id)}
                    className="flex items-center gap-2 text-left flex-1 min-w-0"
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground truncate">{raffle.name}</h3>
                        {raffle.drawn && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
                            <Trophy className="h-3 w-3" />
                            Tire
                          </span>
                        )}
                      </div>
                      {raffle.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{raffle.description}</p>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>Tirage : {formatDate(raffle.draw_date)}</span>
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {raffle.entry_count} participation{raffle.entry_count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center gap-2 ml-3">
                    {!raffle.drawn && (
                      <button
                        type="button"
                        onClick={() => handleDraw(raffle)}
                        disabled={drawing === raffle.id}
                        className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 disabled:opacity-50"
                      >
                        {drawing === raffle.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Dices className="h-3.5 w-3.5" />
                        )}
                        Tirer au sort
                      </button>
                    )}
                    <button type="button" onClick={() => openRaffleEdit(raffle)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => deleteRaffle(raffle)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Draw results announcement */}
                {drawnPrizes && (
                  <div className="mx-5 mb-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                    <div className="flex items-center gap-2 mb-2">
                      <PartyPopper className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <h4 className="font-semibold text-green-800 dark:text-green-300">Resultats du tirage</h4>
                    </div>
                    {drawnPrizes.length === 0 ? (
                      <p className="text-sm text-green-700 dark:text-green-400">Tirage effectue. Aucun lot attribue.</p>
                    ) : (
                      <ul className="space-y-1">
                        {drawnPrizes.map((p) => (
                          <li key={p.id} className="text-sm text-green-800 dark:text-green-300">
                            <span className="font-medium">{p.name}</span>
                            {p.winner_name && (
                              <span> &rarr; <span className="font-semibold">{p.winner_name}</span></span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Prizes section */}
                {isExpanded && (
                  <div className="border-t border-border px-5 pb-5 pt-3">
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Lots ({rafflePrizes.length})
                      </h4>
                      <button
                        type="button"
                        onClick={() => openPrizeCreate(raffle.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
                      >
                        <Plus className="h-3 w-3" />
                        Ajouter un lot
                      </button>
                    </div>

                    {isLoadingPrizes ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : rafflePrizes.length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">
                        Aucun lot configure pour cette tombola.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Lot</th>
                              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Sponsor</th>
                              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Gagnant</th>
                              <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {rafflePrizes.map((prize) => (
                              <tr key={prize.id} className="hover:bg-muted/50">
                                <td className="px-3 py-2">
                                  <div>
                                    <span className="text-sm font-medium text-foreground">{prize.name}</span>
                                    {prize.description && (
                                      <p className="text-xs text-muted-foreground line-clamp-1">{prize.description}</p>
                                    )}
                                  </div>
                                </td>
                                <td className="whitespace-nowrap px-3 py-2 text-sm text-muted-foreground">
                                  {prize.sponsor || '—'}
                                </td>
                                <td className="whitespace-nowrap px-3 py-2 text-sm">
                                  {prize.winner_name ? (
                                    <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400 font-medium">
                                      <Trophy className="h-3 w-3" />
                                      {prize.winner_name}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </td>
                                <td className="whitespace-nowrap px-3 py-2 text-right">
                                  <button
                                    type="button"
                                    onClick={() => deletePrize(raffle.id, prize.id)}
                                    className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
