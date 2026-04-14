/**
 * Subscription & paywall routes.
 *
 * Festosh pricing:
 *   - Free for visitors, exhibitors, volunteers
 *   - Organizers: 5€/month or 50€/year (2 months free)
 *   - Beta phase: free until June 2026, then paywall activates
 *
 * Beta users who signed up before June 2026 get a grace period.
 */

import { Hono } from 'hono';
import { eq, and, desc, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import {
  profiles,
  subscriptionPlans,
  subscriptions,
  payments,
  festivals,
} from '../db/schema.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { formatResponse } from '../lib/format.js';

const subscriptionRoutes = new Hono();

// Beta ends June 1, 2026
const BETA_END_DATE = new Date('2026-06-01T00:00:00Z').getTime() / 1000;
const BETA_GRACE_DAYS = 30; // 30 days grace after beta ends

/**
 * Check if the platform is still in beta.
 */
function isInBeta(): boolean {
  return Math.floor(Date.now() / 1000) < BETA_END_DATE;
}

/**
 * Check if an organizer has active access (beta, subscription, or grace period).
 */
function hasOrganizerAccess(user: {
  isBeta?: number | null;
  betaJoinedAt?: number | null;
  subscriptionStatus?: string | null;
  platformRole?: string | null;
}): { allowed: boolean; reason: string; daysLeft?: number } {
  // Platform admins always have access
  if (user.platformRole === 'admin') {
    return { allowed: true, reason: 'admin' };
  }

  // Still in beta period → everyone has access
  if (isInBeta()) {
    return { allowed: true, reason: 'beta' };
  }

  // Active subscription
  if (user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing') {
    return { allowed: true, reason: 'subscription' };
  }

  // Beta user grace period (30 days after beta ends)
  if (user.isBeta && user.betaJoinedAt) {
    const graceEnd = BETA_END_DATE + (BETA_GRACE_DAYS * 86400);
    const now = Math.floor(Date.now() / 1000);
    if (now < graceEnd) {
      const daysLeft = Math.ceil((graceEnd - now) / 86400);
      return { allowed: true, reason: 'grace_period', daysLeft };
    }
  }

  return { allowed: false, reason: 'no_subscription' };
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC: Plans & pricing info
// ═══════════════════════════════════════════════════════════════════════════

subscriptionRoutes.get('/plans', async (c) => {
  try {
    const plans = db.select().from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, 1))
      .orderBy(subscriptionPlans.sortOrder)
      .all();

    return c.json({
      success: true,
      data: {
        plans: plans.map((p) => formatResponse(p, ['features'])),
        is_beta: isInBeta(),
        beta_end_date: BETA_END_DATE,
        beta_end_formatted: '1er juin 2026',
      },
    });
  } catch (error) {
    console.error('[subscriptions] List plans error:', error);
    return c.json({ success: false, error: 'Failed to list plans' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// AUTH: Check access & subscription status
// ═══════════════════════════════════════════════════════════════════════════

subscriptionRoutes.get('/my-status', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');

    const user = db.select().from(profiles).where(eq(profiles.id, userId)).get();
    if (!user) return c.json({ success: false, error: 'User not found' }, 404);

    const access = hasOrganizerAccess({
      isBeta: user.isBeta,
      betaJoinedAt: user.betaJoinedAt,
      subscriptionStatus: user.subscriptionStatus,
      platformRole: user.platformRole,
    });

    // Get active subscription if any
    const activeSub = db.select().from(subscriptions)
      .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, 'active')))
      .get();

    let plan = null;
    if (activeSub) {
      plan = db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, activeSub.planId)).get();
    }

    // Count user's festivals
    const festivalCount = db.select({ count: sql<number>`count(*)` }).from(festivals)
      .where(eq(festivals.createdBy, userId)).get();

    return c.json({
      success: true,
      data: {
        is_organizer: user.userType === 'organizer' || user.platformRole === 'admin',
        is_beta: !!user.isBeta,
        beta_joined_at: user.betaJoinedAt,
        subscription_status: user.subscriptionStatus || 'none',
        access: access,
        platform_in_beta: isInBeta(),
        beta_end_date: BETA_END_DATE,
        festival_count: festivalCount?.count ?? 0,
        current_subscription: activeSub ? {
          id: activeSub.id,
          plan_name: plan?.name,
          plan_slug: plan?.slug,
          status: activeSub.status,
          current_period_end: activeSub.currentPeriodEnd,
          cancel_at_period_end: activeSub.cancelAtPeriodEnd,
        } : null,
      },
    });
  } catch (error) {
    console.error('[subscriptions] My status error:', error);
    return c.json({ success: false, error: 'Failed to get status' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Join beta
// ═══════════════════════════════════════════════════════════════════════════

subscriptionRoutes.post('/join-beta', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');

    if (!isInBeta()) {
      return c.json({ success: false, error: 'La phase beta est terminee' }, 400);
    }

    const user = db.select().from(profiles).where(eq(profiles.id, userId)).get();
    if (!user) return c.json({ success: false, error: 'User not found' }, 404);

    if (user.isBeta) {
      return c.json({ success: true, data: { message: 'Deja inscrit a la beta', already_beta: true } });
    }

    const now = Math.floor(Date.now() / 1000);
    db.update(profiles).set({
      isBeta: 1,
      betaJoinedAt: now,
      subscriptionStatus: 'beta',
      userType: user.userType === 'visitor' ? 'organizer' : user.userType,
      platformRole: user.platformRole === 'user' ? 'organizer' : user.platformRole,
    }).where(eq(profiles.id, userId)).run();

    return c.json({
      success: true,
      data: {
        message: 'Bienvenue dans la beta Festosh ! Acces gratuit jusqu\'au 1er juin 2026.',
        beta_end: BETA_END_DATE,
      },
    }, 201);
  } catch (error) {
    console.error('[subscriptions] Join beta error:', error);
    return c.json({ success: false, error: 'Failed to join beta' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Subscribe (manual — Stripe integration ready)
// ═══════════════════════════════════════════════════════════════════════════

subscriptionRoutes.post('/subscribe', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();

    if (!body.plan_id) return c.json({ success: false, error: 'plan_id required' }, 400);

    const plan = db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, body.plan_id)).get();
    if (!plan || !plan.isActive) return c.json({ success: false, error: 'Plan not found' }, 404);

    // Check no active subscription
    const existing = db.select().from(subscriptions)
      .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, 'active')))
      .get();
    if (existing) return c.json({ success: false, error: 'Abonnement deja actif' }, 409);

    const now = Math.floor(Date.now() / 1000);
    const periodEnd = plan.interval === 'yearly'
      ? now + (365 * 86400)
      : now + (30 * 86400);

    const subId = crypto.randomUUID();
    db.insert(subscriptions).values({
      id: subId,
      userId,
      planId: plan.id,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      paymentMethod: body.payment_method || 'manual',
      stripeSubscriptionId: body.stripe_subscription_id || null,
      stripeCustomerId: body.stripe_customer_id || null,
      createdAt: now,
      updatedAt: now,
    }).run();

    // Record payment
    db.insert(payments).values({
      id: crypto.randomUUID(),
      userId,
      subscriptionId: subId,
      amountCents: plan.priceCents,
      currency: plan.currency,
      status: 'succeeded',
      paymentMethod: body.payment_method || 'manual',
      description: `Abonnement ${plan.name}`,
      createdAt: now,
    }).run();

    // Update user status
    db.update(profiles).set({
      subscriptionStatus: 'active',
      platformRole: 'organizer',
    }).where(eq(profiles.id, userId)).run();

    return c.json({
      success: true,
      data: {
        subscription_id: subId,
        plan: plan.name,
        period_end: periodEnd,
        message: `Abonnement ${plan.name} active !`,
      },
    }, 201);
  } catch (error) {
    console.error('[subscriptions] Subscribe error:', error);
    return c.json({ success: false, error: 'Failed to subscribe' }, 500);
  }
});

// Cancel subscription
subscriptionRoutes.post('/cancel', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const now = Math.floor(Date.now() / 1000);

    const sub = db.select().from(subscriptions)
      .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, 'active')))
      .get();

    if (!sub) return c.json({ success: false, error: 'Aucun abonnement actif' }, 404);

    // Cancel at end of period (don't revoke immediately)
    db.update(subscriptions).set({
      cancelAtPeriodEnd: 1,
      cancelledAt: now,
      updatedAt: now,
    }).where(eq(subscriptions.id, sub.id)).run();

    return c.json({
      success: true,
      data: {
        message: 'Abonnement annule. Acces maintenu jusqu\'a la fin de la periode.',
        access_until: sub.currentPeriodEnd,
      },
    });
  } catch (error) {
    console.error('[subscriptions] Cancel error:', error);
    return c.json({ success: false, error: 'Failed to cancel' }, 500);
  }
});

// Payment history
subscriptionRoutes.get('/payments', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');

    const rows = db.select().from(payments)
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.createdAt))
      .all();

    return c.json({ success: true, data: rows.map((p) => formatResponse(p)) });
  } catch (error) {
    console.error('[subscriptions] Payments error:', error);
    return c.json({ success: false, error: 'Failed to list payments' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN: Manage plans & subscriptions
// ═══════════════════════════════════════════════════════════════════════════

// Seed default plans
subscriptionRoutes.post('/seed-plans', authMiddleware, requireRole(['admin']), async (c) => {
  try {
    const existing = db.select().from(subscriptionPlans).all();
    if (existing.length > 0) {
      return c.json({ success: true, data: { message: 'Plans already exist', count: existing.length } });
    }

    const now = Math.floor(Date.now() / 1000);

    db.insert(subscriptionPlans).values({
      id: crypto.randomUUID(),
      name: 'Mensuel',
      slug: 'monthly',
      description: 'Acces complet a toutes les fonctionnalites organisateur.',
      priceCents: 500,
      currency: 'EUR',
      interval: 'monthly',
      intervalCount: 1,
      features: JSON.stringify([
        'Festivals illimites',
        'Billetterie integree',
        'CMS personnalisable',
        'Gestion exposants',
        'Marketplace multi-vendeur',
        'Analytics temps reel',
        'Espace de travail collaboratif',
        'QR codes universels',
        'Gamification visiteurs',
        'Support prioritaire',
      ]),
      isActive: 1,
      sortOrder: 0,
      createdAt: now,
    }).run();

    db.insert(subscriptionPlans).values({
      id: crypto.randomUUID(),
      name: 'Annuel',
      slug: 'yearly',
      description: 'Economisez 2 mois — 10 mois au prix de 12.',
      priceCents: 5000,
      currency: 'EUR',
      interval: 'yearly',
      intervalCount: 1,
      features: JSON.stringify([
        'Tout le plan Mensuel',
        '2 mois offerts',
        'Priorite sur les nouvelles fonctionnalites',
        'Badge "Early Supporter"',
      ]),
      isActive: 1,
      sortOrder: 1,
      createdAt: now,
    }).run();

    return c.json({ success: true, data: { message: 'Plans created', count: 2 } }, 201);
  } catch (error) {
    console.error('[subscriptions] Seed plans error:', error);
    return c.json({ success: false, error: 'Failed to seed plans' }, 500);
  }
});

// Admin: list all subscriptions
subscriptionRoutes.get('/admin/all', authMiddleware, requireRole(['admin']), async (c) => {
  try {
    const rows = db.select().from(subscriptions)
      .orderBy(desc(subscriptions.createdAt))
      .all();

    const data = rows.map((s) => {
      const user = db.select({ username: profiles.username, displayName: profiles.displayName, email: profiles.email })
        .from(profiles).where(eq(profiles.id, s.userId)).get();
      const plan = db.select({ name: subscriptionPlans.name, slug: subscriptionPlans.slug })
        .from(subscriptionPlans).where(eq(subscriptionPlans.id, s.planId)).get();

      return {
        ...formatResponse(s),
        user_name: user?.displayName || user?.username,
        user_email: user?.email,
        plan_name: plan?.name,
        plan_slug: plan?.slug,
      };
    });

    return c.json({ success: true, data });
  } catch (error) {
    console.error('[subscriptions] Admin list error:', error);
    return c.json({ success: false, error: 'Failed to list subscriptions' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// MIDDLEWARE: Check organizer access (export for use in other routes)
// ═══════════════════════════════════════════════════════════════════════════

export { subscriptionRoutes, hasOrganizerAccess, isInBeta };