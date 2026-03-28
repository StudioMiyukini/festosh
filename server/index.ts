/**
 * Festosh API — Hono server entry point.
 * Multi-tenant SaaS backend for festival management.
 */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

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

// ---------------------------------------------------------------------------
// Create the Hono app
// ---------------------------------------------------------------------------
const app = new Hono();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
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
