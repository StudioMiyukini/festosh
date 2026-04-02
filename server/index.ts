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
  c.header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'");
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
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use('*', cors({
  origin: (origin) => {
    if (!origin) return ALLOWED_ORIGINS[0]; // Same-origin requests
    if (ALLOWED_ORIGINS.includes(origin)) return origin;
    // Allow *.miyukini.com subdomains
    if (origin.endsWith('.miyukini.com') || origin === 'https://festosh.miyukini.com') return origin;
    return null as unknown as string; // Reject
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400, // Cache preflight for 24h
}));

app.use('*', logger());

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
} catch (error) {
  console.error('[db] Failed to initialize database:', error);
  process.exit(1);
}

serve({
  fetch: app.fetch,
  port: PORT,
}, () => {
  console.log(`Festosh API running on http://localhost:${PORT}`);
});

export default app;
