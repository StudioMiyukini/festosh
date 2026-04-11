/**
 * Platform-wide exhibitor directory + invoice management + document renewal.
 */

import { Hono } from 'hono';
import { eq, and, like, or, sql, desc, lt } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import {
  exhibitorProfiles,
  profiles,
  boothApplications,
  editions,
  festivals,
  documents,
  invoices,
  notifications,
} from '../db/schema.js';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
import { formatResponse } from '../lib/format.js';

const exhibitorDirectoryRoutes = new Hono();

// ---------------------------------------------------------------------------
// GET /directory — public exhibitor directory (platform-wide)
// ---------------------------------------------------------------------------
exhibitorDirectoryRoutes.get('/directory', optionalAuth, async (c) => {
  try {
    const search = c.req.query('search') || '';
    const category = c.req.query('category') || '';
    const city = c.req.query('city') || '';
    const domain = c.req.query('domain') || '';
    const pmrOnly = c.req.query('pmr') === '1';
    const limit = Math.min(parseInt(c.req.query('limit') || '24', 10), 100);
    const offset = parseInt(c.req.query('offset') || '0', 10);

    // Determine viewer role: authenticated organizer/admin sees more fields
    const userRole = c.get('userRole') as string | undefined;
    const isOrganizer = userRole === 'organizer' || userRole === 'admin';

    const allItems = db
      .select()
      .from(exhibitorProfiles)
      .all();

    // Filter: only directory_visible profiles for public view
    let filtered = allItems.filter((p) => isOrganizer || p.directoryVisible);

    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter((p) =>
        (p.companyName?.toLowerCase().includes(s)) ||
        (p.tradeName?.toLowerCase().includes(s)) ||
        (p.description?.toLowerCase().includes(s)) ||
        (p.activityType?.toLowerCase().includes(s)),
      );
    }
    if (category) {
      filtered = filtered.filter((p) => p.category === category);
    }
    if (city) {
      const c2 = city.toLowerCase();
      filtered = filtered.filter((p) => p.city?.toLowerCase().includes(c2));
    }
    if (domain) {
      filtered = filtered.filter((p) => {
        const domains: string[] = p.domains ? JSON.parse(p.domains as string) : [];
        return domains.some((d) => d.toLowerCase() === domain.toLowerCase());
      });
    }
    if (pmrOnly) {
      filtered = filtered.filter((p) => p.isPmr);
    }

    filtered.sort((a, b) => (a.companyName || '').localeCompare(b.companyName || ''));
    const total = filtered.length;
    const page = filtered.slice(offset, offset + limit);

    // Apply field-level visibility: strip organizer-only fields for public viewers
    const SENSITIVE_FIELDS = [
      'contactPhone', 'contactEmail', 'siret', 'vatNumber',
      'registrationNumber', 'insurerName', 'insuranceContractNumber',
      'insuranceExpiresAt', 'legalForm',
      'addressLine1', 'addressLine2', 'postalCode',
      'kbisFileUrl', 'insuranceFileUrl', 'idFileUrl',
      'billingAddressLine1', 'billingAddressLine2', 'billingPostalCode',
      'billingCity', 'billingCountry',
      'contactFirstName', 'contactLastName',
    ];

    const items = page.map((p) => {
      const vis: Record<string, string> = p.visibility ? JSON.parse(p.visibility as string) : {};
      const result: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(p)) {
        if (key === 'visibility' || key === 'directoryVisible') continue;
        // Sensitive fields: check visibility setting
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        if (SENSITIVE_FIELDS.includes(key) && !isOrganizer) {
          const fieldVis = vis[snakeKey] || vis[key] || 'organizer';
          if (fieldVis !== 'public') {
            result[snakeKey] = null; // redact
            continue;
          }
        }
        result[snakeKey] = value;
      }
      result['directory_visible'] = p.directoryVisible;
      return result;
    });

    // Get distinct categories and cities from visible profiles
    const visibleProfiles = allItems.filter((p) => isOrganizer || p.directoryVisible);
    const categories = [...new Set(visibleProfiles.map((p) => p.category).filter(Boolean))];
    const cities = [...new Set(visibleProfiles.map((p) => p.city).filter(Boolean))];
    const domains = [...new Set(
      visibleProfiles.flatMap((p) => {
        try { return p.domains ? JSON.parse(p.domains as string) : []; } catch { return []; }
      }).filter(Boolean),
    )].sort();

    return c.json({
      success: true,
      data: items,
      filters: { categories, cities, domains },
      pagination: { total, limit, offset },
    });
  } catch (error) {
    console.error('[exhibitor-directory] Directory error:', error);
    return c.json({ success: false, error: 'Failed to fetch directory' }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /my-visibility — get current visibility settings
// ---------------------------------------------------------------------------
exhibitorDirectoryRoutes.get('/my-visibility', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const profile = db.select().from(exhibitorProfiles).where(eq(exhibitorProfiles.userId, userId)).get();
    if (!profile) return c.json({ success: false, error: 'Exhibitor profile not found' }, 404);

    return c.json({
      success: true,
      data: {
        directory_visible: profile.directoryVisible,
        visibility: profile.visibility ? JSON.parse(profile.visibility as string) : {},
      },
    });
  } catch (error) {
    console.error('[exhibitor-directory] Get visibility error:', error);
    return c.json({ success: false, error: 'Failed to get visibility settings' }, 500);
  }
});

// ---------------------------------------------------------------------------
// PUT /my-visibility — update visibility settings
// ---------------------------------------------------------------------------
exhibitorDirectoryRoutes.put('/my-visibility', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();

    const profile = db.select().from(exhibitorProfiles).where(eq(exhibitorProfiles.userId, userId)).get();
    if (!profile) return c.json({ success: false, error: 'Exhibitor profile not found' }, 404);

    const VALID_VISIBILITY = ['public', 'organizer'];
    const updateData: Record<string, unknown> = { updatedAt: Math.floor(Date.now() / 1000) };

    if (body.directory_visible !== undefined) {
      updateData.directoryVisible = body.directory_visible ? 1 : 0;
    }

    if (body.visibility && typeof body.visibility === 'object') {
      // Validate each field's value
      const cleaned: Record<string, string> = {};
      for (const [field, value] of Object.entries(body.visibility)) {
        if (typeof value === 'string' && VALID_VISIBILITY.includes(value)) {
          cleaned[field] = value;
        }
      }
      updateData.visibility = JSON.stringify(cleaned);
    }

    db.update(exhibitorProfiles).set(updateData).where(eq(exhibitorProfiles.userId, userId)).run();

    return c.json({ success: true, data: { message: 'Visibility settings updated' } });
  } catch (error) {
    console.error('[exhibitor-directory] Update visibility error:', error);
    return c.json({ success: false, error: 'Failed to update visibility settings' }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /my-applications — exhibitor's applications across all festivals
// ---------------------------------------------------------------------------
exhibitorDirectoryRoutes.get('/my-applications', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');

    // Get exhibitor profile
    const profile = db
      .select()
      .from(exhibitorProfiles)
      .where(eq(exhibitorProfiles.userId, userId))
      .get();

    if (!profile) {
      return c.json({ success: true, data: [] });
    }

    const apps = db
      .select({
        id: boothApplications.id,
        editionId: boothApplications.editionId,
        status: boothApplications.status,
        createdAt: boothApplications.createdAt,
        amountCents: boothApplications.amountCents,
        isPaid: boothApplications.isPaid,
        festivalName: festivals.name,
        festivalSlug: festivals.slug,
        editionName: editions.name,
      })
      .from(boothApplications)
      .leftJoin(editions, eq(editions.id, boothApplications.editionId))
      .leftJoin(festivals, eq(festivals.id, editions.festivalId))
      .where(eq(boothApplications.exhibitorId, profile.id))
      .orderBy(desc(boothApplications.createdAt))
      .all();

    return c.json({
      success: true,
      data: apps.map((a) => ({
        id: a.id,
        edition_id: a.editionId,
        status: a.status,
        created_at: a.createdAt,
        amount_cents: a.amountCents,
        is_paid: a.isPaid,
        festival_name: a.festivalName,
        festival_slug: a.festivalSlug,
        edition_name: a.editionName,
      })),
    });
  } catch (error) {
    console.error('[exhibitor-directory] My applications error:', error);
    return c.json({ success: false, error: 'Failed to fetch applications' }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /my-documents — exhibitor's documents with expiry info
// ---------------------------------------------------------------------------
exhibitorDirectoryRoutes.get('/my-documents', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');

    const docs = db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId))
      .orderBy(desc(documents.createdAt))
      .all();

    const now = Math.floor(Date.now() / 1000);
    const thirtyDays = 30 * 24 * 60 * 60;

    return c.json({
      success: true,
      data: docs.map((d) => ({
        ...formatResponse(d as Record<string, unknown>),
        is_expiring_soon: d.expiresAt ? d.expiresAt - now < thirtyDays && d.expiresAt > now : false,
        is_expired: d.expiresAt ? d.expiresAt <= now : false,
        days_until_expiry: d.expiresAt ? Math.max(0, Math.ceil((d.expiresAt - now) / 86400)) : null,
      })),
    });
  } catch (error) {
    console.error('[exhibitor-directory] My documents error:', error);
    return c.json({ success: false, error: 'Failed to fetch documents' }, 500);
  }
});

// ---------------------------------------------------------------------------
// PUT /documents/:id/expiry — set document expiry date
// ---------------------------------------------------------------------------
exhibitorDirectoryRoutes.put('/documents/:id/expiry', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const docId = c.req.param('id');
    const body = await c.req.json();

    const doc = db.select().from(documents).where(eq(documents.id, docId)).get();
    if (!doc || doc.userId !== userId) {
      return c.json({ success: false, error: 'Document not found' }, 404);
    }

    db.update(documents)
      .set({
        expiresAt: body.expires_at || null,
        renewalReminderSent: 0,
        updatedAt: Math.floor(Date.now() / 1000),
      })
      .where(eq(documents.id, docId))
      .run();

    return c.json({ success: true, data: { message: 'Expiry date updated' } });
  } catch (error) {
    console.error('[exhibitor-directory] Set expiry error:', error);
    return c.json({ success: false, error: 'Failed to update expiry' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /check-renewals — trigger renewal reminder check (called by cron/admin)
// ---------------------------------------------------------------------------
exhibitorDirectoryRoutes.post('/check-renewals', authMiddleware, async (c) => {
  try {
    const now = Math.floor(Date.now() / 1000);
    const thirtyDays = 30 * 24 * 60 * 60;
    const threshold = now + thirtyDays;

    // Find documents expiring within 30 days that haven't had a reminder sent
    const expiring = db
      .select()
      .from(documents)
      .where(
        and(
          lt(documents.expiresAt, threshold),
          sql`${documents.expiresAt} > ${now}`,
          eq(documents.renewalReminderSent, 0),
        ),
      )
      .all();

    let sent = 0;
    for (const doc of expiring) {
      // Create notification for the user
      db.insert(notifications).values({
        id: crypto.randomUUID(),
        userId: doc.userId,
        title: 'Document bientot expire',
        body: `Votre document "${doc.label || doc.documentType}" expire dans moins de 30 jours. Pensez a le renouveler.`,
        link: '/exhibitor/documents',
        channel: 'in_app',
        createdAt: now,
      }).run();

      db.update(documents)
        .set({ renewalReminderSent: 1 })
        .where(eq(documents.id, doc.id))
        .run();

      sent++;
    }

    return c.json({ success: true, data: { reminders_sent: sent } });
  } catch (error) {
    console.error('[exhibitor-directory] Check renewals error:', error);
    return c.json({ success: false, error: 'Failed to check renewals' }, 500);
  }
});

// ---------------------------------------------------------------------------
// INVOICES
// ---------------------------------------------------------------------------

// GET /my-invoices — exhibitor's invoices across all festivals
exhibitorDirectoryRoutes.get('/my-invoices', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');

    const invs = db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        label: invoices.label,
        amountCents: invoices.amountCents,
        taxCents: invoices.taxCents,
        totalCents: invoices.totalCents,
        currency: invoices.currency,
        status: invoices.status,
        issuedAt: invoices.issuedAt,
        dueAt: invoices.dueAt,
        paidAt: invoices.paidAt,
        pdfUrl: invoices.pdfUrl,
        notes: invoices.notes,
        festivalName: festivals.name,
        festivalSlug: festivals.slug,
        createdAt: invoices.createdAt,
      })
      .from(invoices)
      .leftJoin(festivals, eq(festivals.id, invoices.festivalId))
      .where(eq(invoices.userId, userId))
      .orderBy(desc(invoices.createdAt))
      .all();

    return c.json({
      success: true,
      data: invs.map((inv) => ({
        id: inv.id,
        invoice_number: inv.invoiceNumber,
        label: inv.label,
        amount_cents: inv.amountCents,
        tax_cents: inv.taxCents,
        total_cents: inv.totalCents,
        currency: inv.currency,
        status: inv.status,
        issued_at: inv.issuedAt,
        due_at: inv.dueAt,
        paid_at: inv.paidAt,
        pdf_url: inv.pdfUrl,
        notes: inv.notes,
        festival_name: inv.festivalName,
        festival_slug: inv.festivalSlug,
        created_at: inv.createdAt,
      })),
    });
  } catch (error) {
    console.error('[exhibitor-directory] My invoices error:', error);
    return c.json({ success: false, error: 'Failed to fetch invoices' }, 500);
  }
});

// POST /invoices — create invoice (admin/organizer)
exhibitorDirectoryRoutes.post('/invoices', authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const { user_id, festival_id, edition_id, application_id, label, amount_cents, tax_cents, due_at, notes } = body;

    if (!user_id || !label || amount_cents === undefined) {
      return c.json({ success: false, error: 'user_id, label, and amount_cents are required' }, 400);
    }

    const now = Math.floor(Date.now() / 1000);
    const totalCents = (amount_cents || 0) + (tax_cents || 0);

    // Generate invoice number: INV-YYYYMMDD-XXXX
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const seq = crypto.randomUUID().slice(0, 4).toUpperCase();
    const invoiceNumber = `INV-${dateStr}-${seq}`;

    const id = crypto.randomUUID();
    db.insert(invoices).values({
      id,
      userId: user_id,
      festivalId: festival_id || null,
      editionId: edition_id || null,
      applicationId: application_id || null,
      invoiceNumber,
      label,
      amountCents: amount_cents,
      taxCents: tax_cents || 0,
      totalCents,
      status: 'sent',
      issuedAt: now,
      dueAt: due_at || null,
      notes: notes || null,
      createdAt: now,
      updatedAt: now,
    }).run();

    const created = db.select().from(invoices).where(eq(invoices.id, id)).get();
    return c.json({ success: true, data: created ? formatResponse(created as Record<string, unknown>) : null }, 201);
  } catch (error) {
    console.error('[exhibitor-directory] Create invoice error:', error);
    return c.json({ success: false, error: 'Failed to create invoice' }, 500);
  }
});

// PUT /invoices/:id/status — update invoice status
exhibitorDirectoryRoutes.put('/invoices/:id/status', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const validStatuses = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];

    if (!body.status || !validStatuses.includes(body.status)) {
      return c.json({ success: false, error: 'Invalid status' }, 400);
    }

    const inv = db.select().from(invoices).where(eq(invoices.id, id)).get();
    if (!inv) return c.json({ success: false, error: 'Invoice not found' }, 404);

    const now = Math.floor(Date.now() / 1000);
    const updateData: Record<string, unknown> = { status: body.status, updatedAt: now };
    if (body.status === 'paid') {
      updateData.paidAt = now;
    }

    db.update(invoices).set(updateData).where(eq(invoices.id, id)).run();

    return c.json({ success: true, data: { message: 'Invoice status updated' } });
  } catch (error) {
    console.error('[exhibitor-directory] Update invoice status error:', error);
    return c.json({ success: false, error: 'Failed to update invoice' }, 500);
  }
});

export { exhibitorDirectoryRoutes };
