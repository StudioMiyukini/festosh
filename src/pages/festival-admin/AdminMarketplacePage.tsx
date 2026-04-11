import { useState, useEffect, useCallback } from 'react';
import {
  ShoppingBag,
  Package,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Image,
} from 'lucide-react';
import { useTenantStore } from '@/stores/tenant-store';
import { api, ApiClient } from '@/lib/api-client';
import { formatCurrency, formatTimestamp } from '@/lib/format-utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  total_cents: number;
  status: string;
  created_at: number;
  items?: OrderItem[];
}

interface Product {
  id: string;
  name: string;
  price_cents: number;
  stock_quantity: number;
  image_url: string | null;
  is_online: number;
  category: string | null;
}

type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmee',
  shipped: 'Expediee',
  delivered: 'Livree',
  cancelled: 'Annulee',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  shipped: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

type Tab = 'orders' | 'products';

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AdminMarketplacePage() {
  const { festival } = useTenantStore();

  const [activeTab, setActiveTab] = useState<Tab>('orders');

  // Orders
  const [orders, setOrders] = useState<Order[]>([]);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [errorOrders, setErrorOrders] = useState<string | null>(null);

  // Products
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [errorProducts, setErrorProducts] = useState<string | null>(null);
  const [togglingProduct, setTogglingProduct] = useState<string | null>(null);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  /* ---- fetch orders ---- */

  const fetchOrders = useCallback(async () => {
    if (!festival) return;
    setLoadingOrders(true);
    setErrorOrders(null);

    const res = await api.get<Order[]>('/marketplace/seller-orders');
    if (res.success && res.data) {
      setOrders(res.data);
    } else {
      setErrorOrders(res.error || 'Impossible de charger les commandes.');
    }
    setLoadingOrders(false);
  }, [festival]);

  /* ---- fetch products ---- */

  const fetchProducts = useCallback(async () => {
    if (!festival) return;
    setLoadingProducts(true);
    setErrorProducts(null);

    const qs = ApiClient.queryString({ is_online: 1 });
    const res = await api.get<Product[]>(`/pos/products${qs}`);
    if (res.success && res.data) {
      setProducts(res.data);
    } else {
      setErrorProducts(res.error || 'Impossible de charger les produits.');
    }
    setLoadingProducts(false);
  }, [festival]);

  useEffect(() => {
    fetchOrders();
    fetchProducts();
  }, [fetchOrders, fetchProducts]);

  /* ---- expand order ---- */

  const toggleExpandOrder = async (orderId: string) => {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
      return;
    }
    // Load items if not already loaded
    const order = orders.find((o) => o.id === orderId);
    if (order && !order.items) {
      const res = await api.get<Order>(`/marketplace/seller-orders/${orderId}`);
      if (res.success && res.data) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, items: res.data!.items } : o)),
        );
      }
    }
    setExpandedOrder(orderId);
  };

  /* ---- toggle product online ---- */

  const handleToggleOnline = async (product: Product) => {
    setTogglingProduct(product.id);
    setMessage(null);

    const newIsOnline = product.is_online ? 0 : 1;
    const res = await api.put<Product>(`/pos/products/${product.id}`, {
      is_online: newIsOnline,
    });

    if (res.success) {
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, is_online: newIsOnline } : p)),
      );
      setMessage({
        type: 'success',
        text: newIsOnline
          ? `"${product.name}" est maintenant en ligne.`
          : `"${product.name}" a ete retire de la vente en ligne.`,
      });
    } else {
      setMessage({ type: 'error', text: res.error || 'Erreur lors de la mise a jour.' });
    }
    setTogglingProduct(null);
  };

  if (!festival) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Aucun festival selectionne.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Marketplace</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Commandes et produits en ligne de vos exposants.
        </p>
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

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'orders'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <ShoppingBag className="h-4 w-4" />
          Commandes ({orders.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'products'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Package className="h-4 w-4" />
          Produits en ligne ({products.filter((p) => p.is_online).length})
        </button>
      </div>

      {/* ============================================================ */}
      {/*  Tab 1 — Commandes                                            */}
      {/* ============================================================ */}
      {activeTab === 'orders' && (
        <>
          {loadingOrders ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : errorOrders ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertCircle className="mb-3 h-8 w-8 text-destructive" />
              <p className="text-sm text-destructive">{errorOrders}</p>
              <button
                type="button"
                onClick={fetchOrders}
                className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Reessayer
              </button>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-12 text-center">
              <ShoppingBag className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Aucune commande pour le moment.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        N&deg; commande
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Client
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Total
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Date
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {orders.map((order) => {
                      const isExpanded = expandedOrder === order.id;
                      return (
                        <tr key={order.id} className="group">
                          <td colSpan={6} className="p-0">
                            {/* Main row */}
                            <div className="flex items-center hover:bg-muted/50">
                              <div className="flex-1 grid grid-cols-[1fr_1fr_auto_auto_1fr_auto] items-center">
                                <span className="whitespace-nowrap px-6 py-4 text-sm font-medium text-foreground">
                                  {order.order_number}
                                </span>
                                <span className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                                  {order.customer_name}
                                </span>
                                <span className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-foreground">
                                  {formatCurrency(order.total_cents)}
                                </span>
                                <span className="whitespace-nowrap px-6 py-4 text-center">
                                  <span
                                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                      STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'
                                    }`}
                                  >
                                    {STATUS_LABELS[order.status] || order.status}
                                  </span>
                                </span>
                                <span className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                                  {formatTimestamp(order.created_at)}
                                </span>
                                <span className="whitespace-nowrap px-6 py-4 text-right">
                                  <button
                                    type="button"
                                    onClick={() => toggleExpandOrder(order.id)}
                                    className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                                    title={isExpanded ? 'Masquer' : 'Voir les articles'}
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="h-4 w-4" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4" />
                                    )}
                                  </button>
                                </span>
                              </div>
                            </div>

                            {/* Expanded items */}
                            {isExpanded && (
                              <div className="border-t border-border bg-muted/30 px-6 py-4">
                                {order.items && order.items.length > 0 ? (
                                  <div className="space-y-2">
                                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                      Articles
                                    </p>
                                    {order.items.map((item) => (
                                      <div
                                        key={item.id}
                                        className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-2"
                                      >
                                        <div className="flex items-center gap-3">
                                          <span className="text-sm font-medium text-foreground">
                                            {item.product_name}
                                          </span>
                                          <span className="text-xs text-muted-foreground">
                                            x{item.quantity}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm">
                                          <span className="text-muted-foreground">
                                            {formatCurrency(item.unit_price_cents)} / unite
                                          </span>
                                          <span className="font-medium text-foreground">
                                            {formatCurrency(item.total_cents)}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center py-4">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                    <span className="ml-2 text-sm text-muted-foreground">
                                      Chargement des articles...
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ============================================================ */}
      {/*  Tab 2 — Produits en ligne                                    */}
      {/* ============================================================ */}
      {activeTab === 'products' && (
        <>
          {loadingProducts ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : errorProducts ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertCircle className="mb-3 h-8 w-8 text-destructive" />
              <p className="text-sm text-destructive">{errorProducts}</p>
              <button
                type="button"
                onClick={fetchProducts}
                className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Reessayer
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-12 text-center">
              <Package className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Aucun produit en ligne.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  className={`rounded-xl border bg-card p-4 transition-colors ${
                    product.is_online ? 'border-border' : 'border-border opacity-60'
                  }`}
                >
                  {/* Product image */}
                  <div className="mb-3 flex h-32 items-center justify-center rounded-lg bg-muted">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-full w-full rounded-lg object-cover"
                      />
                    ) : (
                      <Image className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-medium text-foreground">
                        {product.name}
                      </h3>
                      {product.category && (
                        <p className="text-xs text-muted-foreground">{product.category}</p>
                      )}
                    </div>
                    <span className="whitespace-nowrap text-sm font-semibold text-foreground">
                      {formatCurrency(product.price_cents)}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Stock : {product.stock_quantity}</span>
                    <span
                      className={`inline-flex items-center gap-1 font-medium ${
                        product.is_online ? 'text-green-600' : 'text-muted-foreground'
                      }`}
                    >
                      {product.is_online ? (
                        <>
                          <Eye className="h-3 w-3" />
                          En ligne
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3 w-3" />
                          Hors ligne
                        </>
                      )}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleOnline(product)}
                    disabled={togglingProduct === product.id}
                    className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                      product.is_online
                        ? 'border border-border text-foreground hover:bg-accent'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }`}
                  >
                    {togglingProduct === product.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : product.is_online ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    {product.is_online ? 'Mettre hors ligne' : 'Mettre en ligne'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
