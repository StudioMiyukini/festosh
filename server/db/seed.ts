import { randomUUID } from 'crypto';
import { hashSync } from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from './index';
import {
  profiles,
  festivals,
  festivalMembers,
  editions,
  venues,
  events,
  boothLocations,
} from './schema';

// ─── Deterministic IDs for idempotency ──────────────────────────────────────
const ADMIN_ID = '00000000-0000-4000-a000-000000000001';
const ORGANIZER_ID = '00000000-0000-4000-a000-000000000002';
const JAPAN_EXPO_ID = '00000000-0000-4000-b000-000000000001';
const GEEK_CON_ID = '00000000-0000-4000-b000-000000000002';
const JAPAN_EDITION_ID = '00000000-0000-4000-c000-000000000001';
const GEEK_EDITION_ID = '00000000-0000-4000-c000-000000000002';
const VENUE_MAIN_HALL_ID = '00000000-0000-4000-d000-000000000001';
const VENUE_SCENE_ID = '00000000-0000-4000-d000-000000000002';
const VENUE_SALLE_LYON_ID = '00000000-0000-4000-d000-000000000003';
const EVENT_COSPLAY_ID = '00000000-0000-4000-e000-000000000001';
const EVENT_CONCERT_ID = '00000000-0000-4000-e000-000000000002';
const EVENT_RETRO_ID = '00000000-0000-4000-e000-000000000003';
const BOOTH_A1_ID = '00000000-0000-4000-f000-000000000001';
const BOOTH_A2_ID = '00000000-0000-4000-f000-000000000002';
const BOOTH_B1_ID = '00000000-0000-4000-f000-000000000003';
const BOOTH_L1_ID = '00000000-0000-4000-f000-000000000004';

function now(): number {
  return Math.floor(Date.now() / 1000);
}

async function seed() {
  console.log('[seed] Starting database seed...');

  // ─── Profiles ───────────────────────────────────────────────────────────
  const existingAdmin = db
    .select()
    .from(profiles)
    .where(eq(profiles.id, ADMIN_ID))
    .get();

  if (!existingAdmin) {
    console.log('[seed] Creating admin user...');
    db.insert(profiles)
      .values({
        id: ADMIN_ID,
        username: 'admin',
        displayName: 'Admin Festosh',
        email: 'admin@festosh.com',
        passwordHash: hashSync('admin123', 10),
        platformRole: 'admin',
        locale: 'fr',
        timezone: 'Europe/Paris',
        createdAt: now(),
        updatedAt: now(),
      })
      .run();
    console.log('[seed]   -> admin@festosh.com (password: admin123)');
  } else {
    console.log('[seed] Admin user already exists, skipping.');
  }

  const existingOrg = db
    .select()
    .from(profiles)
    .where(eq(profiles.id, ORGANIZER_ID))
    .get();

  if (!existingOrg) {
    console.log('[seed] Creating organizer user...');
    db.insert(profiles)
      .values({
        id: ORGANIZER_ID,
        username: 'organizer',
        displayName: 'Marie Dupont',
        email: 'organizer@festosh.com',
        passwordHash: hashSync('org123', 10),
        platformRole: 'organizer',
        locale: 'fr',
        timezone: 'Europe/Paris',
        createdAt: now(),
        updatedAt: now(),
      })
      .run();
    console.log('[seed]   -> organizer@festosh.com (password: org123)');
  } else {
    console.log('[seed] Organizer user already exists, skipping.');
  }

  // ─── Festivals ──────────────────────────────────────────────────────────
  const existingJapanExpo = db
    .select()
    .from(festivals)
    .where(eq(festivals.id, JAPAN_EXPO_ID))
    .get();

  if (!existingJapanExpo) {
    console.log('[seed] Creating festival "Japan Expo Mini"...');
    db.insert(festivals)
      .values({
        id: JAPAN_EXPO_ID,
        slug: 'japan-expo-mini',
        name: 'Japan Expo Mini',
        description:
          'Un festival convivial dedie a la culture japonaise : manga, anime, cosplay, gastronomie et arts traditionnels.',
        themePrimaryColor: '#e11d48',
        themeSecondaryColor: '#f59e0b',
        themeFont: 'Noto Sans JP',
        country: 'FR',
        city: 'Paris',
        address: '1 Place de la Porte de Versailles, 75015 Paris',
        latitude: 48.8323,
        longitude: 2.2872,
        website: 'https://japan-expo-mini.example.com',
        contactEmail: 'contact@japan-expo-mini.example.com',
        socialLinks: JSON.stringify({
          twitter: 'https://twitter.com/japanexpomini',
          instagram: 'https://instagram.com/japanexpomini',
        }),
        tags: JSON.stringify(['manga', 'anime', 'cosplay', 'japon', 'culture']),
        status: 'published',
        createdBy: ORGANIZER_ID,
        createdAt: now(),
        updatedAt: now(),
      })
      .run();
  } else {
    console.log('[seed] Festival "Japan Expo Mini" already exists, skipping.');
  }

  const existingGeekCon = db
    .select()
    .from(festivals)
    .where(eq(festivals.id, GEEK_CON_ID))
    .get();

  if (!existingGeekCon) {
    console.log('[seed] Creating festival "Geek Con"...');
    db.insert(festivals)
      .values({
        id: GEEK_CON_ID,
        slug: 'geek-con',
        name: 'Geek Con',
        description:
          'Le rendez-vous des passionnes de jeux video, retro-gaming, science-fiction et nouvelles technologies.',
        themePrimaryColor: '#6366f1',
        themeSecondaryColor: '#10b981',
        themeFont: 'Inter',
        country: 'FR',
        city: 'Lyon',
        address: 'Eurexpo, Boulevard de l\'Europe, 69680 Chassieu',
        latitude: 45.7273,
        longitude: 4.9511,
        website: 'https://geek-con.example.com',
        contactEmail: 'hello@geek-con.example.com',
        socialLinks: JSON.stringify({
          twitter: 'https://twitter.com/geekcon',
          discord: 'https://discord.gg/geekcon',
        }),
        tags: JSON.stringify(['gaming', 'retro', 'sci-fi', 'tech', 'esport']),
        status: 'draft',
        createdBy: ORGANIZER_ID,
        createdAt: now(),
        updatedAt: now(),
      })
      .run();
  } else {
    console.log('[seed] Festival "Geek Con" already exists, skipping.');
  }

  // ─── Festival Members (organizer as owner) ──────────────────────────────
  const existingMember1 = db
    .select()
    .from(festivalMembers)
    .where(eq(festivalMembers.festivalId, JAPAN_EXPO_ID))
    .get();

  if (!existingMember1) {
    console.log('[seed] Adding organizer as owner of Japan Expo Mini...');
    db.insert(festivalMembers)
      .values({
        id: randomUUID(),
        festivalId: JAPAN_EXPO_ID,
        userId: ORGANIZER_ID,
        role: 'owner',
        joinedAt: now(),
      })
      .run();
  }

  const existingMember2 = db
    .select()
    .from(festivalMembers)
    .where(eq(festivalMembers.festivalId, GEEK_CON_ID))
    .get();

  if (!existingMember2) {
    console.log('[seed] Adding organizer as owner of Geek Con...');
    db.insert(festivalMembers)
      .values({
        id: randomUUID(),
        festivalId: GEEK_CON_ID,
        userId: ORGANIZER_ID,
        role: 'owner',
        joinedAt: now(),
      })
      .run();
  }

  // ─── Editions ───────────────────────────────────────────────────────────
  const existingJapanEdition = db
    .select()
    .from(editions)
    .where(eq(editions.id, JAPAN_EDITION_ID))
    .get();

  if (!existingJapanEdition) {
    console.log('[seed] Creating edition for Japan Expo Mini 2026...');
    db.insert(editions)
      .values({
        id: JAPAN_EDITION_ID,
        festivalId: JAPAN_EXPO_ID,
        name: 'Japan Expo Mini 2026',
        slug: '2026',
        description: 'Edition inaugurale du Japan Expo Mini, ete 2026.',
        startDate: '2026-07-10',
        endDate: '2026-07-12',
        status: 'planning',
        expectedVisitors: 5000,
        maxExhibitors: 80,
        maxVolunteers: 30,
        visitorHours: JSON.stringify({
          '2026-07-10': { open: '10:00', close: '19:00' },
          '2026-07-11': { open: '10:00', close: '20:00' },
          '2026-07-12': { open: '10:00', close: '18:00' },
        }),
        isActive: 1,
        createdAt: now(),
        updatedAt: now(),
      })
      .run();
  }

  const existingGeekEdition = db
    .select()
    .from(editions)
    .where(eq(editions.id, GEEK_EDITION_ID))
    .get();

  if (!existingGeekEdition) {
    console.log('[seed] Creating edition for Geek Con 2026...');
    db.insert(editions)
      .values({
        id: GEEK_EDITION_ID,
        festivalId: GEEK_CON_ID,
        name: 'Geek Con 2026',
        slug: '2026',
        description: 'Premiere edition de Geek Con a Lyon.',
        startDate: '2026-11-14',
        endDate: '2026-11-15',
        status: 'planning',
        expectedVisitors: 3000,
        maxExhibitors: 50,
        maxVolunteers: 20,
        visitorHours: JSON.stringify({
          '2026-11-14': { open: '09:00', close: '19:00' },
          '2026-11-15': { open: '09:00', close: '18:00' },
        }),
        isActive: 1,
        createdAt: now(),
        updatedAt: now(),
      })
      .run();
  }

  // ─── Venues ─────────────────────────────────────────────────────────────
  const existingVenueMain = db
    .select()
    .from(venues)
    .where(eq(venues.id, VENUE_MAIN_HALL_ID))
    .get();

  if (!existingVenueMain) {
    console.log('[seed] Creating venues for Japan Expo Mini...');
    db.insert(venues)
      .values([
        {
          id: VENUE_MAIN_HALL_ID,
          festivalId: JAPAN_EXPO_ID,
          name: 'Hall Principal',
          description: 'Grande salle d\'exposition avec stands exposants et allees visiteurs.',
          venueType: 'hall',
          capacity: 2000,
          isActive: 1,
          createdAt: now(),
          updatedAt: now(),
        },
        {
          id: VENUE_SCENE_ID,
          festivalId: JAPAN_EXPO_ID,
          name: 'Scene Sakura',
          description: 'Scene principale pour les spectacles, concerts et concours cosplay.',
          venueType: 'stage',
          capacity: 500,
          isActive: 1,
          createdAt: now(),
          updatedAt: now(),
        },
      ])
      .run();
  }

  const existingVenueLyon = db
    .select()
    .from(venues)
    .where(eq(venues.id, VENUE_SALLE_LYON_ID))
    .get();

  if (!existingVenueLyon) {
    console.log('[seed] Creating venue for Geek Con...');
    db.insert(venues)
      .values({
        id: VENUE_SALLE_LYON_ID,
        festivalId: GEEK_CON_ID,
        name: 'Salle Pixel',
        description: 'Espace principal de Geek Con avec zone retro-gaming et stands.',
        venueType: 'hall',
        capacity: 1500,
        isActive: 1,
        createdAt: now(),
        updatedAt: now(),
      })
      .run();
  }

  // ─── Events ─────────────────────────────────────────────────────────────
  const existingEvent1 = db
    .select()
    .from(events)
    .where(eq(events.id, EVENT_COSPLAY_ID))
    .get();

  if (!existingEvent1) {
    console.log('[seed] Creating sample events...');

    // Japan Expo Mini events
    const july10_14h = Math.floor(new Date('2026-07-10T14:00:00+02:00').getTime() / 1000);
    const july10_16h = Math.floor(new Date('2026-07-10T16:00:00+02:00').getTime() / 1000);
    const july11_20h = Math.floor(new Date('2026-07-11T20:00:00+02:00').getTime() / 1000);
    const july11_22h = Math.floor(new Date('2026-07-11T22:00:00+02:00').getTime() / 1000);

    db.insert(events)
      .values([
        {
          id: EVENT_COSPLAY_ID,
          editionId: JAPAN_EDITION_ID,
          venueId: VENUE_SCENE_ID,
          title: 'Concours Cosplay',
          description:
            'Grand concours cosplay ouvert a tous les niveaux. Inscriptions sur place des 12h.',
          category: 'contest',
          startTime: july10_14h,
          endTime: july10_16h,
          isPublic: 1,
          maxParticipants: 30,
          speakerNames: JSON.stringify([]),
          tags: JSON.stringify(['cosplay', 'concours']),
          createdBy: ORGANIZER_ID,
          createdAt: now(),
          updatedAt: now(),
        },
        {
          id: EVENT_CONCERT_ID,
          editionId: JAPAN_EDITION_ID,
          venueId: VENUE_SCENE_ID,
          title: 'Concert J-Pop / J-Rock',
          description: 'Soiree musicale avec des groupes locaux de J-Pop et J-Rock.',
          category: 'concert',
          startTime: july11_20h,
          endTime: july11_22h,
          isPublic: 1,
          maxParticipants: 500,
          speakerNames: JSON.stringify(['Sakura Band', 'NeoTokyo']),
          tags: JSON.stringify(['musique', 'jpop', 'jrock', 'concert']),
          createdBy: ORGANIZER_ID,
          createdAt: now(),
          updatedAt: now(),
        },
      ])
      .run();

    // Geek Con event
    const nov14_15h = Math.floor(new Date('2026-11-14T15:00:00+01:00').getTime() / 1000);
    const nov14_17h = Math.floor(new Date('2026-11-14T17:00:00+01:00').getTime() / 1000);

    db.insert(events)
      .values({
        id: EVENT_RETRO_ID,
        editionId: GEEK_EDITION_ID,
        venueId: VENUE_SALLE_LYON_ID,
        title: 'Tournoi Retro-Gaming',
        description:
          'Tournoi multi-jeux sur consoles retro : SNES, Mega Drive, N64. Lots a gagner !',
        category: 'tournament',
        startTime: nov14_15h,
        endTime: nov14_17h,
        isPublic: 1,
        maxParticipants: 64,
        speakerNames: JSON.stringify([]),
        tags: JSON.stringify(['retro', 'gaming', 'tournoi']),
        createdBy: ORGANIZER_ID,
        createdAt: now(),
        updatedAt: now(),
      })
      .run();
  }

  // ─── Booth Locations ────────────────────────────────────────────────────
  const existingBooth1 = db
    .select()
    .from(boothLocations)
    .where(eq(boothLocations.id, BOOTH_A1_ID))
    .get();

  if (!existingBooth1) {
    console.log('[seed] Creating sample booth locations...');

    // Japan Expo Mini booths
    db.insert(boothLocations)
      .values([
        {
          id: BOOTH_A1_ID,
          editionId: JAPAN_EDITION_ID,
          code: 'A-01',
          zone: 'Zone A - Manga & Artistes',
          widthM: 3,
          depthM: 2,
          hasElectricity: 1,
          maxWattage: 500,
          hasWater: 0,
          isInterior: 1,
          isAccessible: 1,
          priceCents: 15000,
          equipmentIncluded: JSON.stringify(['1 table', '2 chaises']),
          isAvailable: 1,
          createdAt: now(),
          updatedAt: now(),
        },
        {
          id: BOOTH_A2_ID,
          editionId: JAPAN_EDITION_ID,
          code: 'A-02',
          zone: 'Zone A - Manga & Artistes',
          widthM: 3,
          depthM: 2,
          hasElectricity: 1,
          maxWattage: 500,
          hasWater: 0,
          isInterior: 1,
          isAccessible: 1,
          priceCents: 15000,
          equipmentIncluded: JSON.stringify(['1 table', '2 chaises']),
          isAvailable: 1,
          createdAt: now(),
          updatedAt: now(),
        },
        {
          id: BOOTH_B1_ID,
          editionId: JAPAN_EDITION_ID,
          code: 'B-01',
          zone: 'Zone B - Gastronomie',
          widthM: 4,
          depthM: 3,
          hasElectricity: 1,
          maxWattage: 2000,
          hasWater: 1,
          isInterior: 1,
          isAccessible: 1,
          priceCents: 25000,
          equipmentIncluded: JSON.stringify(['1 table', '2 chaises', 'acces eau']),
          isAvailable: 1,
          createdAt: now(),
          updatedAt: now(),
        },
      ])
      .run();

    // Geek Con booth
    db.insert(boothLocations)
      .values({
        id: BOOTH_L1_ID,
        editionId: GEEK_EDITION_ID,
        code: 'L-01',
        zone: 'Zone Principale',
        widthM: 3,
        depthM: 2.5,
        hasElectricity: 1,
        maxWattage: 1000,
        hasWater: 0,
        isInterior: 1,
        isAccessible: 1,
        priceCents: 12000,
        equipmentIncluded: JSON.stringify(['1 table', '2 chaises']),
        isAvailable: 1,
        createdAt: now(),
        updatedAt: now(),
      })
      .run();
  }

  console.log('[seed] Seed complete!');
}

seed().catch((err) => {
  console.error('[seed] Error:', err);
  process.exit(1);
});
