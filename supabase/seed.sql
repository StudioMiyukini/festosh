-- ============================================================================
-- Seed: seed.sql
-- Description: Sample data for development and testing
-- ============================================================================

-- ===========================================================================
-- NOTE: This seed file assumes the auth.users rows are created separately
-- (e.g. via Supabase dashboard or supabase auth commands).
-- We create profiles directly here for dev convenience.
-- In production, the handle_new_user trigger creates profiles automatically.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Sample profiles (UUIDs are deterministic for easy reference)
-- ---------------------------------------------------------------------------

INSERT INTO public.profiles (id, email, full_name, role, locale) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'alice@festosh.dev', 'Alice Martin', 'organizer', 'fr'),
  ('a0000000-0000-0000-0000-000000000002', 'bob@festosh.dev', 'Bob Dupont', 'organizer', 'fr'),
  ('a0000000-0000-0000-0000-000000000003', 'charlie@festosh.dev', 'Charlie Bernard', 'user', 'fr'),
  ('a0000000-0000-0000-0000-000000000004', 'diana@festosh.dev', 'Diana Leroy', 'user', 'en'),
  ('a0000000-0000-0000-0000-000000000005', 'eve@festosh.dev', 'Eve Moreau', 'user', 'fr'),
  ('a0000000-0000-0000-0000-000000000006', 'admin@festosh.dev', 'Admin Festosh', 'admin', 'fr')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Festival 1: Festival des Lumieres
-- ---------------------------------------------------------------------------

INSERT INTO public.festivals (id, name, slug, description, primary_color, secondary_color, city, country, status) VALUES
  ('f0000000-0000-0000-0000-000000000001',
   'Festival des Lumieres',
   'festival-des-lumieres',
   'Un festival celebrant les arts lumineux, les installations interactives et la creativite sous toutes ses formes.',
   '#f59e0b', '#8b5cf6',
   'Lyon', 'FR',
   'published')
ON CONFLICT (id) DO NOTHING;

-- Members for Festival des Lumieres
INSERT INTO public.festival_members (festival_id, user_id, role) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'owner'),
  ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'editor'),
  ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'volunteer'),
  ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005', 'exhibitor')
ON CONFLICT (festival_id, user_id) DO NOTHING;

-- Edition 2026 for Festival des Lumieres
INSERT INTO public.editions (id, festival_id, name, slug, year, start_date, end_date, registration_open_at, registration_close_at, max_exhibitors, max_visitors, max_volunteers, visitor_hours, status, is_active) VALUES
  ('e0000000-0000-0000-0000-000000000001',
   'f0000000-0000-0000-0000-000000000001',
   'Festival des Lumieres 2026',
   '2026',
   2026,
   '2026-12-05', '2026-12-08',
   '2026-06-01T00:00:00Z', '2026-10-31T23:59:59Z',
   120, 50000, 80,
   '{"samedi": {"open": "10:00", "close": "23:00"}, "dimanche": {"open": "10:00", "close": "22:00"}, "lundi": {"open": "14:00", "close": "23:00"}}',
   'registration_open',
   true)
ON CONFLICT (festival_id, slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Festival 2: Marche de Noel Artisanal
-- ---------------------------------------------------------------------------

INSERT INTO public.festivals (id, name, slug, description, primary_color, secondary_color, city, country, status) VALUES
  ('f0000000-0000-0000-0000-000000000002',
   'Marche de Noel Artisanal',
   'marche-noel-artisanal',
   'Marche de Noel mettant en valeur les artisans locaux, les produits du terroir et les creations fait-main.',
   '#dc2626', '#16a34a',
   'Strasbourg', 'FR',
   'published')
ON CONFLICT (id) DO NOTHING;

-- Members for Marche de Noel
INSERT INTO public.festival_members (festival_id, user_id, role) VALUES
  ('f0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'owner'),
  ('f0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'admin'),
  ('f0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', 'moderator'),
  ('f0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000005', 'exhibitor')
ON CONFLICT (festival_id, user_id) DO NOTHING;

-- Edition 2026 for Marche de Noel
INSERT INTO public.editions (id, festival_id, name, slug, year, start_date, end_date, registration_open_at, registration_close_at, max_exhibitors, max_visitors, visitor_hours, status, is_active) VALUES
  ('e0000000-0000-0000-0000-000000000002',
   'f0000000-0000-0000-0000-000000000002',
   'Marche de Noel 2026',
   '2026',
   2026,
   '2026-11-27', '2026-12-24',
   '2026-04-01T00:00:00Z', '2026-09-30T23:59:59Z',
   200, 100000,
   '{"lundi_vendredi": {"open": "11:00", "close": "20:00"}, "samedi_dimanche": {"open": "10:00", "close": "21:00"}}',
   'registration_open',
   true)
ON CONFLICT (festival_id, slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- CMS Pages for Festival des Lumieres
-- ---------------------------------------------------------------------------

INSERT INTO public.cms_pages (id, festival_id, slug, title, is_published, is_homepage, meta_description, sort_order) VALUES
  ('c0000000-0000-0000-0000-000000000001',
   'f0000000-0000-0000-0000-000000000001',
   'accueil', 'Accueil', true, true,
   'Bienvenue au Festival des Lumieres de Lyon', 0),
  ('c0000000-0000-0000-0000-000000000002',
   'f0000000-0000-0000-0000-000000000001',
   'programme', 'Programme', true, false,
   'Decouvrez le programme complet du festival', 1),
  ('c0000000-0000-0000-0000-000000000003',
   'f0000000-0000-0000-0000-000000000001',
   'exposants', 'Exposants', true, false,
   'Liste des exposants et artistes', 2),
  ('c0000000-0000-0000-0000-000000000004',
   'f0000000-0000-0000-0000-000000000001',
   'infos-pratiques', 'Infos pratiques', true, false,
   'Informations pratiques : acces, horaires, tarifs', 3)
ON CONFLICT (festival_id, slug) DO NOTHING;

-- CMS Blocks for homepage
INSERT INTO public.cms_blocks (page_id, block_type, content, settings, sort_order, is_visible) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'hero',
   '{"title": "Festival des Lumieres 2026", "subtitle": "5-8 Decembre, Lyon", "cta_text": "Decouvrir le programme", "cta_link": "/programme"}',
   '{"background_overlay": true, "height": "80vh"}',
   0, true),
  ('c0000000-0000-0000-0000-000000000001', 'countdown',
   '{"target_date": "2026-12-05T10:00:00Z", "label": "Ouverture du festival"}',
   '{}',
   1, true),
  ('c0000000-0000-0000-0000-000000000001', 'text',
   '{"body": "Depuis plus de 20 ans, le Festival des Lumieres illumine la ville de Lyon avec des installations artistiques spectaculaires. Rejoignez-nous pour une edition 2026 exceptionnelle !"}',
   '{"alignment": "center", "max_width": "800px"}',
   2, true),
  ('c0000000-0000-0000-0000-000000000001', 'exhibitor_list',
   '{"title": "Nos exposants", "show_categories": true, "max_items": 12}',
   '{"layout": "grid", "columns": 4}',
   3, true);

-- ---------------------------------------------------------------------------
-- Venues for Festival des Lumieres
-- ---------------------------------------------------------------------------

INSERT INTO public.venues (id, festival_id, name, type, description, capacity) VALUES
  ('v0000000-0000-0000-0000-000000000001',
   'f0000000-0000-0000-0000-000000000001',
   'Place des Terreaux', 'outdoor', 'Place principale avec installation lumineuse centrale', 5000),
  ('v0000000-0000-0000-0000-000000000002',
   'f0000000-0000-0000-0000-000000000001',
   'Cathedrale Saint-Jean', 'outdoor', 'Facade de la cathedrale pour projection video', 3000),
  ('v0000000-0000-0000-0000-000000000003',
   'f0000000-0000-0000-0000-000000000001',
   'Salle des Fetes', 'indoor', 'Espace couvert pour ateliers et conferences', 200)
ON CONFLICT (id) DO NOTHING;

-- Events for Festival des Lumieres 2026
INSERT INTO public.events (edition_id, venue_id, title, description, category, start_time, end_time, is_public, tags) VALUES
  ('e0000000-0000-0000-0000-000000000001',
   'v0000000-0000-0000-0000-000000000001',
   'Ceremonie d''ouverture',
   'Inauguration officielle du festival avec spectacle son et lumiere',
   'ceremonie',
   '2026-12-05T18:00:00Z', '2026-12-05T19:30:00Z',
   true, ARRAY['inauguration', 'spectacle', 'gratuit']),
  ('e0000000-0000-0000-0000-000000000001',
   'v0000000-0000-0000-0000-000000000002',
   'Projection "Lumieres d''histoire"',
   'Mapping video sur la facade de la cathedrale racontant l''histoire de Lyon',
   'projection',
   '2026-12-05T19:00:00Z', '2026-12-08T23:00:00Z',
   true, ARRAY['projection', 'mapping', 'gratuit']),
  ('e0000000-0000-0000-0000-000000000001',
   'v0000000-0000-0000-0000-000000000003',
   'Atelier "Creer sa lampe LED"',
   'Atelier participatif pour creer sa propre lampe LED artistique',
   'atelier',
   '2026-12-06T14:00:00Z', '2026-12-06T16:00:00Z',
   true, ARRAY['atelier', 'famille', 'creatif']),
  ('e0000000-0000-0000-0000-000000000001',
   'v0000000-0000-0000-0000-000000000003',
   'Conference "L''art numerique en 2026"',
   'Table ronde avec des artistes numeriques de renom',
   'conference',
   '2026-12-07T10:00:00Z', '2026-12-07T12:00:00Z',
   true, ARRAY['conference', 'art-numerique']);

-- ---------------------------------------------------------------------------
-- Exhibitor profile for Eve (exhibitor at both festivals)
-- ---------------------------------------------------------------------------

INSERT INTO public.exhibitor_profiles (id, user_id, company_name, company_type, contact_email, contact_phone, city, country, description, categories) VALUES
  ('x0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000005',
   'Atelier Moreau',
   'auto-entrepreneur',
   'eve@atelier-moreau.fr',
   '+33612345678',
   'Lyon', 'FR',
   'Creatrice de luminaires artisanaux et installations lumineuses',
   ARRAY['artisanat', 'luminaires', 'decoration'])
ON CONFLICT (user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Booth locations for Festival des Lumieres 2026
-- ---------------------------------------------------------------------------

INSERT INTO public.booth_locations (id, edition_id, code, zone, width_m, depth_m, has_electricity, price_cents, is_available) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'A01', 'Zone A - Place des Terreaux', 3.0, 3.0, true, 35000, true),
  ('b0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'A02', 'Zone A - Place des Terreaux', 3.0, 3.0, true, 35000, true),
  ('b0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 'B01', 'Zone B - Rue de la Republique', 4.0, 2.5, true, 28000, true),
  ('b0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000001', 'B02', 'Zone B - Rue de la Republique', 4.0, 2.5, false, 22000, true)
ON CONFLICT (edition_id, code) DO NOTHING;

-- Booth application from Eve
INSERT INTO public.booth_applications (edition_id, exhibitor_id, status, preferences, applicant_notes, submitted_at) VALUES
  ('e0000000-0000-0000-0000-000000000001',
   'x0000000-0000-0000-0000-000000000001',
   'submitted',
   '{"preferred_zone": "Zone A", "needs_electricity": true, "booth_size": "3x3"}',
   'Je souhaite presenter ma nouvelle collection de luminaires LED.',
   now())
ON CONFLICT (edition_id, exhibitor_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Volunteer roles for Festival des Lumieres
-- ---------------------------------------------------------------------------

INSERT INTO public.volunteer_roles (id, festival_id, name, description, color) VALUES
  ('r0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'Accueil', 'Accueil et orientation des visiteurs', '#3b82f6'),
  ('r0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001', 'Securite', 'Surveillance et securite du site', '#ef4444'),
  ('r0000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000001', 'Logistique', 'Montage, demontage et logistique', '#f59e0b')
ON CONFLICT (festival_id, name) DO NOTHING;

-- Shifts for the edition
INSERT INTO public.shifts (edition_id, role_id, venue_id, start_time, end_time, max_volunteers, status, description) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'r0000000-0000-0000-0000-000000000001', 'v0000000-0000-0000-0000-000000000001',
   '2026-12-05T17:00:00Z', '2026-12-05T21:00:00Z', 4, 'open', 'Accueil soiree d''ouverture'),
  ('e0000000-0000-0000-0000-000000000001', 'r0000000-0000-0000-0000-000000000001', 'v0000000-0000-0000-0000-000000000001',
   '2026-12-06T09:00:00Z', '2026-12-06T13:00:00Z', 3, 'open', 'Accueil matin samedi'),
  ('e0000000-0000-0000-0000-000000000001', 'r0000000-0000-0000-0000-000000000002', 'v0000000-0000-0000-0000-000000000001',
   '2026-12-05T17:00:00Z', '2026-12-06T01:00:00Z', 2, 'open', 'Securite soiree ouverture'),
  ('e0000000-0000-0000-0000-000000000001', 'r0000000-0000-0000-0000-000000000003', NULL,
   '2026-12-04T08:00:00Z', '2026-12-04T18:00:00Z', 6, 'open', 'Montage general J-1');

-- ---------------------------------------------------------------------------
-- Budget categories for Festival des Lumieres
-- ---------------------------------------------------------------------------

INSERT INTO public.budget_categories (id, festival_id, name, entry_type, color, sort_order) VALUES
  ('bc000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'Location stands', 'income', '#22c55e', 0),
  ('bc000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001', 'Subventions', 'income', '#3b82f6', 1),
  ('bc000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000001', 'Billetterie', 'income', '#a855f7', 2),
  ('bc000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000001', 'Location materiel', 'expense', '#ef4444', 3),
  ('bc000000-0000-0000-0000-000000000005', 'f0000000-0000-0000-0000-000000000001', 'Communication', 'expense', '#f97316', 4),
  ('bc000000-0000-0000-0000-000000000006', 'f0000000-0000-0000-0000-000000000001', 'Securite', 'expense', '#ec4899', 5)
ON CONFLICT (festival_id, name) DO NOTHING;

-- Budget entries for 2026 edition
INSERT INTO public.budget_entries (edition_id, category_id, description, amount_cents, entry_date, created_by) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'bc000000-0000-0000-0000-000000000001', 'Prevision revenus stands Zone A (40 stands)', 140000000, '2026-01-15', 'a0000000-0000-0000-0000-000000000001'),
  ('e0000000-0000-0000-0000-000000000001', 'bc000000-0000-0000-0000-000000000002', 'Subvention Ville de Lyon', 5000000, '2026-03-01', 'a0000000-0000-0000-0000-000000000001'),
  ('e0000000-0000-0000-0000-000000000001', 'bc000000-0000-0000-0000-000000000004', 'Location barnums et structures', -4500000, '2026-02-10', 'a0000000-0000-0000-0000-000000000001'),
  ('e0000000-0000-0000-0000-000000000001', 'bc000000-0000-0000-0000-000000000005', 'Impression affiches et flyers', -120000, '2026-04-15', 'a0000000-0000-0000-0000-000000000001'),
  ('e0000000-0000-0000-0000-000000000001', 'bc000000-0000-0000-0000-000000000006', 'Prestation securite 4 jours', -800000, '2026-05-01', 'a0000000-0000-0000-0000-000000000001');

-- ---------------------------------------------------------------------------
-- Equipment for Festival des Lumieres
-- ---------------------------------------------------------------------------

INSERT INTO public.equipment_items (id, festival_id, name, category, unit, total_quantity) VALUES
  ('eq000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'Table pliante 180cm', 'mobilier', 'piece', 60),
  ('eq000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001', 'Chaise pliante', 'mobilier', 'piece', 200),
  ('eq000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000001', 'Multiprise 5 prises', 'electricite', 'piece', 80),
  ('eq000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000001', 'Projecteur LED 100W', 'eclairage', 'piece', 40),
  ('eq000000-0000-0000-0000-000000000005', 'f0000000-0000-0000-0000-000000000001', 'Talkie-walkie', 'communication', 'piece', 15)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Floor plan for Festival des Lumieres 2026
-- ---------------------------------------------------------------------------

INSERT INTO public.floor_plans (edition_id, name, description, width_px, height_px, grid_size, canvas_data, version) VALUES
  ('e0000000-0000-0000-0000-000000000001',
   'Plan general Place des Terreaux',
   'Plan de masse de la Place des Terreaux avec emplacement des stands',
   1920, 1080, 20,
   '{
     "elements": [
       {"id": "entrance-1", "type": "entrance", "x": 960, "y": 1040, "width": 80, "height": 40, "label": "Entree principale"},
       {"id": "stage-1", "type": "stage", "x": 860, "y": 200, "width": 200, "height": 120, "label": "Scene principale"},
       {"id": "booth-a01", "type": "booth", "x": 200, "y": 400, "width": 60, "height": 60, "label": "A01"},
       {"id": "booth-a02", "type": "booth", "x": 280, "y": 400, "width": 60, "height": 60, "label": "A02"},
       {"id": "toilet-1", "type": "toilet", "x": 100, "y": 900, "width": 40, "height": 40, "label": "Sanitaires"},
       {"id": "first-aid", "type": "first_aid", "x": 1700, "y": 100, "width": 60, "height": 60, "label": "Poste de secours"},
       {"id": "info-1", "type": "info_point", "x": 960, "y": 960, "width": 40, "height": 40, "label": "Point info"}
     ]
   }',
   1);

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------

INSERT INTO public.notifications (user_id, festival_id, title, body, link, channel, is_read) VALUES
  ('a0000000-0000-0000-0000-000000000005', 'f0000000-0000-0000-0000-000000000001',
   'Candidature recue',
   'Votre candidature pour le Festival des Lumieres 2026 a bien ete recue. Nous l''examinerons prochainement.',
   '/festivals/festival-des-lumieres/applications',
   'both', false),
  ('a0000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000001',
   'Nouveaux creneaux benevoles',
   'De nouveaux creneaux benevoles sont disponibles pour le Festival des Lumieres. Inscrivez-vous !',
   '/festivals/festival-des-lumieres/volunteer',
   'in_app', false),
  ('a0000000-0000-0000-0000-000000000001', NULL,
   'Bienvenue sur Festosh !',
   'Bienvenue sur la plateforme Festosh. Commencez par creer votre premier festival.',
   '/dashboard',
   'in_app', true);

-- ---------------------------------------------------------------------------
-- Festival favorites
-- ---------------------------------------------------------------------------

INSERT INTO public.festival_favorites (user_id, festival_id) VALUES
  ('a0000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000001')
ON CONFLICT (user_id, festival_id) DO NOTHING;
