/**
 * Audit logging for security-sensitive operations.
 */

import crypto from 'crypto';
import { db } from '../db/index.js';
import { auditLogs } from '../db/schema.js';
import type { Context } from 'hono';

export function logAudit(
  c: Context,
  action: string,
  resourceType?: string,
  resourceId?: string,
  details?: string,
): void {
  try {
    const userId = c.get('userId') as string | undefined;
    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
      || c.req.header('x-real-ip')
      || 'unknown';
    const userAgent = c.req.header('user-agent') || 'unknown';

    db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      userId: userId || null,
      action,
      resourceType: resourceType || null,
      resourceId: resourceId || null,
      ipAddress: ip,
      userAgent: userAgent.slice(0, 512),
      details: details || null,
    }).run();
  } catch (error) {
    console.error('[audit] Failed to log:', error);
  }
}
