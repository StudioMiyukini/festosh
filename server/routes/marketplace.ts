/**
 * Marketplace routes — public shop, cart/checkout, order management.
 * Multi-vendor marketplace where exhibitors sell products online.
 */

import { Hono } from 'hono';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { orders, orderItems, products, exhibitorProfiles } from '../db/schema.js';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
import { formatResponse } from '../lib/format.js';

export const marketplaceRoutes = new Hono();

// Helper: get exhibitor profile ID for current user
async function getExhibitorId(userId: string): Promise<string | null> {
  const p = db
    .select({ id: exhibitorProfiles.id })
    .from(exhibitorProfiles)
    .where(eq(exhibitorProfiles.userId, userId))
    .get();
  return p?.id ?? null;
}

// Helper: generate order number ORD-YYYYMMDD-XXXX
function generateOrderNumber(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `ORD-${datePart}-${rand}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC SHOP
// ═══════════════════════════════════════════════════════════════════════════

// GET /shop — list online products with exhibitor info
marketplaceRoutes.get('/shop', optionalAuth, async (c) => {
  try {
    const search = c.req.query('search');
    const category = c.req.query('category');
    const exhibitorId = c.req.query('exhibitor_id');
    const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 100);
    const offset = parseInt(c.req.query('offset') || '0', 10);

    // Build conditions: must be online and active
    const conditions: ReturnType<typeof eq>[] = [
      eq(products.isOnline, 1),
      eq(products.isActive, 1),
    ];

    if (category) {
      conditions.push(eq(products.categoryId, category));
    }
    if (exhibitorId) {
      conditions.push(eq(products.exhibitorId, exhibitorId));
    }

    let query = db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        sku: products.sku,
        imageUrl: products.imageUrl,
        priceCents: products.priceCents,
        taxRate: products.taxRate,
        stockQuantity: products.stockQuantity,
        categoryId: products.categoryId,
        weightGrams: products.weightGrams,
        exhibitorId: products.exhibitorId,
        companyName: exhibitorProfiles.companyName,
        exhibitorLogoUrl: exhibitorProfiles.logoUrl,
        createdAt: products.createdAt,
      })
      .from(products)
      .innerJoin(exhibitorProfiles, eq(products.exhibitorId, exhibitorProfiles.id))
      .where(and(...conditions))
      .orderBy(desc(products.createdAt))
      .limit(limit)
      .offset(offset);

    let rows = query.all();

    // Apply search filter in-memory (SQLite lacks good full-text on joined queries)
    if (search) {
      const term = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(term) ||
          (r.description && r.description.toLowerCase().includes(term)) ||
          (r.companyName && r.companyName.toLowerCase().includes(term)),
      );
    }

    // Count total matching products
    const countResult = db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(and(...conditions))
      .get();

    return c.json({
      success: true,
      data: rows.map((r) => formatResponse(r as Record<string, unknown>)),
      pagination: { limit, offset, total: countResult?.count ?? 0 },
    });
  } catch (error) {
    console.error('[marketplace] List shop products error:', error);
    return c.json({ success: false, error: 'Failed to list products' }, 500);
  }
});

// GET /shop/:productId — single product detail with exhibitor info
marketplaceRoutes.get('/shop/:productId', optionalAuth, async (c) => {
  try {
    const productId = c.req.param('productId');

    const row = db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        sku: products.sku,
        imageUrl: products.imageUrl,
        priceCents: products.priceCents,
        taxRate: products.taxRate,
        stockQuantity: products.stockQuantity,
        categoryId: products.categoryId,
        weightGrams: products.weightGrams,
        exhibitorId: products.exhibitorId,
        isOnline: products.isOnline,
        isActive: products.isActive,
        companyName: exhibitorProfiles.companyName,
        exhibitorLogoUrl: exhibitorProfiles.logoUrl,
        exhibitorDescription: exhibitorProfiles.description,
        exhibitorWebsite: exhibitorProfiles.website,
        createdAt: products.createdAt,
      })
      .from(products)
      .innerJoin(exhibitorProfiles, eq(products.exhibitorId, exhibitorProfiles.id))
      .where(
        and(
          eq(products.id, productId),
          eq(products.isOnline, 1),
          eq(products.isActive, 1),
        ),
      )
      .get();

    if (!row) {
      return c.json({ success: false, error: 'Product not found' }, 404);
    }

    return c.json({ success: true, data: formatResponse(row as Record<string, unknown>) });
  } catch (error) {
    console.error('[marketplace] Get product detail error:', error);
    return c.json({ success: false, error: 'Failed to get product' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// CART & CHECKOUT (auth required)
// ═══════════════════════════════════════════════════════════════════════════

// POST /checkout — create order from cart items
marketplaceRoutes.post('/checkout', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();

    const {
      items,
      buyer_email,
      buyer_name,
      shipping_address,
      payment_method,
    } = body as {
      items: { product_id: string; quantity: number }[];
      buyer_email: string;
      buyer_name?: string;
      shipping_address?: string;
      payment_method?: string;
    };

    // Validate input
    if (!items || !Array.isArray(items) || items.length === 0) {
      return c.json({ success: false, error: 'Items array is required and must not be empty' }, 400);
    }
    if (!buyer_email?.trim()) {
      return c.json({ success: false, error: 'buyer_email is required' }, 400);
    }

    // Validate each item
    for (const item of items) {
      if (!item.product_id || !item.quantity || item.quantity < 1) {
        return c.json({ success: false, error: 'Each item must have a valid product_id and quantity >= 1' }, 400);
      }
    }

    // Fetch all requested products
    const productIds = items.map((i) => i.product_id);
    const fetchedProducts = db
      .select()
      .from(products)
      .where(
        and(
          inArray(products.id, productIds),
          eq(products.isOnline, 1),
          eq(products.isActive, 1),
        ),
      )
      .all();

    const productMap = new Map(fetchedProducts.map((p) => [p.id, p]));

    // Validate stock and existence
    for (const item of items) {
      const product = productMap.get(item.product_id);
      if (!product) {
        return c.json({ success: false, error: `Product ${item.product_id} not found or not available` }, 400);
      }
      if (product.stockQuantity < item.quantity) {
        return c.json({
          success: false,
          error: `Insufficient stock for "${product.name}": requested ${item.quantity}, available ${product.stockQuantity}`,
        }, 400);
      }
    }

    // Compute totals
    let subtotalCents = 0;
    let taxCents = 0;
    const orderItemRows: {
      id: string;
      orderId: string;
      productId: string;
      exhibitorId: string;
      productName: string;
      quantity: number;
      unitPriceCents: number;
      totalCents: number;
      status: string;
    }[] = [];

    const orderId = crypto.randomUUID();
    const orderNumber = generateOrderNumber();

    for (const item of items) {
      const product = productMap.get(item.product_id)!;
      const lineSubtotal = product.priceCents * item.quantity;
      const lineTax = Math.round(lineSubtotal * product.taxRate);
      const lineTotal = lineSubtotal + lineTax;

      subtotalCents += lineSubtotal;
      taxCents += lineTax;

      orderItemRows.push({
        id: crypto.randomUUID(),
        orderId,
        productId: product.id,
        exhibitorId: product.exhibitorId,
        productName: product.name,
        quantity: item.quantity,
        unitPriceCents: product.priceCents,
        totalCents: lineTotal,
        status: 'pending',
      });
    }

    const totalCents = subtotalCents + taxCents;

    // Execute in a transaction: create order, items, decrement stock
    db.transaction((tx) => {
      // Create the order
      tx.insert(orders).values({
        id: orderId,
        orderNumber,
        buyerId: userId,
        buyerEmail: buyer_email.trim(),
        buyerName: buyer_name?.trim() || null,
        subtotalCents,
        shippingCents: 0,
        taxCents,
        totalCents,
        status: 'pending',
        paymentStatus: 'unpaid',
        paymentMethod: payment_method || null,
        shippingAddress: shipping_address || null,
      }).run();

      // Create order items
      for (const oi of orderItemRows) {
        tx.insert(orderItems).values(oi).run();
      }

      // Decrement stock for each product
      for (const item of items) {
        tx.update(products)
          .set({
            stockQuantity: sql`${products.stockQuantity} - ${item.quantity}`,
            updatedAt: Math.floor(Date.now() / 1000),
          })
          .where(eq(products.id, item.product_id))
          .run();
      }
    });

    // Fetch the created order with items
    const createdOrder = db.select().from(orders).where(eq(orders.id, orderId)).get();
    const createdItems = db.select().from(orderItems).where(eq(orderItems.orderId, orderId)).all();

    return c.json({
      success: true,
      data: {
        ...formatResponse(createdOrder as Record<string, unknown>),
        items: createdItems.map((i) => formatResponse(i as Record<string, unknown>)),
      },
    }, 201);
  } catch (error) {
    console.error('[marketplace] Checkout error:', error);
    return c.json({ success: false, error: 'Failed to process checkout' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ORDER MANAGEMENT (auth required)
// ═══════════════════════════════════════════════════════════════════════════

// GET /my-orders — list buyer's orders
marketplaceRoutes.get('/my-orders', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');

    const rows = db
      .select()
      .from(orders)
      .where(eq(orders.buyerId, userId))
      .orderBy(desc(orders.createdAt))
      .all();

    // Fetch items for each order
    const data = rows.map((order) => {
      const items = db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id))
        .all();

      return {
        ...formatResponse(order as Record<string, unknown>),
        items: items.map((i) => formatResponse(i as Record<string, unknown>)),
      };
    });

    return c.json({ success: true, data });
  } catch (error) {
    console.error('[marketplace] List my orders error:', error);
    return c.json({ success: false, error: 'Failed to list orders' }, 500);
  }
});

// GET /orders/:id — get single order with items
marketplaceRoutes.get('/orders/:id', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const orderId = c.req.param('id');

    const order = db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.buyerId, userId)))
      .get();

    if (!order) {
      return c.json({ success: false, error: 'Order not found' }, 404);
    }

    const items = db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId))
      .all();

    return c.json({
      success: true,
      data: {
        ...formatResponse(order as Record<string, unknown>),
        items: items.map((i) => formatResponse(i as Record<string, unknown>)),
      },
    });
  } catch (error) {
    console.error('[marketplace] Get order error:', error);
    return c.json({ success: false, error: 'Failed to get order' }, 500);
  }
});

// GET /seller-orders — list orders containing items sold by current user's exhibitor profile
marketplaceRoutes.get('/seller-orders', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const exId = await getExhibitorId(userId);

    if (!exId) {
      return c.json({ success: false, error: 'Exhibitor profile required' }, 403);
    }

    // Find all order items belonging to this exhibitor
    const sellerItems = db
      .select()
      .from(orderItems)
      .where(eq(orderItems.exhibitorId, exId))
      .orderBy(desc(orderItems.createdAt))
      .all();

    if (sellerItems.length === 0) {
      return c.json({ success: true, data: [] });
    }

    // Get unique order IDs
    const orderIds = [...new Set(sellerItems.map((i) => i.orderId))];

    // Fetch those orders
    const sellerOrders = db
      .select()
      .from(orders)
      .where(inArray(orders.id, orderIds))
      .orderBy(desc(orders.createdAt))
      .all();

    // Group items by order
    const itemsByOrder = new Map<string, typeof sellerItems>();
    for (const item of sellerItems) {
      const existing = itemsByOrder.get(item.orderId) || [];
      existing.push(item);
      itemsByOrder.set(item.orderId, existing);
    }

    const data = sellerOrders.map((order) => {
      const items = itemsByOrder.get(order.id) || [];
      return {
        ...formatResponse(order as Record<string, unknown>),
        items: items.map((i) => formatResponse(i as Record<string, unknown>)),
      };
    });

    return c.json({ success: true, data });
  } catch (error) {
    console.error('[marketplace] List seller orders error:', error);
    return c.json({ success: false, error: 'Failed to list seller orders' }, 500);
  }
});

// PUT /orders/:id/status — update order status
marketplaceRoutes.put('/orders/:id/status', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const orderId = c.req.param('id');
    const body = await c.req.json();
    const { status } = body as { status: string };

    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return c.json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      }, 400);
    }

    // Check the user owns this order (buyer) or is a seller with items in it
    const order = db.select().from(orders).where(eq(orders.id, orderId)).get();
    if (!order) {
      return c.json({ success: false, error: 'Order not found' }, 404);
    }

    const isBuyer = order.buyerId === userId;

    // Check if user is a seller for this order
    let isSeller = false;
    if (!isBuyer) {
      const exId = await getExhibitorId(userId);
      if (exId) {
        const sellerItem = db
          .select({ id: orderItems.id })
          .from(orderItems)
          .where(and(eq(orderItems.orderId, orderId), eq(orderItems.exhibitorId, exId)))
          .get();
        isSeller = !!sellerItem;
      }
    }

    if (!isBuyer && !isSeller) {
      return c.json({ success: false, error: 'Not authorized to update this order' }, 403);
    }

    db.update(orders)
      .set({ status, updatedAt: Math.floor(Date.now() / 1000) })
      .where(eq(orders.id, orderId))
      .run();

    const updated = db.select().from(orders).where(eq(orders.id, orderId)).get();
    return c.json({ success: true, data: formatResponse(updated as Record<string, unknown>) });
  } catch (error) {
    console.error('[marketplace] Update order status error:', error);
    return c.json({ success: false, error: 'Failed to update order status' }, 500);
  }
});

// PUT /order-items/:id/status — update per-vendor item status
marketplaceRoutes.put('/order-items/:id/status', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const itemId = c.req.param('id');
    const body = await c.req.json();
    const { status } = body as { status: string };

    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return c.json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      }, 400);
    }

    // Fetch the order item
    const item = db.select().from(orderItems).where(eq(orderItems.id, itemId)).get();
    if (!item) {
      return c.json({ success: false, error: 'Order item not found' }, 404);
    }

    // Verify the user is the exhibitor (seller) for this item
    const exId = await getExhibitorId(userId);
    if (!exId || exId !== item.exhibitorId) {
      // Also allow the buyer to update item status
      const order = db.select().from(orders).where(eq(orders.id, item.orderId)).get();
      if (!order || order.buyerId !== userId) {
        return c.json({ success: false, error: 'Not authorized to update this item status' }, 403);
      }
    }

    db.update(orderItems)
      .set({ status })
      .where(eq(orderItems.id, itemId))
      .run();

    const updated = db.select().from(orderItems).where(eq(orderItems.id, itemId)).get();
    return c.json({ success: true, data: formatResponse(updated as Record<string, unknown>) });
  } catch (error) {
    console.error('[marketplace] Update order item status error:', error);
    return c.json({ success: false, error: 'Failed to update item status' }, 500);
  }
});
