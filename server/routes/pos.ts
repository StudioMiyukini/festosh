/**
 * POS routes — products, categories, coupons, sales, expenses, accounting.
 */

import { Hono } from 'hono';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import crypto from 'crypto';
import { db, sqlite } from '../db/index.js';
import {
  exhibitorProfiles,
  productCategories,
  products,
  coupons,
  sales,
  saleItems,
  exhibitorExpenses,
} from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { formatResponse } from '../lib/format.js';

const posRoutes = new Hono();
posRoutes.use('*', authMiddleware);

// Helper: get exhibitor profile ID for current user
async function getExhibitorId(userId: string): Promise<string | null> {
  const p = db.select({ id: exhibitorProfiles.id }).from(exhibitorProfiles).where(eq(exhibitorProfiles.userId, userId)).get();
  return p?.id ?? null;
}

function requireExhibitor(exhibitorId: string | null, c: any) {
  if (!exhibitorId) return c.json({ success: false, error: 'Exhibitor profile required' }, 403);
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCT CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════

posRoutes.get('/categories', async (c) => {
  try {
    const exId = await getExhibitorId(c.get('userId'));
    const err = requireExhibitor(exId, c);
    if (err) return err;

    const cats = db.select().from(productCategories).where(eq(productCategories.exhibitorId, exId!)).orderBy(productCategories.sortOrder).all();
    return c.json({ success: true, data: cats.map((r) => formatResponse(r)) });
  } catch (error) {
    console.error('[pos] List categories error:', error);
    return c.json({ success: false, error: 'Failed to list categories' }, 500);
  }
});

posRoutes.post('/categories', async (c) => {
  try {
    const exId = await getExhibitorId(c.get('userId'));
    const err = requireExhibitor(exId, c);
    if (err) return err;
    const body = await c.req.json();

    if (!body.name?.trim()) return c.json({ success: false, error: 'Name required' }, 400);

    const id = crypto.randomUUID();
    db.insert(productCategories).values({
      id, exhibitorId: exId!, name: body.name.trim(), color: body.color || '#6366f1', sortOrder: body.sort_order ?? 0,
    }).run();

    const cat = db.select().from(productCategories).where(eq(productCategories.id, id)).get();
    return c.json({ success: true, data: cat ? formatResponse(cat) : null }, 201);
  } catch (error) {
    console.error('[pos] Create category error:', error);
    return c.json({ success: false, error: 'Failed to create category' }, 500);
  }
});

posRoutes.put('/categories/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const exId = await getExhibitorId(c.get('userId'));
    const err = requireExhibitor(exId, c);
    if (err) return err;

    const cat = db.select().from(productCategories).where(and(eq(productCategories.id, id), eq(productCategories.exhibitorId, exId!))).get();
    if (!cat) return c.json({ success: false, error: 'Category not found' }, 404);

    const update: Record<string, unknown> = {};
    if (body.name !== undefined) update.name = body.name.trim();
    if (body.color !== undefined) update.color = body.color;
    if (body.sort_order !== undefined) update.sortOrder = body.sort_order;

    db.update(productCategories).set(update).where(eq(productCategories.id, id)).run();
    const updated = db.select().from(productCategories).where(eq(productCategories.id, id)).get();
    return c.json({ success: true, data: updated ? formatResponse(updated) : null });
  } catch (error) {
    console.error('[pos] Update category error:', error);
    return c.json({ success: false, error: 'Failed to update category' }, 500);
  }
});

posRoutes.delete('/categories/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const exId = await getExhibitorId(c.get('userId'));
    const err = requireExhibitor(exId, c);
    if (err) return err;

    db.delete(productCategories).where(and(eq(productCategories.id, id), eq(productCategories.exhibitorId, exId!))).run();
    return c.json({ success: true, data: { message: 'Deleted' } });
  } catch (error) {
    console.error('[pos] Delete category error:', error);
    return c.json({ success: false, error: 'Failed to delete category' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCTS
// ═══════════════════════════════════════════════════════════════════════════

posRoutes.get('/products', async (c) => {
  try {
    const exId = await getExhibitorId(c.get('userId'));
    const err = requireExhibitor(exId, c);
    if (err) return err;

    const prods = db.select().from(products).where(eq(products.exhibitorId, exId!)).orderBy(products.sortOrder).all();
    return c.json({ success: true, data: prods.map((r) => formatResponse(r)) });
  } catch (error) {
    console.error('[pos] List products error:', error);
    return c.json({ success: false, error: 'Failed to list products' }, 500);
  }
});

posRoutes.post('/products', async (c) => {
  try {
    const exId = await getExhibitorId(c.get('userId'));
    const err = requireExhibitor(exId, c);
    if (err) return err;
    const body = await c.req.json();

    if (!body.name?.trim()) return c.json({ success: false, error: 'Name required' }, 400);
    if (body.price_cents === undefined) return c.json({ success: false, error: 'Price required' }, 400);

    const now = Math.floor(Date.now() / 1000);
    const id = crypto.randomUUID();

    db.insert(products).values({
      id,
      exhibitorId: exId!,
      categoryId: body.category_id || null,
      name: body.name.trim(),
      description: body.description || null,
      sku: body.sku || null,
      imageUrl: body.image_url || null,
      priceCents: body.price_cents,
      costCents: body.cost_cents || 0,
      taxRate: body.tax_rate ?? 0,
      stockQuantity: body.stock_quantity ?? 0,
      stockAlertThreshold: body.stock_alert_threshold ?? 5,
      isActive: body.is_active ?? 1,
      isOnline: body.is_online ?? 0,
      weightGrams: body.weight_grams || null,
      sortOrder: body.sort_order ?? 0,
      galleryUrls: JSON.stringify(body.gallery_urls || []),
      onlineDescription: body.online_description || null,
      onlineSortOrder: body.online_sort_order ?? 0,
      slug: body.slug || null,
      createdAt: now,
      updatedAt: now,
    }).run();

    const prod = db.select().from(products).where(eq(products.id, id)).get();
    return c.json({ success: true, data: prod ? formatResponse(prod) : null }, 201);
  } catch (error) {
    console.error('[pos] Create product error:', error);
    return c.json({ success: false, error: 'Failed to create product' }, 500);
  }
});

posRoutes.put('/products/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const exId = await getExhibitorId(c.get('userId'));
    const err = requireExhibitor(exId, c);
    if (err) return err;
    const body = await c.req.json();

    const prod = db.select().from(products).where(and(eq(products.id, id), eq(products.exhibitorId, exId!))).get();
    if (!prod) return c.json({ success: false, error: 'Product not found' }, 404);

    const keyMap: Record<string, string> = {
      name: 'name', description: 'description', sku: 'sku', image_url: 'imageUrl',
      category_id: 'categoryId', price_cents: 'priceCents', cost_cents: 'costCents',
      tax_rate: 'taxRate', stock_quantity: 'stockQuantity', stock_alert_threshold: 'stockAlertThreshold',
      is_active: 'isActive', is_online: 'isOnline', weight_grams: 'weightGrams', sort_order: 'sortOrder',
      online_description: 'onlineDescription', online_sort_order: 'onlineSortOrder', slug: 'slug',
    };

    const update: Record<string, unknown> = { updatedAt: Math.floor(Date.now() / 1000) };
    for (const [bk, sk] of Object.entries(keyMap)) {
      if (body[bk] !== undefined) update[sk] = body[bk];
    }
    if (body.gallery_urls !== undefined) {
      update.galleryUrls = JSON.stringify(body.gallery_urls);
    }

    db.update(products).set(update).where(eq(products.id, id)).run();
    const updated = db.select().from(products).where(eq(products.id, id)).get();
    return c.json({ success: true, data: updated ? formatResponse(updated) : null });
  } catch (error) {
    console.error('[pos] Update product error:', error);
    return c.json({ success: false, error: 'Failed to update product' }, 500);
  }
});

posRoutes.delete('/products/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const exId = await getExhibitorId(c.get('userId'));
    const err = requireExhibitor(exId, c);
    if (err) return err;

    db.delete(products).where(and(eq(products.id, id), eq(products.exhibitorId, exId!))).run();
    return c.json({ success: true, data: { message: 'Deleted' } });
  } catch (error) {
    console.error('[pos] Delete product error:', error);
    return c.json({ success: false, error: 'Failed to delete product' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// COUPONS
// ═══════════════════════════════════════════════════════════════════════════

posRoutes.get('/coupons', async (c) => {
  try {
    const exId = await getExhibitorId(c.get('userId'));
    const err = requireExhibitor(exId, c);
    if (err) return err;

    const list = db.select().from(coupons).where(eq(coupons.exhibitorId, exId!)).orderBy(desc(coupons.createdAt)).all();
    return c.json({ success: true, data: list.map((r) => formatResponse(r)) });
  } catch (error) {
    console.error('[pos] List coupons error:', error);
    return c.json({ success: false, error: 'Failed to list coupons' }, 500);
  }
});

posRoutes.post('/coupons', async (c) => {
  try {
    const exId = await getExhibitorId(c.get('userId'));
    const err = requireExhibitor(exId, c);
    if (err) return err;
    const body = await c.req.json();

    if (!body.code?.trim()) return c.json({ success: false, error: 'Code required' }, 400);
    if (!['percentage', 'fixed'].includes(body.discount_type || '')) return c.json({ success: false, error: 'discount_type must be percentage or fixed' }, 400);

    const id = crypto.randomUUID();
    db.insert(coupons).values({
      id, exhibitorId: exId!, code: body.code.trim().toUpperCase(),
      label: body.label || null, discountType: body.discount_type, discountValue: body.discount_value || 0,
      minAmountCents: body.min_amount_cents || 0, maxUses: body.max_uses || null,
      validFrom: body.valid_from || null, validUntil: body.valid_until || null,
    }).run();

    const coupon = db.select().from(coupons).where(eq(coupons.id, id)).get();
    return c.json({ success: true, data: coupon ? formatResponse(coupon) : null }, 201);
  } catch (error) {
    console.error('[pos] Create coupon error:', error);
    return c.json({ success: false, error: 'Failed to create coupon' }, 500);
  }
});

posRoutes.put('/coupons/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const exId = await getExhibitorId(c.get('userId'));
    const err = requireExhibitor(exId, c);
    if (err) return err;
    const body = await c.req.json();

    const coupon = db.select().from(coupons).where(and(eq(coupons.id, id), eq(coupons.exhibitorId, exId!))).get();
    if (!coupon) return c.json({ success: false, error: 'Coupon not found' }, 404);

    const keyMap: Record<string, string> = {
      code: 'code', label: 'label', discount_type: 'discountType', discount_value: 'discountValue',
      min_amount_cents: 'minAmountCents', max_uses: 'maxUses', valid_from: 'validFrom',
      valid_until: 'validUntil', is_active: 'isActive',
    };
    const update: Record<string, unknown> = {};
    for (const [bk, sk] of Object.entries(keyMap)) {
      if (body[bk] !== undefined) update[sk] = bk === 'code' ? String(body[bk]).toUpperCase() : body[bk];
    }

    db.update(coupons).set(update).where(eq(coupons.id, id)).run();
    const updated = db.select().from(coupons).where(eq(coupons.id, id)).get();
    return c.json({ success: true, data: updated ? formatResponse(updated) : null });
  } catch (error) {
    console.error('[pos] Update coupon error:', error);
    return c.json({ success: false, error: 'Failed to update coupon' }, 500);
  }
});

posRoutes.delete('/coupons/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const exId = await getExhibitorId(c.get('userId'));
    const err = requireExhibitor(exId, c);
    if (err) return err;

    db.delete(coupons).where(and(eq(coupons.id, id), eq(coupons.exhibitorId, exId!))).run();
    return c.json({ success: true, data: { message: 'Deleted' } });
  } catch (error) {
    console.error('[pos] Delete coupon error:', error);
    return c.json({ success: false, error: 'Failed to delete coupon' }, 500);
  }
});

// Validate a coupon code (for POS checkout)
posRoutes.post('/coupons/validate', async (c) => {
  try {
    const exId = await getExhibitorId(c.get('userId'));
    const err = requireExhibitor(exId, c);
    if (err) return err;
    const body = await c.req.json();

    const code = body.code?.trim().toUpperCase();
    if (!code) return c.json({ success: false, error: 'Code required' }, 400);

    const coupon = db.select().from(coupons).where(and(eq(coupons.exhibitorId, exId!), eq(coupons.code, code), eq(coupons.isActive, 1))).get();
    if (!coupon) return c.json({ success: false, error: 'Code invalide' }, 404);

    const now = Math.floor(Date.now() / 1000);
    if (coupon.validFrom && now < coupon.validFrom) return c.json({ success: false, error: 'Coupon pas encore valide' }, 400);
    if (coupon.validUntil && now > coupon.validUntil) return c.json({ success: false, error: 'Coupon expire' }, 400);
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) return c.json({ success: false, error: 'Coupon epuise' }, 400);

    return c.json({ success: true, data: formatResponse(coupon) });
  } catch (error) {
    console.error('[pos] Validate coupon error:', error);
    return c.json({ success: false, error: 'Failed to validate coupon' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SALES (POS CHECKOUT)
// ═══════════════════════════════════════════════════════════════════════════

posRoutes.post('/sales', async (c) => {
  try {
    const exId = await getExhibitorId(c.get('userId'));
    const err = requireExhibitor(exId, c);
    if (err) return err;
    const body = await c.req.json();

    const items: { product_id: string; quantity: number; unit_price_cents: number }[] = body.items || [];
    if (items.length === 0) return c.json({ success: false, error: 'At least one item required' }, 400);

    const now = Math.floor(Date.now() / 1000);

    // Get next sale number
    const lastSale = db.select({ saleNumber: sales.saleNumber }).from(sales)
      .where(eq(sales.exhibitorId, exId!)).orderBy(desc(sales.saleNumber)).limit(1).get();
    const saleNumber = (lastSale?.saleNumber ?? 0) + 1;

    // Calculate totals
    let subtotal = 0;
    let totalTax = 0;
    const resolvedItems: {
      productId: string; productName: string; quantity: number;
      unitPriceCents: number; discountCents: number; taxCents: number; totalCents: number;
    }[] = [];

    for (const item of items) {
      const prod = db.select().from(products).where(and(eq(products.id, item.product_id), eq(products.exhibitorId, exId!))).get();
      if (!prod) return c.json({ success: false, error: `Product ${item.product_id} not found` }, 404);

      const qty = item.quantity || 1;
      const unitPrice = item.unit_price_cents ?? prod.priceCents;
      const lineSubtotal = unitPrice * qty;
      const lineTax = Math.round(lineSubtotal * (prod.taxRate || 0));

      subtotal += lineSubtotal;
      totalTax += lineTax;

      resolvedItems.push({
        productId: prod.id, productName: prod.name, quantity: qty,
        unitPriceCents: unitPrice, discountCents: 0, taxCents: lineTax, totalCents: lineSubtotal + lineTax,
      });

      // Decrement stock
      db.update(products).set({ stockQuantity: Math.max(0, prod.stockQuantity - qty) }).where(eq(products.id, prod.id)).run();
    }

    // Apply coupon
    let discountCents = 0;
    let couponId: string | null = null;
    if (body.coupon_id) {
      const coupon = db.select().from(coupons).where(and(eq(coupons.id, body.coupon_id), eq(coupons.exhibitorId, exId!))).get();
      if (coupon && coupon.isActive) {
        if (coupon.discountType === 'percentage') {
          discountCents = Math.round(subtotal * (coupon.discountValue / 100));
        } else {
          discountCents = Math.round(coupon.discountValue * 100);
        }
        couponId = coupon.id;
        // Increment used count
        db.update(coupons).set({ usedCount: coupon.usedCount + 1 }).where(eq(coupons.id, coupon.id)).run();
      }
    }

    const total = subtotal - discountCents + totalTax;

    // Create sale
    const saleId = crypto.randomUUID();
    db.insert(sales).values({
      id: saleId, exhibitorId: exId!, editionId: body.edition_id || null,
      saleNumber, subtotalCents: subtotal, discountCents, taxCents: totalTax, totalCents: total,
      paymentMethod: body.payment_method || 'cash', couponId, customerName: body.customer_name || null,
      notes: body.notes || null, createdAt: now,
    }).run();

    // Create sale items
    for (const item of resolvedItems) {
      db.insert(saleItems).values({
        id: crypto.randomUUID(), saleId, productId: item.productId, productName: item.productName,
        quantity: item.quantity, unitPriceCents: item.unitPriceCents, discountCents: item.discountCents,
        taxCents: item.taxCents, totalCents: item.totalCents,
      }).run();
    }

    return c.json({
      success: true,
      data: {
        id: saleId, sale_number: saleNumber, subtotal_cents: subtotal,
        discount_cents: discountCents, tax_cents: totalTax, total_cents: total,
        payment_method: body.payment_method || 'cash', items_count: resolvedItems.length, created_at: now,
      },
    }, 201);
  } catch (error) {
    console.error('[pos] Create sale error:', error);
    return c.json({ success: false, error: 'Failed to create sale' }, 500);
  }
});

posRoutes.get('/sales', async (c) => {
  try {
    const exId = await getExhibitorId(c.get('userId'));
    const err = requireExhibitor(exId, c);
    if (err) return err;

    const editionId = c.req.query('edition_id');
    const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 200);
    const offset = parseInt(c.req.query('offset') || '0', 10);

    const conditions = [eq(sales.exhibitorId, exId!)];
    if (editionId) conditions.push(eq(sales.editionId, editionId));

    const list = db.select().from(sales).where(and(...conditions)).orderBy(desc(sales.createdAt)).limit(limit).offset(offset).all();

    return c.json({ success: true, data: list.map((r) => formatResponse(r)) });
  } catch (error) {
    console.error('[pos] List sales error:', error);
    return c.json({ success: false, error: 'Failed to list sales' }, 500);
  }
});

posRoutes.get('/sales/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const exId = await getExhibitorId(c.get('userId'));
    const err = requireExhibitor(exId, c);
    if (err) return err;

    const sale = db.select().from(sales).where(and(eq(sales.id, id), eq(sales.exhibitorId, exId!))).get();
    if (!sale) return c.json({ success: false, error: 'Sale not found' }, 404);

    const items = db.select().from(saleItems).where(eq(saleItems.saleId, id)).all();

    return c.json({
      success: true,
      data: { ...formatResponse(sale), items: items.map((i) => formatResponse(i)) },
    });
  } catch (error) {
    console.error('[pos] Get sale error:', error);
    return c.json({ success: false, error: 'Failed to get sale' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// EXPENSES
// ═══════════════════════════════════════════════════════════════════════════

posRoutes.get('/expenses', async (c) => {
  try {
    const exId = await getExhibitorId(c.get('userId'));
    const err = requireExhibitor(exId, c);
    if (err) return err;

    const editionId = c.req.query('edition_id');
    const conditions = [eq(exhibitorExpenses.exhibitorId, exId!)];
    if (editionId) conditions.push(eq(exhibitorExpenses.editionId, editionId));

    const list = db.select().from(exhibitorExpenses).where(and(...conditions)).orderBy(desc(exhibitorExpenses.createdAt)).all();
    return c.json({ success: true, data: list.map((r) => formatResponse(r)) });
  } catch (error) {
    console.error('[pos] List expenses error:', error);
    return c.json({ success: false, error: 'Failed to list expenses' }, 500);
  }
});

posRoutes.post('/expenses', async (c) => {
  try {
    const exId = await getExhibitorId(c.get('userId'));
    const err = requireExhibitor(exId, c);
    if (err) return err;
    const body = await c.req.json();

    if (!body.label?.trim() || body.amount_cents === undefined) {
      return c.json({ success: false, error: 'label and amount_cents required' }, 400);
    }

    const id = crypto.randomUUID();
    db.insert(exhibitorExpenses).values({
      id, exhibitorId: exId!, editionId: body.edition_id || null,
      category: body.category || 'other', label: body.label.trim(),
      amountCents: body.amount_cents, date: body.date || null, notes: body.notes || null,
    }).run();

    const exp = db.select().from(exhibitorExpenses).where(eq(exhibitorExpenses.id, id)).get();
    return c.json({ success: true, data: exp ? formatResponse(exp) : null }, 201);
  } catch (error) {
    console.error('[pos] Create expense error:', error);
    return c.json({ success: false, error: 'Failed to create expense' }, 500);
  }
});

posRoutes.delete('/expenses/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const exId = await getExhibitorId(c.get('userId'));
    const err = requireExhibitor(exId, c);
    if (err) return err;

    db.delete(exhibitorExpenses).where(and(eq(exhibitorExpenses.id, id), eq(exhibitorExpenses.exhibitorId, exId!))).run();
    return c.json({ success: true, data: { message: 'Deleted' } });
  } catch (error) {
    console.error('[pos] Delete expense error:', error);
    return c.json({ success: false, error: 'Failed to delete expense' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ACCOUNTING / DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Aggregate dashboard for an exhibitor's POS activity.
 *
 * Previous implementation pulled the full sales, sale_items, products and
 * expenses tables into JS and aggregated client-side, with an N+1 lookup on
 * products.cost_cents for each sale item. With non-trivial sales volume that
 * burned multiple seconds per dashboard load. This version pushes every
 * aggregate into SQLite — one round-trip per metric, all using indexed
 * columns. Tested as a faithful drop-in: every field in the JSON response
 * matches the previous shape.
 */
posRoutes.get('/accounting', async (c) => {
  try {
    const exId = await getExhibitorId(c.get('userId'));
    const err = requireExhibitor(exId, c);
    if (err) return err;

    const editionId = c.req.query('edition_id');
    const editionFilter = editionId ? sql`AND s.edition_id = ${editionId}` : sql``;
    const expEditionFilter = editionId ? sql`AND e.edition_id = ${editionId}` : sql``;

    // 1) Revenue + sales count + tax + discount aggregates in one row.
    const revenueRow = sqlite.prepare(`
      SELECT
        COALESCE(SUM(total_cents), 0)    AS total,
        COALESCE(SUM(tax_cents), 0)      AS tax,
        COALESCE(SUM(discount_cents), 0) AS discount,
        COUNT(*)                         AS sales_count
      FROM sales s
      WHERE s.exhibitor_id = ?
      ${editionId ? 'AND s.edition_id = ?' : ''}
    `).get(...(editionId ? [exId!, editionId] : [exId!])) as
      { total: number; tax: number; discount: number; sales_count: number };

    const totalRevenue = revenueRow.total;
    const totalTax = revenueRow.tax;
    const totalDiscount = revenueRow.discount;
    const salesCount = revenueRow.sales_count;

    // 2) COGS — single JOIN, one query.
    const cogsRow = sqlite.prepare(`
      SELECT COALESCE(SUM(si.quantity * p.cost_cents), 0) AS cogs
      FROM sale_items si
      INNER JOIN sales s ON s.id = si.sale_id
      INNER JOIN products p ON p.id = si.product_id
      WHERE s.exhibitor_id = ?
      ${editionId ? 'AND s.edition_id = ?' : ''}
    `).get(...(editionId ? [exId!, editionId] : [exId!])) as { cogs: number };

    const totalCogs = cogsRow.cogs;

    // 3) Expenses aggregate + per-category breakdown.
    const expensesRow = sqlite.prepare(`
      SELECT COALESCE(SUM(amount_cents), 0) AS total
      FROM exhibitor_expenses e
      WHERE e.exhibitor_id = ?
      ${editionId ? 'AND e.edition_id = ?' : ''}
    `).get(...(editionId ? [exId!, editionId] : [exId!])) as { total: number };
    const totalExpenses = expensesRow.total;

    const expensesByCategoryRows = sqlite.prepare(`
      SELECT COALESCE(category, 'other') AS category,
             COALESCE(SUM(amount_cents), 0) AS total
      FROM exhibitor_expenses e
      WHERE e.exhibitor_id = ?
      ${editionId ? 'AND e.edition_id = ?' : ''}
      GROUP BY category
    `).all(...(editionId ? [exId!, editionId] : [exId!])) as { category: string; total: number }[];
    const expensesByCategory: Record<string, number> = {};
    for (const row of expensesByCategoryRows) expensesByCategory[row.category] = row.total;

    // 4) Stock aggregates — single row.
    const stockRow = sqlite.prepare(`
      SELECT
        COALESCE(SUM(price_cents * stock_quantity), 0) AS value,
        COALESCE(SUM(cost_cents  * stock_quantity), 0) AS cost,
        COUNT(*)                                       AS product_count,
        COALESCE(SUM(CASE WHEN is_active = 1 AND stock_quantity <= COALESCE(stock_alert_threshold, 5) THEN 1 ELSE 0 END), 0) AS low_stock
      FROM products
      WHERE exhibitor_id = ?
    `).get(exId!) as { value: number; cost: number; product_count: number; low_stock: number };

    const stockValue = stockRow.value;
    const stockCost = stockRow.cost;
    const lowStockCount = stockRow.low_stock;
    const productCount = stockRow.product_count;

    // 5) Sales by payment method — GROUP BY.
    const byPaymentRows = sqlite.prepare(`
      SELECT COALESCE(payment_method, 'cash') AS method,
             COUNT(*) AS count,
             COALESCE(SUM(total_cents), 0) AS total
      FROM sales s
      WHERE s.exhibitor_id = ?
      ${editionId ? 'AND s.edition_id = ?' : ''}
      GROUP BY COALESCE(payment_method, 'cash')
    `).all(...(editionId ? [exId!, editionId] : [exId!])) as { method: string; count: number; total: number }[];
    const byPayment: Record<string, { count: number; total: number }> = {};
    for (const row of byPaymentRows) byPayment[row.method] = { count: row.count, total: row.total };

    // 6) Daily revenue — GROUP BY date(created_at).
    const dailyRows = sqlite.prepare(`
      SELECT date(created_at, 'unixepoch') AS day,
             COALESCE(SUM(total_cents), 0) AS total
      FROM sales s
      WHERE s.exhibitor_id = ?
      ${editionId ? 'AND s.edition_id = ?' : ''}
      GROUP BY day
    `).all(...(editionId ? [exId!, editionId] : [exId!])) as { day: string; total: number }[];
    const dailyRevenue: Record<string, number> = {};
    for (const row of dailyRows) dailyRevenue[row.day] = row.total;

    // ─── Derived metrics ─────────────────────────────────────────────────
    const totalCosts = totalCogs + totalExpenses;
    const grossProfit = totalRevenue - totalTax - totalCogs;
    const netProfit = grossProfit - totalExpenses;

    const revenueExTax = totalRevenue - totalTax;
    const breakEvenRemaining = Math.max(0, totalCosts - revenueExTax);
    const avgMargin = revenueExTax > 0 ? ((revenueExTax - totalCogs) / revenueExTax) * 100 : 0;
    const avgSale = salesCount > 0 ? Math.round(totalRevenue / salesCount) : 0;
    const breakEvenSales = avgSale > 0 ? Math.ceil(breakEvenRemaining / avgSale) : 0;

    // Silence unused-vars warnings — the `sql` filters were prepped above but
    // we ended up inlining the conditional via the JS ternary, which is the
    // simplest path with raw prepared statements.
    void editionFilter; void expEditionFilter;

    return c.json({
      success: true,
      data: {
        revenue: { total_cents: totalRevenue, tax_cents: totalTax, discount_cents: totalDiscount, sales_count: salesCount, avg_sale_cents: avgSale },
        costs: { cogs_cents: totalCogs, expenses_cents: totalExpenses, total_cents: totalCosts },
        profit: { gross_cents: grossProfit, net_cents: netProfit, margin_percent: Math.round(avgMargin * 10) / 10 },
        break_even: { remaining_cents: breakEvenRemaining, remaining_sales: breakEvenSales, is_profitable: netProfit >= 0 },
        stock: { total_value_cents: stockValue, total_cost_cents: stockCost, low_stock_count: lowStockCount, product_count: productCount },
        expenses_by_category: expensesByCategory,
        sales_by_payment: byPayment,
        daily_revenue: dailyRevenue,
      },
    });
  } catch (error) {
    console.error('[pos] Accounting error:', error);
    return c.json({ success: false, error: 'Failed to compute accounting' }, 500);
  }
});

export { posRoutes };
