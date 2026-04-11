import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  Stamp,
  Award,
  Map,
  QrCode,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useTenantStore } from '@/stores/tenant-store';
import { api } from '@/lib/api-client';

// --- Types ---

interface StampCard {
  id: string;
  edition_id: string;
  name: string;
  description: string | null;
  required_stamps: number;
  reward: string;
  created_at: number;
}

interface Badge {
  id: string;
  edition_id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  condition_type: string;
  condition_value: number;
  created_at: number;
}

interface Hunt {
  id: string;
  edition_id: string;
  name: string;
  description: string | null;
  reward: string | null;
  created_at: number;
}

interface Checkpoint {
  id: string;
  hunt_id: string;
  name: string;
  hint: string | null;
  qr_code: string;
  created_at: number;
}

// --- Condition types ---

const CONDITION_TYPES = [
  { value: 'stamps_collected', label: 'Tampons collectes' },
  { value: 'events_attended', label: 'Evenements assistes' },
  { value: 'purchases_made', label: 'Achats effectues' },
  { value: 'hunts_completed', label: 'Chasses completees' },
];

type Tab = 'stamps' | 'badges' | 'hunts';

export function AdminGamificationPage() {
  const { activeEdition } = useTenantStore();
  const [activeTab, setActiveTab] = useState<Tab>('stamps');

  // --- Stamp Cards ---
  const [stampCards, setStampCards] = useState<StampCard[]>([]);
  const [stampLoading, setStampLoading] = useState(true);
  const [stampError, setStampError] = useState<string | null>(null);
  const [showStampDialog, setShowStampDialog] = useState(false);
  const [editingStamp, setEditingStamp] = useState<StampCard | null>(null);
  const [stampForm, setStampForm] = useState({ name: '', description: '', required_stamps: '5', reward: '' });
  const [stampSubmitting, setStampSubmitting] = useState(false);

  // --- Badges ---
  const [badges, setBadges] = useState<Badge[]>([]);
  const [badgeLoading, setBadgeLoading] = useState(true);
  const [badgeError, setBadgeError] = useState<string | null>(null);
  const [showBadgeDialog, setShowBadgeDialog] = useState(false);
  const [editingBadge, setEditingBadge] = useState<Badge | null>(null);
  const [badgeForm, setBadgeForm] = useState({ name: '', description: '', icon: '', color: '#6366f1', condition_type: 'stamps_collected', condition_value: '1' });
  const [badgeSubmitting, setBadgeSubmitting] = useState(false);

  // --- Hunts ---
  const [hunts, setHunts] = useState<Hunt[]>([]);
  const [huntLoading, setHuntLoading] = useState(true);
  const [huntError, setHuntError] = useState<string | null>(null);
  const [showHuntDialog, setShowHuntDialog] = useState(false);
  const [editingHunt, setEditingHunt] = useState<Hunt | null>(null);
  const [huntForm, setHuntForm] = useState({ name: '', description: '', reward: '' });
  const [huntSubmitting, setHuntSubmitting] = useState(false);

  // --- Checkpoints (per hunt) ---
  const [expandedHunt, setExpandedHunt] = useState<string | null>(null);
  const [checkpoints, setCheckpoints] = useState<Record<string, Checkpoint[]>>({});
  const [showCheckpointDialog, setShowCheckpointDialog] = useState(false);
  const [checkpointHuntId, setCheckpointHuntId] = useState<string | null>(null);
  const [checkpointForm, setCheckpointForm] = useState({ name: '', hint: '' });
  const [checkpointSubmitting, setCheckpointSubmitting] = useState(false);

  // ---------- Fetch ----------

  const fetchStampCards = useCallback(async () => {
    if (!activeEdition) return;
    setStampLoading(true);
    setStampError(null);
    const res = await api.get<StampCard[]>(`/gamification/edition/${activeEdition.id}/stamp-cards`);
    if (res.success && res.data) setStampCards(Array.isArray(res.data) ? res.data : []);
    else setStampError(res.error || 'Erreur de chargement.');
    setStampLoading(false);
  }, [activeEdition]);

  const fetchBadges = useCallback(async () => {
    if (!activeEdition) return;
    setBadgeLoading(true);
    setBadgeError(null);
    const res = await api.get<Badge[]>(`/gamification/edition/${activeEdition.id}/badges`);
    if (res.success && res.data) setBadges(Array.isArray(res.data) ? res.data : []);
    else setBadgeError(res.error || 'Erreur de chargement.');
    setBadgeLoading(false);
  }, [activeEdition]);

  const fetchHunts = useCallback(async () => {
    if (!activeEdition) return;
    setHuntLoading(true);
    setHuntError(null);
    const res = await api.get<Hunt[]>(`/gamification/edition/${activeEdition.id}/hunts`);
    if (res.success && res.data) setHunts(Array.isArray(res.data) ? res.data : []);
    else setHuntError(res.error || 'Erreur de chargement.');
    setHuntLoading(false);
  }, [activeEdition]);

  const fetchCheckpoints = useCallback(async (huntId: string) => {
    const res = await api.get<Checkpoint[]>(`/gamification/hunts/${huntId}/checkpoints`);
    if (res.success && res.data) {
      setCheckpoints((prev) => ({ ...prev, [huntId]: res.data! }));
    }
  }, []);

  useEffect(() => {
    fetchStampCards();
    fetchBadges();
    fetchHunts();
  }, [fetchStampCards, fetchBadges, fetchHunts]);

  // ---------- Stamp Card CRUD ----------

  const openStampCreate = () => {
    setEditingStamp(null);
    setStampForm({ name: '', description: '', required_stamps: '5', reward: '' });
    setShowStampDialog(true);
  };

  const openStampEdit = (card: StampCard) => {
    setEditingStamp(card);
    setStampForm({
      name: card.name,
      description: card.description || '',
      required_stamps: String(card.required_stamps),
      reward: card.reward,
    });
    setShowStampDialog(true);
  };

  const submitStamp = async () => {
    if (!activeEdition || !stampForm.name.trim()) return;
    setStampSubmitting(true);
    const payload = {
      name: stampForm.name.trim(),
      description: stampForm.description.trim() || null,
      required_stamps: Number(stampForm.required_stamps),
      reward: stampForm.reward.trim(),
    };
    if (editingStamp) {
      await api.put(`/gamification/edition/${activeEdition.id}/stamp-cards/${editingStamp.id}`, payload);
    } else {
      await api.post(`/gamification/edition/${activeEdition.id}/stamp-cards`, payload);
    }
    setShowStampDialog(false);
    setStampSubmitting(false);
    await fetchStampCards();
  };

  const deleteStamp = async (card: StampCard) => {
    if (!activeEdition) return;
    if (!confirm(`Supprimer la carte "${card.name}" ?`)) return;
    await api.delete(`/gamification/edition/${activeEdition.id}/stamp-cards/${card.id}`);
    await fetchStampCards();
  };

  // ---------- Badge CRUD ----------

  const openBadgeCreate = () => {
    setEditingBadge(null);
    setBadgeForm({ name: '', description: '', icon: '', color: '#6366f1', condition_type: 'stamps_collected', condition_value: '1' });
    setShowBadgeDialog(true);
  };

  const openBadgeEdit = (badge: Badge) => {
    setEditingBadge(badge);
    setBadgeForm({
      name: badge.name,
      description: badge.description || '',
      icon: badge.icon || '',
      color: badge.color || '#6366f1',
      condition_type: badge.condition_type,
      condition_value: String(badge.condition_value),
    });
    setShowBadgeDialog(true);
  };

  const submitBadge = async () => {
    if (!activeEdition || !badgeForm.name.trim()) return;
    setBadgeSubmitting(true);
    const payload = {
      name: badgeForm.name.trim(),
      description: badgeForm.description.trim() || null,
      icon: badgeForm.icon.trim() || null,
      color: badgeForm.color.trim() || null,
      condition_type: badgeForm.condition_type,
      condition_value: Number(badgeForm.condition_value),
    };
    if (editingBadge) {
      await api.put(`/gamification/edition/${activeEdition.id}/badges/${editingBadge.id}`, payload);
    } else {
      await api.post(`/gamification/edition/${activeEdition.id}/badges`, payload);
    }
    setShowBadgeDialog(false);
    setBadgeSubmitting(false);
    await fetchBadges();
  };

  const deleteBadge = async (badge: Badge) => {
    if (!activeEdition) return;
    if (!confirm(`Supprimer le badge "${badge.name}" ?`)) return;
    await api.delete(`/gamification/edition/${activeEdition.id}/badges/${badge.id}`);
    await fetchBadges();
  };

  // ---------- Hunt CRUD ----------

  const openHuntCreate = () => {
    setEditingHunt(null);
    setHuntForm({ name: '', description: '', reward: '' });
    setShowHuntDialog(true);
  };

  const openHuntEdit = (hunt: Hunt) => {
    setEditingHunt(hunt);
    setHuntForm({
      name: hunt.name,
      description: hunt.description || '',
      reward: hunt.reward || '',
    });
    setShowHuntDialog(true);
  };

  const submitHunt = async () => {
    if (!activeEdition || !huntForm.name.trim()) return;
    setHuntSubmitting(true);
    const payload = {
      name: huntForm.name.trim(),
      description: huntForm.description.trim() || null,
      reward: huntForm.reward.trim() || null,
    };
    if (editingHunt) {
      await api.put(`/gamification/edition/${activeEdition.id}/hunts/${editingHunt.id}`, payload);
    } else {
      await api.post(`/gamification/edition/${activeEdition.id}/hunts`, payload);
    }
    setShowHuntDialog(false);
    setHuntSubmitting(false);
    await fetchHunts();
  };

  const deleteHunt = async (hunt: Hunt) => {
    if (!activeEdition) return;
    if (!confirm(`Supprimer la chasse "${hunt.name}" ?`)) return;
    await api.delete(`/gamification/edition/${activeEdition.id}/hunts/${hunt.id}`);
    setCheckpoints((prev) => {
      const next = { ...prev };
      delete next[hunt.id];
      return next;
    });
    await fetchHunts();
  };

  // ---------- Checkpoint CRUD ----------

  const toggleHuntExpand = async (huntId: string) => {
    if (expandedHunt === huntId) {
      setExpandedHunt(null);
    } else {
      setExpandedHunt(huntId);
      if (!checkpoints[huntId]) {
        await fetchCheckpoints(huntId);
      }
    }
  };

  const openCheckpointCreate = (huntId: string) => {
    setCheckpointHuntId(huntId);
    setCheckpointForm({ name: '', hint: '' });
    setShowCheckpointDialog(true);
  };

  const submitCheckpoint = async () => {
    if (!checkpointHuntId || !checkpointForm.name.trim()) return;
    setCheckpointSubmitting(true);
    await api.post(`/gamification/hunts/${checkpointHuntId}/checkpoints`, {
      name: checkpointForm.name.trim(),
      hint: checkpointForm.hint.trim() || null,
    });
    setShowCheckpointDialog(false);
    setCheckpointSubmitting(false);
    await fetchCheckpoints(checkpointHuntId);
  };

  const deleteCheckpoint = async (huntId: string, cpId: string) => {
    if (!confirm('Supprimer ce checkpoint ?')) return;
    await api.delete(`/gamification/hunts/${huntId}/checkpoints/${cpId}`);
    await fetchCheckpoints(huntId);
  };

  // ---------- Render helpers ----------

  const renderLoading = () => (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  const renderError = (msg: string, retry: () => void) => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertCircle className="mb-2 h-6 w-6 text-destructive" />
      <p className="text-sm text-destructive">{msg}</p>
      <button type="button" onClick={retry} className="mt-3 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
        Reessayer
      </button>
    </div>
  );

  if (!activeEdition) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Aucune edition active selectionnee.</p>
      </div>
    );
  }

if (!activeEdition) {    return <div className="flex items-center justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;  }
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Gamification</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cartes tampons, badges et chasses au tresor.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-border">
        {([
          { key: 'stamps' as Tab, label: 'Cartes tampons', icon: Stamp, count: stampCards.length },
          { key: 'badges' as Tab, label: 'Badges', icon: Award, count: badges.length },
          { key: 'hunts' as Tab, label: 'Chasses au tresor', icon: Map, count: hunts.length },
        ]).map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label} ({count})
          </button>
        ))}
      </div>

      {/* ===== STAMP CARDS TAB ===== */}
      {activeTab === 'stamps' && (
        <div>
          <div className="mb-4 flex items-center justify-end">
            <button type="button" onClick={openStampCreate} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              Nouvelle carte
            </button>
          </div>

          {stampLoading ? renderLoading() : stampError ? renderError(stampError, fetchStampCards) : stampCards.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-12 text-center">
              <Stamp className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Aucune carte tampon.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stampCards.map((card) => (
                <div key={card.id} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{card.name}</h3>
                      {card.description && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{card.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <button type="button" onClick={() => openStampEdit(card)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => deleteStamp(card)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-medium">
                      <Stamp className="h-3 w-3" />
                      {card.required_stamps} tampons
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-foreground">
                    <span className="font-medium">Recompense :</span> {card.reward}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Stamp Dialog */}
          {showStampDialog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">
                    {editingStamp ? 'Modifier la carte' : 'Nouvelle carte tampon'}
                  </h2>
                  <button type="button" onClick={() => setShowStampDialog(false)} className="rounded-md p-1 text-muted-foreground hover:bg-accent">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Nom</label>
                    <input type="text" value={stampForm.name} onChange={(e) => setStampForm({ ...stampForm, name: e.target.value })} placeholder="Ex : Carte des exposants" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
                    <textarea value={stampForm.description} onChange={(e) => setStampForm({ ...stampForm, description: e.target.value })} rows={2} placeholder="Description optionnelle" className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Tampons requis</label>
                    <input type="number" min="1" value={stampForm.required_stamps} onChange={(e) => setStampForm({ ...stampForm, required_stamps: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Recompense</label>
                    <input type="text" value={stampForm.reward} onChange={(e) => setStampForm({ ...stampForm, reward: e.target.value })} placeholder="Ex : Goodie bag" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowStampDialog(false)} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">Annuler</button>
                  <button type="button" onClick={submitStamp} disabled={stampSubmitting || !stampForm.name.trim()} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                    {stampSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {editingStamp ? 'Enregistrer' : 'Creer'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== BADGES TAB ===== */}
      {activeTab === 'badges' && (
        <div>
          <div className="mb-4 flex items-center justify-end">
            <button type="button" onClick={openBadgeCreate} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              Nouveau badge
            </button>
          </div>

          {badgeLoading ? renderLoading() : badgeError ? renderError(badgeError, fetchBadges) : badges.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-12 text-center">
              <Award className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Aucun badge.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {badges.map((badge) => (
                <div key={badge.id} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-full text-white text-lg font-bold"
                        style={{ backgroundColor: badge.color || '#6366f1' }}
                      >
                        {badge.icon || badge.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{badge.name}</h3>
                        {badge.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{badge.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <button type="button" onClick={() => openBadgeEdit(badge)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => deleteBadge(badge)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    <span className="font-medium">Condition :</span>{' '}
                    {CONDITION_TYPES.find((c) => c.value === badge.condition_type)?.label || badge.condition_type}{' '}
                    &ge; {badge.condition_value}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Badge Dialog */}
          {showBadgeDialog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">
                    {editingBadge ? 'Modifier le badge' : 'Nouveau badge'}
                  </h2>
                  <button type="button" onClick={() => setShowBadgeDialog(false)} className="rounded-md p-1 text-muted-foreground hover:bg-accent">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Nom</label>
                    <input type="text" value={badgeForm.name} onChange={(e) => setBadgeForm({ ...badgeForm, name: e.target.value })} placeholder="Ex : Super visiteur" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
                    <textarea value={badgeForm.description} onChange={(e) => setBadgeForm({ ...badgeForm, description: e.target.value })} rows={2} placeholder="Description optionnelle" className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">Icone</label>
                      <input type="text" value={badgeForm.icon} onChange={(e) => setBadgeForm({ ...badgeForm, icon: e.target.value })} placeholder="Emoji ou texte" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">Couleur</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={badgeForm.color} onChange={(e) => setBadgeForm({ ...badgeForm, color: e.target.value })} className="h-9 w-9 rounded border border-border cursor-pointer" />
                        <input type="text" value={badgeForm.color} onChange={(e) => setBadgeForm({ ...badgeForm, color: e.target.value })} className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">Type de condition</label>
                      <select value={badgeForm.condition_type} onChange={(e) => setBadgeForm({ ...badgeForm, condition_type: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                        {CONDITION_TYPES.map((ct) => (
                          <option key={ct.value} value={ct.value}>{ct.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">Valeur requise</label>
                      <input type="number" min="1" value={badgeForm.condition_value} onChange={(e) => setBadgeForm({ ...badgeForm, condition_value: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowBadgeDialog(false)} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">Annuler</button>
                  <button type="button" onClick={submitBadge} disabled={badgeSubmitting || !badgeForm.name.trim()} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                    {badgeSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {editingBadge ? 'Enregistrer' : 'Creer'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== HUNTS TAB ===== */}
      {activeTab === 'hunts' && (
        <div>
          <div className="mb-4 flex items-center justify-end">
            <button type="button" onClick={openHuntCreate} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              Nouvelle chasse
            </button>
          </div>

          {huntLoading ? renderLoading() : huntError ? renderError(huntError, fetchHunts) : hunts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-12 text-center">
              <Map className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Aucune chasse au tresor.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {hunts.map((hunt) => {
                const isExpanded = expandedHunt === hunt.id;
                const cps = checkpoints[hunt.id] || [];
                return (
                  <div key={hunt.id} className="rounded-xl border border-border bg-card">
                    <div className="flex items-center justify-between p-5">
                      <button
                        type="button"
                        onClick={() => toggleHuntExpand(hunt.id)}
                        className="flex items-center gap-2 text-left flex-1 min-w-0"
                      >
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        <div className="min-w-0">
                          <h3 className="font-semibold text-foreground truncate">{hunt.name}</h3>
                          {hunt.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{hunt.description}</p>
                          )}
                        </div>
                      </button>
                      <div className="flex items-center gap-2 ml-3">
                        {hunt.reward && (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            {hunt.reward}
                          </span>
                        )}
                        <button type="button" onClick={() => openHuntEdit(hunt)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => deleteHunt(hunt)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Checkpoints sub-table */}
                    {isExpanded && (
                      <div className="border-t border-border px-5 pb-5 pt-3">
                        <div className="mb-3 flex items-center justify-between">
                          <h4 className="text-sm font-medium text-muted-foreground">
                            Checkpoints ({cps.length})
                          </h4>
                          <button
                            type="button"
                            onClick={() => openCheckpointCreate(hunt.id)}
                            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
                          >
                            <Plus className="h-3 w-3" />
                            Ajouter
                          </button>
                        </div>

                        {cps.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-3 text-center">Aucun checkpoint.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b border-border">
                                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Nom</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Indice</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">QR Code</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {cps.map((cp) => (
                                  <tr key={cp.id} className="hover:bg-muted/50">
                                    <td className="whitespace-nowrap px-3 py-2 text-sm font-medium text-foreground">{cp.name}</td>
                                    <td className="px-3 py-2 text-sm text-muted-foreground">{cp.hint || '—'}</td>
                                    <td className="px-3 py-2">
                                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-mono">
                                        <QrCode className="h-3 w-3" />
                                        {cp.qr_code.substring(0, 16)}...
                                      </span>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2 text-right">
                                      <button type="button" onClick={() => deleteCheckpoint(hunt.id, cp.id)} className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
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

          {/* Hunt Dialog */}
          {showHuntDialog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">
                    {editingHunt ? 'Modifier la chasse' : 'Nouvelle chasse au tresor'}
                  </h2>
                  <button type="button" onClick={() => setShowHuntDialog(false)} className="rounded-md p-1 text-muted-foreground hover:bg-accent">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Nom</label>
                    <input type="text" value={huntForm.name} onChange={(e) => setHuntForm({ ...huntForm, name: e.target.value })} placeholder="Ex : Chasse aux mascots" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
                    <textarea value={huntForm.description} onChange={(e) => setHuntForm({ ...huntForm, description: e.target.value })} rows={2} placeholder="Description optionnelle" className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Recompense</label>
                    <input type="text" value={huntForm.reward} onChange={(e) => setHuntForm({ ...huntForm, reward: e.target.value })} placeholder="Ex : Poster exclusif" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowHuntDialog(false)} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">Annuler</button>
                  <button type="button" onClick={submitHunt} disabled={huntSubmitting || !huntForm.name.trim()} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                    {huntSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {editingHunt ? 'Enregistrer' : 'Creer'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Checkpoint Dialog */}
          {showCheckpointDialog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="mx-4 w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">Nouveau checkpoint</h2>
                  <button type="button" onClick={() => setShowCheckpointDialog(false)} className="rounded-md p-1 text-muted-foreground hover:bg-accent">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Nom</label>
                    <input type="text" value={checkpointForm.name} onChange={(e) => setCheckpointForm({ ...checkpointForm, name: e.target.value })} placeholder="Ex : Stand manga" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Indice</label>
                    <input type="text" value={checkpointForm.hint} onChange={(e) => setCheckpointForm({ ...checkpointForm, hint: e.target.value })} placeholder="Indice optionnel pour les joueurs" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Le QR code sera genere automatiquement.
                  </p>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowCheckpointDialog(false)} className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">Annuler</button>
                  <button type="button" onClick={submitCheckpoint} disabled={checkpointSubmitting || !checkpointForm.name.trim()} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                    {checkpointSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Creer
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
