import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  AlertCircle,
  X,
  Trash2,
  Pencil,
} from 'lucide-react';
import { useTenantStore } from '@/stores/tenant-store';
import { api } from '@/lib/api-client';
import type { BudgetCategory, BudgetEntry } from '@/types/budget';
import type { BudgetEntryType } from '@/types/enums';

interface BudgetSummary {
  total_income: number;
  total_expenses: number;
  balance: number;
}

export function AdminBudgetPage() {
  const { festival, activeEdition } = useTenantStore();

  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [entries, setEntries] = useState<BudgetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Entry create dialog
  const [showEntryDialog, setShowEntryDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState<BudgetEntry | null>(null);
  const [entryDescription, setEntryDescription] = useState('');
  const [entryType, setEntryType] = useState<BudgetEntryType>('expense');
  const [entryAmount, setEntryAmount] = useState('');
  const [entryCategoryId, setEntryCategoryId] = useState('');
  const [entryDate, setEntryDate] = useState('');
  const [entryPaymentMethod, setEntryPaymentMethod] = useState('');
  const [entryNotes, setEntryNotes] = useState('');
  const [submittingEntry, setSubmittingEntry] = useState(false);

  // Category create dialog
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryEntryType, setCategoryEntryType] = useState<BudgetEntryType>('expense');
  const [categoryColor, setCategoryColor] = useState('#6366f1');
  const [creatingCategory, setCreatingCategory] = useState(false);

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);

  const fetchData = useCallback(async () => {
    if (!festival) return;
    setLoading(true);
    setError(null);

    const [summaryRes, categoriesRes, entriesRes] = await Promise.all([
      api.get<BudgetSummary>(`/budget/festival/${festival.id}/summary`),
      api.get<BudgetCategory[]>(`/budget/festival/${festival.id}/categories`),
      api.get<BudgetEntry[]>(`/budget/festival/${festival.id}/entries`),
    ]);

    if (summaryRes.success && summaryRes.data) setSummary(summaryRes.data);
    if (categoriesRes.success && categoriesRes.data) setCategories(categoriesRes.data);
    if (entriesRes.success && entriesRes.data) setEntries(entriesRes.data);
    else setError(entriesRes.error || 'Impossible de charger le budget.');

    setLoading(false);
  }, [festival]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetEntryForm = () => {
    setEntryDescription('');
    setEntryType('expense');
    setEntryAmount('');
    setEntryCategoryId('');
    setEntryDate('');
    setEntryPaymentMethod('');
    setEntryNotes('');
    setEditingEntry(null);
  };

  const openCreateEntryDialog = () => {
    resetEntryForm();
    setEntryDate(new Date().toISOString().slice(0, 10));
    setShowEntryDialog(true);
  };

  const openEditEntryDialog = (entry: BudgetEntry) => {
    setEditingEntry(entry);
    setEntryDescription(entry.description);
    setEntryType(entry.entry_type);
    setEntryAmount(String(entry.amount_cents / 100));
    setEntryCategoryId(entry.category_id);
    setEntryDate(entry.date);
    setEntryPaymentMethod(entry.payment_method || '');
    setEntryNotes(entry.notes || '');
    setShowEntryDialog(true);
  };

  const handleSubmitEntry = async () => {
    if (!festival || !activeEdition || !entryDescription.trim() || !entryAmount || !entryCategoryId || !entryDate)
      return;
    setSubmittingEntry(true);
    setMessage(null);

    const payload = {
      edition_id: activeEdition.id,
      category_id: entryCategoryId,
      entry_type: entryType,
      description: entryDescription.trim(),
      amount_cents: Math.round(parseFloat(entryAmount) * 100),
      date: entryDate,
      payment_method: entryPaymentMethod.trim() || null,
      notes: entryNotes.trim() || null,
    };

    if (editingEntry) {
      const res = await api.put<BudgetEntry>(
        `/budget/festival/${festival.id}/entries/${editingEntry.id}`,
        payload
      );
      if (res.success && res.data) {
        setEntries((prev) => prev.map((e) => (e.id === editingEntry.id ? res.data! : e)));
        setShowEntryDialog(false);
        resetEntryForm();
        setMessage({ type: 'success', text: 'Entree mise a jour.' });
        fetchData(); // refresh summary
      } else {
        setMessage({ type: 'error', text: res.error || 'Erreur lors de la mise a jour.' });
      }
    } else {
      const res = await api.post<BudgetEntry>(`/budget/festival/${festival.id}/entries`, payload);
      if (res.success && res.data) {
        setEntries((prev) => [...prev, res.data!]);
        setShowEntryDialog(false);
        resetEntryForm();
        setMessage({ type: 'success', text: 'Entree ajoutee.' });
        fetchData(); // refresh summary
      } else {
        setMessage({ type: 'error', text: res.error || 'Erreur lors de la creation.' });
      }
    }
    setSubmittingEntry(false);
  };

  const handleDeleteEntry = async (entry: BudgetEntry) => {
    if (!festival) return;
    if (!confirm(`Supprimer l'entree "${entry.description}" ?`)) return;
    setMessage(null);

    const res = await api.delete(`/budget/festival/${festival.id}/entries/${entry.id}`);
    if (res.success) {
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      setMessage({ type: 'success', text: 'Entree supprimee.' });
      fetchData(); // refresh summary
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la suppression.' });
    }
  };

  const handleCreateCategory = async () => {
    if (!festival || !categoryName.trim()) return;
    setCreatingCategory(true);
    setMessage(null);

    const res = await api.post<BudgetCategory>(`/budget/festival/${festival.id}/categories`, {
      name: categoryName.trim(),
      entry_type: categoryEntryType,
      color: categoryColor,
      sort_order: categories.length,
    });

    if (res.success && res.data) {
      setCategories((prev) => [...prev, res.data!]);
      setShowCategoryDialog(false);
      setCategoryName('');
      setCategoryEntryType('expense');
      setCategoryColor('#6366f1');
      setMessage({ type: 'success', text: 'Categorie creee.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la creation.' });
    }
    setCreatingCategory(false);
  };

  const getCategoryName = (categoryId: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.name || 'Sans categorie';
  };

  const getCategoryColor = (categoryId: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.color || '#6b7280';
  };

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

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Budget</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Suivez les recettes et depenses de votre festival.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowCategoryDialog(true)}
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Plus className="h-4 w-4" />
            Categorie
          </button>
          <button
            type="button"
            onClick={openCreateEntryDialog}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Ajouter une entree
          </button>
        </div>
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

      {/* Summary Cards */}
      {summary && (
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Recettes</p>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-green-600">
              {formatCurrency(summary.total_income)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Depenses</p>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-red-600">
              {formatCurrency(summary.total_expenses)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Solde</p>
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <p
              className={`mt-2 text-2xl font-bold ${
                summary.balance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {formatCurrency(summary.balance)}
            </p>
          </div>
        </div>
      )}

      {/* Category Create Dialog */}
      {showCategoryDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Nouvelle categorie</h2>
              <button
                type="button"
                onClick={() => setShowCategoryDialog(false)}
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
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="Ex : Location, Sponsoring..."
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Type</label>
                <select
                  value={categoryEntryType}
                  onChange={(e) => setCategoryEntryType(e.target.value as BudgetEntryType)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="income">Recette</option>
                  <option value="expense">Depense</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Couleur</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={categoryColor}
                    onChange={(e) => setCategoryColor(e.target.value)}
                    className="h-10 w-10 cursor-pointer rounded-md border border-border"
                  />
                  <input
                    type="text"
                    value={categoryColor}
                    onChange={(e) => setCategoryColor(e.target.value)}
                    className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCategoryDialog(false)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleCreateCategory}
                disabled={creatingCategory || !categoryName.trim()}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {creatingCategory && <Loader2 className="h-4 w-4 animate-spin" />}
                Creer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Entry Create/Edit Dialog */}
      {showEntryDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {editingEntry ? 'Modifier l\'entree' : 'Nouvelle entree'}
              </h2>
              <button
                type="button"
                onClick={() => { setShowEntryDialog(false); resetEntryForm(); }}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
                <input
                  type="text"
                  value={entryDescription}
                  onChange={(e) => setEntryDescription(e.target.value)}
                  placeholder="Ex : Location scene, Subvention mairie..."
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Type</label>
                  <select
                    value={entryType}
                    onChange={(e) => setEntryType(e.target.value as BudgetEntryType)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="income">Recette</option>
                    <option value="expense">Depense</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Montant (EUR)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={entryAmount}
                    onChange={(e) => setEntryAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Categorie</label>
                  <select
                    value={entryCategoryId}
                    onChange={(e) => setEntryCategoryId(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Selectionner</option>
                    {categories
                      .filter((c) => c.entry_type === entryType)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Date</label>
                  <input
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Moyen de paiement</label>
                <input
                  type="text"
                  value={entryPaymentMethod}
                  onChange={(e) => setEntryPaymentMethod(e.target.value)}
                  placeholder="Ex : Virement, CB, Cheque..."
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Notes</label>
                <textarea
                  value={entryNotes}
                  onChange={(e) => setEntryNotes(e.target.value)}
                  rows={2}
                  placeholder="Notes optionnelles"
                  className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowEntryDialog(false); resetEntryForm(); }}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSubmitEntry}
                disabled={submittingEntry || !entryDescription.trim() || !entryAmount || !entryCategoryId || !entryDate}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {submittingEntry && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingEntry ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-base font-semibold text-foreground">Categories</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <span
                key={cat.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground"
              >
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: cat.color || '#6b7280' }}
                />
                {cat.name}
                <span className="text-muted-foreground">
                  ({cat.entry_type === 'income' ? 'Recette' : 'Depense'})
                </span>
              </span>
            ))}
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
                  Description
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
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-muted/50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-foreground">
                    {entry.description}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium ${
                        entry.entry_type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {entry.entry_type === 'income' ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      {entry.entry_type === 'income' ? 'Recette' : 'Depense'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: getCategoryColor(entry.category_id) }}
                      />
                      {getCategoryName(entry.category_id)}
                    </span>
                  </td>
                  <td
                    className={`whitespace-nowrap px-6 py-4 text-right text-sm font-medium ${
                      entry.entry_type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {entry.entry_type === 'income' ? '+' : '-'}
                    {formatCurrency(entry.amount_cents)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                    {entry.date}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEditEntryDialog(entry)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEntry(entry)}
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
        {entries.length === 0 && (
          <div className="p-12 text-center">
            <DollarSign className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Aucune entree budgetaire. Ajoutez votre premiere recette ou depense.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
