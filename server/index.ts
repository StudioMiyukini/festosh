/**
 * Festosh API — Hono server entry point.
 * Multi-tenant SaaS backend for festival management.
 */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { MiddlewareHandler } from 'hono';

import { initializeDatabase } from './db/index.js';
import { startBackupSchedule } from './lib/backup.js';

import { authRoutes } from './routes/auth.js';
import { festivalRoutes } from './routes/festivals.js';
import { directoryRoutes } from './routes/directory.js';
import { editionRoutes } from './routes/editions.js';
import { cmsRoutes } from './routes/cms.js';
import { exhibitorRoutes } from './routes/exhibitors.js';
import { eventRoutes } from './routes/events.js';
import { venueRoutes } from './routes/venues.js';
import { volunteerRoutes } from './routes/volunteers.js';
import { budgetRoutes } from './routes/budget.js';
import { equipmentRoutes } from './routes/equipment.js';
import { floorPlanRoutes } from './routes/floor-plans.js';
import { notificationRoutes } from './routes/notifications.js';
import { uploadRoutes } from './routes/uploads.js';
import { taskRoutes } from './routes/tasks.js';
import { meetingRoutes } from './routes/meetings.js';
import { emailRoutes } from './routes/emails.js';
import { inviteRoutes } from './routes/invites.js';
import { exportRoutes } from './routes/exports.js';
import { ticketRoutes } from './routes/tickets.js';
import { chatbotRoutes } from './routes/chatbot.js';
import { platformAdminRoutes } from './routes/platform-admin.js';
import { messagingRoutes } from './routes/messaging.js';
import { exhibitorDirectoryRoutes } from './routes/exhibitor-directory.js';
import { posRoutes } from './routes/pos.js';
import { ticketingRoutes } from './routes/ticketing.js';
import { marketplaceRoutes } from './routes/marketplace.js';
import { sponsorRoutes } from './routes/sponsors.js';
import { reservationRoutes } from './routes/reservations.js';
import { gamificationRoutes } from './routes/gamification.js';
import { voteRoutes } from './routes/votes.js';
import { raffleRoutes } from './routes/raffles.js';
import { artistRoutes } from './routes/artists.js';
import { queueRoutes } from './routes/queues.js';
import { analyticsRoutes } from './routes/analytics.js';
import { apiKeyRoutes } from './routes/api-keys.js';
import { visitorHubRoutes } from './routes/visitor-hub.js';
import { qrObjectRoutes } from './routes/qr-objects.js';
import { customRoleRoutes } from './routes/custom-roles.js';
import { workspaceDocRoutes } from './routes/workspace-docs.js';
import { workspaceSheetRoutes } from './routes/workspace-sheets.js';
import { workspaceCalendarRoutes } from './routes/workspace-calendar.js';
import { workspaceTaskRoutes } from './routes/workspace-tasks.js';
import { surveyRoutes } from './routes/surveys.js';
import { subscriptionRoutes } from './routes/subscriptions.js';
import { billingRoutes } from './routes/billing.js';
import { mediaRoutes } from './routes/media.js';
import { regulationRoutes } from './routes/regulations.js';
import { volunteerHubRoutes } from './routes/volunteer-hub.js';

// ---------------------------------------------------------------------------
// Create the Hono app
// ---------------------------------------------------------------------------
const app = new Hono();

// ---------------------------------------------------------------------------
// Security headers middleware (equivalent to helmet)
// ---------------------------------------------------------------------------
const securityHeaders: MiddlewareHandler = async (c, next) => {
  await next();
  // Prevent MIME sniffing
  c.header('X-Content-Type-Options', 'nosniff');
  // Prevent clickjacking
  c.header('X-Frame-Options', 'DENY');
  // XSS protection (legacy browsers)
  c.header('X-XSS-Protection', '1; mode=block');
  // Control referrer information
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Restrict permissions
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  // HSTS — enforce HTTPS (1 year)
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  // Content Security Policy
  const isDev = (process.env.NODE_ENV || 'development') !== 'production';
  const scriptSrc = isDev ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self'";
  const connectSrc = isDev ? "'self' ws: wss:" : "'self'";
  c.header('Content-Security-Policy', `default-src 'self'; script-src ${scriptSrc}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self'; connect-src ${connectSrc}; frame-ancestors 'none'`);
  // Prevent caching of authenticated responses
  if (c.req.header('Authorization')) {
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    c.header('Pragma', 'no-cache');
  }
};

app.use('*', securityHeaders);

// ---------------------------------------------------------------------------
// CORS — dynamic origin based on environment
// ---------------------------------------------------------------------------
const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3002', 'http://127.0.0.1:3002'];

app.use('*', cors({
  origin: (origin) => {
    if (!origin) return ALLOWED_ORIGINS[0]; // Same-origin requests
    if (ALLOWED_ORIGINS.includes(origin)) return origin;
    // Allow specific subdomains only (not wildcard)
    const ALLOWED_SUBDOMAIN_PATTERNS = [
      /^https:\/\/festosh\.net$/,
      /^https:\/\/www\.festosh\.net$/,
      /^https:\/\/[a-z0-9-]+\.festosh\.net$/,
      /^https:\/\/festosh\.miyukini\.com$/,
      /^https:\/\/[a-z0-9-]+\.miyukini\.com$/,
      /^https:\/\/festosh\.miyukini-home\.org$/,
      /^https:\/\/[a-z0-9-]+\.miyukini-home\.org$/,
    ];
    if (ALLOWED_SUBDOMAIN_PATTERNS.some((re) => re.test(origin))) return origin;
    return null as unknown as string; // Reject
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400, // Cache preflight for 24h
}));

app.use('*', logger());

// ---------------------------------------------------------------------------
// CSRF protection — require X-Requested-With header on mutations
// ---------------------------------------------------------------------------
const csrfProtection: MiddlewareHandler = async (c, next) => {
  const method = c.req.method;
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const contentType = c.req.header('content-type') || '';
    const xRequestedWith = c.req.header('x-requested-with');
    // Allow JSON requests (set by fetch) and multipart (file uploads)
    if (!contentType.includes('application/json') && !contentType.includes('multipart/form-data') && !xRequestedWith) {
      return c.json({ success: false, error: 'CSRF protection: missing content-type or x-requested-with header' }, 403);
    }
  }
  await next();
};
app.use('/api/*', csrfProtection);

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get('/api/health', (c) => {
  return c.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

// ---------------------------------------------------------------------------
// Mount routes
// ---------------------------------------------------------------------------
app.route('/api/auth', authRoutes);
app.route('/api/festivals', festivalRoutes);
app.route('/api/directory', directoryRoutes);
app.route('/api/editions', editionRoutes);
app.route('/api/cms', cmsRoutes);
app.route('/api/exhibitors', exhibitorRoutes);
app.route('/api/events', eventRoutes);
app.route('/api/venues', venueRoutes);
app.route('/api/volunteers', volunteerRoutes);
app.route('/api/budget', budgetRoutes);
app.route('/api/equipment', equipmentRoutes);
app.route('/api/floor-plans', floorPlanRoutes);
app.route('/api/notifications', notificationRoutes);
app.route('/api/uploads', uploadRoutes);
app.route('/api/tasks', taskRoutes);
app.route('/api/meetings', meetingRoutes);
app.route('/api/emails', emailRoutes);
app.route('/api/invites', inviteRoutes);
app.route('/api/exports', exportRoutes);
app.route('/api/tickets', ticketRoutes);
app.route('/api/chatbot', chatbotRoutes);
app.route('/api/platform-admin', platformAdminRoutes);
app.route('/api/messaging', messagingRoutes);
app.route('/api/exhibitor-hub', exhibitorDirectoryRoutes);
app.route('/api/pos', posRoutes);
app.route('/api/ticketing', ticketingRoutes);
app.route('/api/marketplace', marketplaceRoutes);
app.route('/api/sponsors', sponsorRoutes);
app.route('/api/reservations', reservationRoutes);
app.route('/api/gamification', gamificationRoutes);
app.route('/api/votes', voteRoutes);
app.route('/api/raffles', raffleRoutes);
app.route('/api/artists', artistRoutes);
app.route('/api/queues', queueRoutes);
app.route('/api/analytics', analyticsRoutes);
app.route('/api/api-management', apiKeyRoutes);
app.route('/api/visitor-hub', visitorHubRoutes);
app.route('/api/qr-objects', qrObjectRoutes);
app.route('/api/custom-roles', customRoleRoutes);
app.route('/api/workspace-docs', workspaceDocRoutes);
app.route('/api/workspace-sheets', workspaceSheetRoutes);
app.route('/api/workspace-calendar', workspaceCalendarRoutes);
app.route('/api/workspace-tasks', workspaceTaskRoutes);
app.route('/api/surveys', surveyRoutes);
app.route('/api/subscriptions', subscriptionRoutes);
app.route('/api/billing', billingRoutes);
app.route('/api/media', mediaRoutes);
app.route('/api/regulations', regulationRoutes);
app.route('/api/volunteer-hub', volunteerHubRoutes);

// ---------------------------------------------------------------------------
// 404 fallback
// ---------------------------------------------------------------------------
app.notFound((c) => {
  return c.json({ success: false, error: 'Not found' }, 404);
});

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------
app.onError((err, c) => {
  console.error('[server] Unhandled error:', err);
  return c.json({ success: false, error: 'Internal server error' }, 500);
});

// ---------------------------------------------------------------------------
// Initialize database and start server
// ---------------------------------------------------------------------------
const PORT = parseInt(process.env.PORT || '3001', 10);

try {
  initializeDatabase();
  console.log('[db] Database initialized successfully');

  // Cleanup expired token blacklist entries on startup (parameterized)
  const { sqlite } = await import('./db/index.js');
  const cleanupStmt = sqlite.prepare('DELETE FROM token_blacklist WHERE expires_at < ?');
  cleanupStmt.run(Math.floor(Date.now() / 1000));
  console.log('[security] Expired token blacklist entries cleaned up');

  // Start automatic daily database backups with redundancy
  startBackupSchedule();
} catch (error) {
  console.error('[db] Failed to initialize database:', error);
  process.exit(1);
}

// Periodic token blacklist cleanup (every 6 hours, parameterized)
setInterval(() => {
  try {
    const { sqlite: sdb } = require('./db/index.js');
    sdb.prepare('DELETE FROM token_blacklist WHERE expires_at < ?').run(Math.floor(Date.now() / 1000));
  } catch { /* ignore */ }
}, 6 * 60 * 60 * 1000);

serve({
  fetch: app.fetch,
  port: PORT,
}, () => {
  console.log(`Festosh API running on http://localhost:${PORT}`);
});

export default app;
