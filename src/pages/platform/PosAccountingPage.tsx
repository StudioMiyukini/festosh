import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  CheckCircle2,
  AlertTriangle,
  Package,
  Plus,
  Trash2,
  X,
  CreditCard,
  Banknote,
  BarChart3,
} from 'lucide-react';
import { api, ApiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/format-utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AccountingData {
  revenue: {
    total_cents: number;
    tax_cents: number;
    discount_cents: number;
    sales_count: number;
    avg_sale_cents: number;
  };
  costs: {
    cogs_cents: number;
    expenses_cents: number;
    total_cents: number;
  };
  profit: {
    gross_cents: number;
    net_cents: number;
    margin_percent: number;
  };
  break_even: {
    remaining_cents: number;
    remaining_sales: number;
    is_profitable: boolean;
  };
  stock: {
    total_value_cents: number;
    total_cost_cents: number;
    low_stock_count: number;
    product_count: number;
  };
  expenses_by_category: Record<string, number>;
  sales_by_payment: Record<string, { count: number; total: number }>;
  daily_revenue: Record<string, number>;
}

interface Expense {
  id: string;
  label: string;
  amount_cents: number;
  category: string;
  date: string;
  notes: string | null;
  created_at: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EXPENSE_CATEGORIES = [
  { value: 'stand', label: 'Stand' },
  { value: 'transport', label: 'Transport' },
  { value: 'materiel', label: 'Materiel' },
  { value: 'hebergement', label: 'Hebergement' },
  { value: 'nourriture', label: 'Nourriture' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'taxes', label: 'Taxes/Charges' },
  { value: 'other', label: 'Autre' },
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  stand: 'Stand',
  transport: 'Transport',
  materiel: 'Materiel',
  hebergement: 'Hebergement',
  nourriture: 'Nourriture',
  marketing: 'Marketing',
  taxes: 'Taxes/Charges',
  other: 'Autre',
};

const CATEGORY_COLORS: Record<string, string> = {
  stand: 'bg-blue-500',
  transport: 'bg-purple-500',
  materiel: 'bg-orange-500',
  hebergement: 'bg-teal-500',
  nourriture: 'bg-yellow-500',
  marketing: 'bg-pink-500',
  taxes: 'bg-red-500',
  other: 'bg-gray-500',
};

const PAYMENT_ICONS: Record<string, React.ElementType> = {
  cash: Banknote,
  card: CreditCard,
  especes: Banknote,
  cb: CreditCard,
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Especes',
  card: 'Carte bancaire',
  especes: 'Especes',
  cb: 'Carte bancaire',
  transfer: 'Virement',
  other: 'Autre',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

function KpiCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  color: 'green' | 'red' | 'blue' | 'amber';
}) {
  const colorMap = {
    green: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400',
    red: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
    blue: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
    amber: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className={cn('rounded-lg p-2', colorMap[color])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 text-2xl font-bold text-foreground">{value}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function PosAccountingPage() {
  const [searchParams] = useSearchParams();
  const editionId = searchParams.get('edition_id') || undefined;

  const [data, setData] = useState<AccountingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Expenses CRUD state
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(true);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Expense form state
  const [expenseForm, setExpenseForm] = useState({
    label: '',
    amount: '',
    category: 'other',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [savingExpense, setSavingExpense] = useState(false);
  const [expenseError, setExpenseError] = useState<string | null>(null);

  // Fetch accounting data
  const fetchAccounting = useCallback(async () => {
    setLoading(true);
    setError(null);
    const qs = ApiClient.queryString({ edition_id: editionId });
    const result = await api.get<AccountingData>(`/pos/accounting${qs}`);
    if (result.success && result.data) {
      setData(result.data);
    } else {
      setError(result.error || 'Erreur lors du chargement des donnees comptables.');
    }
    setLoading(false);
  }, [editionId]);

  // Fetch expenses
  const fetchExpenses = useCallback(async () => {
    setExpensesLoading(true);
    const result = await api.get<Expense[]>('/pos/expenses');
    if (result.success && result.data) {
      setExpenses(result.data);
    }
    setExpensesLoading(false);
  }, []);

  useEffect(() => {
    fetchAccounting();
    fetchExpenses();
  }, [fetchAccounting, fetchExpenses]);

  // Create expense
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.label.trim() || !expenseForm.amount) return;

    setSavingExpense(true);
    setExpenseError(null);

    const amountCents = Math.round(parseFloat(expenseForm.amount) * 100);
    if (isNaN(amountCents) || amountCents <= 0) {
      setExpenseError('Montant invalide.');
      setSavingExpense(false);
      return;
    }

    const result = await api.post('/pos/expenses', {
      label: expenseForm.label.trim(),
      amount_cents: amountCents,
      category: expenseForm.category,
      date: expenseForm.date,
      notes: expenseForm.notes.trim() || null,
    });

    if (result.success) {
      setShowExpenseDialog(false);
      setExpenseForm({ label: '', amount: '', category: 'other', date: new Date().toISOString().split('T')[0], notes: '' });
      fetchExpenses();
      fetchAccounting();
    } else {
      setExpenseError(result.error || 'Erreur lors de la creation.');
    }
    setSavingExpense(false);
  };

  // Delete expense
  const handleDeleteExpense = async (id: string) => {
    setDeletingId(id);
    const result = await api.delete(`/pos/expenses/${id}`);
    if (result.success) {
      fetchExpenses();
      fetchAccounting();
    }
    setDeletingId(null);
  };

  // Loading state
  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold tracking-tight text-foreground">Comptabilite</h1>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold tracking-tight text-foreground">Comptabilite</h1>
        <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error || 'Impossible de charger les donnees.'}
        </div>
      </div>
    );
  }

  const { revenue, costs, profit, break_even, stock, expenses_by_category, sales_by_payment } = data;

  // Break-even progress: revenue / (revenue + remaining) clamped to 0-100
  const breakEvenTarget = revenue.total_cents + (break_even.is_profitable ? 0 : break_even.remaining_cents);
  const breakEvenPercent = breakEvenTarget > 0 ? Math.min(100, Math.round((revenue.total_cents / breakEvenTarget) * 100)) : 0;

  // Max value for expense category bars
  const maxExpenseValue = Math.max(...Object.values(expenses_by_category), 1);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Comptabilite</h1>
        <p className="mt-2 text-muted-foreground">
          Vue d'ensemble financiere et analyse de rentabilite.
        </p>
      </div>

      {/* Row 1: KPI Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Chiffre d'affaires"
          value={
            <span className={revenue.total_cents > 0 ? 'text-green-600 dark:text-green-400' : ''}>
              {formatCurrency(revenue.total_cents)}
            </span>
          }
          icon={TrendingUp}
          color="green"
        />
        <KpiCard
          label="Charges totales"
          value={
            <span className="text-red-600 dark:text-red-400">
              {formatCurrency(costs.total_cents)}
            </span>
          }
          icon={TrendingDown}
          color="red"
        />
        <KpiCard
          label="Benefice net"
          value={
            <span className={profit.net_cents >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
              {formatCurrency(profit.net_cents)}
            </span>
          }
          icon={DollarSign}
          color={profit.net_cents >= 0 ? 'green' : 'red'}
        />
        <KpiCard
          label="Objectif neutre"
          value={
            break_even.is_profitable ? (
              <span className="inline-flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                Atteint !
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400">
                {formatCurrency(break_even.remaining_cents)}
              </span>
            )
          }
          icon={Target}
          color={break_even.is_profitable ? 'green' : 'amber'}
        />
      </div>

      {/* Row 2: Break-even analysis */}
      <div className="mb-6 rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Analyse du seuil de rentabilite</h2>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progression vers l'equilibre</span>
            <span className="font-medium text-foreground">{breakEvenPercent}%</span>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                break_even.is_profitable ? 'bg-green-500' : 'bg-amber-500',
              )}
              style={{ width: `${breakEvenPercent}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>{formatCurrency(revenue.total_cents)}</span>
            <span>{formatCurrency(breakEvenTarget)}</span>
          </div>
        </div>

        {/* Status text */}
        <div className="mb-3 rounded-lg border border-border bg-muted/50 px-4 py-3">
          {break_even.is_profitable ? (
            <p className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              Objectif atteint, benefice de {formatCurrency(profit.net_cents)}
            </p>
          ) : (
            <p className="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              Il reste {formatCurrency(break_even.remaining_cents)} de CA pour atteindre l'equilibre
            </p>
          )}
        </div>

        {/* Additional info */}
        <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
          {!break_even.is_profitable && revenue.avg_sale_cents > 0 && (
            <span>
              Soit environ <strong className="text-foreground">{break_even.remaining_sales} ventes</strong> au panier moyen de{' '}
              <strong className="text-foreground">{formatCurrency(revenue.avg_sale_cents)}</strong>
            </span>
          )}
          <span>
            Marge brute :{' '}
            <strong className={profit.margin_percent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
              {profit.margin_percent.toFixed(1)}%
            </strong>
          </span>
          <span>
            Nombre de ventes : <strong className="text-foreground">{revenue.sales_count}</strong>
          </span>
        </div>
      </div>

      {/* Row 3: Two columns */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        {/* LEFT: Expenses by category */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Depenses par categorie</h2>
          {Object.keys(expenses_by_category).length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Aucune depense enregistree.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(expenses_by_category)
                .sort(([, a], [, b]) => b - a)
                .map(([category, amountCents]) => {
                  const barWidth = Math.max(4, Math.round((amountCents / maxExpenseValue) * 100));
                  return (
                    <div key={category}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-foreground">{CATEGORY_LABELS[category] || category}</span>
                        <span className="font-medium text-foreground">{formatCurrency(amountCents)}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn('h-full rounded-full', CATEGORY_COLORS[category] || 'bg-gray-500')}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* RIGHT: Sales by payment method */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Ventes par mode de paiement</h2>
          {Object.keys(sales_by_payment).length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Aucune vente enregistree.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(sales_by_payment)
                .sort(([, a], [, b]) => b.total - a.total)
                .map(([method, { count, total }]) => {
                  const PaymentIcon = PAYMENT_ICONS[method] || CreditCard;
                  return (
                    <div
                      key={method}
                      className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-muted p-2">
                          <PaymentIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {PAYMENT_LABELS[method] || method}
                          </p>
                          <p className="text-xs text-muted-foreground">{count} vente{count > 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-foreground">{formatCurrency(total)}</span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Row 4: Expenses CRUD */}
      <div className="mb-6 rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Depenses</h2>
          <button
            type="button"
            onClick={() => setShowExpenseDialog(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Ajouter une depense
          </button>
        </div>

        {expensesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : expenses.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucune depense enregistree. Cliquez sur "Ajouter une depense" pour commencer.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">Libelle</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">Categorie</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">Montant</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">Notes</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => (
                  <tr key={exp.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">
                      {exp.label}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                        <span className={cn('inline-block h-2 w-2 rounded-full', CATEGORY_COLORS[exp.category] || 'bg-gray-500')} />
                        {CATEGORY_LABELS[exp.category] || exp.category}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-red-600 dark:text-red-400">
                      {formatCurrency(exp.amount_cents)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {exp.date}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-muted-foreground" title={exp.notes || ''}>
                      {exp.notes || '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteExpense(exp.id)}
                        disabled={deletingId === exp.id}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/30"
                      >
                        {deletingId === exp.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Row 5: Stock overview */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
            <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Apercu du stock</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">Produits</p>
            <p className="mt-1 text-xl font-bold text-foreground">{stock.product_count}</p>
          </div>
          <div className="rounded-lg border border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">Valeur stock (vente)</p>
            <p className="mt-1 text-xl font-bold text-foreground">{formatCurrency(stock.total_value_cents)}</p>
          </div>
          <div className="rounded-lg border border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">Valeur stock (cout)</p>
            <p className="mt-1 text-xl font-bold text-foreground">{formatCurrency(stock.total_cost_cents)}</p>
          </div>
          <div className="rounded-lg border border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">Alertes stock bas</p>
            <p className={cn('mt-1 text-xl font-bold', stock.low_stock_count > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground')}>
              {stock.low_stock_count}
            </p>
          </div>
        </div>

        {stock.low_stock_count > 0 && (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {stock.low_stock_count} produit{stock.low_stock_count > 1 ? 's' : ''} en stock bas.{' '}
              <Link to="/pos/products" className="font-medium underline hover:no-underline">
                Voir les produits
              </Link>
            </p>
          </div>
        )}
      </div>

      {/* Add expense dialog */}
      {showExpenseDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Ajouter une depense</h3>
              <button
                type="button"
                onClick={() => {
                  setShowExpenseDialog(false);
                  setExpenseError(null);
                }}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {expenseError && (
              <div className="mb-4 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {expenseError}
              </div>
            )}

            <form onSubmit={handleCreateExpense} className="space-y-4">
              <div>
                <label htmlFor="expense-label" className="mb-1.5 block text-sm font-medium text-foreground">
                  Libelle *
                </label>
                <input
                  id="expense-label"
                  type="text"
                  required
                  value={expenseForm.label}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="Location de table"
                  className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label htmlFor="expense-amount" className="mb-1.5 block text-sm font-medium text-foreground">
                  Montant (EUR) *
                </label>
                <input
                  id="expense-amount"
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="50.00"
                  className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label htmlFor="expense-category" className="mb-1.5 block text-sm font-medium text-foreground">
                  Categorie
                </label>
                <select
                  id="expense-category"
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="expense-date" className="mb-1.5 block text-sm font-medium text-foreground">
                  Date
                </label>
                <input
                  id="expense-date"
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label htmlFor="expense-notes" className="mb-1.5 block text-sm font-medium text-foreground">
                  Notes
                </label>
                <textarea
                  id="expense-notes"
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Details supplementaires..."
                  className="w-full resize-none rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowExpenseDialog(false);
                    setExpenseError(null);
                  }}
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingExpense || !expenseForm.label.trim() || !expenseForm.amount}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {savingExpense && <Loader2 className="h-4 w-4 animate-spin" />}
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
