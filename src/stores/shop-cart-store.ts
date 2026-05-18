/**
 * Shop cart store — one cart per exhibitor, persisted in localStorage.
 *
 * Cart shape:
 *   { [exhibitorSlug]: { items: [{ product_id, name, price_cents, image_url, quantity }] } }
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  product_id: string;
  name: string;
  price_cents: number;
  image_url: string | null;
  quantity: number;
  tax_rate: number;
}

interface ExhibitorCart {
  items: CartItem[];
}

interface ShopCartStore {
  carts: Record<string, ExhibitorCart>;
  addItem: (exhibitorSlug: string, item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  updateQuantity: (exhibitorSlug: string, productId: string, quantity: number) => void;
  removeItem: (exhibitorSlug: string, productId: string) => void;
  clearCart: (exhibitorSlug: string) => void;
  getCart: (exhibitorSlug: string) => ExhibitorCart;
}

export const useShopCartStore = create<ShopCartStore>()(
  persist(
    (set, get) => ({
      carts: {},

      addItem: (exhibitorSlug, item, quantity = 1) => {
        const cart = get().carts[exhibitorSlug] || { items: [] };
        const existing = cart.items.find((i) => i.product_id === item.product_id);
        const items = existing
          ? cart.items.map((i) =>
              i.product_id === item.product_id ? { ...i, quantity: i.quantity + quantity } : i,
            )
          : [...cart.items, { ...item, quantity }];
        set({ carts: { ...get().carts, [exhibitorSlug]: { items } } });
      },

      updateQuantity: (exhibitorSlug, productId, quantity) => {
        const cart = get().carts[exhibitorSlug];
        if (!cart) return;
        if (quantity <= 0) {
          set({
            carts: {
              ...get().carts,
              [exhibitorSlug]: { items: cart.items.filter((i) => i.product_id !== productId) },
            },
          });
          return;
        }
        set({
          carts: {
            ...get().carts,
            [exhibitorSlug]: {
              items: cart.items.map((i) =>
                i.product_id === productId ? { ...i, quantity } : i,
              ),
            },
          },
        });
      },

      removeItem: (exhibitorSlug, productId) => {
        const cart = get().carts[exhibitorSlug];
        if (!cart) return;
        set({
          carts: {
            ...get().carts,
            [exhibitorSlug]: { items: cart.items.filter((i) => i.product_id !== productId) },
          },
        });
      },

      clearCart: (exhibitorSlug) => {
        const carts = { ...get().carts };
        delete carts[exhibitorSlug];
        set({ carts });
      },

      getCart: (exhibitorSlug) => get().carts[exhibitorSlug] || { items: [] },
    }),
    { name: 'festosh-shop-cart' },
  ),
);

/** Convenience: derived totals for an exhibitor's cart. */
export function getCartTotals(cart: ExhibitorCart): {
  item_count: number; subtotal_cents: number; tax_cents: number;
} {
  let item_count = 0;
  let subtotal_cents = 0;
  let tax_cents = 0;
  for (const item of cart.items) {
    item_count += item.quantity;
    const lineSubtotal = item.price_cents * item.quantity;
    subtotal_cents += lineSubtotal;
    tax_cents += Math.round(lineSubtotal * item.tax_rate);
  }
  return { item_count, subtotal_cents, tax_cents };
}
