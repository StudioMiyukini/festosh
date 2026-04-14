import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Check,
  Crown,
  Star,
  Loader2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  UserPlus,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { formatCurrency } from '@/lib/format-utils';
import { useAuthStore } from '@/stores/auth-store';

interface Plan {
  id: string;
  name: string;
  slug: string;
  price_cents: number;
  interval: 'month' | 'year';
  features: string[];
  badge?: string;
}

interface PlansResponse {
  plans: Plan[];
  is_beta: boolean;
  beta_end_date: string;
}

interface SubscriptionStatus {
  has_subscription: boolean;
  is_beta: boolean;
  plan_slug?: string;
  status?: string;
}

const FAQ_ITEMS = [
  {
    question: 'Quand le paiement commence-t-il ?',
    answer:
      'Festosh est actuellement en beta gratuite jusqu\'au 1er juin 2026. Apres cette date, les organisateurs devront souscrire un abonnement pour continuer a utiliser les fonctionnalites organisateur. Les visiteurs et exposants restent toujours gratuits.',
  },
  {
    question: 'Puis-je annuler mon abonnement a tout moment ?',
    answer:
      'Oui, vous pouvez annuler votre abonnement a tout moment. Vous conserverez l\'acces jusqu\'a la fin de votre periode de facturation en cours. Aucun engagement, aucun frais d\'annulation.',
  },
  {
    question: 'Les donnees sont-elles conservees si j\'annule ?',
    answer:
      'Oui, vos donnees (festivals, pages, configurations) sont conservees pendant 12 mois apres l\'annulation. Vous pouvez les retrouver en vous reabonnant. Apres 12 mois, nous vous contactons avant toute suppression.',
  },
  {
    question: 'Quels moyens de paiement acceptez-vous ?',
    answer:
      'Le paiement se fait par carte bancaire via Stripe (Visa, Mastercard, American Express). Le paiement par virement ou PayPal sera disponible prochainement.',
  },
  {
    question: 'Y a-t-il des frais supplementaires ?',
    answer:
      'Non, l\'abonnement inclut toutes les fonctionnalites sans frais caches. Festosh ne prend aucune commission sur la billetterie ni sur les ventes exposants. Seuls les frais Stripe standards s\'appliquent sur les transactions.',
  },
];

const VISITOR_FEATURES = [
  'Profil exposant',
  'POS & gestion de stock',
  'Candidatures cross-festivals',
  'Messagerie',
  'XP & gamification',
  'Annuaire exposants',
];

const ORGANIZER_FEATURES = [
  'Festivals illimites',
  'Billetterie integree',
  'CMS personnalisable',
  'Gestion exposants',
  'Marketplace',
  'Analytics temps reel',
  'Espace collaboratif',
  'QR codes',
  'Gamification',
  'Support prioritaire',
];

const ANNUAL_BONUS_FEATURES = [
  'Badge Early Supporter',
  'Priorite nouvelles fonctionnalites',
];

export function PricingPage() {
  const { isAuthenticated } = useAuthStore();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isBeta, setIsBeta] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [joiningBeta, setJoiningBeta] = useState(false);
  const [betaJoined, setBetaJoined] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    api.get<PlansResponse>('/subscriptions/plans').then((res) => {
      if (res.success && res.data) {
        setPlans(res.data.plans || []);
        setIsBeta(res.data.is_beta);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    api.get<SubscriptionStatus>('/subscriptions/my-status').then((res) => {
      if (res.success && res.data) {
        setStatus(res.data);
        if (res.data.is_beta) setBetaJoined(true);
      }
    });
  }, [isAuthenticated]);

  const handleJoinBeta = async () => {
    setJoiningBeta(true);
    const res = await api.post('/subscriptions/join-beta');
    if (res.success) {
      setBetaJoined(true);
      setStatus((prev) => prev ? { ...prev, is_beta: true } : { has_subscription: false, is_beta: true });
    }
    setJoiningBeta(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      {/* Beta banner */}
      {isBeta && (
        <div className="border-b border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <Sparkles className="h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
            <p className="text-sm font-medium text-green-800 dark:text-green-300">
              Festosh est en phase beta ! Acces gratuit pour tous les organisateurs jusqu'au 1er juin 2026.
            </p>
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Tarifs simples et transparents
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            Gratuit pour les visiteurs et exposants. Abonnement organisateur a partir de 5&#8239;€/mois.
          </p>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Card 1 — Visiteur / Exposant */}
            <div className="relative rounded-2xl border border-border bg-card p-8">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-foreground">Visiteur / Exposant</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight text-foreground">0€</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Gratuit pour toujours</p>
              </div>

              <ul className="mb-8 space-y-3">
                {VISITOR_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                to="/signup"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
              >
                <UserPlus className="h-4 w-4" />
                Creer mon compte
              </Link>
            </div>

            {/* Card 2 — Organisateur Mensuel */}
            <div className="relative rounded-2xl border-2 border-primary bg-card p-8 shadow-lg shadow-primary/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  <Crown className="h-3 w-3" />
                  Populaire
                </span>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-bold text-foreground">Organisateur Mensuel</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight text-foreground">5€</span>
                  <span className="text-sm text-muted-foreground">/mois</span>
                </div>
                {isBeta && (
                  <p className="mt-1 text-sm font-medium text-green-600 dark:text-green-400">
                    Gratuit pendant la beta
                  </p>
                )}
              </div>

              <ul className="mb-8 space-y-3">
                {ORGANIZER_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              {isBeta ? (
                isAuthenticated ? (
                  betaJoined ? (
                    <div className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-100 px-6 py-3 text-sm font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      <Check className="h-4 w-4" />
                      Beta rejointe
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleJoinBeta}
                      disabled={joiningBeta}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 disabled:opacity-50"
                    >
                      {joiningBeta ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      Rejoindre la beta gratuitement
                    </button>
                  )
                ) : (
                  <Link
                    to="/signup"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90"
                  >
                    <Sparkles className="h-4 w-4" />
                    Rejoindre la beta gratuitement
                  </Link>
                )
              ) : (
                <Link
                  to={isAuthenticated ? '/subscription' : '/signup'}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90"
                >
                  S'abonner
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>

            {/* Card 3 — Organisateur Annuel */}
            <div className="relative rounded-2xl border border-border bg-card p-8">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white">
                  <Star className="h-3 w-3" />
                  Meilleur rapport
                </span>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-bold text-foreground">Organisateur Annuel</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight text-foreground">50€</span>
                  <span className="text-sm text-muted-foreground">/an</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  soit 4,17&#8239;€/mois — <span className="font-medium text-amber-600 dark:text-amber-400">2 mois offerts</span>
                </p>
                {isBeta && (
                  <p className="mt-1 text-sm font-medium text-green-600 dark:text-green-400">
                    Gratuit pendant la beta
                  </p>
                )}
              </div>

              <ul className="mb-8 space-y-3">
                {ORGANIZER_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
                {ANNUAL_BONUS_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Star className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
                    <span className="text-sm font-medium text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              {isBeta ? (
                isAuthenticated ? (
                  betaJoined ? (
                    <div className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-100 px-6 py-3 text-sm font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      <Check className="h-4 w-4" />
                      Beta rejointe
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleJoinBeta}
                      disabled={joiningBeta}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 border-amber-500 px-6 py-3 text-sm font-semibold text-amber-600 transition-all hover:bg-amber-50 disabled:opacity-50 dark:text-amber-400 dark:hover:bg-amber-950/20"
                    >
                      {joiningBeta ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      Rejoindre la beta gratuitement
                    </button>
                  )
                ) : (
                  <Link
                    to="/signup"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 border-amber-500 px-6 py-3 text-sm font-semibold text-amber-600 transition-all hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/20"
                  >
                    <Sparkles className="h-4 w-4" />
                    Rejoindre la beta gratuitement
                  </Link>
                )
              ) : (
                <Link
                  to={isAuthenticated ? '/subscription' : '/signup'}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 border-amber-500 px-6 py-3 text-sm font-semibold text-amber-600 transition-all hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/20"
                >
                  S'abonner
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-10 text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Questions frequentes
          </h2>

          <div className="space-y-3">
            {FAQ_ITEMS.map((item, index) => (
              <div key={index} className="rounded-xl border border-border bg-card">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="flex w-full items-center justify-between px-6 py-4 text-left"
                >
                  <span className="text-sm font-semibold text-foreground">{item.question}</span>
                  {openFaq === index ? (
                    <ChevronUp className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  )}
                </button>
                {openFaq === index && (
                  <div className="border-t border-border px-6 py-4">
                    <p className="text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
