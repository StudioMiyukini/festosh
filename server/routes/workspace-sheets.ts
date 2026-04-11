/**
 * Workspace sheet routes — collaborative spreadsheet with typed columns.
 *
 * columns_def is JSON: [{ id, name, type, width, options? }]
 *   Types: text, number, date, select, checkbox, formula
 * Row cells is JSON: { colId: value }
 */

import { Hono } from 'hono';
import { eq, and, desc, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { workspaceSheets, sheetRows, profiles } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { festivalMemberMiddleware, requireFestivalRole } from '../middleware/festival-auth.js';
import { formatResponse } from '../lib/format.js';

const workspaceSheetRoutes = new Hono();

const COLUMN_TYPES = ['text', 'number', 'date', 'select', 'checkbox', 'formula'] as const;

function formatSheet(s: typeof workspaceSheets.$inferSelect) {
  return formatResponse(s, ['columnsDef']);
}

function formatRow(r: typeof sheetRows.$inferSelect) {
  return formatResponse(r, ['cells']);
}

// Increment sheet version (triggers poll refresh for other clients)
function bumpVersion(sheetId: string) {
  const s = db.select({ version: workspaceSheets.version }).from(workspaceSheets).where(eq(workspaceSheets.id, sheetId)).get();
  const newVersion = (s?.version ?? 0) + 1;
  db.update(workspaceSheets).set({ version: newVersion, updatedAt: Math.floor(Date.now() / 1000) }).where(eq(workspaceSheets.id, sheetId)).run();
  return newVersion;
}

// Update row count cache
function updateRowCount(sheetId: string) {
  const result = db.select({ count: sql<number>`count(*)` }).from(sheetRows).where(eq(sheetRows.sheetId, sheetId)).get();
  db.update(workspaceSheets).set({ rowCount: result?.count ?? 0 }).where(eq(workspaceSheets.id, sheetId)).run();
}

// Default columns: A through E
function defaultColumns() {
  return ['A', 'B', 'C', 'D', 'E'].map((name) => ({
    id: crypto.randomUUID(),
    name,
    type: 'text' as const,
    width: 150,
  }));
}

// ═══════════════════════════════════════════════════════════════════════════
// LIST SHEETS
// ═══════════════════════════════════════════════════════════════════════════

workspaceSheetRoutes.get('/festival/:festivalId', authMiddleware, festivalMemberMiddleware, async (c) => {
  try {
    const festivalId = c.req.param('festivalId');

    const rows = db.select()
      .from(workspaceSheets)
      .where(eq(workspaceSheets.festivalId, festivalId))
      .orderBy(desc(workspaceSheets.updatedAt))
      .all();

    // Enrich with last editor name
    const data = rows.map((s) => {
      const formatted = formatSheet(s) as Record<string, unknown>;
      if (s.lastEditedBy) {
        const editor = db.select({ username: profiles.username, displayName: profiles.displayName })
          .from(profiles).where(eq(profiles.id, s.lastEditedBy)).get();
        formatted.last_editor_name = editor?.displayName || editor?.username || null;
      }
      return formatted;
    });

    return c.json({ success: true, data });
  } catch (error) {
    console.error('[workspace-sheets] List error:', error);
    return c.json({ success: false, error: 'Failed to list sheets' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// CREATE SHEET
// ═══════════════════════════════════════════════════════════════════════════

workspaceSheetRoutes.post(
  '/festival/:festivalId',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin', 'editor']),
  async (c) => {
    try {
      const festivalId = c.req.param('festivalId');
      const userId = c.get('userId');
      const body = await c.req.json();

      if (!body.title) return c.json({ success: false, error: 'Title is required' }, 400);

      const now = Math.floor(Date.now() / 1000);
      const id = crypto.randomUUID();

      const columnsDef = body.columns_def || defaultColumns();

      db.insert(workspaceSheets).values({
        id,
        festivalId,
        title: body.title,
        columnsDef: JSON.stringify(columnsDef),
        rowCount: 0,
        version: 1,
        createdBy: userId,
        lastEditedBy: userId,
        createdAt: now,
        updatedAt: now,
      }).run();

      const created = db.select().from(workspaceSheets).where(eq(workspaceSheets.id, id)).get();
      return c.json({ success: true, data: formatSheet(created!) }, 201);
    } catch (error) {
      console.error('[workspace-sheets] Create error:', error);
      return c.json({ success: false, error: 'Failed to create sheet' }, 500);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// GET SHEET (with columns + all rows)
// ═══════════════════════════════════════════════════════════════════════════

workspaceSheetRoutes.get('/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const sheet = db.select().from(workspaceSheets).where(eq(workspaceSheets.id, id)).get();
    if (!sheet) return c.json({ success: false, error: 'Sheet not found' }, 404);

    const rows = db.select().from(sheetRows)
      .where(eq(sheetRows.sheetId, id))
      .orderBy(sheetRows.rowIndex)
      .all();

    const formatted = formatSheet(sheet) as Record<string, unknown>;

    // Enrich with editor info
    if (sheet.lastEditedBy) {
      const editor = db.select({ username: profiles.username, displayName: profiles.displayName })
        .from(profiles).where(eq(profiles.id, sheet.lastEditedBy)).get();
      formatted.last_editor_name = editor?.displayName || editor?.username || null;
    }

    formatted.rows = rows.map((r) => formatRow(r));
    formatted.column_types = COLUMN_TYPES;

    return c.json({ success: true, data: formatted });
  } catch (error) {
    console.error('[workspace-sheets] Get error:', error);
    return c.json({ success: false, error: 'Failed to get sheet' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POLL — check if sheet has changed
// ═══════════════════════════════════════════════════════════════════════════

workspaceSheetRoutes.get('/:id/poll', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const clientVersion = parseInt(c.req.query('version') || '0', 10);

    const sheet = db.select({ version: workspaceSheets.version, updatedAt: workspaceSheets.updatedAt })
      .from(workspaceSheets).where(eq(workspaceSheets.id, id)).get();
    if (!sheet) return c.json({ success: false, error: 'Sheet not found' }, 404);

    if (sheet.version <= clientVersion) {
      return c.json({ success: true, data: { changed: false, version: sheet.version } });
    }

    // Version changed — return full updated data
    const fullSheet = db.select().from(workspaceSheets).where(eq(workspaceSheets.id, id)).get();
    const rows = db.select().from(sheetRows)
      .where(eq(sheetRows.sheetId, id))
      .orderBy(sheetRows.rowIndex)
      .all();

    let columnsDef;
    try {
      columnsDef = JSON.parse(fullSheet!.columnsDef || '[]');
    } catch {
      columnsDef = [];
    }

    return c.json({
      success: true,
      data: {
        changed: true,
        version: sheet.version,
        columns_def: columnsDef,
        rows: rows.map((r) => formatRow(r)),
      },
    });
  } catch (error) {
    console.error('[workspace-sheets] Poll error:', error);
    return c.json({ success: false, error: 'Failed to poll sheet' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE SHEET METADATA (title, columns_def)
// ═══════════════════════════════════════════════════════════════════════════

workspaceSheetRoutes.put('/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const userId = c.get('userId');
    const body = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    const existing = db.select().from(workspaceSheets).where(eq(workspaceSheets.id, id)).get();
    if (!existing) return c.json({ success: false, error: 'Sheet not found' }, 404);

    const updateData: Record<string, unknown> = { updatedAt: now, lastEditedBy: userId };
    if (body.title !== undefined) updateData.title = body.title;
    if (body.columns_def !== undefined) updateData.columnsDef = JSON.stringify(body.columns_def);

    db.update(workspaceSheets).set(updateData).where(eq(workspaceSheets.id, id)).run();
    bumpVersion(id);

    const updated = db.select().from(workspaceSheets).where(eq(workspaceSheets.id, id)).get();
    return c.json({ success: true, data: formatSheet(updated!) });
  } catch (error) {
    console.error('[workspace-sheets] Update error:', error);
    return c.json({ success: false, error: 'Failed to update sheet' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ADD COLUMN
// ═══════════════════════════════════════════════════════════════════════════

workspaceSheetRoutes.post('/:id/columns', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const userId = c.get('userId');
    const body = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    const sheet = db.select().from(workspaceSheets).where(eq(workspaceSheets.id, id)).get();
    if (!sheet) return c.json({ success: false, error: 'Sheet not found' }, 404);

    let columns: Array<{ id: string; name: string; type: string; width: number; options?: unknown }>;
    try {
      columns = JSON.parse(sheet.columnsDef || '[]');
    } catch {
      columns = [];
    }

    const newCol = {
      id: crypto.randomUUID(),
      name: body.name || String.fromCharCode(65 + columns.length), // A, B, C...
      type: body.type && COLUMN_TYPES.includes(body.type) ? body.type : 'text',
      width: body.width || 150,
      ...(body.options ? { options: body.options } : {}),
    };

    columns.push(newCol);

    db.update(workspaceSheets).set({
      columnsDef: JSON.stringify(columns),
      lastEditedBy: userId,
      updatedAt: now,
    }).where(eq(workspaceSheets.id, id)).run();

    bumpVersion(id);

    return c.json({ success: true, data: { column: newCol, columns_def: columns } }, 201);
  } catch (error) {
    console.error('[workspace-sheets] Add column error:', error);
    return c.json({ success: false, error: 'Failed to add column' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// REMOVE COLUMN + clean cells
// ═══════════════════════════════════════════════════════════════════════════

workspaceSheetRoutes.delete('/:id/columns/:colId', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const colId = c.req.param('colId');
    const userId = c.get('userId');
    const now = Math.floor(Date.now() / 1000);

    const sheet = db.select().from(workspaceSheets).where(eq(workspaceSheets.id, id)).get();
    if (!sheet) return c.json({ success: false, error: 'Sheet not found' }, 404);

    let columns: Array<{ id: string; name: string; type: string; width: number }>;
    try {
      columns = JSON.parse(sheet.columnsDef || '[]');
    } catch {
      columns = [];
    }

    const colExists = columns.some((col) => col.id === colId);
    if (!colExists) return c.json({ success: false, error: 'Column not found' }, 404);

    // Remove column from definition
    const updatedColumns = columns.filter((col) => col.id !== colId);

    // Clean cells in all rows: remove the deleted column's data
    const rows = db.select().from(sheetRows).where(eq(sheetRows.sheetId, id)).all();
    for (const row of rows) {
      let cells: Record<string, unknown>;
      try {
        cells = JSON.parse(row.cells || '{}');
      } catch {
        cells = {};
      }
      if (colId in cells) {
        delete cells[colId];
        db.update(sheetRows).set({ cells: JSON.stringify(cells), updatedAt: now }).where(eq(sheetRows.id, row.id)).run();
      }
    }

    db.update(workspaceSheets).set({
      columnsDef: JSON.stringify(updatedColumns),
      lastEditedBy: userId,
      updatedAt: now,
    }).where(eq(workspaceSheets.id, id)).run();

    bumpVersion(id);

    return c.json({ success: true, data: { columns_def: updatedColumns } });
  } catch (error) {
    console.error('[workspace-sheets] Remove column error:', error);
    return c.json({ success: false, error: 'Failed to remove column' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ADD ROW
// ═══════════════════════════════════════════════════════════════════════════

workspaceSheetRoutes.post('/:id/rows', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const userId = c.get('userId');
    const body = await c.req.json().catch(() => ({}));
    const now = Math.floor(Date.now() / 1000);

    const sheet = db.select().from(workspaceSheets).where(eq(workspaceSheets.id, id)).get();
    if (!sheet) return c.json({ success: false, error: 'Sheet not found' }, 404);

    // Find max row_index
    const maxRow = db.select({ maxIdx: sql<number>`coalesce(max(${sheetRows.rowIndex}), -1)` })
      .from(sheetRows).where(eq(sheetRows.sheetId, id)).get();
    const nextIndex = (maxRow?.maxIdx ?? -1) + 1;

    const rowId = crypto.randomUUID();

    db.insert(sheetRows).values({
      id: rowId,
      sheetId: id,
      rowIndex: nextIndex,
      cells: JSON.stringify(body.cells || {}),
      createdAt: now,
      updatedAt: now,
    }).run();

    // Update row count and version
    updateRowCount(id);
    db.update(workspaceSheets).set({ lastEditedBy: userId, updatedAt: now }).where(eq(workspaceSheets.id, id)).run();
    bumpVersion(id);

    const created = db.select().from(sheetRows).where(eq(sheetRows.id, rowId)).get();
    return c.json({ success: true, data: formatRow(created!) }, 201);
  } catch (error) {
    console.error('[workspace-sheets] Add row error:', error);
    return c.json({ success: false, error: 'Failed to add row' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE ROW CELLS (partial merge)
// ═══════════════════════════════════════════════════════════════════════════

workspaceSheetRoutes.put('/rows/:rowId', authMiddleware, async (c) => {
  try {
    const rowId = c.req.param('rowId');
    const userId = c.get('userId');
    const body = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    const existing = db.select().from(sheetRows).where(eq(sheetRows.id, rowId)).get();
    if (!existing) return c.json({ success: false, error: 'Row not found' }, 404);

    // Partial merge: only update provided colIds
    let currentCells: Record<string, unknown>;
    try {
      currentCells = JSON.parse(existing.cells || '{}');
    } catch {
      currentCells = {};
    }

    if (body.cells && typeof body.cells === 'object') {
      for (const [colId, value] of Object.entries(body.cells)) {
        currentCells[colId] = value;
      }
    }

    db.update(sheetRows).set({
      cells: JSON.stringify(currentCells),
      updatedAt: now,
    }).where(eq(sheetRows.id, rowId)).run();

    // Bump sheet version
    db.update(workspaceSheets).set({ lastEditedBy: userId, updatedAt: now }).where(eq(workspaceSheets.id, existing.sheetId)).run();
    bumpVersion(existing.sheetId);

    const updated = db.select().from(sheetRows).where(eq(sheetRows.id, rowId)).get();
    return c.json({ success: true, data: formatRow(updated!) });
  } catch (error) {
    console.error('[workspace-sheets] Update row error:', error);
    return c.json({ success: false, error: 'Failed to update row' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// DELETE ROW
// ═══════════════════════════════════════════════════════════════════════════

workspaceSheetRoutes.delete('/rows/:rowId', authMiddleware, async (c) => {
  try {
    const rowId = c.req.param('rowId');
    const userId = c.get('userId');
    const now = Math.floor(Date.now() / 1000);

    const existing = db.select().from(sheetRows).where(eq(sheetRows.id, rowId)).get();
    if (!existing) return c.json({ success: false, error: 'Row not found' }, 404);

    const sheetId = existing.sheetId;

    db.delete(sheetRows).where(eq(sheetRows.id, rowId)).run();

    // Update row count and bump version
    updateRowCount(sheetId);
    db.update(workspaceSheets).set({ lastEditedBy: userId, updatedAt: now }).where(eq(workspaceSheets.id, sheetId)).run();
    bumpVersion(sheetId);

    return c.json({ success: true, data: { message: 'Row deleted' } });
  } catch (error) {
    console.error('[workspace-sheets] Delete row error:', error);
    return c.json({ success: false, error: 'Failed to delete row' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// REORDER ROWS
// ═══════════════════════════════════════════════════════════════════════════

workspaceSheetRoutes.put('/:id/rows/reorder', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const userId = c.get('userId');
    const body = await c.req.json();
    const { row_ids } = body;

    if (!Array.isArray(row_ids)) return c.json({ success: false, error: 'row_ids array required' }, 400);

    const sheet = db.select().from(workspaceSheets).where(eq(workspaceSheets.id, id)).get();
    if (!sheet) return c.json({ success: false, error: 'Sheet not found' }, 404);

    const now = Math.floor(Date.now() / 1000);
    for (let i = 0; i < row_ids.length; i++) {
      db.update(sheetRows).set({ rowIndex: i, updatedAt: now }).where(eq(sheetRows.id, row_ids[i])).run();
    }

    db.update(workspaceSheets).set({ lastEditedBy: userId, updatedAt: now }).where(eq(workspaceSheets.id, id)).run();
    bumpVersion(id);

    return c.json({ success: true, data: { message: 'Rows reordered' } });
  } catch (error) {
    console.error('[workspace-sheets] Reorder rows error:', error);
    return c.json({ success: false, error: 'Failed to reorder rows' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// DELETE SHEET (+ all rows via cascade, but explicit for safety)
// ═══════════════════════════════════════════════════════════════════════════

workspaceSheetRoutes.delete(
  '/:id',
  authMiddleware,
  async (c) => {
    try {
      const id = c.req.param('id');
      const existing = db.select().from(workspaceSheets).where(eq(workspaceSheets.id, id)).get();
      if (!existing) return c.json({ success: false, error: 'Sheet not found' }, 404);

      // Explicit row cleanup (cascade should handle this, but be safe)
      db.delete(sheetRows).where(eq(sheetRows.sheetId, id)).run();
      db.delete(workspaceSheets).where(eq(workspaceSheets.id, id)).run();

      return c.json({ success: true, data: { message: 'Sheet deleted' } });
    } catch (error) {
      console.error('[workspace-sheets] Delete error:', error);
      return c.json({ success: false, error: 'Failed to delete sheet' }, 500);
    }
  },
);

export { workspaceSheetRoutes };
