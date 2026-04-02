/**
 * Email campaigns & direct emailing routes.
 */

import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { emailCampaigns, emailLogs, festivalMembers, profiles } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { festivalMemberMiddleware, requireFestivalRole } from '../middleware/festival-auth.js';
import { sendEmail, sendBulkEmail } from '../lib/email.js';

const emailRoutes = new Hono();

function safeParseJson(value: string | null | undefined, fallback: unknown): unknown {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function formatCampaign(c: typeof emailCampaigns.$inferSelect) {
  return {
    id: c.id,
    festival_id: c.festivalId,
    name: c.name,
    subject: c.subject,
    html_body: c.htmlBody,
    recipient_type: c.recipientType,
    recipient_roles: safeParseJson(c.recipientRoles, []),
    recipient_ids: safeParseJson(c.recipientIds, []),
    status: c.status,
    scheduled_at: c.scheduledAt,
    sent_at: c.sentAt,
    sent_count: c.sentCount,
    failed_count: c.failedCount,
    created_by: c.createdBy,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// GET /festival/:festivalId/campaigns — list campaigns
// ---------------------------------------------------------------------------
emailRoutes.get(
  '/festival/:festivalId/campaigns',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin', 'editor']),
  async (c) => {
    try {
      const festivalId = c.req.param('festivalId');
      const rows = db
        .select()
        .from(emailCampaigns)
        .where(eq(emailCampaigns.festivalId, festivalId))
        .orderBy(desc(emailCampaigns.createdAt))
        .all();
      return c.json({ success: true, data: rows.map(formatCampaign) });
    } catch (error) {
      console.error('[emails] List campaigns error:', error);
      return c.json({ success: false, error: 'Failed to list campaigns' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /festival/:festivalId/campaigns — create campaign
// ---------------------------------------------------------------------------
emailRoutes.post(
  '/festival/:festivalId/campaigns',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin', 'editor']),
  async (c) => {
    try {
      const festivalId = c.req.param('festivalId');
      const userId = c.get('userId');
      const body = await c.req.json();
      const { name, subject, html_body, recipient_type, recipient_roles, recipient_ids, scheduled_at } = body;

      if (!name || !subject) {
        return c.json({ success: false, error: 'Name and subject are required' }, 400);
      }

      const now = Math.floor(Date.now() / 1000);
      const id = crypto.randomUUID();

      db.insert(emailCampaigns)
        .values({
          id,
          festivalId,
          name,
          subject,
          htmlBody: html_body || '',
          recipientType: recipient_type || 'all_members',
          recipientRoles: recipient_roles ? JSON.stringify(recipient_roles) : null,
          recipientIds: recipient_ids ? JSON.stringify(recipient_ids) : null,
          status: scheduled_at ? 'scheduled' : 'draft',
          scheduledAt: scheduled_at || null,
          createdBy: userId,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      const campaign = db.select().from(emailCampaigns).where(eq(emailCampaigns.id, id)).get();
      return c.json({ success: true, data: formatCampaign(campaign!) }, 201);
    } catch (error) {
      console.error('[emails] Create campaign error:', error);
      return c.json({ success: false, error: 'Failed to create campaign' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// PUT /campaigns/:id — update campaign
// ---------------------------------------------------------------------------
emailRoutes.put(
  '/campaigns/:id',
  authMiddleware,
  async (c) => {
    try {
      const id = c.req.param('id');
      const body = await c.req.json();
      const now = Math.floor(Date.now() / 1000);

      const campaign = db.select().from(emailCampaigns).where(eq(emailCampaigns.id, id)).get();
      if (!campaign) {
        return c.json({ success: false, error: 'Campaign not found' }, 404);
      }

      const updateData: Record<string, unknown> = { updatedAt: now };

      const keyMap: Record<string, string> = {
        name: 'name',
        subject: 'subject',
        html_body: 'htmlBody',
        recipient_type: 'recipientType',
        status: 'status',
        scheduled_at: 'scheduledAt',
      };

      for (const [bodyKey, schemaKey] of Object.entries(keyMap)) {
        if (body[bodyKey] !== undefined) {
          updateData[schemaKey] = body[bodyKey];
        }
      }

      if (body.recipient_roles !== undefined) {
        updateData.recipientRoles = JSON.stringify(body.recipient_roles);
      }
      if (body.recipient_ids !== undefined) {
        updateData.recipientIds = JSON.stringify(body.recipient_ids);
      }

      db.update(emailCampaigns).set(updateData).where(eq(emailCampaigns.id, id)).run();

      const updated = db.select().from(emailCampaigns).where(eq(emailCampaigns.id, id)).get();
      return c.json({ success: true, data: formatCampaign(updated!) });
    } catch (error) {
      console.error('[emails] Update campaign error:', error);
      return c.json({ success: false, error: 'Failed to update campaign' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// DELETE /campaigns/:id — delete campaign
// ---------------------------------------------------------------------------
emailRoutes.delete(
  '/campaigns/:id',
  authMiddleware,
  async (c) => {
    try {
      const id = c.req.param('id');
      const campaign = db.select().from(emailCampaigns).where(eq(emailCampaigns.id, id)).get();
      if (!campaign) {
        return c.json({ success: false, error: 'Campaign not found' }, 404);
      }
      db.delete(emailLogs).where(eq(emailLogs.campaignId, id)).run();
      db.delete(emailCampaigns).where(eq(emailCampaigns.id, id)).run();
      return c.json({ success: true, data: { message: 'Campaign deleted' } });
    } catch (error) {
      console.error('[emails] Delete campaign error:', error);
      return c.json({ success: false, error: 'Failed to delete campaign' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /festival/:festivalId/send — send direct email to specific users
// ---------------------------------------------------------------------------
emailRoutes.post(
  '/festival/:festivalId/send',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin', 'editor']),
  async (c) => {
    try {
      const festivalId = c.req.param('festivalId');
      const body = await c.req.json();
      const { recipient_ids, subject, html_body } = body;

      if (!subject || !html_body || !recipient_ids?.length) {
        return c.json({ success: false, error: 'subject, html_body and recipient_ids are required' }, 400);
      }

      // Get recipients info
      const recipients = db
        .select({
          user_id: festivalMembers.userId,
          email: profiles.email,
          display_name: profiles.displayName,
          username: profiles.username,
        })
        .from(festivalMembers)
        .innerJoin(profiles, eq(profiles.id, festivalMembers.userId))
        .where(eq(festivalMembers.festivalId, festivalId))
        .all()
        .filter((r) => recipient_ids.includes(r.user_id));

      const now = Math.floor(Date.now() / 1000);
      let sentCount = 0;
      let failedCount = 0;

      // Send each email and log the result
      for (const r of recipients) {
        const logId = crypto.randomUUID();

        // Insert log entry as 'queued' first
        db.insert(emailLogs)
          .values({
            id: logId,
            festivalId,
            toEmail: r.email,
            toName: r.display_name || r.username,
            subject,
            status: 'queued',
            sentAt: now,
            createdAt: now,
          })
          .run();

        // Actually send the email
        const result = await sendEmail({
          to: r.email,
          toName: r.display_name || r.username,
          subject,
          html: html_body,
        }, festivalId);

        if (result.success) {
          sentCount++;
          db.update(emailLogs)
            .set({ status: 'sent', sentAt: Math.floor(Date.now() / 1000) })
            .where(eq(emailLogs.id, logId))
            .run();
        } else {
          failedCount++;
          db.update(emailLogs)
            .set({ status: 'failed', error: result.error || 'Unknown error' })
            .where(eq(emailLogs.id, logId))
            .run();
        }

        // Small delay between emails to avoid rate limiting
        if (recipients.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return c.json({
        success: true,
        data: {
          sent: sentCount,
          failed: failedCount,
          total: recipients.length,
          message: `${sentCount} email(s) envoyé(s), ${failedCount} échec(s).`,
        },
      });
    } catch (error) {
      console.error('[emails] Send error:', error);
      return c.json({ success: false, error: 'Failed to send emails' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /festival/:festivalId/logs — email logs
// ---------------------------------------------------------------------------
emailRoutes.get(
  '/festival/:festivalId/logs',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const festivalId = c.req.param('festivalId');
      const rows = db
        .select()
        .from(emailLogs)
        .where(eq(emailLogs.festivalId, festivalId))
        .orderBy(desc(emailLogs.createdAt))
        .limit(100)
        .all();

      return c.json({
        success: true,
        data: rows.map((l) => ({
          id: l.id,
          campaign_id: l.campaignId,
          to_email: l.toEmail,
          to_name: l.toName,
          subject: l.subject,
          status: l.status,
          error: l.error,
          sent_at: l.sentAt,
          created_at: l.createdAt,
        })),
      });
    } catch (error) {
      console.error('[emails] Logs error:', error);
      return c.json({ success: false, error: 'Failed to fetch logs' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /campaigns/:id/send — send a campaign to its recipients
// ---------------------------------------------------------------------------
emailRoutes.post(
  '/campaigns/:id/send',
  authMiddleware,
  async (c) => {
    try {
      const id = c.req.param('id');
      const campaign = db.select().from(emailCampaigns).where(eq(emailCampaigns.id, id)).get();
      if (!campaign) {
        return c.json({ success: false, error: 'Campaign not found' }, 404);
      }

      if (campaign.status === 'sent') {
        return c.json({ success: false, error: 'Campaign has already been sent' }, 400);
      }

      const festivalId = campaign.festivalId;
      const now = Math.floor(Date.now() / 1000);

      // Mark campaign as sending
      db.update(emailCampaigns)
        .set({ status: 'sending', updatedAt: now })
        .where(eq(emailCampaigns.id, id))
        .run();

      // Resolve recipients based on campaign settings
      let recipientRows: Array<{ email: string; display_name: string | null; username: string }>;

      const recipientIds = campaign.recipientIds ? JSON.parse(campaign.recipientIds) as string[] : [];

      if (recipientIds.length > 0) {
        // Specific recipient IDs
        recipientRows = db
          .select({
            email: profiles.email,
            display_name: profiles.displayName,
            username: profiles.username,
          })
          .from(festivalMembers)
          .innerJoin(profiles, eq(profiles.id, festivalMembers.userId))
          .where(eq(festivalMembers.festivalId, festivalId))
          .all()
          .filter((r) => recipientIds.includes(r.email) || recipientIds.includes(r.username));
      } else {
        // All members (optionally filtered by roles)
        const recipientRoles = campaign.recipientRoles ? JSON.parse(campaign.recipientRoles) as string[] : [];

        recipientRows = db
          .select({
            email: profiles.email,
            display_name: profiles.displayName,
            username: profiles.username,
            role: festivalMembers.role,
          })
          .from(festivalMembers)
          .innerJoin(profiles, eq(profiles.id, festivalMembers.userId))
          .where(eq(festivalMembers.festivalId, festivalId))
          .all()
          .filter((r) => recipientRoles.length === 0 || (r.role && recipientRoles.includes(r.role)));
      }

      // Send bulk emails
      const bulkRecipients = recipientRows.map((r) => ({
        email: r.email,
        name: r.display_name || r.username,
      }));

      const results = await sendBulkEmail(
        bulkRecipients,
        campaign.subject,
        campaign.htmlBody,
        festivalId,
      );

      // Log each result
      let sentCount = 0;
      let failedCount = 0;

      for (const result of results) {
        const logId = crypto.randomUUID();
        const status = result.success ? 'sent' : 'failed';
        if (result.success) sentCount++;
        else failedCount++;

        db.insert(emailLogs)
          .values({
            id: logId,
            festivalId,
            campaignId: id,
            toEmail: result.email,
            toName: bulkRecipients.find((r) => r.email === result.email)?.name || null,
            subject: campaign.subject,
            status,
            error: result.error || null,
            sentAt: result.success ? Math.floor(Date.now() / 1000) : null,
            createdAt: Math.floor(Date.now() / 1000),
          })
          .run();
      }

      // Update campaign status
      db.update(emailCampaigns)
        .set({
          status: 'sent',
          sentAt: Math.floor(Date.now() / 1000),
          sentCount,
          failedCount,
          updatedAt: Math.floor(Date.now() / 1000),
        })
        .where(eq(emailCampaigns.id, id))
        .run();

      const updated = db.select().from(emailCampaigns).where(eq(emailCampaigns.id, id)).get();

      return c.json({
        success: true,
        data: {
          campaign: formatCampaign(updated!),
          sent: sentCount,
          failed: failedCount,
          total: results.length,
        },
      });
    } catch (error) {
      console.error('[emails] Campaign send error:', error);
      return c.json({ success: false, error: 'Failed to send campaign' }, 500);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /festival/:festivalId/test — send a test email
// ---------------------------------------------------------------------------
emailRoutes.post(
  '/festival/:festivalId/test',
  authMiddleware,
  festivalMemberMiddleware,
  requireFestivalRole(['owner', 'admin']),
  async (c) => {
    try {
      const festivalId = c.req.param('festivalId');
      const body = await c.req.json();
      const { to_email } = body;

      if (!to_email) {
        return c.json({ success: false, error: 'to_email is required' }, 400);
      }

      const result = await sendEmail({
        to: to_email,
        subject: '[Festosh] Email de test',
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #6366f1, #ec4899); padding: 24px; border-radius: 12px 12px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Festosh</h1>
            </div>
            <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <h2 style="color: #111827; margin-top: 0;">Email de test</h2>
              <p style="color: #4b5563; line-height: 1.6;">
                Cet email confirme que la configuration SMTP de votre festival fonctionne correctement.
              </p>
              <p style="color: #4b5563; line-height: 1.6;">
                Si vous recevez ce message, votre configuration email est opérationnelle.
              </p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
              <p style="color: #9ca3af; font-size: 12px;">
                Envoyé depuis Festosh — Plateforme de gestion de festivals
              </p>
            </div>
          </div>
        `,
      }, festivalId);

      if (result.success) {
        return c.json({ success: true, data: { message: `Email de test envoyé à ${to_email}` } });
      } else {
        return c.json({ success: false, error: result.error || 'Failed to send test email' }, 500);
      }
    } catch (error) {
      console.error('[emails] Test email error:', error);
      return c.json({ success: false, error: 'Failed to send test email' }, 500);
    }
  },
);

export { emailRoutes };
