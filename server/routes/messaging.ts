/**
 * Messaging routes — direct conversations between users.
 */

import { Hono } from 'hono';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import {
  conversations,
  conversationParticipants,
  messages,
  profiles,
} from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';

const messagingRoutes = new Hono();

messagingRoutes.use('*', authMiddleware);

// ---------------------------------------------------------------------------
// GET /conversations — inbox (list user's conversations)
// ---------------------------------------------------------------------------
messagingRoutes.get('/conversations', async (c) => {
  try {
    const userId = c.get('userId');

    // Get conversation IDs where user is participant
    const participations = db
      .select({ conversationId: conversationParticipants.conversationId, lastReadAt: conversationParticipants.lastReadAt })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId))
      .all();

    if (participations.length === 0) {
      return c.json({ success: true, data: [] });
    }

    const convIds = participations.map((p) => p.conversationId);
    const readMap = new Map(participations.map((p) => [p.conversationId, p.lastReadAt]));

    const convos = db
      .select()
      .from(conversations)
      .where(inArray(conversations.id, convIds))
      .orderBy(desc(conversations.updatedAt))
      .all();

    // Get participants + last message for each conversation
    const result = [];
    for (const conv of convos) {
      const parts = db
        .select({
          userId: conversationParticipants.userId,
          username: profiles.username,
          displayName: profiles.displayName,
          avatarUrl: profiles.avatarUrl,
        })
        .from(conversationParticipants)
        .leftJoin(profiles, eq(profiles.id, conversationParticipants.userId))
        .where(eq(conversationParticipants.conversationId, conv.id))
        .all();

      const lastMsg = db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conv.id))
        .orderBy(desc(messages.createdAt))
        .limit(1)
        .get();

      const unreadCount = db
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, conv.id),
            readMap.get(conv.id)
              ? sql`${messages.createdAt} > ${readMap.get(conv.id)}`
              : sql`1=1`,
          ),
        )
        .get();

      result.push({
        id: conv.id,
        subject: conv.subject,
        festival_id: conv.festivalId,
        created_at: conv.createdAt,
        updated_at: conv.updatedAt,
        participants: parts.map((p) => ({
          user_id: p.userId,
          username: p.username,
          display_name: p.displayName,
          avatar_url: p.avatarUrl,
        })),
        last_message: lastMsg
          ? { body: lastMsg.body, sender_id: lastMsg.senderId, created_at: lastMsg.createdAt }
          : null,
        unread_count: unreadCount?.count ?? 0,
      });
    }

    return c.json({ success: true, data: result });
  } catch (error) {
    console.error('[messaging] List conversations error:', error);
    return c.json({ success: false, error: 'Failed to list conversations' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /conversations — start a new conversation
// ---------------------------------------------------------------------------
messagingRoutes.post('/conversations', async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    const { recipient_id, subject, message, festival_id } = body;

    if (!recipient_id || !message?.trim()) {
      return c.json({ success: false, error: 'recipient_id and message are required' }, 400);
    }

    if (recipient_id === userId) {
      return c.json({ success: false, error: 'Cannot message yourself' }, 400);
    }

    // Check recipient exists
    const recipient = db.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, recipient_id)).get();
    if (!recipient) {
      return c.json({ success: false, error: 'Recipient not found' }, 404);
    }

    // Check if a 1:1 conversation already exists between these two users
    const existingConvs = db
      .select({ conversationId: conversationParticipants.conversationId })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId))
      .all();

    let existingConvId: string | null = null;
    if (!subject && !festival_id) {
      for (const ec of existingConvs) {
        const parts = db
          .select({ userId: conversationParticipants.userId })
          .from(conversationParticipants)
          .where(eq(conversationParticipants.conversationId, ec.conversationId))
          .all();
        if (parts.length === 2 && parts.some((p) => p.userId === recipient_id)) {
          // Check no subject (pure DM)
          const conv = db.select().from(conversations).where(eq(conversations.id, ec.conversationId)).get();
          if (conv && !conv.subject && !conv.festivalId) {
            existingConvId = ec.conversationId;
            break;
          }
        }
      }
    }

    const now = Math.floor(Date.now() / 1000);

    if (existingConvId) {
      // Append to existing conversation
      const msgId = crypto.randomUUID();
      db.insert(messages).values({ id: msgId, conversationId: existingConvId, senderId: userId, body: message.trim(), createdAt: now }).run();
      db.update(conversations).set({ updatedAt: now }).where(eq(conversations.id, existingConvId)).run();

      return c.json({
        success: true,
        data: { conversation_id: existingConvId, message_id: msgId },
      }, 201);
    }

    // Create new conversation
    const convId = crypto.randomUUID();
    db.insert(conversations).values({
      id: convId,
      subject: subject?.trim() || null,
      festivalId: festival_id || null,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    }).run();

    // Add participants
    db.insert(conversationParticipants).values({ id: crypto.randomUUID(), conversationId: convId, userId, joinedAt: now, lastReadAt: now }).run();
    db.insert(conversationParticipants).values({ id: crypto.randomUUID(), conversationId: convId, userId: recipient_id, joinedAt: now }).run();

    // Add first message
    const msgId = crypto.randomUUID();
    db.insert(messages).values({ id: msgId, conversationId: convId, senderId: userId, body: message.trim(), createdAt: now }).run();

    return c.json({
      success: true,
      data: { conversation_id: convId, message_id: msgId },
    }, 201);
  } catch (error) {
    console.error('[messaging] Create conversation error:', error);
    return c.json({ success: false, error: 'Failed to create conversation' }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /conversations/:id/messages — get messages in a conversation
// ---------------------------------------------------------------------------
messagingRoutes.get('/conversations/:id/messages', async (c) => {
  try {
    const userId = c.get('userId');
    const convId = c.req.param('id');
    const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 200);
    const before = c.req.query('before'); // cursor: created_at timestamp

    // Verify user is participant
    const participant = db
      .select()
      .from(conversationParticipants)
      .where(and(eq(conversationParticipants.conversationId, convId), eq(conversationParticipants.userId, userId)))
      .get();

    if (!participant) {
      return c.json({ success: false, error: 'Conversation not found' }, 404);
    }

    let query = db
      .select({
        id: messages.id,
        body: messages.body,
        senderId: messages.senderId,
        createdAt: messages.createdAt,
        senderUsername: profiles.username,
        senderDisplayName: profiles.displayName,
        senderAvatarUrl: profiles.avatarUrl,
      })
      .from(messages)
      .leftJoin(profiles, eq(profiles.id, messages.senderId))
      .where(
        before
          ? and(eq(messages.conversationId, convId), sql`${messages.createdAt} < ${parseInt(before, 10)}`)
          : eq(messages.conversationId, convId),
      )
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .all();

    // Mark as read
    const now = Math.floor(Date.now() / 1000);
    db.update(conversationParticipants)
      .set({ lastReadAt: now })
      .where(and(eq(conversationParticipants.conversationId, convId), eq(conversationParticipants.userId, userId)))
      .run();

    return c.json({
      success: true,
      data: query.reverse().map((m) => ({
        id: m.id,
        body: m.body,
        sender_id: m.senderId,
        sender_username: m.senderUsername,
        sender_display_name: m.senderDisplayName,
        sender_avatar_url: m.senderAvatarUrl,
        created_at: m.createdAt,
      })),
    });
  } catch (error) {
    console.error('[messaging] Get messages error:', error);
    return c.json({ success: false, error: 'Failed to get messages' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /conversations/:id/messages — send a message
// ---------------------------------------------------------------------------
messagingRoutes.post('/conversations/:id/messages', async (c) => {
  try {
    const userId = c.get('userId');
    const convId = c.req.param('id');
    const body = await c.req.json();

    if (!body.message?.trim()) {
      return c.json({ success: false, error: 'Message body is required' }, 400);
    }

    // Verify user is participant
    const participant = db
      .select()
      .from(conversationParticipants)
      .where(and(eq(conversationParticipants.conversationId, convId), eq(conversationParticipants.userId, userId)))
      .get();

    if (!participant) {
      return c.json({ success: false, error: 'Conversation not found' }, 404);
    }

    const now = Math.floor(Date.now() / 1000);
    const msgId = crypto.randomUUID();

    db.insert(messages).values({
      id: msgId,
      conversationId: convId,
      senderId: userId,
      body: body.message.trim(),
      createdAt: now,
    }).run();

    // Update conversation timestamp
    db.update(conversations).set({ updatedAt: now }).where(eq(conversations.id, convId)).run();

    // Update sender's read marker
    db.update(conversationParticipants)
      .set({ lastReadAt: now })
      .where(and(eq(conversationParticipants.conversationId, convId), eq(conversationParticipants.userId, userId)))
      .run();

    return c.json({
      success: true,
      data: { id: msgId, body: body.message.trim(), sender_id: userId, created_at: now },
    }, 201);
  } catch (error) {
    console.error('[messaging] Send message error:', error);
    return c.json({ success: false, error: 'Failed to send message' }, 500);
  }
});

export { messagingRoutes };
