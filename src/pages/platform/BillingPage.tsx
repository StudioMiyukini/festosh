import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Loader2,
  AlertCircle,
  Building2,
  CreditCard,
  Receipt,
  Save,
  Check,
  X,
  Calendar,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { formatCurrency, formatTimestamp } from '@/lib/format-utils';
import { useAuthStore } from '@/stores/auth-store';

/* ---------- Types ---------- */

interface BillingProfile {
  company_name: string;
  billing_email: string;
  vat_number: string;
  address_line1: string;
  address_line2: string;
  postal_code: string;
  city: string;
  country: string;
}

interface SubscriptionStatus {
  has_subscription: boolean;
  is_beta: boolean;
  beta_end_date?: number;
  plan_name?: string;
  plan_slug?: string;
  status?: string;
  current_period_end?: number;
}

interface Invoice {
  id: string;
  number: string;
  description: string;
  amount_ttc: number;
  status: 'paid' | 'pending' | 'overdue';
  created_at: number;
}

/* ---------- Constants ---------- */

const EMPTY_PROFILE: BillingProfile = {
  company_name: '',
  billing_email: '',
  vat_number: '',
  address_line1: '',
  address_line2: '',
  postal_code: '',
  city: '',
  country: 'France',
};

const INV_STATUS_BADGE: Record<string, string> = {
  paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const INV_STATUS_LABEL: Record<string, string> = {
  paid: 'Payee',
  pending: 'En attente',
  overdue: 'En retard',
};

/* ---------- Component ---------- */

export function BillingPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const navigate = useNavigate();

  /* ---- Billing profile ---- */
  const [profile, setProfile] = useState<BillingProfile>(EMPTY_PROFILE);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  /* ---- Subscription ---- */
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [subLoading, setSubLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  /* ---- Invoices ---- */
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invLoading, setInvLoading] = useState(true);
  const [invError, setInvError] = useState<string | null>(null);

  /* ---- General message ---- */
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  /* ---- Auth guard ---- */
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  /* ---- Load billing profile ---- */
  useEffect(() => {
    if (!isAuthenticated) return;
    api.get<BillingProfile>('/billing/my-profile').then((res) => {
      if (res.success && res.data) {
        setProfile({ ...EMPTY_PROFILE, ...res.data });
      }
      setProfileLoading(false);
    });
  }, [isAuthenticated]);

  /* ---- Load subscription status ---- */
  useEffect(() => {
    if (!isAuthenticated) return;
    api.get<SubscriptionStatus>('/subscriptions/my-status').then((res) => {
      if (res.success && res.data) {
        setSubscription(res.data);
      }
      setSubLoading(false);
    });
  }, [isAuthenticated]);

  /* ---- Load invoices ---- */
  useEffect(() => {
    if (!isAuthenticated) return;
    api.get<Invoice[]>('/billing/my-invoices').then((res) => {
      if (res.success && res.data) {
        setInvoices(Array.isArray(res.data) ? res.data : []);
      } else {
        setInvError(res.error || 'Erreur lors du chargement des factures');
      }
      setInvLoading(false);
    });
  }, [isAuthenticated]);

  /* ---- Save billing profile ---- */
  const handleSaveProfile = async () => {
    setProfileSaving(true);
    setProfileMessage(null);

    const res = await api.put<BillingProfile>('/billing/my-profile', profile);
    if (res.success) {
      setProfileMessage({ type: 'success', text: 'Profil de facturation enregistre.' });
    } else {
      setProfileMessage({ type: 'error', text: res.error || 'Erreur lors de l\'enregistrement.' });
    }
    setProfileSaving(false);
  };

  /* ---- Cancel subscription ---- */
  const handleCancelSubscription = async () => {
    setCancelling(true);
    setMessage(null);

    const res = await api.post<SubscriptionStatus>('/subscriptions/cancel');
    if (res.success && res.data) {
      setSubscription(res.data);
      setMessage({ type: 'success', text: 'Abonnement annule. Vous conservez l\'acces jusqu\'a la fin de la periode.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de l\'annulation.' });
    }
    setCancelling(false);
  };

  /* ---- Input change helper ---- */
  const updateField = (field: keyof BillingProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  /* ---- Loading / auth gate ---- */
  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  /* ---------- Render ---------- */
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Facturation</h1>
        <p className="mt-2 text-muted-foreground">
          Gerez votre profil de facturation, votre abonnement et consultez vos factures.
        </p>
      </div>

      {/* General message */}
      {message && (
        <div
          className={`mb-6 flex items-center justify-between rounded-xl border px-5 py-4 text-sm ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400'
              : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <Check className="h-4 w-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button type="button" onClick={() => setMessage(null)} className="ml-3 flex-shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ========== Billing profile ========== */}
      <div className="mb-8 rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-bold text-foreground">Profil de facturation</h2>
        </div>

        {profileLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="p-6">
            {/* Profile message */}
            {profileMessage && (
              <div
                className={`mb-4 flex items-center gap-2 rounded-md border px-4 py-3 text-sm ${
                  profileMessage.type === 'success'
                    ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400'
                    : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'
                }`}
              >
                {profileMessage.type === 'success' ? (
                  <Check className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                )}
                {profileMessage.text}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Company name */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Raison sociale
                </label>
                <input
                  type="text"
                  value={profile.company_name}
                  onChange={(e) => updateField('company_name', e.target.value)}
                  placeholder="Nom de l'entreprise"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Billing email */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Email de facturation
                </label>
                <input
                  type="email"
                  value={profile.billing_email}
                  onChange={(e) => updateField('billing_email', e.target.value)}
                  placeholder="facturation@example.com"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* VAT number */}
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Numero de TVA
                </label>
                <input
                  type="text"
                  value={profile.vat_number}
                  onChange={(e) => updateField('vat_number', e.target.value)}
                  placeholder="FR12345678901"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Address line 1 */}
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Adresse (ligne 1)
                </label>
                <input
                  type="text"
                  value={profile.address_line1}
                  onChange={(e) => updateField('address_line1', e.target.value)}
                  placeholder="Numero et rue"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Address line 2 */}
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Adresse (ligne 2)
                </label>
                <input
                  type="text"
                  value={profile.address_line2}
                  onChange={(e) => updateField('address_line2', e.target.value)}
                  placeholder="Complement d'adresse"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Postal code */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Code postal
                </label>
                <input
                  type="text"
                  value={profile.postal_code}
                  onChange={(e) => updateField('postal_code', e.target.value)}
                  placeholder="75001"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* City */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Ville
                </label>
                <input
                  type="text"
                  value={profile.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  placeholder="Paris"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Country */}
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Pays
                </label>
                <input
                  type="text"
                  value={profile.country}
                  onChange={(e) => updateField('country', e.target.value)}
                  placeholder="France"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            {/* Save button */}
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                disabled={profileSaving}
                onClick={handleSaveProfile}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {profileSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Enregistrer
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========== Subscription ========== */}
      <div className="mb-8 rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <CreditCard className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-bold text-foreground">Abonnement</h2>
        </div>

        {subLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !subscription ? (
          <div className="p-6 text-center">
            <AlertCircle className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Impossible de charger les informations d'abonnement.</p>
          </div>
        ) : subscription.is_beta ? (
          /* Beta user */
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-green-100 p-3 dark:bg-green-900/40">
                <Sparkles className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-foreground">Acces Beta</h3>
                  <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    Beta
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Vous beneficiez d'un acces gratuit a toutes les fonctionnalites organisateur.
                </p>
                {subscription.beta_end_date && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Acces jusqu'au {formatTimestamp(subscription.beta_end_date)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : subscription.has_subscription && subscription.status === 'active' ? (
          /* Active subscription */
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-primary/10 p-3">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    {subscription.plan_name || 'Abonnement organisateur'}
                  </h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">Abonnement actif</p>
                </div>
              </div>
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Actif
              </span>
            </div>

            {subscription.current_period_end && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Prochaine facturation :</span>
                <span className="font-medium text-foreground">
                  {formatTimestamp(subscription.current_period_end)}
                </span>
              </div>
            )}

            <div className="mt-4 border-t border-border pt-4">
              <button
                type="button"
                disabled={cancelling}
                onClick={handleCancelSubscription}
                className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
              >
                {cancelling && <Loader2 className="h-4 w-4 animate-spin" />}
                Annuler l'abonnement
              </button>
            </div>
          </div>
        ) : (
          /* No subscription */
          <div className="p-6 text-center">
            <CreditCard className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="mb-1 text-sm font-medium text-foreground">Aucun abonnement actif</p>
            <p className="mb-4 text-sm text-muted-foreground">
              Souscrivez a un abonnement pour acceder aux fonctionnalites organisateur.
            </p>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <ExternalLink className="h-4 w-4" />
              Voir les offres
            </Link>
          </div>
        )}
      </div>

      {/* ========== Invoices ========== */}
      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <Receipt className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-bold text-foreground">Factures</h2>
        </div>

        {invLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : invError ? (
          <div className="flex flex-col items-center py-12">
            <AlertCircle className="mb-2 h-6 w-6 text-destructive" />
            <p className="text-sm text-destructive">{invError}</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-12 text-center">
            <Receipt className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Aucune facture pour le moment.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    N° Facture
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Libelle
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Montant TTC
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/30">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-mono text-foreground">
                      {inv.number}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {inv.description}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-foreground">
                      {formatCurrency(inv.amount_ttc)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          INV_STATUS_BADGE[inv.status] || INV_STATUS_BADGE.pending
                        }`}
                      >
                        {INV_STATUS_LABEL[inv.status] || inv.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-muted-foreground">
                      {formatTimestamp(inv.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
