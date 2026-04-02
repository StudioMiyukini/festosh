/**
 * Public festival directory — search, browse, and discover festivals.
 */

import { Hono } from 'hono';
import { eq, like, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { festivals } from '../db/schema.js';

const directoryRoutes = new Hono();

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function safeParseJson(value: string | null | undefined, fallback: unknown): unknown {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// GET / — search published festivals
// ---------------------------------------------------------------------------
directoryRoutes.get('/', async (c) => {
  try {
    const search = c.req.query('search') || '';
    const tagsParam = c.req.query('tags') || '';
    const city = c.req.query('city') || '';
    const sort = c.req.query('sort') || 'name';
    const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 100);
    const offset = parseInt(c.req.query('offset') || '0', 10);

    // Build conditions — only published festivals
    const conditions: string[] = ["status = 'published'"];
    const params: unknown[] = [];

    if (search) {
      conditions.push("(name LIKE ? OR description LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }

    if (city) {
      conditions.push("city = ?");
      params.push(city);
    }

    if (tagsParam) {
      // Tags stored as JSON array string — use LIKE for matching
      const tagList = tagsParam.split(',');
      for (const tag of tagList) {
        conditions.push("tags LIKE ?");
        params.push(`%"${tag.trim()}"%`);
      }
    }

    const whereClause = conditions.join(' AND ');

    // Determine sort
    let orderClause = 'name ASC';
    if (sort === 'newest') orderClause = 'created_at DESC';
    else if (sort === 'city') orderClause = 'city ASC, name ASC';

    // Count total
    const countResult = db.all(
      sql.raw(`SELECT COUNT(*) as total FROM festivals WHERE ${whereClause}`),
      // @ts-expect-error raw SQL params
      ...params,
    );

    // For raw SQL with dynamic params, use the underlying sqlite
    const { sqlite } = await import('../db/index.js');

    const countStmt = sqlite.prepare(`SELECT COUNT(*) as total FROM festivals WHERE ${whereClause}`);
    const countRow = countStmt.get(...params) as { total: number };
    const total = countRow?.total || 0;

    const dataStmt = sqlite.prepare(
      `SELECT * FROM festivals WHERE ${whereClause} ORDER BY ${orderClause} LIMIT ? OFFSET ?`,
    );
    const rows = dataStmt.all(...params, limit, offset) as Array<Record<string, unknown>>;

    const data = rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      logo_url: row.logo_url,
      banner_url: row.banner_url,
      city: row.city,
      country: row.country,
      primary_color: row.theme_primary_color,
      secondary_color: row.theme_secondary_color,
      tags: safeParseJson(row.tags as string, []),
      social_links: safeParseJson(row.social_links as string, {}),
      status: row.status,
      created_at: row.created_at,
    }));

    return c.json({
      success: true,
      data,
      pagination: { total, limit, offset },
    });
  } catch (error) {
    console.error('[directory] Search error:', error);
    return c.json({ success: false, error: 'Failed to search festivals' }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /tags — get available tags
// ---------------------------------------------------------------------------
directoryRoutes.get('/tags', async (c) => {
  try {
    const { sqlite } = await import('../db/index.js');
    const rows = sqlite
      .prepare("SELECT tags FROM festivals WHERE status = 'published' AND tags IS NOT NULL")
      .all() as Array<{ tags: string }>;

    const tagSet = new Set<string>();
    for (const row of rows) {
      const parsed = safeParseJson(row.tags, []) as string[];
      if (Array.isArray(parsed)) {
        for (const tag of parsed) {
          tagSet.add(tag);
        }
      }
    }

    return c.json({ success: true, data: Array.from(tagSet).sort() });
  } catch (error) {
    console.error('[directory] Tags error:', error);
    return c.json({ success: false, error: 'Failed to fetch tags' }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /cities — get available cities
// ---------------------------------------------------------------------------
directoryRoutes.get('/cities', async (c) => {
  try {
    const { sqlite } = await import('../db/index.js');
    const rows = sqlite
      .prepare(
        "SELECT DISTINCT city FROM festivals WHERE status = 'published' AND city IS NOT NULL ORDER BY city ASC",
      )
      .all() as Array<{ city: string }>;

    return c.json({ success: true, data: rows.map((r) => r.city) });
  } catch (error) {
    console.error('[directory] Cities error:', error);
    return c.json({ success: false, error: 'Failed to fetch cities' }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /by-slug/:slug — get festival by slug (public)
// ---------------------------------------------------------------------------
directoryRoutes.get('/by-slug/:slug', async (c) => {
  try {
    const slug = c.req.param('slug');

    const festival = db
      .select()
      .from(festivals)
      .where(eq(festivals.slug, slug))
      .get();

    if (!festival) {
      return c.json({ success: false, error: 'Festival not found' }, 404);
    }

    return c.json({
      success: true,
      data: {
        id: festival.id,
        slug: festival.slug,
        name: festival.name,
        description: festival.description,
        logo_url: festival.logoUrl,
        banner_url: festival.bannerUrl,
        theme_colors: {
          primary: festival.themePrimaryColor ?? '#6366f1',
          secondary: festival.themeSecondaryColor ?? '#ec4899',
          accent: '#f59e0b',
          background: '#ffffff',
          text: '#111827',
        },
        location_name: festival.city,
        location_address: festival.address,
        location_lat: festival.latitude,
        location_lng: festival.longitude,
        website: festival.website,
        contact_email: festival.contactEmail,
        social_links: safeParseJson(festival.socialLinks, {}),
        tags: safeParseJson(festival.tags, []),
        status: festival.status,
        created_by: festival.createdBy,
        created_at: festival.createdAt,
        updated_at: festival.updatedAt,
      },
    });
  } catch (error) {
    console.error('[directory] Get by slug error:', error);
    return c.json({ success: false, error: 'Failed to fetch festival' }, 500);
  }
});

export { directoryRoutes };
