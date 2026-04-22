import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Loader2,
  Search,
  ShoppingCart,
  Plus,
  Minus,
  X,
  Trash2,
  CreditCard,
  Banknote,
  ArrowRightLeft,
  Tag,
  CheckCircle2,
  AlertTriangle,
  ImageOff,
  PackageOpen,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { formatCurrency } from '@/lib/format-utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PosCategory {
  id: string;
  name: string;
  sort_order: number;
}

interface PosProduct {
  id: string;
  name: string;
  price_cents: number;
  tax_rate: number;
  image_url: string | null;
  category_id: string | null;
  stock_quantity: number | null;
  active: number;
}

interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  taxRate: number;
  stockQuantity: number | null;
}

interface CouponResult {
  id: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
}

interface SaleResult {
  id: string;
  sale_number: string;
}

type PaymentMethod = 'cash' | 'card' | 'transfer';

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ElementType }[] = [
  { value: 'cash', label: 'Especes', icon: Banknote },
  { value: 'card', label: 'CB', icon: CreditCard },
  { value: 'transfer', label: 'Virement', icon: ArrowRightLeft },
];

const LOW_STOCK_THRESHOLD = 5;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeDiscount(subtotalCents: number, coupon: CouponResult | null): number {
  if (!coupon) return 0;
  if (coupon.discount_type === 'percent') {
    return Math.round(subtotalCents * (coupon.discount_value / 100));
  }
  // fixed discount is stored in cents
  return Math.min(coupon.discount_value, subtotalCents);
}

function computeTax(items: CartItem[], discountCents: number, subtotalCents: number): number {
  // Distribute discount proportionally across items and compute tax
  if (subtotalCents === 0) return 0;
  return items.reduce((acc, item) => {
    const lineTotal = item.unitPriceCents * item.quantity;
    const lineDiscount = subtotalCents > 0 ? Math.round((lineTotal / subtotalCents) * discountCents) : 0;
    const taxableAmount = lineTotal - lineDiscount;
    return acc + Math.round(taxableAmount * item.taxRate);
  }, 0);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProductCard({
  product,
  onAdd,
  cartQuantity,
}: {
  product: PosProduct;
  onAdd: () => void;
  cartQuantity: number;
}) {
  const outOfStock = product.stock_quantity !== null && product.stock_quantity <= 0;
  const lowStock =
    product.stock_quantity !== null &&
    product.stock_quantity > 0 &&
    product.stock_quantity <= LOW_STOCK_THRESHOLD;
  const remainingAfterCart =
    product.stock_quantity !== null ? product.stock_quantity - cartQuantity : null;
  const cannotAddMore = remainingAfterCart !== null && remainingAfterCart <= 0;

  return (
    <button
      type="button"
      disabled={outOfStock || cannotAddMore}
      onClick={onAdd}
      className={`group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition-all ${
        outOfStock || cannotAddMore
          ? 'cursor-not-allowed opacity-50'
          : 'hover:shadow-md hover:border-primary/40 active:scale-[0.98]'
      }`}
    >
      {/* Image — compact on mobile */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageOff className="h-10 w-10 text-muted-foreground/40" />
          </div>
        )}
        {/* Stock badge */}
        {outOfStock && (
          <span className="absolute right-2 top-2 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
            Rupture
          </span>
        )}
        {lowStock && !outOfStock && (
          <span className="absolute right-2 top-2 inline-flex items-center gap-0.5 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">
            <AlertTriangle className="h-3 w-3" />
            {product.stock_quantity}
          </span>
        )}
        {/* Cart quantity overlay */}
        {cartQuantity > 0 && (
          <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {cartQuantity}
          </span>
        )}
      </div>
      {/* Info */}
      <div className="flex flex-1 flex-col gap-1 p-3">
        <span className="line-clamp-2 text-sm font-medium text-foreground">{product.name}</span>
        <span className="mt-auto text-base font-bold text-primary">
          {formatCurrency(product.price_cents)}
        </span>
      </div>
    </button>
  );
}

function CartItemRow({
  item,
  onIncrement,
  onDecrement,
  onRemove,
}: {
  item: CartItem;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}) {
  const atStockLimit = item.stockQuantity !== null && item.quantity >= item.stockQuantity;

  return (
    <div className="flex items-center gap-3 border-b border-border py-3 last:border-0">
      {/* Name + unit price */}
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
        <p className="text-xs text-muted-foreground">{formatCurrency(item.unitPriceCents)}</p>
      </div>
      {/* Qty controls */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onDecrement}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:bg-accent"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="w-8 text-center text-sm font-semibold text-foreground">
          {item.quantity}
        </span>
        <button
          type="button"
          onClick={onIncrement}
          disabled={atStockLimit}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      {/* Line total */}
      <span className="w-20 text-right text-sm font-semibold text-foreground">
        {formatCurrency(item.unitPriceCents * item.quantity)}
      </span>
      {/* Remove */}
      <button
        type="button"
        onClick={onRemove}
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function SuccessToast({ saleNumber, onDone }: { saleNumber: string; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 3000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-6 py-4 shadow-lg dark:border-green-800 dark:bg-green-900/30">
        <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
        <div>
          <p className="text-sm font-semibold text-green-800 dark:text-green-300">Vente enregistree !</p>
          <p className="text-xs text-green-600 dark:text-green-400">N° {saleNumber}</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cart panel (shared between desktop sidebar and mobile overlay)
// ---------------------------------------------------------------------------

function CartPanel({
  cart, cartItemCount, subtotalCents, discountCents, taxCents, totalCents,
  appliedCoupon, couponCode, couponLoading, couponError, paymentMethod, processing, error,
  onCouponCodeChange, onApplyCoupon, onRemoveCoupon, onPaymentMethodChange, onCheckout, onClearCart,
  onIncrement, onDecrement, onRemove,
}: {
  cart: CartItem[]; cartItemCount: number; subtotalCents: number; discountCents: number;
  taxCents: number; totalCents: number; appliedCoupon: CouponResult | null;
  couponCode: string; couponLoading: boolean; couponError: string | null;
  paymentMethod: PaymentMethod; processing: boolean; error: string | null;
  onCouponCodeChange: (v: string) => void; onApplyCoupon: () => void; onRemoveCoupon: () => void;
  onPaymentMethodChange: (v: PaymentMethod) => void; onCheckout: () => void; onClearCart: () => void;
  onIncrement: (id: string) => void; onDecrement: (id: string) => void; onRemove: (id: string) => void;
}) {
  return (
    <>
      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-foreground" />
          <h2 className="text-base font-semibold text-foreground">Panier</h2>
          {cartItemCount > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">{cartItemCount}</span>
          )}
        </div>
        {cart.length > 0 && (
          <button type="button" onClick={onClearCart} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" /> Vider
          </button>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-4">
        {cart.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
            <ShoppingCart className="h-10 w-10 opacity-30" />
            <p className="text-sm">Le panier est vide</p>
          </div>
        ) : (
          <div className="py-2">
            {cart.map((item) => (
              <CartItemRow key={item.productId} item={item} onIncrement={() => onIncrement(item.productId)} onDecrement={() => onDecrement(item.productId)} onRemove={() => onRemove(item.productId)} />
            ))}
          </div>
        )}
      </div>

      {/* Bottom */}
      <div className="flex-shrink-0 border-t border-border">
        {/* Coupon */}
        <div className="border-b border-border px-4 py-2.5">
          {appliedCoupon ? (
            <div className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2 dark:bg-green-900/20">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700 dark:text-green-300">{appliedCoupon.code}</span>
                <span className="text-xs text-green-600">(-{appliedCoupon.discount_type === 'percent' ? `${appliedCoupon.discount_value}%` : formatCurrency(appliedCoupon.discount_value)})</span>
              </div>
              <button type="button" onClick={onRemoveCoupon} className="rounded-md p-1 text-green-600 hover:bg-green-100"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <div>
              <div className="flex gap-2">
                <input type="text" value={couponCode} onChange={(e) => onCouponCodeChange(e.target.value.toUpperCase())} onKeyDown={(e) => { if (e.key === 'Enter') onApplyCoupon(); }} placeholder="Code promo"
                  className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                <button type="button" onClick={onApplyCoupon} disabled={couponLoading || !couponCode.trim()}
                  className="inline-flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50">
                  {couponLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Tag className="h-3.5 w-3.5" />} Appliquer
                </button>
              </div>
              {couponError && <p className="mt-1 text-xs text-destructive">{couponError}</p>}
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="space-y-1 border-b border-border px-4 py-2.5">
          <div className="flex justify-between text-sm text-muted-foreground"><span>Sous-total</span><span>{formatCurrency(subtotalCents)}</span></div>
          {discountCents > 0 && <div className="flex justify-between text-sm text-green-600"><span>Remise</span><span>-{formatCurrency(discountCents)}</span></div>}
          <div className="flex justify-between text-sm text-muted-foreground"><span>TVA</span><span>{formatCurrency(taxCents)}</span></div>
          <div className="flex justify-between border-t border-border pt-2 text-lg font-bold text-foreground"><span>Total</span><span>{formatCurrency(totalCents)}</span></div>
        </div>

        {/* Payment */}
        <div className="border-b border-border px-4 py-2.5">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Mode de paiement</p>
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_METHODS.map((pm) => {
              const Icon = pm.icon;
              return (
                <button key={pm.value} type="button" onClick={() => onPaymentMethodChange(pm.value)}
                  className={`flex flex-col items-center gap-1 rounded-lg border-2 px-2 py-2 text-xs font-medium transition-colors ${paymentMethod === pm.value ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>
                  <Icon className="h-4 w-4" /> {pm.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Checkout */}
        <div className="px-4 py-3">
          {error && cart.length > 0 && <p className="mb-2 text-xs text-destructive">{error}</p>}
          <button type="button" onClick={onCheckout} disabled={cart.length === 0 || processing}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 text-base font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 active:bg-green-800">
            {processing ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
            Encaisser {cart.length > 0 ? formatCurrency(totalCents) : ''}
          </button>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function PosTerminalPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  // Data
  const [categories, setCategories] = useState<PosCategory[]>([]);
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);

  // Coupon
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponResult | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [processing, setProcessing] = useState(false);

  // Success toast
  const [successSale, setSuccessSale] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // -----------------------------------------------------------------------
  // Fetch data
  // -----------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    setLoadingData(true);
    setError(null);
    const [catRes, prodRes] = await Promise.all([
      api.get<PosCategory[]>('/pos/categories'),
      api.get<PosProduct[]>('/pos/products'),
    ]);
    if (catRes.success && catRes.data) {
      setCategories(catRes.data);
    }
    if (prodRes.success && prodRes.data) {
      setProducts(prodRes.data.filter((p) => p.active === 1));
    } else {
      setError(prodRes.error || 'Erreur lors du chargement des produits.');
    }
    setLoadingData(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, fetchData]);

  // -----------------------------------------------------------------------
  // Filtered products
  // -----------------------------------------------------------------------

  const filteredProducts = useMemo(() => {
    let result = products;
    if (activeCategory) {
      result = result.filter((p) => p.category_id === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((p) => p.name.toLowerCase().includes(q));
    }
    return result;
  }, [products, activeCategory, searchQuery]);

  // -----------------------------------------------------------------------
  // Cart helpers (build a map for O(1) lookups)
  // -----------------------------------------------------------------------

  const cartMap = useMemo(() => {
    const m = new Map<string, number>();
    cart.forEach((item) => m.set(item.productId, item.quantity));
    return m;
  }, [cart]);

  const addToCart = useCallback(
    (product: PosProduct) => {
      setCart((prev) => {
        const existing = prev.find((i) => i.productId === product.id);
        if (existing) {
          // Check stock
          if (product.stock_quantity !== null && existing.quantity >= product.stock_quantity) {
            return prev;
          }
          return prev.map((i) =>
            i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i,
          );
        }
        return [
          ...prev,
          {
            productId: product.id,
            name: product.name,
            quantity: 1,
            unitPriceCents: product.price_cents,
            taxRate: product.tax_rate,
            stockQuantity: product.stock_quantity,
          },
        ];
      });
    },
    [],
  );

  const incrementItem = useCallback((productId: string) => {
    setCart((prev) =>
      prev.map((i) => {
        if (i.productId !== productId) return i;
        if (i.stockQuantity !== null && i.quantity >= i.stockQuantity) return i;
        return { ...i, quantity: i.quantity + 1 };
      }),
    );
  }, []);

  const decrementItem = useCallback((productId: string) => {
    setCart((prev) =>
      prev
        .map((i) => (i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0),
    );
  }, []);

  const removeItem = useCallback((productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError(null);
    setPaymentMethod('cash');
  }, []);

  // -----------------------------------------------------------------------
  // Totals
  // -----------------------------------------------------------------------

  const subtotalCents = useMemo(
    () => cart.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0),
    [cart],
  );

  const discountCents = useMemo(
    () => computeDiscount(subtotalCents, appliedCoupon),
    [subtotalCents, appliedCoupon],
  );

  const taxCents = useMemo(
    () => computeTax(cart, discountCents, subtotalCents),
    [cart, discountCents, subtotalCents],
  );

  const totalCents = subtotalCents - discountCents + taxCents;

  const cartItemCount = useMemo(() => cart.reduce((sum, i) => sum + i.quantity, 0), [cart]);

  // -----------------------------------------------------------------------
  // Coupon
  // -----------------------------------------------------------------------

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError(null);
    const res = await api.post<CouponResult>('/pos/coupons/validate', { code: couponCode.trim() });
    if (res.success && res.data) {
      setAppliedCoupon(res.data);
      setCouponError(null);
    } else {
      setCouponError(res.error || 'Code invalide.');
    }
    setCouponLoading(false);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError(null);
  };

  // -----------------------------------------------------------------------
  // Checkout
  // -----------------------------------------------------------------------

  const handleCheckout = async () => {
    if (cart.length === 0 || processing) return;
    setProcessing(true);
    const payload = {
      items: cart.map((i) => ({
        product_id: i.productId,
        quantity: i.quantity,
        unit_price_cents: i.unitPriceCents,
      })),
      coupon_id: appliedCoupon?.id ?? null,
      payment_method: paymentMethod,
      edition_id: null,
      customer_name: null,
    };
    const res = await api.post<SaleResult>('/pos/sales', payload);
    setProcessing(false);
    if (res.success && res.data) {
      setSuccessSale(res.data.sale_number);
      clearCart();
      // Refresh products to update stock counts
      fetchData();
    } else {
      setError(res.error || 'Erreur lors de la vente.');
    }
  };

  // -----------------------------------------------------------------------
  // Render guards
  // -----------------------------------------------------------------------

  if (authLoading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <p className="text-muted-foreground">Veuillez vous connecter pour acceder a la caisse.</p>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col lg:flex-row">
      {/* ================================================================= */}
      {/* LEFT PANEL: Products */}
      {/* ================================================================= */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Search + categories combined bar */}
        <div className="flex-shrink-0 border-b border-border bg-background px-3 py-2">
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un produit..."
              className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {searchQuery && (
              <button type="button" onClick={() => { setSearchQuery(''); searchInputRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            <button type="button" onClick={() => setActiveCategory(null)}
              className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${activeCategory === null ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
              Tout
            </button>
            {categories.map((cat) => (
              <button key={cat.id} type="button" onClick={() => setActiveCategory(cat.id)}
                className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${activeCategory === cat.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {loadingData ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error && products.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <AlertTriangle className="h-10 w-10 text-destructive/60" />
              <p className="text-sm text-destructive">{error}</p>
              <button type="button" onClick={fetchData} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Reessayer
              </button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <PackageOpen className="h-12 w-12 opacity-40" />
              <p className="text-sm">Aucun produit trouve.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  cartQuantity={cartMap.get(product.id) || 0}
                  onAdd={() => addToCart(product)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* MOBILE: Floating cart button */}
      {/* ================================================================= */}
      {!mobileCartOpen && (
        <button
          type="button"
          onClick={() => setMobileCartOpen(true)}
          className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-transform active:scale-95 lg:hidden"
        >
          <ShoppingCart className="h-5 w-5" />
          {cartItemCount > 0 ? (
            <>{cartItemCount} — {formatCurrency(totalCents)}</>
          ) : (
            <>Panier</>
          )}
        </button>
      )}

      {/* ================================================================= */}
      {/* MOBILE: Cart overlay */}
      {/* ================================================================= */}
      {mobileCartOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background lg:hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              <h2 className="text-base font-semibold text-foreground">Panier</h2>
              {cartItemCount > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">{cartItemCount}</span>
              )}
            </div>
            <button type="button" onClick={() => setMobileCartOpen(false)} className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-1 flex-col overflow-hidden">
            <CartPanel
              cart={cart} cartItemCount={cartItemCount} subtotalCents={subtotalCents} discountCents={discountCents}
              taxCents={taxCents} totalCents={totalCents} appliedCoupon={appliedCoupon} couponCode={couponCode}
              couponLoading={couponLoading} couponError={couponError} paymentMethod={paymentMethod} processing={processing} error={error}
              onCouponCodeChange={setCouponCode} onApplyCoupon={applyCoupon} onRemoveCoupon={removeCoupon}
              onPaymentMethodChange={setPaymentMethod} onCheckout={handleCheckout} onClearCart={clearCart}
              onIncrement={incrementItem} onDecrement={decrementItem} onRemove={removeItem}
            />
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* DESKTOP: Right panel cart */}
      {/* ================================================================= */}
      <div className="hidden lg:flex flex-col border-l border-border bg-card lg:w-[30%] lg:min-w-[340px] lg:max-w-[440px]">
        <CartPanel
          cart={cart} cartItemCount={cartItemCount} subtotalCents={subtotalCents} discountCents={discountCents}
          taxCents={taxCents} totalCents={totalCents} appliedCoupon={appliedCoupon} couponCode={couponCode}
          couponLoading={couponLoading} couponError={couponError} paymentMethod={paymentMethod} processing={processing} error={error}
          onCouponCodeChange={setCouponCode} onApplyCoupon={applyCoupon} onRemoveCoupon={removeCoupon}
          onPaymentMethodChange={setPaymentMethod} onCheckout={handleCheckout} onClearCart={clearCart}
          onIncrement={incrementItem} onDecrement={decrementItem} onRemove={removeItem}
        />
      </div>

      {/* Success toast */}
      {successSale && <SuccessToast saleNumber={successSale} onDone={() => setSuccessSale(null)} />}
    </div>
  );
}
