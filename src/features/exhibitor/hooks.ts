/**
 * Shared TanStack Query hooks for the exhibitor dashboard.
 *
 * Why this exists: before this module, the dashboard page itself ran four
 * Promise.all-style fetches, and each child tab (Profile, Documents,
 * Applications, Invoices, Boutique) re-ran the same fetches on mount. Result:
 * switching tabs caused redundant network round-trips even though the data
 * was already in memory.
 *
 * Now every consumer uses the same query keys + queryFn, so TanStack Query
 * dedupes in-flight requests, serves cached data on re-mount (subject to the
 * 30-second staleTime configured on the QueryClient), and invalidates on
 * mutation. Tab switching becomes free.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type ApiResponse } from '@/lib/api-client';

// ─── Query keys (stable, comparable by reference equality) ────────────────

export const exhibitorKeys = {
  all: ['exhibitor'] as const,
  profile: () => [...exhibitorKeys.all, 'profile'] as const,
  applications: () => [...exhibitorKeys.all, 'applications'] as const,
  documents: () => [...exhibitorKeys.all, 'documents'] as const,
  invoices: () => [...exhibitorKeys.all, 'invoices'] as const,
  visibility: () => [...exhibitorKeys.all, 'visibility'] as const,
  accounting: () => ['pos', 'accounting'] as const,
  posProducts: () => ['pos', 'products'] as const,
  shopOrders: () => ['shop', 'my-orders'] as const,
};

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Treat ApiResponse failures the same as thrown errors so React Query
 *  surfaces them via `isError` and triggers retry semantics. */
function unwrap<T>(res: ApiResponse<T>): T {
  if (!res.success || !res.data) {
    throw new Error(res.error || 'Request failed');
  }
  return res.data;
}

// ─── Profile ──────────────────────────────────────────────────────────────

export interface ExhibitorProfileData {
  id: string;
  slug: string | null;
  company_name: string | null;
  trade_name: string | null;
  description: string | null;
  logo_url: string | null;
  website: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  siret: string | null;
  vat_number: string | null;
  activity_type: string | null;
  category: string | null;
  domains: string[];
  is_pmr: number | null;
  address_line1: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  boutique_enabled: number | null;
  boutique_intro: string | null;
  boutique_currency: string | null;
  boutique_shipping_cents: number | null;
  boutique_free_shipping_above_cents: number | null;
  vitrine_page_id: string | null;
}

export function useExhibitorProfile(enabled = true) {
  return useQuery({
    queryKey: exhibitorKeys.profile(),
    queryFn: async () => {
      const data = unwrap(await api.get<ExhibitorProfileData>('/exhibitors/profile'));
      return {
        ...data,
        domains: Array.isArray(data.domains) ? data.domains : [],
      };
    },
    enabled,
  });
}

// ─── Applications ─────────────────────────────────────────────────────────

export interface ApplicationData {
  id: string;
  edition_id: string;
  status: string;
  created_at: number;
  amount_cents: number | null;
  is_paid: number | null;
  festival_name: string;
  festival_slug: string;
  edition_name: string;
  assigned_booth_id: string | null;
  booth_code: string | null;
  booth_zone: string | null;
  review_notes: string | null;
}

export function useExhibitorApplications(enabled = true) {
  return useQuery({
    queryKey: exhibitorKeys.applications(),
    queryFn: async () => unwrap(await api.get<ApplicationData[]>('/exhibitor-hub/my-applications')),
    enabled,
  });
}

// ─── Documents ────────────────────────────────────────────────────────────

export interface DocumentData {
  id: string;
  file_name: string;
  document_type: string;
  status: string;
  label: string | null;
  expires_at: number | null;
  created_at: number;
  is_expiring_soon: boolean;
  is_expired: boolean;
  days_until_expiry: number | null;
}

export function useExhibitorDocuments(enabled = true) {
  return useQuery({
    queryKey: exhibitorKeys.documents(),
    queryFn: async () => unwrap(await api.get<DocumentData[]>('/exhibitor-hub/my-documents')),
    enabled,
  });
}

// ─── Invoices ─────────────────────────────────────────────────────────────

export interface InvoiceData {
  id: string;
  invoice_number: string;
  label: string;
  total_cents: number;
  currency: string;
  status: string;
  issued_at: number | null;
  festival_name: string | null;
  festival_slug: string | null;
  created_at: number;
}

export function useExhibitorInvoices(enabled = true) {
  return useQuery({
    queryKey: exhibitorKeys.invoices(),
    queryFn: async () => unwrap(await api.get<InvoiceData[]>('/exhibitor-hub/my-invoices')),
    enabled,
  });
}

// ─── Accounting (POS dashboard) ───────────────────────────────────────────

export interface AccountingData {
  revenue: { total_cents: number; tax_cents: number; discount_cents: number; sales_count: number; avg_sale_cents: number };
  costs: { cogs_cents: number; expenses_cents: number; total_cents: number };
  profit: { gross_cents: number; net_cents: number; margin_percent: number };
  break_even: { remaining_cents: number; remaining_sales: number; is_profitable: boolean };
  stock: { total_value_cents: number; total_cost_cents: number; low_stock_count: number; product_count: number };
  expenses_by_category: Record<string, number>;
  sales_by_payment: Record<string, { count: number; total: number }>;
  daily_revenue: Record<string, number>;
}

export function useExhibitorAccounting(enabled = true) {
  return useQuery({
    queryKey: exhibitorKeys.accounting(),
    queryFn: async () => unwrap(await api.get<AccountingData>('/pos/accounting')),
    enabled,
  });
}

// ─── Visibility settings ──────────────────────────────────────────────────

export interface VisibilityData {
  directory_visible: number;
  visibility: Record<string, string>;
}

export function useExhibitorVisibility(enabled = true) {
  return useQuery({
    queryKey: exhibitorKeys.visibility(),
    queryFn: async () => unwrap(await api.get<VisibilityData>('/exhibitor-hub/my-visibility')),
    enabled,
  });
}

// ─── POS products + shop orders (used by Boutique tab) ───────────────────

export interface OnlineProductData {
  id: string;
  name: string;
  sku: string | null;
  price_cents: number;
  stock_quantity: number;
  is_online: number;
  is_active: number;
  image_url: string | null;
}

export function usePosProducts(enabled = true) {
  return useQuery({
    queryKey: exhibitorKeys.posProducts(),
    queryFn: async () => unwrap(await api.get<OnlineProductData[]>('/pos/products')),
    enabled,
  });
}

export interface ShopOrderData {
  id: string;
  order_number: string;
  status: string;
  customer_email: string;
  total_cents: number;
  created_at: number;
  payment_status: string | null;
}

export function useShopOrders(enabled = true) {
  return useQuery({
    queryKey: exhibitorKeys.shopOrders(),
    queryFn: async () => unwrap(await api.get<ShopOrderData[]>('/shop/my-orders')),
    enabled,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────

/** Save the exhibitor profile. Auto-invalidates the cached profile + visibility
 *  on success so the dashboard reflects the change without a manual refetch. */
export function useSaveExhibitorProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<ExhibitorProfileData> & Record<string, unknown>) => {
      const res = await api.post('/exhibitors/profile', patch);
      if (!res.success) throw new Error(res.error || 'Save failed');
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: exhibitorKeys.profile() });
      qc.invalidateQueries({ queryKey: exhibitorKeys.visibility() });
    },
  });
}

/** Toggle one product's is_online flag. Optimistically updates the cached list
 *  for instant feedback, rolls back on error. */
export function useToggleProductOnline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isOnline }: { id: string; isOnline: number }) => {
      const res = await api.put(`/pos/products/${id}`, { is_online: isOnline });
      if (!res.success) throw new Error(res.error || 'Toggle failed');
      return res.data;
    },
    onMutate: async ({ id, isOnline }) => {
      await qc.cancelQueries({ queryKey: exhibitorKeys.posProducts() });
      const previous = qc.getQueryData<OnlineProductData[]>(exhibitorKeys.posProducts());
      if (previous) {
        qc.setQueryData<OnlineProductData[]>(
          exhibitorKeys.posProducts(),
          previous.map((p) => (p.id === id ? { ...p, is_online: isOnline } : p)),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(exhibitorKeys.posProducts(), ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: exhibitorKeys.posProducts() });
    },
  });
}
