/**
 * Budget routes — categories and entries for financial tracking.
 */

import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { mkdirSync, createReadStream } from 'fs';
import { writeFile, stat } from 'fs/promises';
import { resolve, extname, join } from 'path';
import { validateFileContent } from '../lib/file-validation.js';
import { db } from '../db/index.js';
import { budgetCategories, budgetEntries, editions } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { festivalMemberMiddleware, requireFestivalRole } from '../middleware/festival-auth.js';
import type { MiddlewareHandler } from 'hono';

// Resolve festivalId from edition for middleware compatibility
const resolveEditionFestival: MiddlewareHandler = async (c, next) => {
  const editionId = c.req.param('editionId');
  if (editionId) {
    const edition = db.select({ festivalId: editions.festivalId }).from(editions).where(eq(editions.id, editionId)).get();
    if (edition) c.req.addValidatedData('param', { festivalId: edition.festivalId });
  }
  await next();
};
import { formatResponse } from '../lib/format.js';

const RECEIPTS_DIR = resolve(process.cwd(), 'data', 'uploads', 'receipts');
const MAX_RECEIPT_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_RECEIPT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

mkdirSync(RECEIPTS_DIR, { recursive: true });

const budgetRoutes = new Hono();

// ---------------------------------------------------------------------------
// GET /festival/:festivalId/categories — list categories
// ---------------------------------------------------------------------------
budgetRoutes.get('/festival/:festivalId/categories', authMiddleware, festivalMemberMiddleware, async (c) => {
  try {
    const festivalId = c.req.param('festivalId');

    const categories = db
      .select()
      .from(budgetCategories)
      .where(eq(budgetCategories.festivalId, festivalId))
      .all();

    categories.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    return c.json({ success: true, data: categories.map((cat) => formatResponse(cat)) });
  } catch (error) {
    console.error('[budget] List categories error:', error);
    return c.json({ success: false, error: 'Failed to list budget categories' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /festival/:festivalId/categories — create category
// ---------------------------------------------------------------------------
budgetRoutes.post(
  '/festival/:festivalId/categories',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const festivalId = c.req.param('festivalId');
      const body = await c.req.json();
      const { name, entry_type, color, description, sort_order } = body;

      if (!name || !entry_type) {
        return c.json({ success: false, error: 'Name and entry_type are required' }, 400);
      }

      if (!['income', 'expense'].includes(entry_type)) {
        return c.json({ success: false, error: 'entry_type must be "income" or "expense"' }, 400);
      }

      const id = crypto.randomUUID();

      db.insert(budgetCategories)
        .values({
          id,
          festivalId,
          name,
          entryType: entry_type,
          color: color || '#6366f1',
          sortOrder: sort_order || 0,
        })
        .run();

      const category = db
        .select()
        .from(budgetCategories)
        .where(eq(budgetCategories.id, id))
        .get();

      return c.json({ success: true, data: category ? formatResponse(category) : null }, 201);
    } catch (error) {
      console.error('[budget] Create category error:', error);
      return c.json({ success: false, error: 'Failed to create budget category' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /edition/:editionId/entries — list entries
// ---------------------------------------------------------------------------
budgetRoutes.get('/edition/:editionId/entries', authMiddleware, resolveEditionFestival, festivalMemberMiddleware, async (c) => {
  try {
    const editionId = c.req.param('editionId');

    const entries = db
      .select()
      .from(budgetEntries)
      .where(eq(budgetEntries.editionId, editionId))
      .all();

    return c.json({ success: true, data: entries.map((e) => formatResponse(e)) });
  } catch (error) {
    console.error('[budget] List entries error:', error);
    return c.json({ success: false, error: 'Failed to list budget entries' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /edition/:editionId/entries — create entry
// ---------------------------------------------------------------------------
budgetRoutes.post('/edition/:editionId/entries', authMiddleware, resolveEditionFestival, festivalMemberMiddleware, async (c) => {
  try {
    const editionId = c.req.param('editionId');
    const userId = c.get('userId');
    const body = await c.req.json();
    const { category_id, entry_type, description, amount_cents, date, receipt_url, payment_method, notes } = body;

    if (!category_id || !description || amount_cents === undefined) {
      return c.json({ success: false, error: 'category_id, description, and amount_cents are required' }, 400);
    }

    const now = Math.floor(Date.now() / 1000);
    const id = crypto.randomUUID();

    db.insert(budgetEntries)
      .values({
        id,
        editionId,
        categoryId: category_id,
        entryType: entry_type || null,
        description,
        amountCents: amount_cents,
        date: date || new Date().toISOString().split('T')[0],
        receiptUrl: receipt_url || null,
        paymentMethod: payment_method || null,
        notes: notes || null,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const entry = db
      .select()
      .from(budgetEntries)
      .where(eq(budgetEntries.id, id))
      .get();

    return c.json({ success: true, data: entry ? formatResponse(entry) : null }, 201);
  } catch (error) {
    console.error('[budget] Create entry error:', error);
    return c.json({ success: false, error: 'Failed to create budget entry' }, 500);
  }
});

// ---------------------------------------------------------------------------
// PUT /entries/:id — update entry
// ---------------------------------------------------------------------------
budgetRoutes.put('/entries/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    const entry = db.select().from(budgetEntries).where(eq(budgetEntries.id, id)).get();
    if (!entry) {
      return c.json({ success: false, error: 'Budget entry not found' }, 404);
    }

    const updateData: Record<string, unknown> = { updatedAt: now };

    const keyMap: Record<string, string> = {
      category_id: 'categoryId',
      entry_type: 'entryType',
      description: 'description',
      amount_cents: 'amountCents',
      date: 'date',
      receipt_url: 'receiptUrl',
      payment_method: 'paymentMethod',
      notes: 'notes',
    };

    for (const [bodyKey, schemaKey] of Object.entries(keyMap)) {
      if (body[bodyKey] !== undefined) {
        updateData[schemaKey] = body[bodyKey];
      }
    }

    db.update(budgetEntries).set(updateData).where(eq(budgetEntries.id, id)).run();

    const updated = db.select().from(budgetEntries).where(eq(budgetEntries.id, id)).get();

    return c.json({ success: true, data: updated ? formatResponse(updated) : null });
  } catch (error) {
    console.error('[budget] Update entry error:', error);
    return c.json({ success: false, error: 'Failed to update budget entry' }, 500);
  }
});

// ---------------------------------------------------------------------------
// DELETE /entries/:id — delete entry
// ---------------------------------------------------------------------------
budgetRoutes.delete('/entries/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');

    const entry = db.select().from(budgetEntries).where(eq(budgetEntries.id, id)).get();
    if (!entry) {
      return c.json({ success: false, error: 'Budget entry not found' }, 404);
    }

    db.delete(budgetEntries).where(eq(budgetEntries.id, id)).run();

    return c.json({ success: true, data: { message: 'Budget entry deleted' } });
  } catch (error) {
    console.error('[budget] Delete entry error:', error);
    return c.json({ success: false, error: 'Failed to delete budget entry' }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /edition/:editionId/summary — get budget summary
// ---------------------------------------------------------------------------
budgetRoutes.get('/edition/:editionId/summary', authMiddleware, resolveEditionFestival, festivalMemberMiddleware, async (c) => {
  try {
    const editionId = c.req.param('editionId');

    // Get all entries for this edition
    const entries = db
      .select()
      .from(budgetEntries)
      .where(eq(budgetEntries.editionId, editionId))
      .all();

    // Get all categories for quick lookup
    const edition = db.select().from(editions).where(eq(editions.id, editionId)).get();
    if (!edition) {
      return c.json({ success: false, error: 'Edition not found' }, 404);
    }

    const categories = db
      .select()
      .from(budgetCategories)
      .where(eq(budgetCategories.festivalId, edition.festivalId))
      .all();

    const categoryMap = new Map(categories.map((cat) => [cat.id, cat]));

    let totalIncome = 0;
    let totalExpense = 0;
    const byCategory: Record<string, { name: string; type: string; total: number; count: number }> = {};

    for (const entry of entries) {
      const category = categoryMap.get(entry.categoryId!);
      const entryType = entry.entryType || category?.entryType || 'expense';
      const amount = entry.amountCents ?? 0;

      if (entryType === 'income') {
        totalIncome += amount;
      } else {
        totalExpense += amount;
      }

      const catId = entry.categoryId || 'uncategorized';
      if (!byCategory[catId]) {
        byCategory[catId] = {
          name: category?.name || 'Uncategorized',
          type: entryType,
          total: 0,
          count: 0,
        };
      }
      byCategory[catId].total += amount;
      byCategory[catId].count += 1;
    }

    return c.json({
      success: true,
      data: {
        total_income_cents: totalIncome,
        total_expense_cents: totalExpense,
        balance_cents: totalIncome - totalExpense,
        entry_count: entries.length,
        by_category: byCategory,
      },
    });
  } catch (error) {
    console.error('[budget] Summary error:', error);
    return c.json({ success: false, error: 'Failed to compute budget summary' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /receipt — upload a receipt file
// ---------------------------------------------------------------------------
budgetRoutes.post('/receipt', authMiddleware, async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body['file'];

    if (!file || !(file instanceof File)) {
      return c.json({ success: false, error: 'No file provided' }, 400);
    }

    if (!ALLOWED_RECEIPT_TYPES.includes(file.type)) {
      return c.json({ success: false, error: 'Type non autorise. Formats acceptes : JPEG, PNG, WebP, PDF' }, 400);
    }

    if (file.size > MAX_RECEIPT_SIZE) {
      return c.json({ success: false, error: 'Fichier trop volumineux (max 10 Mo)' }, 400);
    }

    const ext = extname(file.name) || '.bin';
    const filename = `${crypto.randomUUID()}${ext}`;
    const filepath = join(RECEIPTS_DIR, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!validateFileContent(buffer, file.type)) {
      return c.json({ success: false, error: 'File content does not match declared type' }, 400);
    }
    await writeFile(filepath, buffer);

    const receiptUrl = `/api/budget/receipt/${filename}`;

    return c.json({ success: true, data: { receipt_url: receiptUrl, filename } }, 201);
  } catch (error) {
    console.error('[budget] Upload receipt error:', error);
    return c.json({ success: false, error: 'Failed to upload receipt' }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /receipt/:filename — serve a receipt file
// ---------------------------------------------------------------------------
budgetRoutes.get('/receipt/:filename', async (c) => {
  try {
    const filename = c.req.param('filename');

    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return c.json({ success: false, error: 'Invalid filename' }, 400);
    }

    const filepath = join(RECEIPTS_DIR, filename);

    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
    };

    let fileSize: number;
    try {
      fileSize = (await stat(filepath)).size;
    } catch {
      return c.json({ success: false, error: 'Receipt not found' }, 404);
    }

    const ext = extname(filename).toLowerCase();
    const contentType = mimeMap[ext] || 'application/octet-stream';
    const stream = createReadStream(filepath);
    const readable = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => controller.enqueue(chunk));
        stream.on('end', () => controller.close());
        stream.on('error', (err) => controller.error(err));
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(fileSize),
        'Cache-Control': 'private, max-age=86400',
      },
    });
  } catch (error) {
    console.error('[budget] Serve receipt error:', error);
    return c.json({ success: false, error: 'Failed to serve receipt' }, 500);
  }
});

export { budgetRoutes };
