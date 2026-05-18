/**
 * Public exhibitor routes — vitrine + boutique en ligne.
 *
 * All routes here are PUBLIC (no auth). They expose only data that exhibitors
 * have explicitly opted in to (directory_visible, is_online flag, etc.).
 */

import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  exhibitorProfiles,
  cmsPages,
  cmsBlocks,
  products,
  productCategories,
} from '../db/schema.js';
import { formatResponse } from '../lib/format.js';

const publicExhibitorRoutes = new Hono();

// ─── Helpers ────────────────────────────────────────────────────────────────

function safeParseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

/** Public-safe projection of an exhibitor — strips fields marked private. */
function projectPublicExhibitor(ex: typeof exhibitorProfiles.$inferSelect) {
  const visibility = safeParseJson<Record<string, string>>(ex.visibility, {});
  const isFieldPublic = (key: string) => visibility[key] === 'public';

  const base = {
    id: ex.id,
    slug: ex.slug,
    company_name: ex.companyName,
    trade_name: ex.tradeName,
    activity_type: ex.activityType,
    category: ex.category,
    description: ex.description,
    logo_url: ex.logoUrl,
    photo_url: ex.photoUrl,
    website: ex.website,
    social_links: safeParseJson(ex.socialLinks, {}),
    domains: safeParseJson(ex.domains, []),
    city: ex.city,
    country: ex.country,
    is_pmr: ex.isPmr,
    boutique_enabled: ex.boutiqueEnabled,
    boutique_intro: ex.boutiqueIntro,
    boutique_currency: ex.boutiqueCurrency,
    boutique_shipping_cents: ex.boutiqueShippingCents,
    boutique_free_shipping_above_cents: ex.boutiqueFreeShippingAboveCents,
    vitrine_page_id: ex.vitrinePageId,
  };

  // Optionally surface contact info if marked public
  const optional: Record<string, unknown> = {};
  if (isFieldPublic('contact_email')) optional.contact_email = ex.contactEmail;
  if (isFieldPublic('contact_phone')) optional.contact_phone = ex.contactPhone;
  if (isFieldPublic('contact_first_name')) optional.contact_first_name = ex.contactFirstName;
  if (isFieldPublic('contact_last_name')) optional.contact_last_name = ex.contactLastName;
  if (isFieldPublic('address_line1')) {
    optional.address_line1 = ex.addressLine1;
    optional.postal_code = ex.postalCode;
  }

  return { ...base, ...optional };
}

function formatPublicProduct(p: typeof products.$inferSelect) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    online_description: p.onlineDescription,
    sku: p.sku,
    image_url: p.imageUrl,
    gallery_urls: safeParseJson(p.galleryUrls, []),
    price_cents: p.priceCents,
    tax_rate: p.taxRate,
    stock_quantity: p.stockQuantity,
    in_stock: p.stockQuantity > 0,
    weight_grams: p.weightGrams,
    category_id: p.categoryId,
  };
}

// ─── Routes ─────────────────────────────────────────────────────────────────

/**
 * GET /public/exhibitors/by-slug/:slug
 * Public exhibitor profile + vitrine page (if any).
 */
publicExhibitorRoutes.get('/by-slug/:slug', async (c) => {
  try {
    const slug = c.req.param('slug');
    const ex = db.select().from(exhibitorProfiles).where(eq(exhibitorProfiles.slug, slug)).get();
    if (!ex || ex.directoryVisible !== 1) {
      return c.json({ success: false, error: 'Exhibitor not found' }, 404);
    }

    let vitrine = null;
    if (ex.vitrinePageId) {
      const page = db
        .select()
        .from(cmsPages)
        .where(and(eq(cmsPages.id, ex.vitrinePageId), eq(cmsPages.isPublished, 1)))
        .get();
      if (page) {
        const blocks = db.select().from(cmsBlocks).where(eq(cmsBlocks.pageId, page.id)).all();
        blocks.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        vitrine = {
          ...formatResponse(page),
          blocks: blocks.filter((b) => b.isVisible === 1).map((b) => formatResponse(b, ['content', 'settings'])),
        };
      }
    }

    return c.json({
      success: true,
      data: { ...projectPublicExhibitor(ex), vitrine },
    });
  } catch (error) {
    console.error('[public-exhibitor] Get by slug error:', error);
    return c.json({ success: false, error: 'Failed to fetch exhibitor' }, 500);
  }
});

/**
 * GET /public/exhibitors/by-slug/:slug/products
 * Public product listing for an exhibitor's online shop.
 * Only products that are both is_active AND is_online are returned.
 */
publicExhibitorRoutes.get('/by-slug/:slug/products', async (c) => {
  try {
    const slug = c.req.param('slug');
    const ex = db.select().from(exhibitorProfiles).where(eq(exhibitorProfiles.slug, slug)).get();
    if (!ex || ex.boutiqueEnabled !== 1) {
      return c.json({ success: false, error: 'Boutique not available' }, 404);
    }

    const list = db
      .select()
      .from(products)
      .where(
        and(
          eq(products.exhibitorId, ex.id),
          eq(products.isActive, 1),
          eq(products.isOnline, 1),
        ),
      )
      .orderBy(desc(products.onlineSortOrder), desc(products.createdAt))
      .all();

    const cats = db
      .select()
      .from(productCategories)
      .where(eq(productCategories.exhibitorId, ex.id))
      .all();

    return c.json({
      success: true,
      data: {
        products: list.map(formatPublicProduct),
        categories: cats.map((c) => ({ id: c.id, name: c.name, sort_order: c.sortOrder })),
        currency: ex.boutiqueCurrency || 'EUR',
        shipping_cents: ex.boutiqueShippingCents ?? 0,
        free_shipping_above_cents: ex.boutiqueFreeShippingAboveCents,
      },
    });
  } catch (error) {
    console.error('[public-exhibitor] List products error:', error);
    return c.json({ success: false, error: 'Failed to list products' }, 500);
  }
});

/**
 * GET /public/exhibitors/by-slug/:slug/products/:productSlug
 * Product detail for the public shop. Accepts product id OR slug.
 */
publicExhibitorRoutes.get('/by-slug/:slug/products/:productSlug', async (c) => {
  try {
    const slug = c.req.param('slug');
    const productSlug = c.req.param('productSlug');

    const ex = db.select().from(exhibitorProfiles).where(eq(exhibitorProfiles.slug, slug)).get();
    if (!ex || ex.boutiqueEnabled !== 1) return c.json({ success: false, error: 'Not found' }, 404);

    const prod = db
      .select()
      .from(products)
      .where(
        and(
          eq(products.exhibitorId, ex.id),
          eq(products.isActive, 1),
          eq(products.isOnline, 1),
        ),
      )
      .all()
      .find((p) => p.id === productSlug || p.slug === productSlug);

    if (!prod) return c.json({ success: false, error: 'Product not found' }, 404);

    return c.json({ success: true, data: formatPublicProduct(prod) });
  } catch (error) {
    console.error('[public-exhibitor] Get product error:', error);
    return c.json({ success: false, error: 'Failed to fetch product' }, 500);
  }
});

export { publicExhibitorRoutes };
