/**
 * Auth routes — register, login, profile management.
 */

import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { db, sqlite } from '../db/index.js';
import { logAudit } from '../lib/audit.js';
import { profiles, exhibitorProfiles, documents, passwordResetTokens, tokenBlacklist } from '../db/schema.js';
import {
  authMiddleware,
  generateToken,
  hashPassword,
  verifyPassword,
  rateLimit,
} from '../middleware/auth.js';
import { sendEmail } from '../lib/email.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const authRoutes = new Hono();

// Rate limit: 5 login attempts per 15 minutes per IP
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
// Rate limit: 3 registrations per hour per IP
const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 3 });
// Rate limit: 3 forgot password requests per 15 minutes per IP
const forgotPasswordLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 3 });

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------
const userTypeEnum = z.enum(['visitor', 'volunteer', 'exhibitor', 'organizer']);

const registerSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/, 'Username may only contain letters, numbers, hyphens, and underscores'),
  email: z.string().email('Invalid email format').max(255),
  password: z.string().min(10, 'Le mot de passe doit contenir au moins 10 caracteres').max(128).regex(/[A-Z]/, 'Doit contenir une majuscule').regex(/[a-z]/, 'Doit contenir une minuscule').regex(/[0-9]/, 'Doit contenir un chiffre'),
  user_type: userTypeEnum.default('visitor'),
  // Identity fields (exhibitor/organizer)
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
  birth_date: z.string().max(10).optional(), // YYYY-MM-DD
  // Professional profile fields (exhibitor/organizer)
  company_name: z.string().max(200).optional(),
  category: z.string().max(100).optional(),
  legal_form: z.string().max(50).optional(),
  registration_number: z.string().max(50).optional(),
  siret: z.string().max(20).optional(),
  insurer_name: z.string().max(200).optional(),
  insurance_contract_number: z.string().max(100).optional(),
  contact_phone: z.string().max(20).optional(),
  contact_email: z.string().email().max(255).optional(),
  website: z.string().max(500).optional(),
  social_links: z.array(z.string().url().max(500)).max(10).optional(),
  // Billing address
  address_line1: z.string().max(200).optional(),
  address_line2: z.string().max(200).optional(),
  postal_code: z.string().max(10).optional(),
  city: z.string().max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format').max(255),
  password: z.string().min(1).max(128),
});

const changePasswordSchema = z.object({
  old_password: z.string().min(1).max(128),
  new_password: z.string().min(10, 'Le mot de passe doit contenir au moins 10 caracteres').max(128).regex(/[A-Z]/, 'Doit contenir une majuscule').regex(/[a-z]/, 'Doit contenir une minuscule').regex(/[0-9]/, 'Doit contenir un chiffre'),
});

const updateProfileSchema = z.object({
  first_name: z.string().max(100).nullable().optional(),
  last_name: z.string().max(100).nullable().optional(),
  birth_date: z.string().max(10).nullable().optional(),
  display_name: z.string().max(100).nullable().optional(),
  bio: z.string().max(500).nullable().optional(),
  avatar_url: z.string().url().max(500).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  locale: z.string().max(10).optional(),
  timezone: z.string().max(50).optional(),
  // Volunteer fields
  volunteer_bio: z.string().max(1000).nullable().optional(),
  volunteer_skills: z.array(z.string().max(50)).max(20).optional(),
  // Exhibitor/professional profile fields (nested)
  exhibitor_profile: z.object({
    company_name: z.string().max(200).optional(),
    trade_name: z.string().max(200).optional(),
    activity_type: z.string().max(100).optional(),
    category: z.string().max(100).optional(),
    description: z.string().max(2000).optional(),
    website: z.string().max(500).optional(),
    social_links: z.array(z.string().max(500)).max(10).optional(),
    legal_form: z.string().max(50).optional(),
    registration_number: z.string().max(50).optional(),
    siret: z.string().max(20).optional(),
    vat_number: z.string().max(30).optional(),
    insurer_name: z.string().max(200).optional(),
    insurance_contract_number: z.string().max(100).optional(),
    contact_first_name: z.string().max(100).optional(),
    contact_last_name: z.string().max(100).optional(),
    contact_email: z.string().email().max(255).optional(),
    contact_phone: z.string().max(20).optional(),
    address_line1: z.string().max(200).optional(),
    address_line2: z.string().max(200).optional(),
    postal_code: z.string().max(10).optional(),
    city: z.string().max(100).optional(),
    country: z.string().max(2).optional(),
  }).optional(),
});

// ---------------------------------------------------------------------------
// POST /register
// ---------------------------------------------------------------------------
authRoutes.post('/register', registerLimiter, async (c) => {
  try {
    const body = await c.req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: parsed.error.errors[0]?.message || 'Invalid input' }, 400);
    }
    const d = parsed.data;

    // Check for existing email
    const existingEmail = db
      .select()
      .from(profiles)
      .where(eq(profiles.email, d.email))
      .get();

    if (existingEmail) {
      return c.json({ success: false, error: 'An account with these details already exists' }, 409);
    }

    // Check for existing username
    const existingUsername = db
      .select()
      .from(profiles)
      .where(eq(profiles.username, d.username))
      .get();

    if (existingUsername) {
      return c.json({ success: false, error: 'An account with these details already exists' }, 409);
    }

    const now = Math.floor(Date.now() / 1000);
    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(d.password);
    const platformRole = d.user_type === 'organizer' ? 'organizer' : 'user';

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = now + 24 * 60 * 60; // 24h from now

    db.insert(profiles)
      .values({
        id,
        username: d.username,
        email: d.email,
        passwordHash,
        firstName: d.first_name || null,
        lastName: d.last_name || null,
        birthDate: d.birth_date || null,
        platformRole,
        userType: d.user_type,
        phone: d.contact_phone || null,
        locale: 'fr',
        timezone: 'Europe/Paris',
        emailVerified: 0,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    // Send verification email (fire and forget — don't block registration)
    const verifyLink = `${FRONTEND_URL}/verify-email/${verificationToken}`;
    sendEmail({
      to: d.email,
      toName: d.first_name || d.username,
      subject: '[Festosh] Vérifiez votre adresse email',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6366f1, #ec4899); padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Festosh</h1>
          </div>
          <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="color: #111827; margin-top: 0;">Bienvenue sur Festosh !</h2>
            <p style="color: #4b5563; line-height: 1.6;">
              Merci de vous être inscrit. Veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyLink}" style="background: #6366f1; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                Vérifier mon email
              </a>
            </div>
            <p style="color: #9ca3af; font-size: 13px; line-height: 1.5;">
              Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :<br/>
              <a href="${verifyLink}" style="color: #6366f1; word-break: break-all;">${verifyLink}</a>
            </p>
            <p style="color: #9ca3af; font-size: 13px;">Ce lien expire dans 24 heures.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="color: #9ca3af; font-size: 12px;">
              Envoyé depuis Festosh — Plateforme de gestion de festivals
            </p>
          </div>
        </div>
      `,
    }).catch((err) => {
      console.error('[AUTH] Failed to send verification email to', d.email, ':', err);
    });

    // Auto-create exhibitor/professional profile for exhibitor and organizer
    if (d.user_type === 'exhibitor' || d.user_type === 'organizer') {
      db.insert(exhibitorProfiles)
        .values({
          id: crypto.randomUUID(),
          userId: id,
          companyName: d.company_name || null,
          category: d.category || null,
          legalForm: d.legal_form || null,
          registrationNumber: d.registration_number || null,
          siret: d.siret || null,
          insurerName: d.insurer_name || null,
          insuranceContractNumber: d.insurance_contract_number || null,
          contactEmail: d.contact_email || d.email,
          contactPhone: d.contact_phone || null,
          website: d.website || null,
          socialLinks: d.social_links ? JSON.stringify(d.social_links) : null,
          addressLine1: d.address_line1 || null,
          addressLine2: d.address_line2 || null,
          postalCode: d.postal_code || null,
          city: d.city || null,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    }

    const token = generateToken(id, platformRole);
    logAudit(c, 'user_registered', 'profile', id);

    return c.json({
      success: true,
      data: {
        token,
        user: {
          id,
          username: d.username,
          email: d.email,
          first_name: d.first_name || null,
          last_name: d.last_name || null,
          birth_date: d.birth_date || null,
          display_name: null,
          avatar_url: null,
          bio: null,
          phone: d.contact_phone || null,
          platform_role: platformRole,
          user_type: d.user_type,
          locale: 'fr',
          timezone: 'Europe/Paris',
        },
      },
    }, 201);
  } catch (error) {
    console.error('[auth] Register error:', error);
    return c.json({ success: false, error: 'Registration failed' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /login
// ---------------------------------------------------------------------------
authRoutes.post('/login', authLimiter, async (c) => {
  try {
    const body = await c.req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: 'Email and password are required' }, 400);
    }
    const { email, password } = parsed.data;

    const user = db
      .select()
      .from(profiles)
      .where(eq(profiles.email, email))
      .get();

    if (!user) {
      return c.json({ success: false, error: 'Invalid email or password' }, 401);
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return c.json({ success: false, error: 'Invalid email or password' }, 401);
    }

    const token = generateToken(user.id, user.platformRole ?? 'user');
    logAudit(c, 'user_login', 'profile', user.id);

    return c.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          display_name: user.displayName,
          avatar_url: user.avatarUrl,
          bio: user.bio,
          phone: user.phone,
          platform_role: user.platformRole,
          user_type: user.userType || 'visitor',
          locale: user.locale,
          timezone: user.timezone,
        },
      },
    });
  } catch (error) {
    console.error('[auth] Login error:', error);
    return c.json({ success: false, error: 'Login failed' }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /me
// ---------------------------------------------------------------------------
authRoutes.get('/me', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');

    const user = db
      .select()
      .from(profiles)
      .where(eq(profiles.id, userId))
      .get();

    if (!user) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    // Fetch exhibitor/professional profile for exhibitor and organizer
    let exhibitor_profile = null;
    if (user.userType === 'exhibitor' || user.userType === 'organizer') {
      exhibitor_profile = db
        .select()
        .from(exhibitorProfiles)
        .where(eq(exhibitorProfiles.userId, userId))
        .get() || null;
    }

    // Fetch user's documents
    const userDocuments = db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId))
      .all();

    return c.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
        birth_date: user.birthDate,
        display_name: user.displayName,
        avatar_url: user.avatarUrl,
        bio: user.bio,
        phone: user.phone,
        platform_role: user.platformRole,
        user_type: user.userType || 'visitor',
        volunteer_bio: user.volunteerBio,
        volunteer_skills: (() => { try { return user.volunteerSkills ? JSON.parse(user.volunteerSkills) : []; } catch { return []; } })(),
        locale: user.locale,
        timezone: user.timezone,
        created_at: user.createdAt,
        exhibitor_profile: exhibitor_profile ? {
          id: exhibitor_profile.id,
          company_name: exhibitor_profile.companyName,
          trade_name: exhibitor_profile.tradeName,
          activity_type: exhibitor_profile.activityType,
          category: exhibitor_profile.category,
          description: exhibitor_profile.description,
          logo_url: exhibitor_profile.logoUrl,
          website: exhibitor_profile.website,
          social_links: (() => { try { return exhibitor_profile.socialLinks ? JSON.parse(exhibitor_profile.socialLinks) : []; } catch { return []; } })(),
          legal_form: exhibitor_profile.legalForm,
          registration_number: exhibitor_profile.registrationNumber,
          siret: exhibitor_profile.siret,
          vat_number: exhibitor_profile.vatNumber,
          insurer_name: exhibitor_profile.insurerName,
          insurance_contract_number: exhibitor_profile.insuranceContractNumber,
          contact_first_name: exhibitor_profile.contactFirstName,
          contact_last_name: exhibitor_profile.contactLastName,
          contact_email: exhibitor_profile.contactEmail,
          contact_phone: exhibitor_profile.contactPhone,
          address_line1: exhibitor_profile.addressLine1,
          address_line2: exhibitor_profile.addressLine2,
          postal_code: exhibitor_profile.postalCode,
          city: exhibitor_profile.city,
          country: exhibitor_profile.country,
        } : null,
        documents: userDocuments.map((d) => ({
          id: d.id,
          file_name: d.fileName,
          document_type: d.documentType,
          label: d.label,
          status: d.status,
          mime_type: d.mimeType,
          size_bytes: d.sizeBytes,
          created_at: d.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('[auth] Get profile error:', error);
    return c.json({ success: false, error: 'Failed to fetch profile' }, 500);
  }
});

// ---------------------------------------------------------------------------
// PUT /me
// ---------------------------------------------------------------------------
authRoutes.put('/me', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: parsed.error.errors[0]?.message || 'Invalid input' }, 400);
    }
    const { first_name, last_name, birth_date, display_name, bio, avatar_url, phone, locale, timezone, volunteer_bio, volunteer_skills, exhibitor_profile } = parsed.data;

    const now = Math.floor(Date.now() / 1000);

    // Update profile fields
    const profileUpdate: Record<string, unknown> = { updatedAt: now };
    if (first_name !== undefined) profileUpdate.firstName = first_name;
    if (last_name !== undefined) profileUpdate.lastName = last_name;
    if (birth_date !== undefined) profileUpdate.birthDate = birth_date;
    if (display_name !== undefined) profileUpdate.displayName = display_name;
    if (bio !== undefined) profileUpdate.bio = bio;
    if (avatar_url !== undefined) profileUpdate.avatarUrl = avatar_url;
    if (phone !== undefined) profileUpdate.phone = phone;
    if (locale !== undefined) profileUpdate.locale = locale;
    if (timezone !== undefined) profileUpdate.timezone = timezone;
    if (volunteer_bio !== undefined) profileUpdate.volunteerBio = volunteer_bio;
    if (volunteer_skills !== undefined) profileUpdate.volunteerSkills = JSON.stringify(volunteer_skills);

    db.update(profiles)
      .set(profileUpdate)
      .where(eq(profiles.id, userId))
      .run();

    // Update exhibitor/professional profile if provided
    if (exhibitor_profile) {
      const existing = db.select().from(exhibitorProfiles).where(eq(exhibitorProfiles.userId, userId)).get();
      const epData = {
        companyName: exhibitor_profile.company_name,
        tradeName: exhibitor_profile.trade_name,
        activityType: exhibitor_profile.activity_type,
        category: exhibitor_profile.category,
        description: exhibitor_profile.description,
        website: exhibitor_profile.website,
        socialLinks: exhibitor_profile.social_links ? JSON.stringify(exhibitor_profile.social_links) : undefined,
        legalForm: exhibitor_profile.legal_form,
        registrationNumber: exhibitor_profile.registration_number,
        siret: exhibitor_profile.siret,
        vatNumber: exhibitor_profile.vat_number,
        insurerName: exhibitor_profile.insurer_name,
        insuranceContractNumber: exhibitor_profile.insurance_contract_number,
        contactFirstName: exhibitor_profile.contact_first_name,
        contactLastName: exhibitor_profile.contact_last_name,
        contactEmail: exhibitor_profile.contact_email,
        contactPhone: exhibitor_profile.contact_phone,
        addressLine1: exhibitor_profile.address_line1,
        addressLine2: exhibitor_profile.address_line2,
        postalCode: exhibitor_profile.postal_code,
        city: exhibitor_profile.city,
        country: exhibitor_profile.country,
        updatedAt: now,
      };

      if (existing) {
        db.update(exhibitorProfiles).set(epData).where(eq(exhibitorProfiles.userId, userId)).run();
      } else {
        db.insert(exhibitorProfiles).values({
          id: crypto.randomUUID(),
          userId,
          ...epData,
          createdAt: now,
        }).run();
      }
    }

    const user = db.select().from(profiles).where(eq(profiles.id, userId)).get();

    return c.json({
      success: true,
      data: {
        id: user!.id,
        username: user!.username,
        email: user!.email,
        first_name: user!.firstName,
        last_name: user!.lastName,
        birth_date: user!.birthDate,
        display_name: user!.displayName,
        avatar_url: user!.avatarUrl,
        bio: user!.bio,
        phone: user!.phone,
        platform_role: user!.platformRole,
        user_type: user!.userType || 'visitor',
        volunteer_bio: user!.volunteerBio,
        volunteer_skills: (() => { try { return user!.volunteerSkills ? JSON.parse(user!.volunteerSkills) : []; } catch { return []; } })(),
        locale: user!.locale,
        timezone: user!.timezone,
      },
    });
  } catch (error) {
    console.error('[auth] Update profile error:', error);
    return c.json({ success: false, error: 'Failed to update profile' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /change-password
// ---------------------------------------------------------------------------
authRoutes.post('/change-password', authLimiter, authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: parsed.error.errors[0]?.message || 'Invalid input' }, 400);
    }
    const { old_password, new_password } = parsed.data;

    const user = db
      .select()
      .from(profiles)
      .where(eq(profiles.id, userId))
      .get();

    if (!user) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    const valid = await verifyPassword(old_password, user.passwordHash);
    if (!valid) {
      return c.json({ success: false, error: 'Current password is incorrect' }, 401);
    }

    const newHash = await hashPassword(new_password);
    const now = Math.floor(Date.now() / 1000);

    db.update(profiles)
      .set({ passwordHash: newHash, updatedAt: now })
      .where(eq(profiles.id, userId))
      .run();

    return c.json({ success: true, data: { message: 'Password changed successfully' } });
  } catch (error) {
    console.error('[auth] Change password error:', error);
    return c.json({ success: false, error: 'Failed to change password' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /logout
// ---------------------------------------------------------------------------
authRoutes.post('/logout', authMiddleware, async (c) => {
  try {
    const header = c.req.header('Authorization');
    if (!header) {
      return c.json({ success: false, error: 'No token provided' }, 400);
    }

    const token = header.slice(7);
    const decoded = jwt.decode(token) as jwt.JwtPayload | null;

    if (decoded?.jti) {
      const now = Math.floor(Date.now() / 1000);
      db.insert(tokenBlacklist)
        .values({
          id: crypto.randomUUID(),
          jti: decoded.jti,
          expiresAt: decoded.exp || now + 24 * 60 * 60,
          createdAt: now,
        })
        .run();
    }

    return c.json({ success: true, data: { message: 'Logged out successfully' } });
  } catch (error) {
    console.error('[auth] Logout error:', error);
    return c.json({ success: false, error: 'Logout failed' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /forgot-password
// ---------------------------------------------------------------------------
authRoutes.post('/forgot-password', forgotPasswordLimiter, async (c) => {
  try {
    const body = await c.req.json();
    const email = body.email;

    if (!email || typeof email !== 'string') {
      return c.json({ success: false, error: 'Email is required' }, 400);
    }

    // Always return success to not leak whether email exists
    const successResponse = {
      success: true,
      data: { message: 'Si un compte existe avec cet email, un lien de reinitialisation a ete envoye.' },
    };

    const user = db.select().from(profiles).where(eq(profiles.email, email)).get();

    if (!user) {
      return c.json(successResponse);
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const now = Math.floor(Date.now() / 1000);

    db.insert(passwordResetTokens)
      .values({
        id: crypto.randomUUID(),
        userId: user.id,
        tokenHash,
        expiresAt: now + 60 * 60, // 1h expiry
        createdAt: now,
      })
      .run();

    // Send reset email (fire and forget — always return success to not leak info)
    const resetLink = `${FRONTEND_URL}/reset-password/${token}`;
    sendEmail({
      to: email,
      toName: user.displayName || user.firstName || user.username,
      subject: '[Festosh] Réinitialisation de votre mot de passe',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6366f1, #ec4899); padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Festosh</h1>
          </div>
          <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="color: #111827; margin-top: 0;">Réinitialisation du mot de passe</h2>
            <p style="color: #4b5563; line-height: 1.6;">
              Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background: #6366f1; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                Réinitialiser mon mot de passe
              </a>
            </div>
            <p style="color: #9ca3af; font-size: 13px; line-height: 1.5;">
              Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :<br/>
              <a href="${resetLink}" style="color: #6366f1; word-break: break-all;">${resetLink}</a>
            </p>
            <p style="color: #9ca3af; font-size: 13px;">Ce lien expire dans 1 heure.</p>
            <p style="color: #9ca3af; font-size: 13px;">Si vous n'avez pas fait cette demande, ignorez simplement cet email.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="color: #9ca3af; font-size: 12px;">
              Envoyé depuis Festosh — Plateforme de gestion de festivals
            </p>
          </div>
        </div>
      `,
    }).catch((err) => {
      console.error('[AUTH] Failed to send reset email to', email, ':', err);
    });

    return c.json(successResponse);
  } catch (error) {
    console.error('[auth] Forgot password error:', error);
    return c.json({ success: false, error: 'Request failed' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /reset-password
// ---------------------------------------------------------------------------
authRoutes.post('/reset-password', async (c) => {
  try {
    const body = await c.req.json();
    const { token, new_password } = body;

    if (!token || !new_password) {
      return c.json({ success: false, error: 'Token and new password are required' }, 400);
    }

    if (typeof new_password !== 'string' || new_password.length < 10
      || !/[A-Z]/.test(new_password) || !/[a-z]/.test(new_password) || !/[0-9]/.test(new_password)) {
      return c.json({ success: false, error: 'Le mot de passe doit contenir au moins 10 caracteres, une majuscule, une minuscule et un chiffre' }, 400);
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const now = Math.floor(Date.now() / 1000);

    // Fetch all non-expired tokens for timing-safe comparison
    const resetToken = db.select().from(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, tokenHash)).get();

    if (!resetToken) {
      // Constant-time: always hash even on miss to prevent timing leaks
      crypto.timingSafeEqual(Buffer.alloc(32), Buffer.alloc(32));
      return c.json({ success: false, error: 'Invalid or expired reset token' }, 400);
    }

    if (resetToken.expiresAt < now) {
      return c.json({ success: false, error: 'Reset token has expired' }, 400);
    }

    if (resetToken.usedAt) {
      return c.json({ success: false, error: 'Reset token has already been used' }, 400);
    }

    // Atomic: update password + mark token used in one transaction
    const newHash = await hashPassword(new_password);
    sqlite.transaction(() => {
      // Re-check token not used (prevents race condition)
      const freshToken = db.select().from(passwordResetTokens).where(eq(passwordResetTokens.id, resetToken.id)).get();
      if (freshToken?.usedAt) throw new Error('Token already used');

      db.update(profiles)
        .set({ passwordHash: newHash, updatedAt: now })
        .where(eq(profiles.id, resetToken.userId))
        .run();

      db.update(passwordResetTokens)
        .set({ usedAt: now })
        .where(eq(passwordResetTokens.id, resetToken.id))
        .run();
    })();

    return c.json({ success: true, data: { message: 'Password reset successfully' } });
  } catch (error) {
    console.error('[auth] Reset password error:', error);
    return c.json({ success: false, error: 'Password reset failed' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /verify-email
// ---------------------------------------------------------------------------
authRoutes.post('/verify-email', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }), async (c) => {
  try {
    const body = await c.req.json();
    const { token } = body;

    if (!token) {
      return c.json({ success: false, error: 'Token is required' }, 400);
    }

    const now = Math.floor(Date.now() / 1000);

    const user = db.select().from(profiles).where(eq(profiles.emailVerificationToken, token)).get();

    if (!user) {
      return c.json({ success: false, error: 'Invalid verification token' }, 400);
    }

    if (user.emailVerificationExpires && user.emailVerificationExpires < now) {
      return c.json({ success: false, error: 'Verification token has expired' }, 400);
    }

    db.update(profiles)
      .set({
        emailVerified: 1,
        emailVerificationToken: null,
        emailVerificationExpires: null,
        updatedAt: now,
      })
      .where(eq(profiles.id, user.id))
      .run();

    return c.json({ success: true, data: { message: 'Email verified successfully' } });
  } catch (error) {
    console.error('[auth] Verify email error:', error);
    return c.json({ success: false, error: 'Email verification failed' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /resend-verification
// ---------------------------------------------------------------------------
authRoutes.post('/resend-verification', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const now = Math.floor(Date.now() / 1000);

    const user = db.select().from(profiles).where(eq(profiles.id, userId)).get();

    if (!user) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    if (user.emailVerified) {
      return c.json({ success: false, error: 'Email is already verified' }, 400);
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = now + 24 * 60 * 60; // 24h from now

    db.update(profiles)
      .set({
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
        updatedAt: now,
      })
      .where(eq(profiles.id, userId))
      .run();

    // Send verification email
    const verifyLink = `${FRONTEND_URL}/verify-email/${verificationToken}`;
    sendEmail({
      to: user.email,
      toName: user.displayName || user.firstName || user.username,
      subject: '[Festosh] Vérifiez votre adresse email',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6366f1, #ec4899); padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Festosh</h1>
          </div>
          <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="color: #111827; margin-top: 0;">Vérification de votre email</h2>
            <p style="color: #4b5563; line-height: 1.6;">
              Veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyLink}" style="background: #6366f1; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                Vérifier mon email
              </a>
            </div>
            <p style="color: #9ca3af; font-size: 13px; line-height: 1.5;">
              Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :<br/>
              <a href="${verifyLink}" style="color: #6366f1; word-break: break-all;">${verifyLink}</a>
            </p>
            <p style="color: #9ca3af; font-size: 13px;">Ce lien expire dans 24 heures.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="color: #9ca3af; font-size: 12px;">
              Envoyé depuis Festosh — Plateforme de gestion de festivals
            </p>
          </div>
        </div>
      `,
    }).catch((err) => {
      console.error('[AUTH] Failed to send verification email to', user.email, ':', err);
    });

    return c.json({ success: true, data: { message: 'Verification email resent' } });
  } catch (error) {
    console.error('[auth] Resend verification error:', error);
    return c.json({ success: false, error: 'Failed to resend verification email' }, 500);
  }
});

export { authRoutes };
