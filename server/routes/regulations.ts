/**
 * Regulations routes — terms, rules, conditions for festivals.
 */

import { Hono } from 'hono';
import { eq, and, desc, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { regulations, regulationAcceptances, profiles } from '../db/schema.js';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
import { festivalMemberMiddleware, requireFestivalRole } from '../middleware/festival-auth.js';
import { formatResponse } from '../lib/format.js';

const regulationRoutes = new Hono();

// ─── Regulation templates ────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'general', label: 'Reglement general' },
  { value: 'visitor', label: 'Conditions visiteurs' },
  { value: 'exhibitor', label: 'Conditions exposants' },
  { value: 'cosplay', label: 'Reglement concours cosplay' },
  { value: 'photo_video', label: 'Droit a l\'image' },
  { value: 'volunteer', label: 'Charte benevoles' },
  { value: 'safety', label: 'Securite et prevention' },
  { value: 'food', label: 'Restauration et hygiene' },
  { value: 'marketplace', label: 'Conditions de vente' },
  { value: 'privacy', label: 'Politique de confidentialite' },
  { value: 'other', label: 'Autre' },
];

const TEMPLATES: Record<string, { title: string; category: string; content: string }> = {
  visitor_rules: {
    title: 'Reglement interieur — Visiteurs',
    category: 'visitor',
    content: `# Reglement interieur — Visiteurs

## Article 1 — Acces au festival
L'acces au festival est soumis a la presentation d'un billet valide (numerique ou imprime). Tout billet est personnel et non cessible.

## Article 2 — Horaires
Le festival est ouvert aux horaires indiques sur le site officiel. L'organisateur se reserve le droit de modifier les horaires en cas de force majeure.

## Article 3 — Comportement
Tout visiteur s'engage a adopter un comportement respectueux envers les autres participants, les exposants, les benevoles et le personnel d'organisation. Sont interdits :
- Les comportements violents, agressifs ou discriminatoires
- La consommation excessive d'alcool
- L'introduction d'objets dangereux (armes reelles, objets tranchants)
- La degradation du materiel et des installations

## Article 4 — Objets et accessoires
Les armes factices (cosplay) doivent etre signalees a l'entree et peuvent etre soumises a verification. Les objets juges dangereux seront consignes.

## Article 5 — Mineurs
Les mineurs de moins de 12 ans doivent etre accompagnes d'un adulte responsable. Les mineurs de 12 a 17 ans doivent presenter une autorisation parentale si non accompagnes.

## Article 6 — Responsabilite
L'organisateur decline toute responsabilite en cas de perte, vol ou dommage aux effets personnels des visiteurs. Les visiteurs sont responsables des dommages qu'ils causent.

## Article 7 — Exclusion
L'organisateur se reserve le droit d'exclure tout visiteur ne respectant pas le present reglement, sans remboursement.`,
  },

  exhibitor_terms: {
    title: 'Conditions generales de candidature exposant',
    category: 'exhibitor',
    content: `# Conditions generales — Candidature exposant

## Article 1 — Candidature
La candidature est soumise a validation par l'organisateur. L'acceptation n'est pas automatique et depend des places disponibles, de la coherence avec le festival et de la qualite du dossier.

## Article 2 — Documents obligatoires
L'exposant doit fournir :
- Un extrait KBIS ou numero INSEE valide
- Une attestation d'assurance responsabilite civile professionnelle en cours de validite
- Une copie de la piece d'identite du responsable

## Article 3 — Emplacement
L'emplacement est attribue par l'organisateur sauf indication contraire. L'exposant s'engage a occuper uniquement l'espace qui lui est attribue.

## Article 4 — Installation et rangement
- Installation : selon les horaires communiques (generalement la veille ou le matin)
- Rangement : obligatoire dans l'heure suivant la fermeture
- L'espace doit etre rendu propre et en bon etat

## Article 5 — Tarification
Le prix du stand comprend l'espace, les tables et chaises de base. Les options supplementaires (electricite, eau, materiel additionnel) sont facturees separement.

## Article 6 — Annulation
- Annulation par l'exposant plus de 30 jours avant : remboursement a 80%
- Annulation entre 15 et 30 jours : remboursement a 50%
- Annulation moins de 15 jours : aucun remboursement

## Article 7 — Obligations
L'exposant s'engage a :
- Respecter les horaires d'ouverture au public
- Maintenir son stand propre et attractif
- Respecter les normes de securite
- Disposer de toutes les autorisations necessaires pour les produits vendus`,
  },

  cosplay_rules: {
    title: 'Reglement du concours cosplay',
    category: 'cosplay',
    content: `# Reglement du concours cosplay

## Article 1 — Conditions de participation
- Le concours est ouvert a tous les participants du festival munis d'un billet valide
- Categorie solo et categorie groupe
- Les participants mineurs doivent fournir une autorisation parentale

## Article 2 — Inscription
L'inscription se fait en ligne avant le festival ou sur place le jour meme (dans la limite des places). Chaque participant doit indiquer :
- Le nom du personnage et de l'oeuvre originale
- Le pourcentage de fabrication personnelle (handmade)
- La duree de la prestation (max 3 minutes solo, 5 minutes groupe)

## Article 3 — Prestations
- Les prestations violentes, offensantes ou a caractere sexuel explicite sont interdites
- L'utilisation de feu, fumee, liquides ou pyrotechnie est strictement interdite
- La musique et les effets sonores doivent etre fournis sur cle USB au format MP3

## Article 4 — Criteres de jugement
Le jury evaluera :
- La fidelite au personnage (ressemblance, details)
- La qualite de fabrication (couture, accessoires, armure)
- La prestation scenique (jeu, mise en scene, creativite)
- L'impression generale

## Article 5 — Lots
Les lots sont definis par l'organisateur et communiques avant le concours. Ils ne sont ni echangeables ni remboursables.

## Article 6 — Droits d'image
Les participants acceptent d'etre photographies et filmes lors du concours. Les images pourront etre utilisees pour la communication du festival.`,
  },

  photo_video: {
    title: 'Autorisation de prise de photographie et video',
    category: 'photo_video',
    content: `# Droit a l'image — Photographie et video

## Article 1 — Consentement general
En participant au festival, les visiteurs, exposants et intervenants acceptent que des photographies et videos puissent etre prises dans le cadre de la couverture de l'evenement.

## Article 2 — Utilisation
Les images et videos realisees par l'equipe d'organisation ou ses partenaires media pourront etre utilisees pour :
- La communication du festival (site web, reseaux sociaux, affiches)
- Les supports de presse
- Les archives et bilans de l'evenement
- La promotion des editions futures

## Article 3 — Photographes et videographes
Les photographes et videographes professionnels ou amateurs sont les bienvenus. Toutefois :
- Le flash est interdit lors des conferences et spectacles
- Les drones sont interdits sans autorisation prealable
- Le respect de la vie privee des participants doit etre garanti

## Article 4 — Droit d'opposition
Toute personne peut exercer son droit d'opposition a l'utilisation de son image en contactant l'organisateur a l'adresse email indiquee sur le site du festival. La demande sera traitee dans un delai de 48 heures.

## Article 5 — Cosplay
Les cosplayeurs acceptent d'etre photographies dans l'espace public du festival. Toute prise de photo privee (portrait, mise en scene) necessite le consentement explicite du cosplayeur concerne.`,
  },

  volunteer_charter: {
    title: 'Charte des benevoles',
    category: 'volunteer',
    content: `# Charte des benevoles

## Article 1 — Engagement
Le benevole s'engage a respecter les horaires de ses shifts et a prevenir l'organisateur en cas d'absence ou de retard.

## Article 2 — Identification
Chaque benevole recoit un badge d'identification qu'il doit porter visiblement pendant toute la duree de ses shifts.

## Article 3 — Comportement
Le benevole represente le festival. Il s'engage a :
- Etre courtois et accueillant avec les visiteurs et exposants
- Rester sobre pendant ses shifts
- Respecter les consignes de securite
- Signaler tout incident a son responsable

## Article 4 — Confidentialite
Le benevole s'engage a ne pas divulguer les informations confidentielles auxquelles il pourrait avoir acces (donnees personnelles, informations financieres, etc.).

## Article 5 — Avantages
En echange de sa participation, le benevole beneficie :
- De l'acces gratuit au festival en dehors de ses shifts
- D'un repas par shift de 4 heures minimum
- D'un certificat de benevolat sur demande

## Article 6 — Assurance
Les benevoles sont couverts par l'assurance responsabilite civile de l'organisation pendant leurs shifts.`,
  },

  safety: {
    title: 'Reglement securite et prevention',
    category: 'safety',
    content: `# Securite et prevention

## Article 1 — Issues de secours
Les issues de secours doivent rester degagees en permanence. Tout encombrement des voies d'evacuation est interdit.

## Article 2 — Incendie
- Les extincteurs sont situes aux emplacements signales
- L'utilisation de bougies, flammes nues ou appareils a combustion est interdite
- En cas d'alarme incendie, evacuer calmement par les sorties indiquees

## Article 3 — Secours
Un poste de secours est present sur le site. En cas d'urgence, contacter les benevoles securite ou appeler le 15 (SAMU) / 18 (Pompiers).

## Article 4 — Allergies et accessibilite
L'organisateur met a disposition des informations sur les allergenes dans les stands de restauration. Les personnes a mobilite reduite beneficient d'acces dedies.

## Article 5 — Capacite
La jauge maximale du site est definie par arrete prefectoral. L'organisateur se reserve le droit de limiter temporairement l'acces en cas de pic d'affluence.`,
  },

  privacy_policy: {
    title: 'Politique de confidentialite',
    category: 'privacy',
    content: `# Politique de confidentialite

## Article 1 — Collecte des donnees
Dans le cadre du festival, nous collectons les donnees suivantes :
- Nom, prenom, email (inscription et billetterie)
- Donnees de candidature (exposants et benevoles)
- Donnees de paiement (traitees par notre prestataire securise)

## Article 2 — Finalites
Les donnees sont utilisees pour :
- La gestion des inscriptions et des billets
- La communication relative au festival
- L'amelioration de nos services

## Article 3 — Conservation
Les donnees sont conservees pour la duree necessaire aux finalites mentionnees, et au maximum 3 ans apres le dernier contact.

## Article 4 — Droits
Conformement au RGPD, vous disposez des droits suivants :
- Droit d'acces, de rectification et de suppression
- Droit a la portabilite
- Droit d'opposition au traitement

Pour exercer ces droits, contactez-nous a l'adresse email indiquee sur le site du festival.

## Article 5 — Cookies
Notre site utilise des cookies essentiels au fonctionnement. Aucun cookie publicitaire n'est utilise sans votre consentement.`,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC: View regulations
// ═══════════════════════════════════════════════════════════════════════════

regulationRoutes.get('/festival/:festivalId/public', optionalAuth, async (c) => {
  try {
    const festivalId = c.req.param('festivalId');
    const rows = db.select().from(regulations)
      .where(and(eq(regulations.festivalId, festivalId), eq(regulations.isPublished, 1)))
      .orderBy(regulations.sortOrder)
      .all();

    return c.json({ success: true, data: rows.map((r) => formatResponse(r)), categories: CATEGORIES });
  } catch (error) {
    console.error('[regulations] List public error:', error);
    return c.json({ success: false, error: 'Failed to list regulations' }, 500);
  }
});

regulationRoutes.get('/:id/view', optionalAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const reg = db.select().from(regulations).where(eq(regulations.id, id)).get();
    if (!reg || !reg.isPublished) return c.json({ success: false, error: 'Not found' }, 404);

    const userId = c.get('userId') as string | undefined;
    let accepted = false;
    if (userId) {
      const acc = db.select().from(regulationAcceptances)
        .where(and(eq(regulationAcceptances.regulationId, id), eq(regulationAcceptances.userId, userId)))
        .get();
      accepted = !!acc;
    }

    const acceptCount = db.select({ count: sql<number>`count(*)` }).from(regulationAcceptances)
      .where(eq(regulationAcceptances.regulationId, id)).get();

    return c.json({
      success: true,
      data: { ...formatResponse(reg), accepted, acceptance_count: acceptCount?.count ?? 0 },
    });
  } catch (error) {
    console.error('[regulations] View error:', error);
    return c.json({ success: false, error: 'Failed to view regulation' }, 500);
  }
});

// Accept a regulation
regulationRoutes.post('/:id/accept', optionalAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const userId = c.get('userId') as string | undefined;
    const body = await c.req.json().catch(() => ({}));

    const reg = db.select().from(regulations).where(eq(regulations.id, id)).get();
    if (!reg || !reg.isPublished) return c.json({ success: false, error: 'Not found' }, 404);

    if (userId) {
      const existing = db.select().from(regulationAcceptances)
        .where(and(eq(regulationAcceptances.regulationId, id), eq(regulationAcceptances.userId, userId)))
        .get();
      if (existing) return c.json({ success: true, data: { message: 'Deja accepte' } });
    }

    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

    db.insert(regulationAcceptances).values({
      id: crypto.randomUUID(),
      regulationId: id,
      userId: userId || null,
      guestName: body.guest_name || null,
      guestEmail: body.guest_email || null,
      ipAddress: ip,
    }).run();

    return c.json({ success: true, data: { message: 'Reglement accepte' } }, 201);
  } catch (error) {
    console.error('[regulations] Accept error:', error);
    return c.json({ success: false, error: 'Failed to accept' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN: CRUD regulations
// ═══════════════════════════════════════════════════════════════════════════

regulationRoutes.get(
  '/festival/:festivalId',
  authMiddleware, festivalMemberMiddleware,
  async (c) => {
    try {
      const festivalId = c.req.param('festivalId');
      const rows = db.select().from(regulations)
        .where(eq(regulations.festivalId, festivalId))
        .orderBy(regulations.sortOrder)
        .all();

      const enriched = rows.map((r) => {
        const acceptCount = db.select({ count: sql<number>`count(*)` }).from(regulationAcceptances)
          .where(eq(regulationAcceptances.regulationId, r.id)).get();
        return { ...formatResponse(r), acceptance_count: acceptCount?.count ?? 0 };
      });

      return c.json({ success: true, data: enriched, categories: CATEGORIES, templates: Object.keys(TEMPLATES) });
    } catch (error) {
      console.error('[regulations] List error:', error);
      return c.json({ success: false, error: 'Failed to list regulations' }, 500);
    }
  },
);

regulationRoutes.post(
  '/festival/:festivalId',
  authMiddleware, festivalMemberMiddleware, requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const festivalId = c.req.param('festivalId');
      const userId = c.get('userId');
      const body = await c.req.json();
      const now = Math.floor(Date.now() / 1000);

      if (!body.title?.trim()) return c.json({ success: false, error: 'Title required' }, 400);

      const slug = (body.slug || body.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);
      const id = crypto.randomUUID();

      db.insert(regulations).values({
        id, festivalId,
        editionId: body.edition_id || null,
        title: body.title.trim(),
        slug,
        category: body.category || 'general',
        content: body.content || '',
        isPublished: body.is_published ? 1 : 0,
        requiresAcceptance: body.requires_acceptance ? 1 : 0,
        sortOrder: body.sort_order ?? 0,
        createdBy: userId,
        createdAt: now, updatedAt: now,
      }).run();

      const created = db.select().from(regulations).where(eq(regulations.id, id)).get();
      return c.json({ success: true, data: created ? formatResponse(created) : null }, 201);
    } catch (error) {
      console.error('[regulations] Create error:', error);
      return c.json({ success: false, error: 'Failed to create regulation' }, 500);
    }
  },
);

// Create from template
regulationRoutes.post(
  '/festival/:festivalId/from-template',
  authMiddleware, festivalMemberMiddleware, requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const festivalId = c.req.param('festivalId');
      const userId = c.get('userId');
      const body = await c.req.json();
      const now = Math.floor(Date.now() / 1000);

      const templateKey = body.template;
      const template = TEMPLATES[templateKey];
      if (!template) return c.json({ success: false, error: 'Template not found' }, 404);

      const slug = templateKey.replace(/_/g, '-');
      const id = crypto.randomUUID();

      db.insert(regulations).values({
        id, festivalId,
        editionId: body.edition_id || null,
        title: template.title,
        slug,
        category: template.category,
        content: template.content,
        isPublished: 0,
        requiresAcceptance: body.requires_acceptance ? 1 : 0,
        createdBy: userId,
        createdAt: now, updatedAt: now,
      }).run();

      const created = db.select().from(regulations).where(eq(regulations.id, id)).get();
      return c.json({ success: true, data: created ? formatResponse(created) : null }, 201);
    } catch (error) {
      console.error('[regulations] Create from template error:', error);
      return c.json({ success: false, error: 'Failed to create from template' }, 500);
    }
  },
);

// List available templates
regulationRoutes.get('/templates', (c) => {
  return c.json({
    success: true,
    data: Object.entries(TEMPLATES).map(([key, t]) => ({
      key, title: t.title, category: t.category,
    })),
    categories: CATEGORIES,
  });
});

regulationRoutes.put('/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const now = Math.floor(Date.now() / 1000);

    const existing = db.select().from(regulations).where(eq(regulations.id, id)).get();
    if (!existing) return c.json({ success: false, error: 'Not found' }, 404);

    const keyMap: Record<string, string> = {
      title: 'title', content: 'content', category: 'category',
      is_published: 'isPublished', requires_acceptance: 'requiresAcceptance',
      sort_order: 'sortOrder', edition_id: 'editionId',
    };

    const booleanFields = new Set(['isPublished', 'requiresAcceptance']);
    const update: Record<string, unknown> = { updatedAt: now };
    for (const [bk, sk] of Object.entries(keyMap)) {
      if (body[bk] !== undefined) {
        update[sk] = booleanFields.has(sk) ? (body[bk] ? 1 : 0) : body[bk];
      }
    }

    // Bump version if content changed
    if (body.content !== undefined && body.content !== existing.content) {
      update.version = (existing.version ?? 1) + 1;
    }

    db.update(regulations).set(update).where(eq(regulations.id, id)).run();
    const updated = db.select().from(regulations).where(eq(regulations.id, id)).get();
    return c.json({ success: true, data: updated ? formatResponse(updated) : null });
  } catch (error) {
    console.error('[regulations] Update error:', error);
    return c.json({ success: false, error: 'Failed to update' }, 500);
  }
});

regulationRoutes.delete('/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    db.delete(regulationAcceptances).where(eq(regulationAcceptances.regulationId, id)).run();
    db.delete(regulations).where(eq(regulations.id, id)).run();
    return c.json({ success: true, data: { message: 'Deleted' } });
  } catch (error) {
    console.error('[regulations] Delete error:', error);
    return c.json({ success: false, error: 'Failed to delete' }, 500);
  }
});

// Acceptances list (admin)
regulationRoutes.get('/:id/acceptances', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const rows = db.select({
      id: regulationAcceptances.id,
      userId: regulationAcceptances.userId,
      guestName: regulationAcceptances.guestName,
      guestEmail: regulationAcceptances.guestEmail,
      acceptedAt: regulationAcceptances.acceptedAt,
      username: profiles.username,
      displayName: profiles.displayName,
      email: profiles.email,
    })
      .from(regulationAcceptances)
      .leftJoin(profiles, eq(profiles.id, regulationAcceptances.userId))
      .where(eq(regulationAcceptances.regulationId, id))
      .orderBy(desc(regulationAcceptances.acceptedAt))
      .all();

    return c.json({
      success: true,
      data: rows.map((r) => ({
        id: r.id, user_id: r.userId,
        name: r.displayName || r.username || r.guestName || 'Anonyme',
        email: r.email || r.guestEmail,
        accepted_at: r.acceptedAt,
      })),
    });
  } catch (error) {
    console.error('[regulations] Acceptances error:', error);
    return c.json({ success: false, error: 'Failed to list acceptances' }, 500);
  }
});

export { regulationRoutes };
