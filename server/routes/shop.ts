/**
 * Shop routes — checkout, orders, and order management.
 *
 * Public endpoints handle the customer-facing checkout flow.
 * Authenticated endpoints let exhibitors manage their received orders.
 */

import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import {
  exhibitorProfiles,
  products,
  shopOrders,
  shopOrderItems,
  notifications,
} from '../db/schema.js';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
import { formatResponse } from '../lib/format.js';
import {
  createPaymentIntent,
  retrievePaymentIntent,
  confirmMockIntent,
  PAYMENT_PROVIDER_IN_USE,
} from '../lib/payments.js';

const shopRoutes = new Hono();

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateOrderNumber(): string {
  const date = new Date();
  const yymmdd = `${date.getFullYear().toString().slice(2)}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `CMD-${yymmdd}-${rand}`;
}

function formatOrder(o: typeof shopOrders.$inferSelect) {
  return formatResponse(o);
}

function formatOrderItem(i: typeof shopOrderItems.$inferSelect) {
  return formatResponse(i);
}

interface CartLine {
  product_id: string;
  quantity: number;
}

interface CheckoutBody {
  exhibitor_slug: string;
  items: CartLine[];
  customer: {
    email: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
  };
  shipping: {
    address_line1: string;
    address_line2?: string;
    postal_code: string;
    city: string;
    country?: string;
  };
  use_billing_same_as_shipping?: boolean;
  billing?: Partial<CheckoutBody['shipping']>;
  notes?: string;
}

// ─── POST /shop/checkout ──────────────────────────────────────────────────
// Creates a pending order + payment intent. The client uses the returned
// client_secret to complete payment (Stripe Elements, or auto-confirm in mock).
shopRoutes.post('/checkout', optionalAuth, async (c) => {
  try {
    const body = (await c.req.json()) as CheckoutBody;
    const userId = c.get('userId') || null;

    if (!body.exhibitor_slug || !Array.isArray(body.items) || body.items.length === 0) {
      return c.json({ success: false, error: 'Invalid cart' }, 400);
    }
    if (!body.customer?.email || !body.shipping?.address_line1 || !body.shipping?.city) {
      return c.json({ success: false, error: 'Missing required customer or shipping info' }, 400);
    }

    const ex = db.select().from(exhibitorProfiles).where(eq(exhibitorProfiles.slug, body.exhibitor_slug)).get();
    if (!ex || ex.boutiqueEnabled !== 1) {
      return c.json({ success: false, error: 'Boutique not available' }, 404);
    }

    // Resolve products + validate stock
    const productIds = body.items.map((i) => i.product_id);
    const allProducts = db.select().from(products).where(eq(products.exhibitorId, ex.id)).all();
    const productMap = new Map(allProducts.map((p) => [p.id, p]));

    const lineItems: {
      product_id: string;
      product: typeof products.$inferSelect;
      quantity: number;
      unit_price_cents: number;
      tax_rate: number;
      subtotal_cents: number;
    }[] = [];

    let subtotal = 0;
    let taxTotal = 0;

    for (const line of body.items) {
      const p = productMap.get(line.product_id);
      if (!p || p.isActive !== 1 || p.isOnline !== 1) {
        return c.json({ success: false, error: `Produit indisponible : ${line.product_id}` }, 400);
      }
      const qty = Math.max(1, Math.min(line.quantity, 999));
      if (p.stockQuantity < qty) {
        return c.json({ success: false, error: `Stock insuffisant pour ${p.name}` }, 400);
      }
      const lineSubtotal = p.priceCents * qty;
      const lineTax = Math.round(lineSubtotal * p.taxRate);
      subtotal += lineSubtotal;
      taxTotal += lineTax;
      lineItems.push({
        product_id: p.id,
        product: p,
        quantity: qty,
        unit_price_cents: p.priceCents,
        tax_rate: p.taxRate,
        subtotal_cents: lineSubtotal,
      });
    }

    // Shipping
    let shipping = ex.boutiqueShippingCents ?? 0;
    if (ex.boutiqueFreeShippingAboveCents && subtotal >= ex.boutiqueFreeShippingAboveCents) {
      shipping = 0;
    }

    const total = subtotal + taxTotal + shipping;
    const currency = ex.boutiqueCurrency || 'EUR';

    // Create the order in pending state
    const orderId = crypto.randomUUID();
    const orderNumber = generateOrderNumber();
    const now = Math.floor(Date.now() / 1000);

    db.insert(shopOrders).values({
      id: orderId,
      exhibitorId: ex.id,
      orderNumber,
      status: 'pending',
      customerUserId: userId,
      customerEmail: body.customer.email,
      customerFirstName: body.customer.first_name || null,
      customerLastName: body.customer.last_name || null,
      customerPhone: body.customer.phone || null,
      shippingAddressLine1: body.shipping.address_line1,
      shippingAddressLine2: body.shipping.address_line2 || null,
      shippingPostalCode: body.shipping.postal_code,
      shippingCity: body.shipping.city,
      shippingCountry: body.shipping.country || 'FR',
      billingAddressLine1: body.use_billing_same_as_shipping !== false ? body.shipping.address_line1 : body.billing?.address_line1 || null,
      billingAddressLine2: body.use_billing_same_as_shipping !== false ? body.shipping.address_line2 || null : body.billing?.address_line2 || null,
      billingPostalCode: body.use_billing_same_as_shipping !== false ? body.shipping.postal_code : body.billing?.postal_code || null,
      billingCity: body.use_billing_same_as_shipping !== false ? body.shipping.city : body.billing?.city || null,
      billingCountry: body.use_billing_same_as_shipping !== false ? (body.shipping.country || 'FR') : body.billing?.country || null,
      subtotalCents: subtotal,
      shippingCents: shipping,
      taxCents: taxTotal,
      totalCents: total,
      currency,
      paymentStatus: 'pending',
      paymentProvider: PAYMENT_PROVIDER_IN_USE,
      notes: body.notes || null,
      createdAt: now,
      updatedAt: now,
    }).run();

    for (const li of lineItems) {
      db.insert(shopOrderItems).values({
        id: crypto.randomUUID(),
        orderId,
        productId: li.product_id,
        productName: li.product.name,
        productSku: li.product.sku,
        unitPriceCents: li.unit_price_cents,
        quantity: li.quantity,
        taxRate: li.tax_rate,
        subtotalCents: li.subtotal_cents,
        createdAt: now,
      }).run();
    }

    // Create payment intent
    const intent = await createPaymentIntent({
      amount_cents: total,
      currency,
      order_id: orderId,
      customer_email: body.customer.email,
      metadata: { exhibitor_id: ex.id, order_number: orderNumber },
    });

    db.update(shopOrders)
      .set({ paymentIntentId: intent.id, paymentProvider: intent.provider, updatedAt: now })
      .where(eq(shopOrders.id, orderId))
      .run();

    return c.json({
      success: true,
      data: {
        order_id: orderId,
        order_number: orderNumber,
        total_cents: total,
        currency,
        payment: {
          provider: intent.provider,
          intent_id: intent.id,
          client_secret: intent.client_secret,
          status: intent.status,
        },
      },
    });
  } catch (error) {
    console.error('[shop] Checkout error:', error);
    return c.json({ success: false, error: 'Checkout failed' }, 500);
  }
});

// ─── POST /shop/orders/:id/confirm ────────────────────────────────────────
// Customer-side callback: verify payment and finalize the order.
// In mock mode this just flips the intent to "succeeded".
// In stripe mode this checks the actual intent status before marking paid.
shopRoutes.post('/orders/:id/confirm', async (c) => {
  try {
    const orderId = c.req.param('id');
    const order = db.select().from(shopOrders).where(eq(shopOrders.id, orderId)).get();
    if (!order) return c.json({ success: false, error: 'Order not found' }, 404);
    if (order.status !== 'pending') {
      return c.json({ success: true, data: formatOrder(order), already: true });
    }
    if (!order.paymentIntentId) return c.json({ success: false, error: 'No payment intent' }, 400);

    // Mock mode auto-confirms here. Stripe mode requires the intent to be succeeded already.
    let intent = order.paymentProvider === 'mock'
      ? confirmMockIntent(order.paymentIntentId)
      : await retrievePaymentIntent(order.paymentIntentId);

    if (!intent || intent.status !== 'succeeded') {
      return c.json({ success: false, error: 'Payment not confirmed', status: intent?.status }, 402);
    }

    const now = Math.floor(Date.now() / 1000);
    db.update(shopOrders)
      .set({
        status: 'paid',
        paymentStatus: 'succeeded',
        paidAt: now,
        updatedAt: now,
      })
      .where(eq(shopOrders.id, orderId))
      .run();

    // Decrement stock
    const items = db.select().from(shopOrderItems).where(eq(shopOrderItems.orderId, orderId)).all();
    for (const item of items) {
      if (!item.productId) continue;
      const p = db.select().from(products).where(eq(products.id, item.productId)).get();
      if (!p) continue;
      const newQty = Math.max(0, p.stockQuantity - item.quantity);
      db.update(products).set({ stockQuantity: newQty, updatedAt: now }).where(eq(products.id, p.id)).run();
    }

    // Notify the exhibitor
    const ex = db.select().from(exhibitorProfiles).where(eq(exhibitorProfiles.id, order.exhibitorId)).get();
    if (ex && ex.userId) {
      db.insert(notifications).values({
        id: crypto.randomUUID(),
        userId: ex.userId,
        title: 'Nouvelle commande',
        body: `Commande ${order.orderNumber} de ${(order.totalCents / 100).toFixed(2)} ${order.currency}`,
        link: '/exhibitor?tab=boutique',
        channel: 'in_app',
        createdAt: now,
      }).run();
    }

    const updated = db.select().from(shopOrders).where(eq(shopOrders.id, orderId)).get();
    return c.json({ success: true, data: formatOrder(updated!) });
  } catch (error) {
    console.error('[shop] Confirm order error:', error);
    return c.json({ success: false, error: 'Failed to confirm order' }, 500);
  }
});

// ─── GET /shop/orders/:id (public, by order number for tracking) ──────────
shopRoutes.get('/orders/by-number/:number', async (c) => {
  try {
    const num = c.req.param('number');
    const order = db.select().from(shopOrders).where(eq(shopOrders.orderNumber, num)).get();
    if (!order) return c.json({ success: false, error: 'Order not found' }, 404);

    const items = db.select().from(shopOrderItems).where(eq(shopOrderItems.orderId, order.id)).all();
    return c.json({
      success: true,
      data: {
        ...formatOrder(order),
        items: items.map(formatOrderItem),
      },
    });
  } catch (error) {
    console.error('[shop] Get order by number error:', error);
    return c.json({ success: false, error: 'Failed to fetch order' }, 500);
  }
});

// ─── GET /shop/my-orders (exhibitor side) ─────────────────────────────────
shopRoutes.get('/my-orders', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const ex = db.select().from(exhibitorProfiles).where(eq(exhibitorProfiles.userId, userId)).get();
    if (!ex) return c.json({ success: true, data: [] });

    const list = db
      .select()
      .from(shopOrders)
      .where(eq(shopOrders.exhibitorId, ex.id))
      .orderBy(desc(shopOrders.createdAt))
      .all();

    return c.json({ success: true, data: list.map(formatOrder) });
  } catch (error) {
    console.error('[shop] My orders error:', error);
    return c.json({ success: false, error: 'Failed to fetch orders' }, 500);
  }
});

// ─── GET /shop/my-orders/:id (with items) ─────────────────────────────────
shopRoutes.get('/my-orders/:id', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const orderId = c.req.param('id');

    const ex = db.select().from(exhibitorProfiles).where(eq(exhibitorProfiles.userId, userId)).get();
    if (!ex) return c.json({ success: false, error: 'Not found' }, 404);

    const order = db
      .select()
      .from(shopOrders)
      .where(and(eq(shopOrders.id, orderId), eq(shopOrders.exhibitorId, ex.id)))
      .get();
    if (!order) return c.json({ success: false, error: 'Not found' }, 404);

    const items = db.select().from(shopOrderItems).where(eq(shopOrderItems.orderId, order.id)).all();
    return c.json({
      success: true,
      data: { ...formatOrder(order), items: items.map(formatOrderItem) },
    });
  } catch (error) {
    console.error('[shop] My order detail error:', error);
    return c.json({ success: false, error: 'Failed to fetch order' }, 500);
  }
});

// ─── PUT /shop/my-orders/:id/status (exhibitor updates fulfillment) ───────
shopRoutes.put('/my-orders/:id/status', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const orderId = c.req.param('id');
    const body = await c.req.json();
    const next = body.status as string;

    const allowed = ['paid', 'fulfilled', 'shipped', 'delivered', 'cancelled', 'refunded'];
    if (!allowed.includes(next)) return c.json({ success: false, error: 'Invalid status' }, 400);

    const ex = db.select().from(exhibitorProfiles).where(eq(exhibitorProfiles.userId, userId)).get();
    if (!ex) return c.json({ success: false, error: 'Not found' }, 404);

    const order = db
      .select()
      .from(shopOrders)
      .where(and(eq(shopOrders.id, orderId), eq(shopOrders.exhibitorId, ex.id)))
      .get();
    if (!order) return c.json({ success: false, error: 'Not found' }, 404);

    const now = Math.floor(Date.now() / 1000);
    const update: Record<string, unknown> = { status: next, updatedAt: now };
    if (next === 'shipped') update.shippedAt = now;
    if (body.tracking_url !== undefined) update.trackingUrl = body.tracking_url;

    db.update(shopOrders).set(update).where(eq(shopOrders.id, orderId)).run();

    // Notify customer if they have an account
    if (order.customerUserId) {
      const labels: Record<string, string> = {
        paid: 'Commande confirmee',
        fulfilled: 'Commande preparee',
        shipped: 'Commande expediee',
        delivered: 'Commande livree',
        cancelled: 'Commande annulee',
        refunded: 'Commande remboursee',
      };
      db.insert(notifications).values({
        id: crypto.randomUUID(),
        userId: order.customerUserId,
        title: labels[next] || 'Mise a jour de commande',
        body: `Commande ${order.orderNumber}`,
        link: `/order/${order.orderNumber}`,
        channel: 'in_app',
        createdAt: now,
      }).run();
    }

    const updated = db.select().from(shopOrders).where(eq(shopOrders.id, orderId)).get();
    return c.json({ success: true, data: formatOrder(updated!) });
  } catch (error) {
    console.error('[shop] Update status error:', error);
    return c.json({ success: false, error: 'Failed to update status' }, 500);
  }
});

export { shopRoutes };
