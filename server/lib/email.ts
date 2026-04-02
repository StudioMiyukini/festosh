/**
 * Email transport service using nodemailer.
 * Uses festival-specific SMTP config when available, falls back to platform config.
 */
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { db } from '../db/index.js';
import { festivals } from '../db/schema.js';
import { eq } from 'drizzle-orm';

interface EmailOptions {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  from?: string;
  fromName?: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from_email: string;
  from_name: string;
  encryption: 'tls' | 'ssl' | 'none';
}

// Platform-level fallback config from env
const PLATFORM_SMTP: SmtpConfig | null = process.env.SMTP_HOST ? {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  user: process.env.SMTP_USER || '',
  pass: process.env.SMTP_PASS || '',
  from_email: process.env.SMTP_FROM_EMAIL || 'noreply@festosh.com',
  from_name: process.env.SMTP_FROM_NAME || 'Festosh',
  encryption: (process.env.SMTP_ENCRYPTION as 'tls' | 'ssl' | 'none') || 'tls',
} : null;

function createTransport(config: SmtpConfig): Transporter {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.encryption === 'ssl',
    auth: {
      user: config.user,
      pass: config.pass,
    },
    tls: config.encryption === 'tls' ? { rejectUnauthorized: false } : undefined,
  });
}

/**
 * Get SMTP config for a festival, falls back to platform config.
 */
export function getSmtpConfig(festivalId?: string): SmtpConfig | null {
  if (festivalId) {
    const festival = db.select().from(festivals).where(eq(festivals.id, festivalId)).get();
    if (festival?.emailConfig) {
      try {
        const config = typeof festival.emailConfig === 'string'
          ? JSON.parse(festival.emailConfig)
          : festival.emailConfig;
        if (config.host && config.user && config.pass) {
          return config as SmtpConfig;
        }
      } catch { /* fall through */ }
    }
  }
  return PLATFORM_SMTP;
}

/**
 * Send a single email. Returns true on success, error message on failure.
 */
export async function sendEmail(opts: EmailOptions, festivalId?: string): Promise<{ success: boolean; error?: string }> {
  const config = getSmtpConfig(festivalId);
  if (!config) {
    console.warn('[EMAIL] No SMTP config available, email not sent to:', opts.to);
    return { success: false, error: 'No SMTP configuration available' };
  }

  try {
    const transport = createTransport(config);
    const fromAddress = opts.from || config.from_email;
    const fromName = opts.fromName || config.from_name;

    await transport.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: opts.toName ? `"${opts.toName}" <${opts.to}>` : opts.to,
      subject: opts.subject,
      html: opts.html,
    });

    console.log('[EMAIL] Sent to:', opts.to, '- Subject:', opts.subject);
    return { success: true };
  } catch (err: any) {
    console.error('[EMAIL] Failed to send to:', opts.to, '-', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send emails to multiple recipients. Returns per-recipient results.
 */
export async function sendBulkEmail(
  recipients: Array<{ email: string; name?: string }>,
  subject: string,
  html: string,
  festivalId?: string,
): Promise<Array<{ email: string; success: boolean; error?: string }>> {
  const results: Array<{ email: string; success: boolean; error?: string }> = [];

  for (const recipient of recipients) {
    const result = await sendEmail({
      to: recipient.email,
      toName: recipient.name,
      subject,
      html,
    }, festivalId);
    results.push({ email: recipient.email, ...result });

    // Small delay between emails to avoid rate limiting
    if (recipients.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
}
