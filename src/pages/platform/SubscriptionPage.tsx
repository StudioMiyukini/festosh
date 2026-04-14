import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Check,
  CreditCard,
  Calendar,
  Loader2,
  AlertTriangle,
  Tent,
  X,
  Receipt,
  Crown,
  Star,
  Mail,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { formatCurrency, formatTimestamp } from '@/lib/format-utils';
import { useAuthStore } from '@/stores/auth-store';

interface SubscriptionStatus {
  has_subscription: boolean;
  is_beta: boolean;
  beta_joined_at?: number;
  plan_name?: string;
  plan_slug?: string;
  status?: string;
  current_period_end?: number;
  payment_method?: string;
  festival_count?: number;
}

interface Payment {
  id: string;
  created_at: number;
  description: string;
  amount_cents: number;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
}

interface PaymentsResponse {
  payments: Payment[];
}

export function SubscriptionPage() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  // Load subscription status
  useEffect(() => {
    if (!isAuthenticated) return;
    api.get<SubscriptionStatus>('/subscriptions/my-status').then((res) => {
      if (res.success && res.data) {
        setStatus(res.data);
      }
      setLoadingStatus(false);
    });
  }, [isAuthenticated]);

  // Load payment history
  useEffect(() => {
    if (!isAuthenticated) return;
    api.get<PaymentsResponse>('/subscriptions/payments').then((res) => {
      if (res.success && res.data) {
        setPayments(res.data.payments || []);
      }
      setLoadingPayments(false);
    });
  }, [isAuthenticated]);

  const handleJoinBeta = async () => {
    setActionLoading(true);
    setError(null);
    const res = await api.post<SubscriptionStatus>('/subscriptions/join-beta');
    if (res.success && res.data) {
      setStatus(res.data);
      setSuccessMessage('Bienvenue dans la beta ! Vous avez acces a toutes les fonctionnalites organisateur.');
    } else {
      setError(res.error || 'Une erreur est survenue.');
    }
    setActionLoading(false);
  };

  const handleSubscribe = async () => {
    setActionLoading(true);
    setError(null);
    const res = await api.post<SubscriptionStatus>('/subscriptions/subscribe', {
      plan: selectedPlan,
    });
    if (res.success && res.data) {
      setStatus(res.data);
      setSuccessMessage('Abonnement active avec succes !');
    } else {
      setError(res.error || 'Une erreur est survenue.');
    }
    setActionLoading(false);
  };

  const handleCancel = async () => {
    setActionLoading(true);
    setError(null);
    const res = await api.post<SubscriptionStatus>('/subscriptions/cancel');
    if (res.success && res.data) {
      setStatus(res.data);
      setSuccessMessage('Votre abonnement a ete annule. Vous conservez l\'acces jusqu\'a la fin de la periode en cours.');
      setShowCancelConfirm(false);
    } else {
      setError(res.error || 'Une erreur est survenue.');
    }
    setActionLoading(false);
  };

  const statusBadge = (paymentStatus: Payment['status']) => {
    switch (paymentStatus) {
      case 'paid':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'failed':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'refunded':
        return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const statusLabel = (paymentStatus: Payment['status']) => {
    switch (paymentStatus) {
      case 'paid':
        return 'Paye';
      case 'pending':
        return 'En attente';
      case 'failed':
        return 'Echoue';
      case 'refunded':
        return 'Rembourse';
    }
  };

  if (isLoading || loadingStatus) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Mon abonnement</h1>
        <p className="mt-2 text-muted-foreground">
          Gerez votre abonnement organisateur et consultez votre historique de paiements.
        </p>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-4 dark:border-green-900 dark:bg-green-950/30">
          <Check className="h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
          <p className="text-sm font-medium text-green-800 dark:text-green-300">{successMessage}</p>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="ml-auto flex-shrink-0 text-green-600 hover:text-green-800 dark:text-green-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/10 px-5 py-4">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-destructive" />
          <p className="text-sm font-medium text-destructive">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-auto flex-shrink-0 text-destructive hover:text-destructive/80"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Beta state ── */}
      {status?.is_beta && (
        <div className="mb-8 rounded-2xl border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 p-8 dark:border-green-800 dark:from-green-950/30 dark:to-emerald-950/20">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-green-100 p-3 dark:bg-green-900/40">
              <Sparkles className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-green-900 dark:text-green-200">
                Vous etes en phase beta !
              </h2>
              <p className="mt-1 text-sm text-green-700 dark:text-green-400">
                Acces gratuit a toutes les fonctionnalites organisateur jusqu'au 1er juin 2026.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {status.beta_joined_at && (
                  <div className="rounded-xl bg-white/60 p-4 dark:bg-green-900/20">
                    <p className="text-xs font-medium uppercase tracking-wider text-green-600 dark:text-green-500">
                      Membre depuis
                    </p>
                    <p className="mt-1 text-sm font-semibold text-green-900 dark:text-green-200">
                      {formatTimestamp(status.beta_joined_at)}
                    </p>
                  </div>
                )}
                <div className="rounded-xl bg-white/60 p-4 dark:bg-green-900/20">
                  <p className="text-xs font-medium uppercase tracking-wider text-green-600 dark:text-green-500">
                    Acces gratuit jusqu'au
                  </p>
                  <p className="mt-1 text-sm font-semibold text-green-900 dark:text-green-200">
                    1 juin 2026
                  </p>
                </div>
                {status.festival_count !== undefined && (
                  <div className="rounded-xl bg-white/60 p-4 dark:bg-green-900/20">
                    <p className="text-xs font-medium uppercase tracking-wider text-green-600 dark:text-green-500">
                      Festivals crees
                    </p>
                    <p className="mt-1 text-sm font-semibold text-green-900 dark:text-green-200">
                      {status.festival_count}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Not yet beta — join beta ── */}
      {!status?.is_beta && !status?.has_subscription && status !== null && (
        <div className="mb-8">
          {/* Check if we are still in beta period (before June 1 2026) */}
          {new Date() < new Date('2026-06-01') ? (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-8 dark:border-green-900 dark:bg-green-950/20">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-green-100 p-3 dark:bg-green-900/40">
                  <Sparkles className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-green-900 dark:text-green-200">
                    Rejoignez la beta gratuite
                  </h2>
                  <p className="mt-1 text-sm text-green-700 dark:text-green-400">
                    Festosh est en beta jusqu'au 1er juin 2026. Profitez de toutes les fonctionnalites organisateur gratuitement.
                  </p>
                  <button
                    type="button"
                    onClick={handleJoinBeta}
                    disabled={actionLoading}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-green-600/25 transition-all hover:bg-green-700 disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Rejoindre la beta
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Post-beta — no subscription */
            <div className="space-y-6">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                  <div>
                    <h2 className="text-lg font-bold text-amber-900 dark:text-amber-200">
                      Votre acces organisateur necessite un abonnement
                    </h2>
                    <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                      La beta est terminee. Pour continuer a utiliser les fonctionnalites organisateur, choisissez un abonnement.
                    </p>
                  </div>
                </div>
              </div>

              {/* Plan selection */}
              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="mb-4 text-lg font-bold text-foreground">Choisir un abonnement</h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Monthly */}
                  <button
                    type="button"
                    onClick={() => setSelectedPlan('monthly')}
                    className={`rounded-xl border-2 p-5 text-left transition-all ${
                      selectedPlan === 'monthly'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Crown className="h-5 w-5 text-primary" />
                      <span className="text-sm font-semibold text-foreground">Mensuel</span>
                    </div>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-foreground">5€</span>
                      <span className="text-sm text-muted-foreground">/mois</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Sans engagement</p>
                  </button>

                  {/* Yearly */}
                  <button
                    type="button"
                    onClick={() => setSelectedPlan('yearly')}
                    className={`relative rounded-xl border-2 p-5 text-left transition-all ${
                      selectedPlan === 'yearly'
                        ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/10'
                        : 'border-border hover:border-amber-500/30'
                    }`}
                  >
                    <div className="absolute -top-2.5 right-3">
                      <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                        -17%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-amber-500" />
                      <span className="text-sm font-semibold text-foreground">Annuel</span>
                    </div>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-foreground">50€</span>
                      <span className="text-sm text-muted-foreground">/an</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      soit 4,17€/mois — 2 mois offerts
                    </p>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSubscribe}
                  disabled={actionLoading}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 disabled:opacity-50 sm:w-auto"
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4" />
                  )}
                  S'abonner — {selectedPlan === 'monthly' ? '5€/mois' : '50€/an'}
                </button>

                <div className="mt-4 flex items-start gap-2 rounded-lg bg-muted/50 p-3">
                  <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Paiement par carte bancaire (Stripe — bientot disponible). En attendant, contactez-nous a{' '}
                    <a href="mailto:contact@festosh.com" className="font-medium text-primary hover:underline">
                      contact@festosh.com
                    </a>{' '}
                    pour activer votre abonnement.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Active subscription ── */}
      {status?.has_subscription && status.status === 'active' && (
        <div className="mb-8 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-primary/10 p-3">
                <Crown className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {status.plan_name || 'Abonnement organisateur'}
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">Abonnement actif</p>
              </div>
            </div>
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
              Actif
            </span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {status.current_period_end && (
              <div className="rounded-xl border border-border p-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Prochaine facturation
                  </p>
                </div>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {formatTimestamp(status.current_period_end)}
                </p>
              </div>
            )}
            {status.payment_method && (
              <div className="rounded-xl border border-border p-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Moyen de paiement
                  </p>
                </div>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {status.payment_method}
                </p>
              </div>
            )}
            {status.festival_count !== undefined && (
              <div className="rounded-xl border border-border p-4">
                <div className="flex items-center gap-2">
                  <Tent className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Festivals
                  </p>
                </div>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {status.festival_count}
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 border-t border-border pt-4">
            {showCancelConfirm ? (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                <p className="mb-3 text-sm text-foreground">
                  Etes-vous sur de vouloir annuler votre abonnement ? Vous conserverez l'acces jusqu'a la fin de la periode en cours.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
                  >
                    {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Confirmer l'annulation
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCancelConfirm(false)}
                    className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                  >
                    Conserver mon abonnement
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowCancelConfirm(true)}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-destructive"
              >
                Annuler l'abonnement
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Payment history ── */}
      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <Receipt className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-bold text-foreground">Historique des paiements</h2>
        </div>

        {loadingPayments ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : payments.length === 0 ? (
          <div className="py-12 text-center">
            <Receipt className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Aucun paiement pour le moment.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Date
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Description
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Montant
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-muted/30">
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">
                      {formatTimestamp(payment.created_at)}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {payment.description}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-foreground">
                      {formatCurrency(payment.amount_cents)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge(payment.status)}`}
                      >
                        {statusLabel(payment.status)}
                      </span>
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
