/**
 * Billing routes — billing profiles, platform invoices, admin subscription management.
 */

import { Hono } from 'hono';
import { eq, and, desc, sql, like } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import {
  profiles,
  billingProfiles,
  platformInvoices,
  subscriptions,
  subscriptionPlans,
  payments,
} from '../db/schema.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { formatResponse } from '../lib/format.js';

const billingRoutes = new Hono();

function generateInvoiceNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const seq = crypto.randomUUID().slice(0, 4).toUpperCase();
  return `FEST-${y}${m}-${seq}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// BILLING PROFILE (organizer self-service)
// ═══════════════════════════════════════════════════════════════════════════

billingRoutes.get('/my-profile', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const bp = db.select().from(billingProfiles).where(eq(billingProfiles.userId, userId)).get();
    return c.json({ success: true, data: bp ? formatResponse(bp) : null });
  } catch (error) {
    console.error('[billing] Get profile error:', error);
    return c.json({ success: false, error: 'Failed to get billing profile' }, 500);
  }
});

billingRoutes.put('/my-profile', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    const existing = db.select().from(billingProfiles).where(eq(billingProfiles.userId, userId)).get();

    if (existing) {
      const keyMap: Record<string, string> = {
        company_name: 'companyName', billing_email: 'billingEmail',
        vat_number: 'vatNumber', address_line1: 'addressLine1',
        address_line2: 'addressLine2', postal_code: 'postalCode',
        city: 'city', country: 'country',
      };
      const update: Record<string, unknown> = { updatedAt: now };
      for (const [bk, sk] of Object.entries(keyMap)) {
        if (body[bk] !== undefined) update[sk] = body[bk];
      }
      db.update(billingProfiles).set(update).where(eq(billingProfiles.userId, userId)).run();
    } else {
      db.insert(billingProfiles).values({
        id: crypto.randomUUID(), userId,
        companyName: body.company_name || null, billingEmail: body.billing_email || null,
        vatNumber: body.vat_number || null,
        addressLine1: body.address_line1 || null, addressLine2: body.address_line2 || null,
        postalCode: body.postal_code || null, city: body.city || null,
        country: body.country || 'FR', createdAt: now, updatedAt: now,
      }).run();
    }

    const updated = db.select().from(billingProfiles).where(eq(billingProfiles.userId, userId)).get();
    return c.json({ success: true, data: updated ? formatResponse(updated) : null });
  } catch (error) {
    console.error('[billing] Update profile error:', error);
    return c.json({ success: false, error: 'Failed to update billing profile' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// MY INVOICES (organizer)
// ═══════════════════════════════════════════════════════════════════════════

billingRoutes.get('/my-invoices', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const rows = db.select().from(platformInvoices)
      .where(eq(platformInvoices.userId, userId))
      .orderBy(desc(platformInvoices.issuedAt))
      .all();

    return c.json({ success: true, data: rows.map((r) => formatResponse(r)) });
  } catch (error) {
    console.error('[billing] My invoices error:', error);
    return c.json({ success: false, error: 'Failed to list invoices' }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /invoices/:id/pdf — render invoice as printable HTML (PDF via browser)
// ---------------------------------------------------------------------------
billingRoutes.get('/invoices/:id/pdf', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const role = c.get('platformRole');
    const id = c.req.param('id');

    const inv = db.select().from(platformInvoices).where(eq(platformInvoices.id, id)).get();
    if (!inv) return c.json({ success: false, error: 'Invoice not found' }, 404);

    // Only owner or admin can view
    if (inv.userId !== userId && role !== 'admin') {
      return c.json({ success: false, error: 'Forbidden' }, 403);
    }

    const fmtDate = (ts: number | null) => {
      if (!ts) return '—';
      return new Date(ts * 1000).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
    };
    const fmtCurrency = (cents: number) => (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: inv.currency || 'EUR' });

    const statusLabel = inv.status === 'paid' ? 'Payee' : inv.status === 'pending' ? 'En attente' : inv.status;

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<title>Facture ${inv.invoiceNumber}</title>
<style>
  @page { size: A4; margin: 20mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #1a1a1a; font-size: 13px; line-height: 1.5; }
  .page { max-width: 800px; margin: 0 auto; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
  .brand { font-size: 28px; font-weight: 800; color: #4f46e5; letter-spacing: -0.5px; }
  .brand-sub { font-size: 11px; color: #6b7280; margin-top: 2px; }
  .invoice-title { text-align: right; }
  .invoice-title h1 { font-size: 22px; font-weight: 700; color: #1a1a1a; }
  .invoice-title .number { font-size: 14px; color: #6b7280; margin-top: 2px; }
  .status { display: inline-block; padding: 3px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .status-paid { background: #d1fae5; color: #065f46; }
  .status-pending { background: #fef3c7; color: #92400e; }
  .meta { display: flex; justify-content: space-between; margin-bottom: 32px; gap: 40px; }
  .meta-block { flex: 1; }
  .meta-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-bottom: 6px; }
  .meta-value { font-size: 13px; color: #374151; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  thead th { text-align: left; padding: 10px 16px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
  thead th.right { text-align: right; }
  tbody td { padding: 14px 16px; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
  tbody td.right { text-align: right; }
  .totals { margin-left: auto; width: 280px; }
  .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; color: #374151; }
  .totals-row.total { border-top: 2px solid #1a1a1a; padding-top: 12px; margin-top: 4px; font-size: 16px; font-weight: 700; color: #1a1a1a; }
  .footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
  .notes { margin-top: 24px; padding: 16px; background: #f9fafb; border-radius: 8px; font-size: 12px; color: #6b7280; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none; } }
  .print-btn { position: fixed; top: 20px; right: 20px; padding: 10px 24px; background: #4f46e5; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; z-index: 100; }
  .print-btn:hover { background: #4338ca; }
</style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">Telecharger PDF</button>
<div class="page">
  <div class="header">
    <div>
      <div class="brand">Festosh</div>
      <div class="brand-sub">Plateforme de gestion de festivals</div>
    </div>
    <div class="invoice-title">
      <h1>FACTURE</h1>
      <div class="number">${inv.invoiceNumber}</div>
      <div style="margin-top:8px">
        <span class="status status-${inv.status}">${statusLabel}</span>
      </div>
    </div>
  </div>

  <div class="meta">
    <div class="meta-block">
      <div class="meta-label">Emetteur</div>
      <div class="meta-value">
        <strong>Festosh — Studio Miyukini</strong><br/>
        festosh.net
      </div>
    </div>
    <div class="meta-block">
      <div class="meta-label">Client</div>
      <div class="meta-value">
        ${inv.billingName ? `<strong>${inv.billingName}</strong><br/>` : ''}
        ${inv.billingEmail || ''}${inv.billingAddress ? `<br/>${inv.billingAddress}` : ''}
        ${inv.billingVat ? `<br/>TVA : ${inv.billingVat}` : ''}
      </div>
    </div>
    <div class="meta-block">
      <div class="meta-label">Dates</div>
      <div class="meta-value">
        Emise le : ${fmtDate(inv.issuedAt)}<br/>
        ${inv.dueAt ? `Echeance : ${fmtDate(inv.dueAt)}<br/>` : ''}
        ${inv.paidAt ? `Payee le : ${fmtDate(inv.paidAt)}` : ''}
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="right">Montant HT</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${inv.label}</td>
        <td class="right">${fmtCurrency(inv.subtotalCents)}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row">
      <span>Sous-total HT</span>
      <span>${fmtCurrency(inv.subtotalCents)}</span>
    </div>
    <div class="totals-row">
      <span>TVA (${Math.round((inv.taxRate || 0.20) * 100)}%)</span>
      <span>${fmtCurrency(inv.taxCents)}</span>
    </div>
    <div class="totals-row total">
      <span>Total TTC</span>
      <span>${fmtCurrency(inv.totalCents)}</span>
    </div>
  </div>

  ${inv.notes ? `<div class="notes"><strong>Notes :</strong> ${inv.notes}</div>` : ''}

  <div class="footer">
    Festosh — Studio Miyukini &middot; festosh.net<br/>
    Facture generee automatiquement
  </div>
</div>
</body>
</html>`;

    return c.html(html);
  } catch (error) {
    console.error('[billing] Invoice PDF error:', error);
    return c.json({ success: false, error: 'Failed to generate invoice' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN: Subscription & billing management
// ═══════════════════════════════════════════════════════════════════════════

// List all subscriptions with search/filter
billingRoutes.get('/admin/subscriptions', authMiddleware, requireRole(['admin']), async (c) => {
  try {
    const status = c.req.query('status') || '';
    const search = c.req.query('search') || '';
    const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 200);
    const offset = parseInt(c.req.query('offset') || '0', 10);

    const allSubs = db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt)).all();

    let filtered = allSubs;
    if (status) filtered = filtered.filter((s) => s.status === status);

    // Enrich with user + plan info
    const enriched = filtered.map((s) => {
      const user = db.select({ username: profiles.username, displayName: profiles.displayName, email: profiles.email })
        .from(profiles).where(eq(profiles.id, s.userId)).get();
      const plan = db.select({ name: subscriptionPlans.name, slug: subscriptionPlans.slug, priceCents: subscriptionPlans.priceCents })
        .from(subscriptionPlans).where(eq(subscriptionPlans.id, s.planId)).get();
      return {
        ...formatResponse(s),
        user_name: user?.displayName || user?.username,
        user_email: user?.email,
        plan_name: plan?.name,
        plan_slug: plan?.slug,
        plan_price_cents: plan?.priceCents,
      };
    });

    // Search filter (on enriched data)
    let result = enriched;
    if (search) {
      const q = search.toLowerCase();
      result = enriched.filter((s) =>
        (s.user_name as string)?.toLowerCase().includes(q) ||
        (s.user_email as string)?.toLowerCase().includes(q),
      );
    }

    const total = result.length;
    const paged = result.slice(offset, offset + limit);

    // Stats
    const stats = {
      total: allSubs.length,
      active: allSubs.filter((s) => s.status === 'active').length,
      cancelled: allSubs.filter((s) => s.status === 'cancelled').length,
      trialing: allSubs.filter((s) => s.status === 'trialing').length,
      mrr_cents: allSubs
        .filter((s) => s.status === 'active')
        .reduce((sum, s) => {
          const plan = db.select({ priceCents: subscriptionPlans.priceCents, interval: subscriptionPlans.interval })
            .from(subscriptionPlans).where(eq(subscriptionPlans.id, s.planId)).get();
          if (!plan) return sum;
          return sum + (plan.interval === 'yearly' ? Math.round(plan.priceCents / 12) : plan.priceCents);
        }, 0),
    };

    // Beta users count
    const betaCount = db.select({ count: sql<number>`count(*)` }).from(profiles)
      .where(eq(profiles.isBeta, 1)).get();

    return c.json({
      success: true,
      data: paged,
      stats: { ...stats, beta_users: betaCount?.count ?? 0 },
      pagination: { total, limit, offset },
    });
  } catch (error) {
    console.error('[billing] Admin list subs error:', error);
    return c.json({ success: false, error: 'Failed to list subscriptions' }, 500);
  }
});

// Admin: manually create/extend subscription for a user
// Supports: months (number), lifetime (boolean), free (boolean)
billingRoutes.post('/admin/grant', authMiddleware, requireRole(['admin']), async (c) => {
  try {
    const body = await c.req.json();
    const { user_id, plan_id, months, lifetime, free, note } = body;

    if (!user_id) return c.json({ success: false, error: 'user_id required' }, 400);

    const user = db.select().from(profiles).where(eq(profiles.id, user_id)).get();
    if (!user) return c.json({ success: false, error: 'User not found' }, 404);

    const now = Math.floor(Date.now() / 1000);

    // Lifetime = 100 years
    const LIFETIME_SECONDS = 100 * 365 * 86400;
    const isLifetime = !!lifetime;
    const isFree = !!free || isLifetime;

    // Get plan (optional for lifetime/free grants)
    let plan = null;
    if (plan_id) {
      plan = db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, plan_id)).get();
      if (!plan) return c.json({ success: false, error: 'Plan not found' }, 404);
    }

    const duration = isLifetime
      ? LIFETIME_SECONDS
      : (months || (plan?.interval === 'yearly' ? 12 : 1)) * 30 * 86400;

    const paymentMethod = isLifetime ? 'lifetime_grant' : isFree ? 'free_grant' : 'admin_grant';
    const label = isLifetime
      ? 'Abonnement gratuit a vie'
      : isFree
        ? `Abonnement offert (${months || 1} mois)`
        : `Abonnement ${plan?.name || 'Organisateur'}`;

    // Check existing active subscription
    const existing = db.select().from(subscriptions)
      .where(and(eq(subscriptions.userId, user_id), eq(subscriptions.status, 'active')))
      .get();

    if (existing) {
      // Extend existing subscription
      const newEnd = isLifetime ? now + LIFETIME_SECONDS : existing.currentPeriodEnd + duration;
      db.update(subscriptions).set({
        currentPeriodEnd: newEnd,
        paymentMethod,
        updatedAt: now,
      }).where(eq(subscriptions.id, existing.id)).run();

      return c.json({
        success: true,
        data: {
          message: isLifetime ? 'Abonnement a vie accorde' : `Abonnement prolonge de ${months || 1} mois`,
          subscription_id: existing.id,
          new_end: newEnd,
          is_lifetime: isLifetime,
        },
      });
    }

    // Create new subscription
    const subId = crypto.randomUUID();
    const planId = plan?.id || db.select().from(subscriptionPlans).limit(1).get()?.id;
    if (!planId) return c.json({ success: false, error: 'No plan available' }, 400);

    db.insert(subscriptions).values({
      id: subId, userId: user_id, planId,
      status: 'active', currentPeriodStart: now, currentPeriodEnd: now + duration,
      paymentMethod, createdAt: now, updatedAt: now,
    }).run();

    db.update(profiles).set({ subscriptionStatus: 'active', platformRole: 'organizer' })
      .where(eq(profiles.id, user_id)).run();

    // Generate invoice (0€ for free/lifetime)
    const bp = db.select().from(billingProfiles).where(eq(billingProfiles.userId, user_id)).get();
    const priceCents = isFree ? 0 : (plan?.priceCents || 0);
    const taxCents = Math.round(priceCents * 0.20);

    db.insert(platformInvoices).values({
      id: crypto.randomUUID(), userId: user_id, subscriptionId: subId,
      invoiceNumber: generateInvoiceNumber(),
      billingName: bp?.companyName || user.displayName || user.username || '',
      billingEmail: bp?.billingEmail || user.email || '',
      billingAddress: bp ? [bp.addressLine1, bp.addressLine2, bp.postalCode, bp.city, bp.country].filter(Boolean).join(', ') : '',
      billingVat: bp?.vatNumber || null,
      label,
      subtotalCents: priceCents, taxRate: isFree ? 0 : 0.20, taxCents: isFree ? 0 : taxCents,
      totalCents: isFree ? 0 : priceCents + taxCents,
      currency: 'EUR', status: isFree ? 'paid' : 'paid',
      issuedAt: now, paidAt: now,
      notes: note || (isLifetime ? 'Abonnement gratuit a vie offert par l\'administrateur' : isFree ? 'Mois offerts par l\'administrateur' : null),
    }).run();

    return c.json({
      success: true,
      data: {
        subscription_id: subId,
        message: label,
        is_lifetime: isLifetime,
        is_free: isFree,
        period_end: now + duration,
      },
    }, 201);
  } catch (error) {
    console.error('[billing] Admin grant error:', error);
    return c.json({ success: false, error: 'Failed to grant subscription' }, 500);
  }
});

// Admin: add free months to an existing subscription
billingRoutes.post('/admin/add-months/:subId', authMiddleware, requireRole(['admin']), async (c) => {
  try {
    const subId = c.req.param('subId');
    const body = await c.req.json();
    const months = body.months || 1;
    const now = Math.floor(Date.now() / 1000);

    const sub = db.select().from(subscriptions).where(eq(subscriptions.id, subId)).get();
    if (!sub) return c.json({ success: false, error: 'Subscription not found' }, 404);

    const addSeconds = months * 30 * 86400;
    const newEnd = sub.currentPeriodEnd + addSeconds;

    db.update(subscriptions).set({ currentPeriodEnd: newEnd, updatedAt: now })
      .where(eq(subscriptions.id, subId)).run();

    return c.json({
      success: true,
      data: {
        message: `${months} mois offerts`,
        new_end: newEnd,
        subscription_id: subId,
      },
    });
  } catch (error) {
    console.error('[billing] Admin add months error:', error);
    return c.json({ success: false, error: 'Failed to add months' }, 500);
  }
});

// Admin: cancel a subscription
billingRoutes.post('/admin/cancel/:subId', authMiddleware, requireRole(['admin']), async (c) => {
  try {
    const subId = c.req.param('subId');
    const now = Math.floor(Date.now() / 1000);

    const sub = db.select().from(subscriptions).where(eq(subscriptions.id, subId)).get();
    if (!sub) return c.json({ success: false, error: 'Subscription not found' }, 404);

    db.update(subscriptions).set({ status: 'cancelled', cancelledAt: now, updatedAt: now })
      .where(eq(subscriptions.id, subId)).run();
    db.update(profiles).set({ subscriptionStatus: 'cancelled' })
      .where(eq(profiles.id, sub.userId)).run();

    return c.json({ success: true, data: { message: 'Subscription cancelled' } });
  } catch (error) {
    console.error('[billing] Admin cancel error:', error);
    return c.json({ success: false, error: 'Failed to cancel subscription' }, 500);
  }
});

// Admin: list all platform invoices
billingRoutes.get('/admin/invoices', authMiddleware, requireRole(['admin']), async (c) => {
  try {
    const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 200);
    const offset = parseInt(c.req.query('offset') || '0', 10);

    const total = db.select({ count: sql<number>`count(*)` }).from(platformInvoices).get();
    const rows = db.select().from(platformInvoices)
      .orderBy(desc(platformInvoices.issuedAt))
      .limit(limit).offset(offset)
      .all();

    return c.json({
      success: true,
      data: rows.map((r) => formatResponse(r)),
      pagination: { total: total?.count ?? 0, limit, offset },
    });
  } catch (error) {
    console.error('[billing] Admin invoices error:', error);
    return c.json({ success: false, error: 'Failed to list invoices' }, 500);
  }
});

// Admin: revenue stats
billingRoutes.get('/admin/revenue', authMiddleware, requireRole(['admin']), async (c) => {
  try {
    const allPayments = db.select().from(payments).where(eq(payments.status, 'succeeded')).all();
    const totalRevenue = allPayments.reduce((s, p) => s + p.amountCents, 0);

    const thisMonth = new Date();
    thisMonth.setDate(1); thisMonth.setHours(0, 0, 0, 0);
    const thisMonthTs = Math.floor(thisMonth.getTime() / 1000);
    const monthlyRevenue = allPayments.filter((p) => (p.createdAt ?? 0) >= thisMonthTs).reduce((s, p) => s + p.amountCents, 0);

    const activeSubs = db.select({ count: sql<number>`count(*)` }).from(subscriptions)
      .where(eq(subscriptions.status, 'active')).get();
    const betaUsers = db.select({ count: sql<number>`count(*)` }).from(profiles)
      .where(eq(profiles.isBeta, 1)).get();

    return c.json({
      success: true,
      data: {
        total_revenue_cents: totalRevenue,
        monthly_revenue_cents: monthlyRevenue,
        active_subscriptions: activeSubs?.count ?? 0,
        beta_users: betaUsers?.count ?? 0,
        total_payments: allPayments.length,
      },
    });
  } catch (error) {
    console.error('[billing] Revenue error:', error);
    return c.json({ success: false, error: 'Failed to get revenue' }, 500);
  }
});

export { billingRoutes };
