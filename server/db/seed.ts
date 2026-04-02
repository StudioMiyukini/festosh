import { randomUUID } from 'crypto';
import { hashSync } from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from './index';
import {
  profiles,
  exhibitorProfiles,
} from './schema';

// ─── Deterministic IDs for idempotency ──────────────────────────────────────
const TEST_ORGANIZER_ID = '00000000-0000-4000-a000-000000000010';
const TEST_ORGANIZER_EP_ID = '00000000-0000-4000-a000-000000000011';

function now(): number {
  return Math.floor(Date.now() / 1000);
}

async function seed() {
  console.log('[seed] Starting database seed...');

  // ─── Test Organizer (test@test.com / 12345678) ──────────────────────────
  const existingOrg = db
    .select()
    .from(profiles)
    .where(eq(profiles.email, 'test@test.com'))
    .get();

  if (!existingOrg) {
    console.log('[seed] Creating organizer test account...');
    db.insert(profiles)
      .values({
        id: TEST_ORGANIZER_ID,
        username: 'marie_dupont',
        displayName: 'Marie Dupont',
        email: 'test@test.com',
        passwordHash: hashSync('12345678', 10),
        firstName: 'Marie',
        lastName: 'Dupont',
        birthDate: '1988-03-14',
        platformRole: 'organizer',
        userType: 'organizer',
        phone: '+33 6 72 45 89 31',
        locale: 'fr',
        timezone: 'Europe/Paris',
        createdAt: now(),
        updatedAt: now(),
      })
      .run();

    db.insert(exhibitorProfiles)
      .values({
        id: TEST_ORGANIZER_EP_ID,
        userId: TEST_ORGANIZER_ID,
        companyName: 'Evenements MDP',
        legalForm: 'eurl_sarl',
        registrationNumber: '812 456 789',
        siret: '812 456 789 00015',
        insurerName: 'MAIF',
        insuranceContractNumber: 'MAIF-RC-2025-74821',
        contactEmail: 'contact@evenements-mdp.fr',
        contactPhone: '+33 6 72 45 89 31',
        website: 'https://evenements-mdp.fr',
        socialLinks: JSON.stringify([
          'https://instagram.com/evenements.mdp',
          'https://facebook.com/EvenementsMDP',
          'https://linkedin.com/company/evenements-mdp',
        ]),
        addressLine1: '24 rue des Lilas',
        addressLine2: 'Bureau 3B',
        postalCode: '69003',
        city: 'Lyon',
        createdAt: now(),
        updatedAt: now(),
      })
      .run();

    console.log('[seed]   -> test@test.com (password: 12345678) — organizer');
  } else {
    console.log('[seed] Organizer test account already exists, skipping.');
  }

  console.log('[seed] Seed complete!');
}

seed().catch((err) => {
  console.error('[seed] Error:', err);
  process.exit(1);
});
