import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Award,
  Users,
  Loader2,
  AlertCircle,
  X,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Building2,
  Mail,
  Phone,
} from 'lucide-react';
import { useTenantStore } from '@/stores/tenant-store';
import { api } from '@/lib/api-client';
import { formatCurrency } from '@/lib/format-utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SponsorTier {
  id: string;
  festival_id: string;
  name: string;
  level: number;
  price_cents: number;
  max_sponsors: number;
  color: string;
  benefits: string;
}

interface Sponsor {
  id: string;
  festival_id: string;
  tier_id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  amount_cents: number;
  is_paid: number;
  logo_url: string | null;
  website_url: string | null;
  notes: string | null;
  created_at: number;
}

interface SponsorStats {
  total_sponsors: number;
  total_revenue_cents: number;
  paid_count: number;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AdminSponsorsPage() {
  const { festival } = useTenantStore();

  const [tiers, setTiers] = useState<SponsorTier[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Tier dialog
  const [showTierDialog, setShowTierDialog] = useState(false);
  const [editingTier, setEditingTier] = useState<SponsorTier | null>(null);
  const [tierName, setTierName] = useState('');
  const [tierLevel, setTierLevel] = useState('1');
  const [tierPrice, setTierPrice] = useState('');
  const [tierMaxSponsors, setTierMaxSponsors] = useState('');
  const [tierColor, setTierColor] = useState('#6366f1');
  const [tierBenefits, setTierBenefits] = useState('');
  const [submittingTier, setSubmittingTier] = useState(false);

  // Sponsor dialog
  const [showSponsorDialog, setShowSponsorDialog] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);
  const [sponsorCompany, setSponsorCompany] = useState('');
  const [sponsorTierId, setSponsorTierId] = useState('');
  const [sponsorContactName, setSponsorContactName] = useState('');
  const [sponsorContactEmail, setSponsorContactEmail] = useState('');
  const [sponsorContactPhone, setSponsorContactPhone] = useState('');
  const [sponsorAmount, setSponsorAmount] = useState('');
  const [sponsorIsPaid, setSponsorIsPaid] = useState(false);
  const [sponsorNotes, setSponsorNotes] = useState('');
  const [submittingSponsor, setSubmittingSponsor] = useState(false);

  /* ---- data fetching ---- */

  const fetchData = useCallback(async () => {
    if (!festival) return;
    setLoading(true);
    setError(null);

    const [tiersRes, sponsorsRes] = await Promise.all([
      api.get<SponsorTier[]>(`/sponsors/festival/${festival.id}/tiers`),
      api.get<Sponsor[]>(`/sponsors/festival/${festival.id}/sponsors`),
    ]);

    if (tiersRes.success && tiersRes.data) {
      setTiers(tiersRes.data);
    } else {
      setError(tiersRes.error || 'Impossible de charger les paliers.');
    }

    if (sponsorsRes.success && sponsorsRes.data) {
      setSponsors(sponsorsRes.data);
    }

    setLoading(false);
  }, [festival]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ---- computed stats ---- */

  const stats: SponsorStats = {
    total_sponsors: sponsors.length,
    total_revenue_cents: sponsors.reduce((sum, s) => sum + s.amount_cents, 0),
    paid_count: sponsors.filter((s) => s.is_paid).length,
  };

  /* ---- tier form helpers ---- */

  const resetTierForm = () => {
    setTierName('');
    setTierLevel('1');
    setTierPrice('');
    setTierMaxSponsors('');
    setTierColor('#6366f1');
    setTierBenefits('');
    setEditingTier(null);
  };

  const openCreateTierDialog = () => {
    resetTierForm();
    setShowTierDialog(true);
  };

  const openEditTierDialog = (tier: SponsorTier) => {
    setEditingTier(tier);
    setTierName(tier.name);
    setTierLevel(String(tier.level));
    setTierPrice(String(tier.price_cents / 100));
    setTierMaxSponsors(String(tier.max_sponsors));
    setTierColor(tier.color);
    setTierBenefits(tier.benefits);
    setShowTierDialog(true);
  };

  const handleSubmitTier = async () => {
    if (!festival || !tierName.trim() || !tierPrice || !tierMaxSponsors) return;
    setSubmittingTier(true);
    setMessage(null);

    const payload = {
      festival_id: festival.id,
      name: tierName.trim(),
      level: Number(tierLevel),
      price_cents: Math.round(parseFloat(tierPrice) * 100),
      max_sponsors: Number(tierMaxSponsors),
      color: tierColor,
      benefits: tierBenefits.trim(),
    };

    if (editingTier) {
      const res = await api.put<SponsorTier>(
        `/sponsors/festival/${festival.id}/tiers/${editingTier.id}`,
        payload,
      );
      if (res.success) {
        setShowTierDialog(false);
        resetTierForm();
        setMessage({ type: 'success', text: 'Palier mis a jour.' });
        fetchData();
      } else {
        setMessage({ type: 'error', text: res.error || 'Erreur lors de la mise a jour.' });
      }
    } else {
      const res = await api.post<SponsorTier>(
        `/sponsors/festival/${festival.id}/tiers`,
        payload,
      );
      if (res.success) {
        setShowTierDialog(false);
        resetTierForm();
        setMessage({ type: 'success', text: 'Palier cree.' });
        fetchData();
      } else {
        setMessage({ type: 'error', text: res.error || 'Erreur lors de la creation.' });
      }
    }
    setSubmittingTier(false);
  };

  const handleDeleteTier = async (tier: SponsorTier) => {
    if (!festival) return;
    if (!confirm(`Supprimer le palier "${tier.name}" ?`)) return;
    setMessage(null);

    const res = await api.delete(`/sponsors/festival/${festival.id}/tiers/${tier.id}`);
    if (res.success) {
      setTiers((prev) => prev.filter((t) => t.id !== tier.id));
      setMessage({ type: 'success', text: 'Palier supprime.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la suppression.' });
    }
  };

  /* ---- sponsor form helpers ---- */

  const resetSponsorForm = () => {
    setSponsorCompany('');
    setSponsorTierId('');
    setSponsorContactName('');
    setSponsorContactEmail('');
    setSponsorContactPhone('');
    setSponsorAmount('');
    setSponsorIsPaid(false);
    setSponsorNotes('');
    setEditingSponsor(null);
  };

  const openCreateSponsorDialog = () => {
    resetSponsorForm();
    if (tiers.length > 0) setSponsorTierId(tiers[0].id);
    setShowSponsorDialog(true);
  };

  const openEditSponsorDialog = (s: Sponsor) => {
    setEditingSponsor(s);
    setSponsorCompany(s.company_name);
    setSponsorTierId(s.tier_id);
    setSponsorContactName(s.contact_name);
    setSponsorContactEmail(s.contact_email);
    setSponsorContactPhone(s.contact_phone);
    setSponsorAmount(String(s.amount_cents / 100));
    setSponsorIsPaid(!!s.is_paid);
    setSponsorNotes(s.notes || '');
    setShowSponsorDialog(true);
  };

  const handleSubmitSponsor = async () => {
    if (!festival || !sponsorCompany.trim() || !sponsorTierId || !sponsorAmount) return;
    setSubmittingSponsor(true);
    setMessage(null);

    const payload = {
      festival_id: festival.id,
      tier_id: sponsorTierId,
      company_name: sponsorCompany.trim(),
      contact_name: sponsorContactName.trim(),
      contact_email: sponsorContactEmail.trim(),
      contact_phone: sponsorContactPhone.trim(),
      amount_cents: Math.round(parseFloat(sponsorAmount) * 100),
      is_paid: sponsorIsPaid ? 1 : 0,
      notes: sponsorNotes.trim() || null,
    };

    if (editingSponsor) {
      const res = await api.put<Sponsor>(
        `/sponsors/festival/${festival.id}/sponsors/${editingSponsor.id}`,
        payload,
      );
      if (res.success) {
        setShowSponsorDialog(false);
        resetSponsorForm();
        setMessage({ type: 'success', text: 'Sponsor mis a jour.' });
        fetchData();
      } else {
        setMessage({ type: 'error', text: res.error || 'Erreur lors de la mise a jour.' });
      }
    } else {
      const res = await api.post<Sponsor>(
        `/sponsors/festival/${festival.id}/sponsors`,
        payload,
      );
      if (res.success) {
        setShowSponsorDialog(false);
        resetSponsorForm();
        setMessage({ type: 'success', text: 'Sponsor ajoute.' });
        fetchData();
      } else {
        setMessage({ type: 'error', text: res.error || 'Erreur lors de la creation.' });
      }
    }
    setSubmittingSponsor(false);
  };

  const handleDeleteSponsor = async (s: Sponsor) => {
    if (!festival) return;
    if (!confirm(`Supprimer le sponsor "${s.company_name}" ?`)) return;
    setMessage(null);

    const res = await api.delete(`/sponsors/festival/${festival.id}/sponsors/${s.id}`);
    if (res.success) {
      setSponsors((prev) => prev.filter((x) => x.id !== s.id));
      setMessage({ type: 'success', text: 'Sponsor supprime.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la suppression.' });
    }
  };

  const handleTogglePaid = async (s: Sponsor) => {
    if (!festival) return;
    setMessage(null);

    const newPaid = s.is_paid ? 0 : 1;
    const res = await api.put<Sponsor>(
      `/sponsors/festival/${festival.id}/sponsors/${s.id}`,
      { is_paid: newPaid },
    );
    if (res.success) {
      setSponsors((prev) =>
        prev.map((x) => (x.id === s.id ? { ...x, is_paid: newPaid } : x)),
      );
      setMessage({
        type: 'success',
        text: newPaid
          ? `"${s.company_name}" marque comme paye.`
          : `"${s.company_name}" marque comme non paye.`,
      });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la mise a jour.' });
    }
  };

  /* ---- helpers ---- */

  const getTierName = (tierId: string) => {
    const tier = tiers.find((t) => t.id === tierId);
    return tier?.name || 'Inconnu';
  };

  const getTierColor = (tierId: string) => {
    const tier = tiers.find((t) => t.id === tierId);
    return tier?.color || '#6b7280';
  };

  /* ---- rendering ---- */

  if (!festival) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Aucun festival selectionne.</p>
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
        <button
          type="button"
          onClick={fetchData}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Reessayer
        </button>
      </div>
    );
  }

if (!festival) {    return <div className="flex items-center justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;  }
  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Sponsors</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerez les paliers de sponsoring et les partenaires du festival.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={openCreateTierDialog}
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Plus className="h-4 w-4" />
            Palier
          </button>
          <button
            type="button"
            onClick={openCreateSponsorDialog}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Ajouter un sponsor
          </button>
        </div>
      </div>

      {/* Feedback */}
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

      {/* ============================================================ */}
      {/*  Stats Cards                                                  */}
      {/* ============================================================ */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Sponsors</p>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{stats.total_sponsors}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Revenus sponsoring</p>
            <Award className="h-4 w-4 text-green-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-green-600">
            {formatCurrency(stats.total_revenue_cents)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Payes</p>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {stats.paid_count}
            <span className="ml-1 text-base font-normal text-muted-foreground">
              / {stats.total_sponsors}
            </span>
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Section 1 — Paliers                                          */}
      {/* ============================================================ */}
      <div className="mb-8">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
          <Award className="h-5 w-5" />
          Paliers ({tiers.length})
        </h2>

        <div className="rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Nom
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Niveau
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Prix
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Max sponsors
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Couleur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Avantages
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tiers
                  .sort((a, b) => a.level - b.level)
                  .map((tier) => (
                    <tr key={tier.id} className="hover:bg-muted/50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-foreground">
                        <span className="inline-flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: tier.color }}
                          />
                          {tier.name}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-center text-sm text-muted-foreground">
                        {tier.level}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-foreground">
                        {formatCurrency(tier.price_cents)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-center text-sm text-muted-foreground">
                        {tier.max_sponsors}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className="inline-block rounded-md px-2 py-0.5 text-xs font-medium text-white"
                          style={{ backgroundColor: tier.color }}
                        >
                          {tier.color}
                        </span>
                      </td>
                      <td className="max-w-[200px] truncate px-6 py-4 text-sm text-muted-foreground">
                        {tier.benefits || '—'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditTierDialog(tier)}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                            title="Modifier"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTier(tier)}
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

          {tiers.length === 0 && (
            <div className="p-12 text-center">
              <Award className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Aucun palier de sponsoring. Creez-en un pour commencer.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Section 2 — Sponsors                                         */}
      {/* ============================================================ */}
      <div className="mb-8">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
          <Building2 className="h-5 w-5" />
          Sponsors ({sponsors.length})
        </h2>

        <div className="rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Entreprise
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Palier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Montant
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Paye
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sponsors.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-foreground">
                      {s.company_name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: getTierColor(s.tier_id) }}
                        />
                        {getTierName(s.tier_id)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-foreground">{s.contact_name}</div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {s.contact_email && (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {s.contact_email}
                          </span>
                        )}
                        {s.contact_phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {s.contact_phone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-foreground">
                      {formatCurrency(s.amount_cents)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleTogglePaid(s)}
                        className="rounded-md p-1 hover:bg-accent"
                        title={s.is_paid ? 'Marquer comme non paye' : 'Marquer comme paye'}
                      >
                        {s.is_paid ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEditSponsorDialog(s)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                          title="Modifier"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSponsor(s)}
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

          {sponsors.length === 0 && (
            <div className="p-12 text-center">
              <Building2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Aucun sponsor. Ajoutez votre premier partenaire.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Tier Create / Edit Dialog                                    */}
      {/* ============================================================ */}
      {showTierDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {editingTier ? 'Modifier le palier' : 'Nouveau palier'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowTierDialog(false);
                  resetTierForm();
                }}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Nom</label>
                <input
                  type="text"
                  value={tierName}
                  onChange={(e) => setTierName(e.target.value)}
                  placeholder="Ex : Or, Argent, Bronze..."
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Niveau
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={tierLevel}
                    onChange={(e) => setTierLevel(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Prix (EUR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={tierPrice}
                    onChange={(e) => setTierPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Max sponsors
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={tierMaxSponsors}
                    onChange={(e) => setTierMaxSponsors(e.target.value)}
                    placeholder="10"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Couleur
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={tierColor}
                      onChange={(e) => setTierColor(e.target.value)}
                      className="h-9 w-9 cursor-pointer rounded-md border border-border"
                    />
                    <input
                      type="text"
                      value={tierColor}
                      onChange={(e) => setTierColor(e.target.value)}
                      className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Avantages
                </label>
                <textarea
                  value={tierBenefits}
                  onChange={(e) => setTierBenefits(e.target.value)}
                  rows={3}
                  placeholder="Logo sur le site, stand dedie, billets VIP..."
                  className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowTierDialog(false);
                  resetTierForm();
                }}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSubmitTier}
                disabled={submittingTier || !tierName.trim() || !tierPrice || !tierMaxSponsors}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {submittingTier && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingTier ? 'Enregistrer' : 'Creer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  Sponsor Create / Edit Dialog                                 */}
      {/* ============================================================ */}
      {showSponsorDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {editingSponsor ? 'Modifier le sponsor' : 'Nouveau sponsor'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowSponsorDialog(false);
                  resetSponsorForm();
                }}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Entreprise
                </label>
                <input
                  type="text"
                  value={sponsorCompany}
                  onChange={(e) => setSponsorCompany(e.target.value)}
                  placeholder="Nom de l'entreprise"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Palier
                  </label>
                  <select
                    value={sponsorTierId}
                    onChange={(e) => setSponsorTierId(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Selectionner</option>
                    {tiers
                      .sort((a, b) => a.level - b.level)
                      .map((tier) => (
                        <option key={tier.id} value={tier.id}>
                          {tier.name} ({formatCurrency(tier.price_cents)})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Montant (EUR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={sponsorAmount}
                    onChange={(e) => setSponsorAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div className="border-t border-border pt-2">
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Contact
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Nom du contact
                </label>
                <input
                  type="text"
                  value={sponsorContactName}
                  onChange={(e) => setSponsorContactName(e.target.value)}
                  placeholder="Prenom Nom"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
                  <input
                    type="email"
                    value={sponsorContactEmail}
                    onChange={(e) => setSponsorContactEmail(e.target.value)}
                    placeholder="contact@entreprise.fr"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Telephone
                  </label>
                  <input
                    type="tel"
                    value={sponsorContactPhone}
                    onChange={(e) => setSponsorContactPhone(e.target.value)}
                    placeholder="06 12 34 56 78"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={sponsorIsPaid}
                    onChange={(e) => setSponsorIsPaid(e.target.checked)}
                    className="rounded border-border"
                  />
                  Paye
                </label>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Notes</label>
                <textarea
                  value={sponsorNotes}
                  onChange={(e) => setSponsorNotes(e.target.value)}
                  rows={2}
                  placeholder="Notes optionnelles"
                  className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowSponsorDialog(false);
                  resetSponsorForm();
                }}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSubmitSponsor}
                disabled={
                  submittingSponsor || !sponsorCompany.trim() || !sponsorTierId || !sponsorAmount
                }
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {submittingSponsor && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingSponsor ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
