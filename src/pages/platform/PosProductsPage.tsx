import { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Search,
  Package,
  Tag,
  Ticket,
  X,
  Check,
  AlertTriangle,
  Image as ImageIcon,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { formatCurrency } from '@/lib/format-utils';
import { EmptyState } from '@/components/shared/EmptyState';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PosCategory {
  id: string;
  name: string;
  color: string;
  sort_order: number;
}

interface PosProduct {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  category_name: string | null;
  category_color: string | null;
  sku: string | null;
  price_cents: number;
  cost_cents: number | null;
  tax_rate: number;
  stock_quantity: number;
  stock_alert_threshold: number;
  image_url: string | null;
  is_active: number;
  is_online: number;
}

interface PosCoupon {
  id: string;
  code: string;
  label: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_amount_cents: number | null;
  max_uses: number | null;
  current_uses: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: number;
}

type TabId = 'products' | 'categories' | 'coupons';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}>
      {children}
    </span>
  );
}

function FeedbackMessage({ message }: { message: { type: 'success' | 'error'; text: string } | null }) {
  if (!message) return null;
  return (
    <div
      className={`mb-4 rounded-md border px-4 py-3 text-sm ${
        message.type === 'success'
          ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400'
          : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'
      }`}
    >
      {message.text}
    </div>
  );
}

/** Render a standard loading spinner */
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

/** Render a standard error block */
function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {message}
    </div>
  );
}

/** Modal dialog shell */
function Dialog({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className={`max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl ${
          wide ? 'w-full max-w-2xl' : 'w-full max-w-md'
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Confirm deletion dialog */
function ConfirmDeleteDialog({
  label,
  onConfirm,
  onCancel,
  saving,
}: {
  label: string;
  onConfirm: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <Dialog title="Confirmer la suppression" onClose={onCancel}>
      <p className="mb-6 text-sm text-muted-foreground">
        Voulez-vous vraiment supprimer <span className="font-medium text-foreground">{label}</span> ? Cette action est irreversible.
      </p>
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Supprimer
        </button>
      </div>
    </Dialog>
  );
}

/** Cents input that displays EUR -- divides by 100 for display, multiplies on change */
function CentsInput({
  value,
  onChange,
  id,
  placeholder,
}: {
  value: number;
  onChange: (cents: number) => void;
  id?: string;
  placeholder?: string;
}) {
  const [display, setDisplay] = useState((value / 100).toFixed(2));

  useEffect(() => {
    setDisplay((value / 100).toFixed(2));
  }, [value]);

  return (
    <div className="relative">
      <input
        id={id}
        type="number"
        step="0.01"
        min="0"
        value={display}
        onChange={(e) => {
          setDisplay(e.target.value);
          const parsed = parseFloat(e.target.value);
          if (!isNaN(parsed)) {
            onChange(Math.round(parsed * 100));
          }
        }}
        onBlur={() => {
          const parsed = parseFloat(display);
          if (!isNaN(parsed)) {
            setDisplay(parsed.toFixed(2));
          }
        }}
        placeholder={placeholder}
        className="w-full rounded-md border border-border bg-background px-4 py-2.5 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
        EUR
      </span>
    </div>
  );
}

/** Toggle switch */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (val: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
        checked ? 'bg-primary' : 'bg-muted'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

const TAX_RATES = [
  { label: '0 %', value: 0 },
  { label: '5,5 %', value: 5.5 },
  { label: '10 %', value: 10 },
  { label: '20 %', value: 20 },
];

// ---------------------------------------------------------------------------
// Products Tab
// ---------------------------------------------------------------------------

interface ProductFormData {
  name: string;
  description: string;
  category_id: string;
  sku: string;
  price_cents: number;
  cost_cents: number;
  tax_rate: number;
  stock_quantity: number;
  stock_alert_threshold: number;
  is_active: boolean;
  is_online: boolean;
}

const EMPTY_PRODUCT_FORM: ProductFormData = {
  name: '',
  description: '',
  category_id: '',
  sku: '',
  price_cents: 0,
  cost_cents: 0,
  tax_rate: 20,
  stock_quantity: 0,
  stock_alert_threshold: 5,
  is_active: true,
  is_online: false,
};

function ProductDialog({
  product,
  categories,
  onClose,
  onSaved,
}: {
  product: PosProduct | null;
  categories: PosCategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = product !== null;
  const [form, setForm] = useState<ProductFormData>(() =>
    product
      ? {
          name: product.name,
          description: product.description || '',
          category_id: product.category_id || '',
          sku: product.sku || '',
          price_cents: product.price_cents,
          cost_cents: product.cost_cents || 0,
          tax_rate: product.tax_rate,
          stock_quantity: product.stock_quantity,
          stock_alert_threshold: product.stock_alert_threshold,
          is_active: !!product.is_active,
          is_online: !!product.is_online,
        }
      : { ...EMPTY_PRODUCT_FORM },
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = <K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError('Le nom du produit est requis.');
      return;
    }
    if (form.price_cents <= 0) {
      setError('Le prix doit etre superieur a 0.');
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      category_id: form.category_id || null,
      sku: form.sku.trim() || null,
      price_cents: form.price_cents,
      cost_cents: form.cost_cents || null,
      tax_rate: form.tax_rate,
      stock_quantity: form.stock_quantity,
      stock_alert_threshold: form.stock_alert_threshold,
      is_active: form.is_active ? 1 : 0,
      is_online: form.is_online ? 1 : 0,
    };

    const result = isEdit
      ? await api.put(`/pos/products/${product.id}`, payload)
      : await api.post('/pos/products', payload);

    setSaving(false);
    if (result.success) {
      onSaved();
    } else {
      setError(result.error || 'Erreur lors de la sauvegarde.');
    }
  };

  return (
    <Dialog title={isEdit ? 'Modifier le produit' : 'Ajouter un produit'} onClose={onClose} wide>
      {error && (
        <div className="mb-4 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Name */}
        <div className="sm:col-span-2">
          <label htmlFor="prod-name" className="mb-1.5 block text-sm font-medium text-foreground">
            Nom *
          </label>
          <input
            id="prod-name"
            type="text"
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Nom du produit"
          />
        </div>

        {/* Description */}
        <div className="sm:col-span-2">
          <label htmlFor="prod-desc" className="mb-1.5 block text-sm font-medium text-foreground">
            Description
          </label>
          <textarea
            id="prod-desc"
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            rows={2}
            className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Description optionnelle"
          />
        </div>

        {/* Category */}
        <div>
          <label htmlFor="prod-cat" className="mb-1.5 block text-sm font-medium text-foreground">
            Categorie
          </label>
          <select
            id="prod-cat"
            value={form.category_id}
            onChange={(e) => setField('category_id', e.target.value)}
            className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">-- Aucune --</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* SKU */}
        <div>
          <label htmlFor="prod-sku" className="mb-1.5 block text-sm font-medium text-foreground">
            SKU
          </label>
          <input
            id="prod-sku"
            type="text"
            value={form.sku}
            onChange={(e) => setField('sku', e.target.value)}
            className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="REF-001"
          />
        </div>

        {/* Price */}
        <div>
          <label htmlFor="prod-price" className="mb-1.5 block text-sm font-medium text-foreground">
            Prix de vente *
          </label>
          <CentsInput
            id="prod-price"
            value={form.price_cents}
            onChange={(v) => setField('price_cents', v)}
            placeholder="0.00"
          />
        </div>

        {/* Cost */}
        <div>
          <label htmlFor="prod-cost" className="mb-1.5 block text-sm font-medium text-foreground">
            Cout d'achat
          </label>
          <CentsInput
            id="prod-cost"
            value={form.cost_cents}
            onChange={(v) => setField('cost_cents', v)}
            placeholder="0.00"
          />
        </div>

        {/* Tax rate */}
        <div>
          <label htmlFor="prod-tax" className="mb-1.5 block text-sm font-medium text-foreground">
            Taux de TVA
          </label>
          <select
            id="prod-tax"
            value={form.tax_rate}
            onChange={(e) => setField('tax_rate', parseFloat(e.target.value))}
            className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {TAX_RATES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {/* Stock quantity */}
        <div>
          <label htmlFor="prod-stock" className="mb-1.5 block text-sm font-medium text-foreground">
            Stock
          </label>
          <input
            id="prod-stock"
            type="number"
            min="0"
            value={form.stock_quantity}
            onChange={(e) => setField('stock_quantity', parseInt(e.target.value, 10) || 0)}
            className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Stock alert threshold */}
        <div>
          <label htmlFor="prod-threshold" className="mb-1.5 block text-sm font-medium text-foreground">
            Seuil d'alerte stock
          </label>
          <input
            id="prod-threshold"
            type="number"
            min="0"
            value={form.stock_alert_threshold}
            onChange={(e) => setField('stock_alert_threshold', parseInt(e.target.value, 10) || 0)}
            className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Spacer for alignment */}
        <div className="hidden sm:block" />

        {/* is_active toggle */}
        <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
          <span className="text-sm text-foreground">Actif (en vente)</span>
          <Toggle checked={form.is_active} onChange={(v) => setField('is_active', v)} />
        </div>

        {/* is_online toggle */}
        <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
          <span className="text-sm text-foreground">En ligne (marketplace)</span>
          <Toggle checked={form.is_online} onChange={(v) => setField('is_online', v)} />
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {isEdit ? 'Enregistrer' : 'Creer'}
        </button>
      </div>
    </Dialog>
  );
}

function ProductsTab() {
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [categories, setCategories] = useState<PosCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<PosProduct | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PosProduct | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [prodResult, catResult] = await Promise.all([
      api.get<PosProduct[]>('/pos/products'),
      api.get<PosCategory[]>('/pos/categories'),
    ]);
    if (prodResult.success && prodResult.data) {
      setProducts(prodResult.data);
    } else {
      setError(prodResult.error || 'Erreur lors du chargement des produits.');
    }
    if (catResult.success && catResult.data) {
      setCategories(catResult.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreate = () => {
    setEditProduct(null);
    setDialogOpen(true);
  };

  const openEdit = (p: PosProduct) => {
    setEditProduct(p);
    setDialogOpen(true);
  };

  const handleSaved = () => {
    setDialogOpen(false);
    setEditProduct(null);
    setMessage({ type: 'success', text: editProduct ? 'Produit mis a jour.' : 'Produit cree avec succes.' });
    fetchData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await api.delete(`/pos/products/${deleteTarget.id}`);
    setDeleting(false);
    if (result.success) {
      setDeleteTarget(null);
      setMessage({ type: 'success', text: 'Produit supprime.' });
      fetchData();
    } else {
      setMessage({ type: 'error', text: result.error || 'Erreur lors de la suppression.' });
      setDeleteTarget(null);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBlock message={error} />;

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) ||
    (p.category_name && p.category_name.toLowerCase().includes(search.toLowerCase()))
  );

  const getStockRowClass = (p: PosProduct) => {
    if (p.stock_quantity === 0) return 'bg-red-50 dark:bg-red-900/10';
    if (p.stock_quantity <= p.stock_alert_threshold) return 'bg-orange-50 dark:bg-orange-900/10';
    return '';
  };

  return (
    <>
      <FeedbackMessage message={message} />

      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un produit..."
            className="w-full rounded-md border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Ajouter un produit
        </button>
      </div>

      {/* Table or empty */}
      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Aucun produit"
          description="Commencez par ajouter votre premier produit a votre catalogue."
          action={{ label: 'Ajouter un produit', onClick: openCreate }}
        />
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Aucun produit ne correspond a votre recherche.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">Image</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">Nom</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">Categorie</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">Prix</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">Cout</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">Stock</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">Actif</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className={`border-b border-border last:border-0 transition-colors hover:bg-muted/40 ${getStockRowClass(p)}`}
                >
                  {/* Image thumb */}
                  <td className="px-4 py-3">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="h-10 w-10 rounded-md border border-border object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </td>

                  {/* Name + SKU */}
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{p.name}</div>
                    {p.sku && (
                      <span className="text-xs text-muted-foreground">SKU: {p.sku}</span>
                    )}
                  </td>

                  {/* Category */}
                  <td className="whitespace-nowrap px-4 py-3">
                    {p.category_name ? (
                      <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: p.category_color || '#9ca3af' }}
                        />
                        {p.category_name}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </td>

                  {/* Price */}
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">
                    {formatCurrency(p.price_cents)}
                  </td>

                  {/* Cost */}
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {p.cost_cents ? formatCurrency(p.cost_cents) : '-'}
                  </td>

                  {/* Stock */}
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="flex items-center gap-1.5">
                      {p.stock_quantity === 0 && (
                        <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                      )}
                      {p.stock_quantity > 0 && p.stock_quantity <= p.stock_alert_threshold && (
                        <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                      )}
                      <span
                        className={`font-medium ${
                          p.stock_quantity === 0
                            ? 'text-red-600 dark:text-red-400'
                            : p.stock_quantity <= p.stock_alert_threshold
                              ? 'text-orange-600 dark:text-orange-400'
                              : 'text-foreground'
                        }`}
                      >
                        {p.stock_quantity}
                      </span>
                    </span>
                  </td>

                  {/* Active */}
                  <td className="whitespace-nowrap px-4 py-3">
                    {p.is_active ? (
                      <Badge className="bg-green-100 text-green-700">Oui</Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-600">Non</Badge>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(p)}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
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
      )}

      {/* Product dialog */}
      {dialogOpen && (
        <ProductDialog
          product={editProduct}
          categories={categories}
          onClose={() => {
            setDialogOpen(false);
            setEditProduct(null);
          }}
          onSaved={handleSaved}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <ConfirmDeleteDialog
          label={deleteTarget.name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          saving={deleting}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Categories Tab
// ---------------------------------------------------------------------------

interface CategoryFormData {
  name: string;
  color: string;
  sort_order: number;
}

const EMPTY_CATEGORY_FORM: CategoryFormData = {
  name: '',
  color: '#6366f1',
  sort_order: 0,
};

function CategoriesTab() {
  const [categories, setCategories] = useState<PosCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<PosCategory | null>(null);
  const [form, setForm] = useState<CategoryFormData>({ ...EMPTY_CATEGORY_FORM });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<PosCategory | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await api.get<PosCategory[]>('/pos/categories');
    if (result.success && result.data) {
      setCategories(result.data);
    } else {
      setError(result.error || 'Erreur lors du chargement des categories.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openCreate = () => {
    setEditCategory(null);
    setForm({ ...EMPTY_CATEGORY_FORM });
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (c: PosCategory) => {
    setEditCategory(c);
    setForm({ name: c.name, color: c.color, sort_order: c.sort_order });
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setFormError('Le nom de la categorie est requis.');
      return;
    }
    setSaving(true);
    setFormError(null);

    const payload = {
      name: form.name.trim(),
      color: form.color,
      sort_order: form.sort_order,
    };

    const result = editCategory
      ? await api.put(`/pos/categories/${editCategory.id}`, payload)
      : await api.post('/pos/categories', payload);

    setSaving(false);
    if (result.success) {
      setDialogOpen(false);
      setMessage({ type: 'success', text: editCategory ? 'Categorie mise a jour.' : 'Categorie creee.' });
      fetchCategories();
    } else {
      setFormError(result.error || 'Erreur lors de la sauvegarde.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await api.delete(`/pos/categories/${deleteTarget.id}`);
    setDeleting(false);
    if (result.success) {
      setDeleteTarget(null);
      setMessage({ type: 'success', text: 'Categorie supprimee.' });
      fetchCategories();
    } else {
      setMessage({ type: 'error', text: result.error || 'Erreur lors de la suppression.' });
      setDeleteTarget(null);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <>
      <FeedbackMessage message={message} />

      {/* Toolbar */}
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Ajouter une categorie
        </button>
      </div>

      {categories.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="Aucune categorie"
          description="Creez des categories pour organiser vos produits."
          action={{ label: 'Ajouter une categorie', onClick: openCreate }}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">Couleur</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">Nom</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">Ordre</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <span
                      className="inline-block h-4 w-4 rounded-full border border-border"
                      style={{ backgroundColor: c.color }}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.sort_order}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(c)}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(c)}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
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
      )}

      {/* Category dialog */}
      {dialogOpen && (
        <Dialog
          title={editCategory ? 'Modifier la categorie' : 'Ajouter une categorie'}
          onClose={() => setDialogOpen(false)}
        >
          {formError && (
            <div className="mb-4 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="cat-name" className="mb-1.5 block text-sm font-medium text-foreground">
                Nom *
              </label>
              <input
                id="cat-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Nom de la categorie"
              />
            </div>

            <div>
              <label htmlFor="cat-color" className="mb-1.5 block text-sm font-medium text-foreground">
                Couleur
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="cat-color"
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value }))}
                  className="h-10 w-14 cursor-pointer rounded-md border border-border bg-background"
                />
                <span className="text-sm text-muted-foreground">{form.color}</span>
              </div>
            </div>

            <div>
              <label htmlFor="cat-order" className="mb-1.5 block text-sm font-medium text-foreground">
                Ordre d'affichage
              </label>
              <input
                id="cat-order"
                type="number"
                min="0"
                value={form.sort_order}
                onChange={(e) => setForm((prev) => ({ ...prev, sort_order: parseInt(e.target.value, 10) || 0 }))}
                className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setDialogOpen(false)}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {editCategory ? 'Enregistrer' : 'Creer'}
            </button>
          </div>
        </Dialog>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <ConfirmDeleteDialog
          label={deleteTarget.name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          saving={deleting}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Coupons Tab
// ---------------------------------------------------------------------------

interface CouponFormData {
  code: string;
  label: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_amount_cents: number;
  max_uses: string;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
}

const EMPTY_COUPON_FORM: CouponFormData = {
  code: '',
  label: '',
  discount_type: 'percentage',
  discount_value: 0,
  min_amount_cents: 0,
  max_uses: '',
  valid_from: '',
  valid_until: '',
  is_active: true,
};

function CouponDialog({
  coupon,
  onClose,
  onSaved,
}: {
  coupon: PosCoupon | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = coupon !== null;
  const [form, setForm] = useState<CouponFormData>(() =>
    coupon
      ? {
          code: coupon.code,
          label: coupon.label || '',
          discount_type: coupon.discount_type,
          discount_value: coupon.discount_value,
          min_amount_cents: coupon.min_amount_cents || 0,
          max_uses: coupon.max_uses !== null ? String(coupon.max_uses) : '',
          valid_from: coupon.valid_from || '',
          valid_until: coupon.valid_until || '',
          is_active: !!coupon.is_active,
        }
      : { ...EMPTY_COUPON_FORM },
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = <K extends keyof CouponFormData>(key: K, value: CouponFormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.code.trim()) {
      setError('Le code du coupon est requis.');
      return;
    }
    if (form.discount_value <= 0) {
      setError('La valeur de la remise doit etre superieure a 0.');
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      code: form.code.trim().toUpperCase(),
      label: form.label.trim() || null,
      discount_type: form.discount_type,
      discount_value: form.discount_value,
      min_amount_cents: form.min_amount_cents || null,
      max_uses: form.max_uses ? parseInt(form.max_uses, 10) : null,
      valid_from: form.valid_from || null,
      valid_until: form.valid_until || null,
      is_active: form.is_active ? 1 : 0,
    };

    const result = isEdit
      ? await api.put(`/pos/coupons/${coupon.id}`, payload)
      : await api.post('/pos/coupons', payload);

    setSaving(false);
    if (result.success) {
      onSaved();
    } else {
      setError(result.error || 'Erreur lors de la sauvegarde.');
    }
  };

  return (
    <Dialog title={isEdit ? 'Modifier le coupon' : 'Ajouter un coupon'} onClose={onClose} wide>
      {error && (
        <div className="mb-4 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Code */}
        <div>
          <label htmlFor="coup-code" className="mb-1.5 block text-sm font-medium text-foreground">
            Code *
          </label>
          <input
            id="coup-code"
            type="text"
            value={form.code}
            onChange={(e) => setField('code', e.target.value.toUpperCase())}
            className="w-full rounded-md border border-border bg-background px-4 py-2.5 font-mono text-sm text-foreground uppercase focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="PROMO2026"
          />
        </div>

        {/* Label */}
        <div>
          <label htmlFor="coup-label" className="mb-1.5 block text-sm font-medium text-foreground">
            Libelle
          </label>
          <input
            id="coup-label"
            type="text"
            value={form.label}
            onChange={(e) => setField('label', e.target.value)}
            className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Promo d'ouverture"
          />
        </div>

        {/* Discount type */}
        <div>
          <label htmlFor="coup-type" className="mb-1.5 block text-sm font-medium text-foreground">
            Type de remise
          </label>
          <select
            id="coup-type"
            value={form.discount_type}
            onChange={(e) => setField('discount_type', e.target.value as 'percentage' | 'fixed')}
            className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="percentage">Pourcentage (%)</option>
            <option value="fixed">Montant fixe (EUR)</option>
          </select>
        </div>

        {/* Discount value */}
        <div>
          <label htmlFor="coup-value" className="mb-1.5 block text-sm font-medium text-foreground">
            Valeur *
          </label>
          {form.discount_type === 'fixed' ? (
            <CentsInput
              id="coup-value"
              value={form.discount_value}
              onChange={(v) => setField('discount_value', v)}
              placeholder="0.00"
            />
          ) : (
            <div className="relative">
              <input
                id="coup-value"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.discount_value}
                onChange={(e) => setField('discount_value', parseFloat(e.target.value) || 0)}
                className="w-full rounded-md border border-border bg-background px-4 py-2.5 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="10"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                %
              </span>
            </div>
          )}
        </div>

        {/* Min amount */}
        <div>
          <label htmlFor="coup-min" className="mb-1.5 block text-sm font-medium text-foreground">
            Montant minimum
          </label>
          <CentsInput
            id="coup-min"
            value={form.min_amount_cents}
            onChange={(v) => setField('min_amount_cents', v)}
            placeholder="0.00"
          />
        </div>

        {/* Max uses */}
        <div>
          <label htmlFor="coup-max" className="mb-1.5 block text-sm font-medium text-foreground">
            Utilisations max
          </label>
          <input
            id="coup-max"
            type="number"
            min="0"
            value={form.max_uses}
            onChange={(e) => setField('max_uses', e.target.value)}
            className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Illimite"
          />
        </div>

        {/* Valid from */}
        <div>
          <label htmlFor="coup-from" className="mb-1.5 block text-sm font-medium text-foreground">
            Valide a partir du
          </label>
          <input
            id="coup-from"
            type="date"
            value={form.valid_from}
            onChange={(e) => setField('valid_from', e.target.value)}
            className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Valid until */}
        <div>
          <label htmlFor="coup-until" className="mb-1.5 block text-sm font-medium text-foreground">
            Valide jusqu'au
          </label>
          <input
            id="coup-until"
            type="date"
            value={form.valid_until}
            onChange={(e) => setField('valid_until', e.target.value)}
            className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* is_active toggle */}
        <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3 sm:col-span-2">
          <span className="text-sm text-foreground">Coupon actif</span>
          <Toggle checked={form.is_active} onChange={(v) => setField('is_active', v)} />
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {isEdit ? 'Enregistrer' : 'Creer'}
        </button>
      </div>
    </Dialog>
  );
}

function CouponsTab() {
  const [coupons, setCoupons] = useState<PosCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCoupon, setEditCoupon] = useState<PosCoupon | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PosCoupon | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await api.get<PosCoupon[]>('/pos/coupons');
    if (result.success && result.data) {
      setCoupons(result.data);
    } else {
      setError(result.error || 'Erreur lors du chargement des coupons.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const openCreate = () => {
    setEditCoupon(null);
    setDialogOpen(true);
  };

  const openEdit = (c: PosCoupon) => {
    setEditCoupon(c);
    setDialogOpen(true);
  };

  const handleSaved = () => {
    setDialogOpen(false);
    setEditCoupon(null);
    setMessage({ type: 'success', text: editCoupon ? 'Coupon mis a jour.' : 'Coupon cree avec succes.' });
    fetchCoupons();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await api.delete(`/pos/coupons/${deleteTarget.id}`);
    setDeleting(false);
    if (result.success) {
      setDeleteTarget(null);
      setMessage({ type: 'success', text: 'Coupon supprime.' });
      fetchCoupons();
    } else {
      setMessage({ type: 'error', text: result.error || 'Erreur lors de la suppression.' });
      setDeleteTarget(null);
    }
  };

  const formatDiscountValue = (c: PosCoupon) => {
    if (c.discount_type === 'percentage') {
      return `${c.discount_value} %`;
    }
    return formatCurrency(c.discount_value);
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <>
      <FeedbackMessage message={message} />

      {/* Toolbar */}
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Ajouter un coupon
        </button>
      </div>

      {coupons.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="Aucun coupon"
          description="Creez des coupons de reduction pour vos clients."
          action={{ label: 'Ajouter un coupon', onClick: openCreate }}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">Code</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">Libelle</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">Type</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">Valeur</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">Utilisations</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">Actif</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-foreground">
                    {c.code}
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-foreground" title={c.label || ''}>
                    {c.label || '-'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {c.discount_type === 'percentage' ? 'Pourcentage' : 'Fixe'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">
                    {formatDiscountValue(c)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {c.current_uses}{c.max_uses !== null ? ` / ${c.max_uses}` : ''}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {c.is_active ? (
                      <Badge className="bg-green-100 text-green-700">Oui</Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-600">Non</Badge>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(c)}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(c)}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
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
      )}

      {/* Coupon dialog */}
      {dialogOpen && (
        <CouponDialog
          coupon={editCoupon}
          onClose={() => {
            setDialogOpen(false);
            setEditCoupon(null);
          }}
          onSaved={handleSaved}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <ConfirmDeleteDialog
          label={deleteTarget.code}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          saving={deleting}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'products', label: 'Produits', icon: Package },
  { id: 'categories', label: 'Categories', icon: Tag },
  { id: 'coupons', label: 'Coupons', icon: Ticket },
];

export function PosProductsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('products');
  const [mountedTabs, setMountedTabs] = useState<Set<TabId>>(new Set(['products']));

  const selectTab = (tab: TabId) => {
    setActiveTab(tab);
    setMountedTabs((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Produits et stock
        </h1>
        <p className="mt-2 text-muted-foreground">
          Gerez votre catalogue produits, vos categories et vos coupons de reduction.
        </p>
      </div>

      {/* Tab navigation */}
      <div className="mb-6 border-b border-border">
        <nav className="-mb-px flex gap-6 overflow-x-auto" aria-label="Onglets">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => selectTab(tab.id)}
                className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab panels (lazy mounted, hidden when inactive) */}
      <div>
        {mountedTabs.has('products') && (
          <div className={activeTab === 'products' ? '' : 'hidden'}>
            <ProductsTab />
          </div>
        )}
        {mountedTabs.has('categories') && (
          <div className={activeTab === 'categories' ? '' : 'hidden'}>
            <CategoriesTab />
          </div>
        )}
        {mountedTabs.has('coupons') && (
          <div className={activeTab === 'coupons' ? '' : 'hidden'}>
            <CouponsTab />
          </div>
        )}
      </div>
    </div>
  );
}
