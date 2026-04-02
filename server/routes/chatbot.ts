/**
 * Chatbot routes — FAQ management + OpenRouter LLM proxy.
 */

import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { chatbotFaq, festivals, supportTickets, ticketMessages } from '../db/schema.js';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
import { formatResponse } from '../lib/format.js';

const chatbotRoutes = new Hono();

// ---------------------------------------------------------------------------
// GET /faq/festival/:festivalId — get active FAQ entries (public)
// ---------------------------------------------------------------------------
chatbotRoutes.get('/faq/festival/:festivalId', async (c) => {
  try {
    const festivalId = c.req.param('festivalId');
    const rows = db.select().from(chatbotFaq)
      .where(and(eq(chatbotFaq.festivalId, festivalId), eq(chatbotFaq.isActive, 1)))
      .orderBy(chatbotFaq.sortOrder)
      .all();

    return c.json({ success: true, data: rows.map((r) => formatResponse(r)) });
  } catch (error) {
    console.error('[chatbot] FAQ list error:', error);
    return c.json({ success: false, error: 'Failed to list FAQ' }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /faq/festival/:festivalId/all — get all FAQ entries (admin)
// ---------------------------------------------------------------------------
chatbotRoutes.get('/faq/festival/:festivalId/all', authMiddleware, async (c) => {
  try {
    const festivalId = c.req.param('festivalId');
    const rows = db.select().from(chatbotFaq)
      .where(eq(chatbotFaq.festivalId, festivalId))
      .orderBy(chatbotFaq.sortOrder)
      .all();

    return c.json({ success: true, data: rows.map((r) => formatResponse(r)) });
  } catch (error) {
    console.error('[chatbot] FAQ list all error:', error);
    return c.json({ success: false, error: 'Failed to list FAQ' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /faq/festival/:festivalId — create FAQ entry
// ---------------------------------------------------------------------------
chatbotRoutes.post('/faq/festival/:festivalId', authMiddleware, async (c) => {
  try {
    const festivalId = c.req.param('festivalId');
    const body = await c.req.json();

    if (!body.question || !body.answer) {
      return c.json({ success: false, error: 'Question and answer are required' }, 400);
    }

    const now = Math.floor(Date.now() / 1000);
    const id = crypto.randomUUID();

    db.insert(chatbotFaq).values({
      id,
      festivalId,
      question: body.question,
      answer: body.answer,
      category: body.category || 'general',
      sortOrder: body.sort_order ?? 0,
      isActive: body.is_active ?? 1,
      createdAt: now,
      updatedAt: now,
    }).run();

    const created = db.select().from(chatbotFaq).where(eq(chatbotFaq.id, id)).get();
    return c.json({ success: true, data: formatResponse(created!) }, 201);
  } catch (error) {
    console.error('[chatbot] FAQ create error:', error);
    return c.json({ success: false, error: 'Failed to create FAQ' }, 500);
  }
});

// ---------------------------------------------------------------------------
// PUT /faq/:id — update FAQ entry
// ---------------------------------------------------------------------------
chatbotRoutes.put('/faq/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    const existing = db.select().from(chatbotFaq).where(eq(chatbotFaq.id, id)).get();
    if (!existing) {
      return c.json({ success: false, error: 'FAQ not found' }, 404);
    }

    const updateData: Record<string, unknown> = { updatedAt: now };
    if (body.question !== undefined) updateData.question = body.question;
    if (body.answer !== undefined) updateData.answer = body.answer;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.sort_order !== undefined) updateData.sortOrder = body.sort_order;
    if (body.is_active !== undefined) updateData.isActive = body.is_active;

    db.update(chatbotFaq).set(updateData).where(eq(chatbotFaq.id, id)).run();
    const updated = db.select().from(chatbotFaq).where(eq(chatbotFaq.id, id)).get();
    return c.json({ success: true, data: formatResponse(updated!) });
  } catch (error) {
    console.error('[chatbot] FAQ update error:', error);
    return c.json({ success: false, error: 'Failed to update FAQ' }, 500);
  }
});

// ---------------------------------------------------------------------------
// DELETE /faq/:id — delete FAQ entry
// ---------------------------------------------------------------------------
chatbotRoutes.delete('/faq/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const existing = db.select().from(chatbotFaq).where(eq(chatbotFaq.id, id)).get();
    if (!existing) {
      return c.json({ success: false, error: 'FAQ not found' }, 404);
    }
    db.delete(chatbotFaq).where(eq(chatbotFaq.id, id)).run();
    return c.json({ success: true, data: { message: 'FAQ deleted' } });
  } catch (error) {
    console.error('[chatbot] FAQ delete error:', error);
    return c.json({ success: false, error: 'Failed to delete FAQ' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /chat — proxy to OpenRouter LLM with festival context
// ---------------------------------------------------------------------------
chatbotRoutes.post('/chat', optionalAuth, async (c) => {
  try {
    const body = await c.req.json();
    const { festival_id, messages, user_message } = body;

    if (!festival_id || !user_message) {
      return c.json({ success: false, error: 'festival_id and user_message are required' }, 400);
    }

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
      return c.json({ success: false, error: 'Chatbot is not configured' }, 503);
    }

    // Build context from festival info + FAQ
    const festival = db.select().from(festivals).where(eq(festivals.id, festival_id)).get();
    if (!festival) {
      return c.json({ success: false, error: 'Festival not found' }, 404);
    }

    const faqs = db.select().from(chatbotFaq)
      .where(and(eq(chatbotFaq.festivalId, festival_id), eq(chatbotFaq.isActive, 1)))
      .all();

    const faqContext = faqs.length > 0
      ? faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')
      : '';

    const systemPrompt = `Tu es l'assistant virtuel du festival "${festival.name}". Tu aides les visiteurs, benevoles et exposants a trouver des informations sur le festival.

Informations sur le festival :
- Nom : ${festival.name}
- Description : ${festival.description || 'Non disponible'}
- Lieu : ${festival.location || 'Non precise'}
- Contact : ${festival.contactEmail || 'Non disponible'}

${faqContext ? `FAQ du festival :\n${faqContext}` : ''}

Regles :
- Reponds toujours en francais
- Sois concis et utile
- Si tu ne connais pas la reponse, suggere de creer un ticket support
- Ne reponds qu'aux questions liees au festival
- Si l'utilisateur veut signaler un probleme ou faire une demande complexe, propose de creer un ticket support`;

    // Build message history
    const chatMessages = [
      { role: 'system', content: systemPrompt },
      ...(messages || []).slice(-10), // Keep last 10 messages for context
      { role: 'user', content: user_message },
    ];

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:3000',
        'X-Title': `Festosh - ${festival.name}`,
      },
      body: JSON.stringify({
        model: 'moonshotai/kimi-k2.5',
        messages: chatMessages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[chatbot] OpenRouter error:', errText);
      return c.json({ success: false, error: 'Chatbot service unavailable' }, 502);
    }

    const result = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const assistantMessage = result.choices?.[0]?.message?.content || 'Desole, je ne peux pas repondre pour le moment.';

    return c.json({
      success: true,
      data: {
        message: assistantMessage,
      },
    });
  } catch (error) {
    console.error('[chatbot] Chat error:', error);
    return c.json({ success: false, error: 'Failed to process chat' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /chat/create-ticket — create ticket from chatbot conversation
// ---------------------------------------------------------------------------
chatbotRoutes.post('/chat/create-ticket', optionalAuth, async (c) => {
  try {
    const body = await c.req.json();
    const userId = c.get('userId') || null;
    const { festival_id, subject, message, guest_name, guest_email, category } = body;

    if (!festival_id || !subject || !message) {
      return c.json({ success: false, error: 'festival_id, subject and message are required' }, 400);
    }

    if (!userId && (!guest_name || !guest_email)) {
      return c.json({ success: false, error: 'Guest name and email are required' }, 400);
    }

    const now = Math.floor(Date.now() / 1000);
    const ticketId = crypto.randomUUID();

    db.insert(supportTickets).values({
      id: ticketId,
      festivalId: festival_id,
      userId,
      guestName: guest_name || null,
      guestEmail: guest_email || null,
      subject,
      category: category || 'general',
      priority: 'medium',
      status: 'open',
      createdAt: now,
      updatedAt: now,
    }).run();

    db.insert(ticketMessages).values({
      id: crypto.randomUUID(),
      ticketId,
      senderId: userId,
      senderType: 'user',
      content: message,
      isInternal: 0,
      createdAt: now,
    }).run();

    return c.json({
      success: true,
      data: { ticket_id: ticketId, message: 'Ticket cree avec succes' },
    }, 201);
  } catch (error) {
    console.error('[chatbot] Create ticket error:', error);
    return c.json({ success: false, error: 'Failed to create ticket' }, 500);
  }
});

export { chatbotRoutes };
