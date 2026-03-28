import { useState } from 'react';
import { Plus, TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';

// TODO: Wire up to service layer - fetch budget entries from budget service

const PLACEHOLDER_SUMMARY = {
  totalIncome: 18500,
  totalExpenses: 6050,
  balance: 12450,
};

const PLACEHOLDER_ENTRIES = [
  {
    id: '1',
    label: 'Subvention mairie',
    type: 'income' as const,
    amount: 5000,
    category: 'Subvention',
    date: '2026-02-15',
  },
  {
    id: '2',
    label: 'Frais exposants (x47)',
    type: 'income' as const,
    amount: 9400,
    category: 'Inscription',
    date: '2026-03-10',
  },
  {
    id: '3',
    label: 'Sponsors partenaires',
    type: 'income' as const,
    amount: 4100,
    category: 'Sponsoring',
    date: '2026-03-01',
  },
  {
    id: '4',
    label: 'Location scene principale',
    type: 'expense' as const,
    amount: 2500,
    category: 'Location',
    date: '2026-03-05',
  },
  {
    id: '5',
    label: 'Impression flyers & affiches',
    type: 'expense' as const,
    amount: 800,
    category: 'Communication',
    date: '2026-03-08',
  },
  {
    id: '6',
    label: 'Electricite / branchements',
    type: 'expense' as const,
    amount: 1200,
    category: 'Logistique',
    date: '2026-03-12',
  },
  {
    id: '7',
    label: 'Assurance evenement',
    type: 'expense' as const,
    amount: 1550,
    category: 'Assurance',
    date: '2026-02-20',
  },
];

export function AdminBudgetPage() {
  const [showAddForm, setShowAddForm] = useState(false);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Budget</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Suivez les recettes et depenses de votre festival.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Ajouter une entree
        </button>
      </div>

      {/* Summary Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Recettes</p>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-green-600">
            {formatCurrency(PLACEHOLDER_SUMMARY.totalIncome)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Depenses</p>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-red-600">
            {formatCurrency(PLACEHOLDER_SUMMARY.totalExpenses)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Solde</p>
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <p
            className={`mt-2 text-2xl font-bold ${
              PLACEHOLDER_SUMMARY.balance >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {formatCurrency(PLACEHOLDER_SUMMARY.balance)}
          </p>
        </div>
      </div>

      {/* Add Entry Form */}
      {showAddForm && (
        <div className="mb-8 rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-base font-semibold text-foreground">Nouvelle entree</h2>
          {/* TODO: Wire up to service layer - implement budget entry creation */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Libelle</label>
              <input
                type="text"
                placeholder="Description"
                className="w-full rounded-md border border-border bg-background py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Type</label>
              <select className="w-full rounded-md border border-border bg-background py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="income">Recette</option>
                <option value="expense">Depense</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Montant</label>
              <input
                type="number"
                placeholder="0.00"
                step="0.01"
                className="w-full rounded-md border border-border bg-background py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Categorie</label>
              <input
                type="text"
                placeholder="Categorie"
                className="w-full rounded-md border border-border bg-background py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              Annuler
            </button>
            <button
              type="button"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Ajouter
            </button>
          </div>
        </div>
      )}

      {/* Entries Table */}
      <div className="rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Libelle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Categorie
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Montant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {PLACEHOLDER_ENTRIES.map((entry) => (
                <tr key={entry.id} className="hover:bg-muted/50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-foreground">
                    {entry.label}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium ${
                        entry.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {entry.type === 'income' ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      {entry.type === 'income' ? 'Recette' : 'Depense'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                    {entry.category}
                  </td>
                  <td
                    className={`whitespace-nowrap px-6 py-4 text-right text-sm font-medium ${
                      entry.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {entry.type === 'income' ? '+' : '-'}
                    {formatCurrency(entry.amount)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                    {entry.date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
