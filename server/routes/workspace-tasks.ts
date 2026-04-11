/**
 * Workspace Task Board routes — Kanban boards with columns and cards.
 */

import { Hono } from 'hono';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { taskBoards, taskColumns, taskCards, profiles } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { festivalMemberMiddleware, requireFestivalRole } from '../middleware/festival-auth.js';
import { formatResponse } from '../lib/format.js';

const workspaceTaskRoutes = new Hono();

function formatBoard(b: typeof taskBoards.$inferSelect) {
  return formatResponse(b);
}

function formatColumn(col: typeof taskColumns.$inferSelect) {
  return formatResponse(col);
}

function formatCard(card: typeof taskCards.$inferSelect) {
  return formatResponse(card, ['labels', 'checklist']);
}

/** Increment board version — triggers poll refresh for other clients. */
function bumpVersion(boardId: string): number {
  const board = db.select({ version: taskBoards.version }).from(taskBoards).where(eq(taskBoards.id, boardId)).get();
  const newVersion = (board?.version ?? 0) + 1;
  db.update(taskBoards)
    .set({ version: newVersion, updatedAt: Math.floor(Date.now() / 1000) })
    .where(eq(taskBoards.id, boardId))
    .run();
  return newVersion;
}

/** Enrich a card row with assignee display_name and avatar_url. */
function enrichCard(card: typeof taskCards.$inferSelect): Record<string, unknown> {
  const formatted = formatCard(card) as Record<string, unknown>;
  if (card.assigneeId) {
    const user = db.select().from(profiles).where(eq(profiles.id, card.assigneeId)).get();
    if (user) {
      formatted.assignee_display_name = user.displayName || user.username;
      formatted.assignee_avatar_url = user.avatarUrl || null;
    }
  }
  return formatted;
}

// ═══════════════════════════════════════════════════════════════════════════
// BOARDS
// ═══════════════════════════════════════════════════════════════════════════

// ---------------------------------------------------------------------------
// GET /festival/:festivalId — list boards
// ---------------------------------------------------------------------------
workspaceTaskRoutes.get('/festival/:festivalId', authMiddleware, festivalMemberMiddleware, async (c) => {
  try {
    const festivalId = c.req.param('festivalId');

    const rows = db.select().from(taskBoards)
      .where(eq(taskBoards.festivalId, festivalId))
      .orderBy(desc(taskBoards.createdAt))
      .all();

    const data = rows.map((b) => formatBoard(b));
    return c.json({ success: true, data });
  } catch (error) {
    console.error('[workspace-tasks] List boards error:', error);
    return c.json({ success: false, error: 'Failed to list boards' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /festival/:festivalId — create board with 3 default columns
// ---------------------------------------------------------------------------
workspaceTaskRoutes.post('/festival/:festivalId', authMiddleware, festivalMemberMiddleware, async (c) => {
  try {
    const festivalId = c.req.param('festivalId');
    const userId = c.get('userId');
    const body = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    if (!body.title) {
      return c.json({ success: false, error: 'Title is required' }, 400);
    }

    const boardId = crypto.randomUUID();
    db.insert(taskBoards).values({
      id: boardId,
      festivalId,
      title: body.title,
      version: 1,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    }).run();

    // Auto-create 3 default columns
    const defaultColumns = [
      { title: 'A faire', color: '#6b7280', sortOrder: 0 },
      { title: 'En cours', color: '#f59e0b', sortOrder: 1 },
      { title: 'Termine', color: '#22c55e', sortOrder: 2 },
    ];

    for (const col of defaultColumns) {
      db.insert(taskColumns).values({
        id: crypto.randomUUID(),
        boardId,
        title: col.title,
        color: col.color,
        sortOrder: col.sortOrder,
      }).run();
    }

    const created = db.select().from(taskBoards).where(eq(taskBoards.id, boardId)).get();
    return c.json({ success: true, data: formatBoard(created!) }, 201);
  } catch (error) {
    console.error('[workspace-tasks] Create board error:', error);
    return c.json({ success: false, error: 'Failed to create board' }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /:id — get board with columns + cards + assignee info
// ---------------------------------------------------------------------------
workspaceTaskRoutes.get('/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');

    const board = db.select().from(taskBoards).where(eq(taskBoards.id, id)).get();
    if (!board) {
      return c.json({ success: false, error: 'Board not found' }, 404);
    }

    const columns = db.select().from(taskColumns)
      .where(eq(taskColumns.boardId, id))
      .orderBy(taskColumns.sortOrder)
      .all();

    const cards = db.select().from(taskCards)
      .where(eq(taskCards.boardId, id))
      .orderBy(taskCards.sortOrder)
      .all();

    // Group cards by column
    const cardsByColumn = new Map<string, Record<string, unknown>[]>();
    for (const card of cards) {
      const enriched = enrichCard(card);
      const colCards = cardsByColumn.get(card.columnId) || [];
      colCards.push(enriched);
      cardsByColumn.set(card.columnId, colCards);
    }

    const formattedBoard = formatBoard(board) as Record<string, unknown>;
    formattedBoard.columns = columns.map((col) => {
      const formattedCol = formatColumn(col) as Record<string, unknown>;
      formattedCol.cards = cardsByColumn.get(col.id) || [];
      return formattedCol;
    });

    return c.json({ success: true, data: formattedBoard });
  } catch (error) {
    console.error('[workspace-tasks] Get board error:', error);
    return c.json({ success: false, error: 'Failed to get board' }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /:id/poll?version=N — long-poll for board changes
// ---------------------------------------------------------------------------
workspaceTaskRoutes.get('/:id/poll', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const clientVersion = parseInt(c.req.query('version') || '0', 10);

    const board = db.select().from(taskBoards).where(eq(taskBoards.id, id)).get();
    if (!board) {
      return c.json({ success: false, error: 'Board not found' }, 404);
    }

    if (board.version <= clientVersion) {
      return c.json({ success: true, data: { changed: false, version: board.version } });
    }

    // Changed — return full board with columns + cards
    const columns = db.select().from(taskColumns)
      .where(eq(taskColumns.boardId, id))
      .orderBy(taskColumns.sortOrder)
      .all();

    const allCards = db.select().from(taskCards)
      .where(eq(taskCards.boardId, id))
      .orderBy(taskCards.sortOrder)
      .all();

    const cardsByCol = new Map<string, unknown[]>();
    for (const card of allCards) {
      const colCards = cardsByCol.get(card.columnId) || [];
      let assigneeName = null;
      if (card.assigneeId) {
        const u = db.select({ displayName: profiles.displayName, username: profiles.username })
          .from(profiles).where(eq(profiles.id, card.assigneeId)).get();
        assigneeName = u?.displayName || u?.username || null;
      }
      colCards.push({ ...formatResponse(card, ['labels', 'checklist']), assignee_name: assigneeName });
      cardsByCol.set(card.columnId, colCards);
    }

    return c.json({
      success: true,
      data: {
        changed: true,
        ...formatResponse(board),
        columns: columns.map((col) => ({
          ...formatResponse(col),
          cards: cardsByCol.get(col.id) || [],
        })),
      },
    });
  } catch (error) {
    console.error('[workspace-tasks] Poll error:', error);
    return c.json({ success: false, error: 'Failed to poll board' }, 500);
  }
});

// ---------------------------------------------------------------------------
// PUT /:id — update board title
// ---------------------------------------------------------------------------
workspaceTaskRoutes.put('/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    const existing = db.select().from(taskBoards).where(eq(taskBoards.id, id)).get();
    if (!existing) {
      return c.json({ success: false, error: 'Board not found' }, 404);
    }

    const updateData: Record<string, unknown> = { updatedAt: now };
    if (body.title !== undefined) updateData.title = body.title;

    db.update(taskBoards).set(updateData).where(eq(taskBoards.id, id)).run();
    const updated = db.select().from(taskBoards).where(eq(taskBoards.id, id)).get();
    return c.json({ success: true, data: formatBoard(updated!) });
  } catch (error) {
    console.error('[workspace-tasks] Update board error:', error);
    return c.json({ success: false, error: 'Failed to update board' }, 500);
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id — delete board + columns + cards (cascade)
// ---------------------------------------------------------------------------
workspaceTaskRoutes.delete('/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');

    const existing = db.select().from(taskBoards).where(eq(taskBoards.id, id)).get();
    if (!existing) {
      return c.json({ success: false, error: 'Board not found' }, 404);
    }

    // Delete cards, then columns, then board
    db.delete(taskCards).where(eq(taskCards.boardId, id)).run();
    db.delete(taskColumns).where(eq(taskColumns.boardId, id)).run();
    db.delete(taskBoards).where(eq(taskBoards.id, id)).run();

    return c.json({ success: true, data: { message: 'Board deleted' } });
  } catch (error) {
    console.error('[workspace-tasks] Delete board error:', error);
    return c.json({ success: false, error: 'Failed to delete board' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// COLUMNS
// ═══════════════════════════════════════════════════════════════════════════

// ---------------------------------------------------------------------------
// POST /:boardId/columns — create column
// ---------------------------------------------------------------------------
workspaceTaskRoutes.post('/:boardId/columns', authMiddleware, async (c) => {
  try {
    const boardId = c.req.param('boardId');
    const body = await c.req.json();

    const board = db.select().from(taskBoards).where(eq(taskBoards.id, boardId)).get();
    if (!board) {
      return c.json({ success: false, error: 'Board not found' }, 404);
    }

    if (!body.title) {
      return c.json({ success: false, error: 'Title is required' }, 400);
    }

    // Determine next sort order
    const maxOrder = db.select({ max: sql<number>`coalesce(max(${taskColumns.sortOrder}), -1)` })
      .from(taskColumns)
      .where(eq(taskColumns.boardId, boardId))
      .get();

    const id = crypto.randomUUID();
    db.insert(taskColumns).values({
      id,
      boardId,
      title: body.title,
      color: body.color || '#6b7280',
      sortOrder: (maxOrder?.max ?? -1) + 1,
      wipLimit: body.wip_limit ?? null,
    }).run();

    bumpVersion(boardId);

    const created = db.select().from(taskColumns).where(eq(taskColumns.id, id)).get();
    return c.json({ success: true, data: formatColumn(created!) }, 201);
  } catch (error) {
    console.error('[workspace-tasks] Create column error:', error);
    return c.json({ success: false, error: 'Failed to create column' }, 500);
  }
});

// ---------------------------------------------------------------------------
// PUT /columns/:id — update column
// ---------------------------------------------------------------------------
workspaceTaskRoutes.put('/columns/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();

    const existing = db.select().from(taskColumns).where(eq(taskColumns.id, id)).get();
    if (!existing) {
      return c.json({ success: false, error: 'Column not found' }, 404);
    }

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.color !== undefined) updateData.color = body.color;
    if (body.sort_order !== undefined) updateData.sortOrder = body.sort_order;
    if (body.wip_limit !== undefined) updateData.wipLimit = body.wip_limit;

    if (Object.keys(updateData).length > 0) {
      db.update(taskColumns).set(updateData).where(eq(taskColumns.id, id)).run();
      bumpVersion(existing.boardId);
    }

    const updated = db.select().from(taskColumns).where(eq(taskColumns.id, id)).get();
    return c.json({ success: true, data: formatColumn(updated!) });
  } catch (error) {
    console.error('[workspace-tasks] Update column error:', error);
    return c.json({ success: false, error: 'Failed to update column' }, 500);
  }
});

// ---------------------------------------------------------------------------
// DELETE /columns/:id — delete column, move cards to first column (or delete if last)
// ---------------------------------------------------------------------------
workspaceTaskRoutes.delete('/columns/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');

    const existing = db.select().from(taskColumns).where(eq(taskColumns.id, id)).get();
    if (!existing) {
      return c.json({ success: false, error: 'Column not found' }, 404);
    }

    const boardId = existing.boardId;

    // Find all other columns in the same board
    const otherColumns = db.select().from(taskColumns)
      .where(and(eq(taskColumns.boardId, boardId), sql`${taskColumns.id} != ${id}`))
      .orderBy(taskColumns.sortOrder)
      .all();

    if (otherColumns.length > 0) {
      // Move cards from deleted column to the first remaining column
      const targetColumnId = otherColumns[0].id;
      db.update(taskCards)
        .set({ columnId: targetColumnId })
        .where(eq(taskCards.columnId, id))
        .run();
    } else {
      // Last column — delete its cards
      db.delete(taskCards).where(eq(taskCards.columnId, id)).run();
    }

    db.delete(taskColumns).where(eq(taskColumns.id, id)).run();
    bumpVersion(boardId);

    return c.json({ success: true, data: { message: 'Column deleted' } });
  } catch (error) {
    console.error('[workspace-tasks] Delete column error:', error);
    return c.json({ success: false, error: 'Failed to delete column' }, 500);
  }
});

// ---------------------------------------------------------------------------
// PUT /:boardId/columns/reorder — reorder columns
// ---------------------------------------------------------------------------
workspaceTaskRoutes.put('/:boardId/columns/reorder', authMiddleware, async (c) => {
  try {
    const boardId = c.req.param('boardId');
    const body = await c.req.json();

    const board = db.select().from(taskBoards).where(eq(taskBoards.id, boardId)).get();
    if (!board) {
      return c.json({ success: false, error: 'Board not found' }, 404);
    }

    if (!Array.isArray(body.column_ids)) {
      return c.json({ success: false, error: 'column_ids array is required' }, 400);
    }

    for (let i = 0; i < body.column_ids.length; i++) {
      db.update(taskColumns)
        .set({ sortOrder: i })
        .where(and(eq(taskColumns.id, body.column_ids[i]), eq(taskColumns.boardId, boardId)))
        .run();
    }

    bumpVersion(boardId);

    return c.json({ success: true, data: { message: 'Columns reordered' } });
  } catch (error) {
    console.error('[workspace-tasks] Reorder columns error:', error);
    return c.json({ success: false, error: 'Failed to reorder columns' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// CARDS
// ═══════════════════════════════════════════════════════════════════════════

// ---------------------------------------------------------------------------
// POST /columns/:columnId/cards — create card
// ---------------------------------------------------------------------------
workspaceTaskRoutes.post('/columns/:columnId/cards', authMiddleware, async (c) => {
  try {
    const columnId = c.req.param('columnId');
    const userId = c.get('userId');
    const body = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    const column = db.select().from(taskColumns).where(eq(taskColumns.id, columnId)).get();
    if (!column) {
      return c.json({ success: false, error: 'Column not found' }, 404);
    }

    if (!body.title) {
      return c.json({ success: false, error: 'Title is required' }, 400);
    }

    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    const priority = validPriorities.includes(body.priority) ? body.priority : 'medium';

    // Determine next sort order within the column
    const maxOrder = db.select({ max: sql<number>`coalesce(max(${taskCards.sortOrder}), -1)` })
      .from(taskCards)
      .where(eq(taskCards.columnId, columnId))
      .get();

    const id = crypto.randomUUID();
    db.insert(taskCards).values({
      id,
      columnId,
      boardId: column.boardId,
      title: body.title,
      description: body.description || null,
      assigneeId: body.assignee_id || null,
      priority,
      dueAt: body.due_at ?? null,
      labels: body.labels ? JSON.stringify(body.labels) : '[]',
      checklist: '[]',
      sortOrder: (maxOrder?.max ?? -1) + 1,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    }).run();

    bumpVersion(column.boardId);

    const created = db.select().from(taskCards).where(eq(taskCards.id, id)).get();
    return c.json({ success: true, data: enrichCard(created!) }, 201);
  } catch (error) {
    console.error('[workspace-tasks] Create card error:', error);
    return c.json({ success: false, error: 'Failed to create card' }, 500);
  }
});

// ---------------------------------------------------------------------------
// PUT /cards/:id — update card
// ---------------------------------------------------------------------------
workspaceTaskRoutes.put('/cards/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    const existing = db.select().from(taskCards).where(eq(taskCards.id, id)).get();
    if (!existing) {
      return c.json({ success: false, error: 'Card not found' }, 404);
    }

    const updateData: Record<string, unknown> = { updatedAt: now };
    const keyMap: Record<string, string> = {
      title: 'title',
      description: 'description',
      assignee_id: 'assigneeId',
      priority: 'priority',
      due_at: 'dueAt',
      sort_order: 'sortOrder',
    };

    for (const [bodyKey, schemaKey] of Object.entries(keyMap)) {
      if (body[bodyKey] !== undefined) {
        updateData[schemaKey] = body[bodyKey];
      }
    }

    if (body.labels !== undefined) {
      updateData.labels = JSON.stringify(body.labels);
    }
    if (body.checklist !== undefined) {
      updateData.checklist = JSON.stringify(body.checklist);
    }

    db.update(taskCards).set(updateData).where(eq(taskCards.id, id)).run();
    bumpVersion(existing.boardId);

    const updated = db.select().from(taskCards).where(eq(taskCards.id, id)).get();
    return c.json({ success: true, data: enrichCard(updated!) });
  } catch (error) {
    console.error('[workspace-tasks] Update card error:', error);
    return c.json({ success: false, error: 'Failed to update card' }, 500);
  }
});

// ---------------------------------------------------------------------------
// PUT /cards/:id/move — move card to another column
// ---------------------------------------------------------------------------
workspaceTaskRoutes.put('/cards/:id/move', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    const existing = db.select().from(taskCards).where(eq(taskCards.id, id)).get();
    if (!existing) {
      return c.json({ success: false, error: 'Card not found' }, 404);
    }

    if (!body.column_id) {
      return c.json({ success: false, error: 'column_id is required' }, 400);
    }

    const targetColumn = db.select().from(taskColumns).where(eq(taskColumns.id, body.column_id)).get();
    if (!targetColumn) {
      return c.json({ success: false, error: 'Target column not found' }, 404);
    }

    const updateData: Record<string, unknown> = {
      columnId: body.column_id,
      updatedAt: now,
    };

    if (body.sort_order !== undefined) {
      updateData.sortOrder = body.sort_order;
    }

    db.update(taskCards).set(updateData).where(eq(taskCards.id, id)).run();
    bumpVersion(existing.boardId);

    const updated = db.select().from(taskCards).where(eq(taskCards.id, id)).get();
    return c.json({ success: true, data: enrichCard(updated!) });
  } catch (error) {
    console.error('[workspace-tasks] Move card error:', error);
    return c.json({ success: false, error: 'Failed to move card' }, 500);
  }
});

// ---------------------------------------------------------------------------
// DELETE /cards/:id — delete card
// ---------------------------------------------------------------------------
workspaceTaskRoutes.delete('/cards/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');

    const existing = db.select().from(taskCards).where(eq(taskCards.id, id)).get();
    if (!existing) {
      return c.json({ success: false, error: 'Card not found' }, 404);
    }

    const boardId = existing.boardId;
    db.delete(taskCards).where(eq(taskCards.id, id)).run();
    bumpVersion(boardId);

    return c.json({ success: true, data: { message: 'Card deleted' } });
  } catch (error) {
    console.error('[workspace-tasks] Delete card error:', error);
    return c.json({ success: false, error: 'Failed to delete card' }, 500);
  }
});

// ---------------------------------------------------------------------------
// PUT /cards/:id/checklist — update card checklist
// ---------------------------------------------------------------------------
workspaceTaskRoutes.put('/cards/:id/checklist', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    const existing = db.select().from(taskCards).where(eq(taskCards.id, id)).get();
    if (!existing) {
      return c.json({ success: false, error: 'Card not found' }, 404);
    }

    if (!Array.isArray(body.items)) {
      return c.json({ success: false, error: 'items array is required' }, 400);
    }

    // Validate checklist items
    const checklist = body.items.map((item: { text: string; done: boolean }) => ({
      text: item.text || '',
      done: !!item.done,
    }));

    db.update(taskCards)
      .set({ checklist: JSON.stringify(checklist), updatedAt: now })
      .where(eq(taskCards.id, id))
      .run();

    bumpVersion(existing.boardId);

    const updated = db.select().from(taskCards).where(eq(taskCards.id, id)).get();
    return c.json({ success: true, data: enrichCard(updated!) });
  } catch (error) {
    console.error('[workspace-tasks] Update checklist error:', error);
    return c.json({ success: false, error: 'Failed to update checklist' }, 500);
  }
});

export { workspaceTaskRoutes };
