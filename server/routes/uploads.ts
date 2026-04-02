/**
 * Upload routes — file upload, download, delete for user documents.
 */

import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { existsSync, mkdirSync, writeFileSync, unlinkSync, createReadStream } from 'fs';
import { resolve, extname } from 'path';
import { db } from '../db/index.js';
import { documents, profiles } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { stream } from 'hono/streaming';
import { createReadStream as fsCreateReadStream } from 'fs';
import { stat } from 'fs/promises';

const uploadRoutes = new Hono();

// All upload routes require authentication
uploadRoutes.use('*', authMiddleware);

const UPLOADS_DIR = resolve(process.cwd(), 'data', 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];
const VALID_DOCUMENT_TYPES = [
  'kbis',
  'insurance',
  'id_card',
  'association_registration',
  'other',
];

// Ensure uploads directory exists
if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ---------------------------------------------------------------------------
// POST / — Upload a document
// ---------------------------------------------------------------------------
uploadRoutes.post('/', async (c) => {
  try {
    const userId = c.get('userId');
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;
    const documentType = formData.get('document_type') as string | null;
    const label = formData.get('label') as string | null;

    if (!file || !(file instanceof File)) {
      return c.json({ success: false, error: 'No file provided' }, 400);
    }

    if (!documentType || !VALID_DOCUMENT_TYPES.includes(documentType)) {
      return c.json({ success: false, error: `Invalid document_type. Must be one of: ${VALID_DOCUMENT_TYPES.join(', ')}` }, 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return c.json({ success: false, error: 'File too large (max 10 MB)' }, 400);
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return c.json({ success: false, error: `File type not allowed. Accepted: PDF, JPEG, PNG, WebP` }, 400);
    }

    // Create user upload directory
    const userDir = resolve(UPLOADS_DIR, userId);
    if (!existsSync(userDir)) {
      mkdirSync(userDir, { recursive: true });
    }

    // Generate unique filename
    const ext = extname(file.name) || '.bin';
    const storedName = `${crypto.randomUUID()}${ext}`;
    const storagePath = `${userId}/${storedName}`;
    const fullPath = resolve(UPLOADS_DIR, storagePath);

    // Write file to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    writeFileSync(fullPath, buffer);

    // Insert document record
    const now = Math.floor(Date.now() / 1000);
    const docId = crypto.randomUUID();

    db.insert(documents)
      .values({
        id: docId,
        userId,
        fileName: file.name,
        storagePath,
        mimeType: file.type,
        sizeBytes: file.size,
        documentType,
        label: label || null,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return c.json({
      success: true,
      data: {
        id: docId,
        file_name: file.name,
        document_type: documentType,
        label,
        mime_type: file.type,
        size_bytes: file.size,
        status: 'pending',
        created_at: now,
      },
    }, 201);
  } catch (error) {
    console.error('[uploads] Upload error:', error);
    return c.json({ success: false, error: 'Upload failed' }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET / — List current user's documents
// ---------------------------------------------------------------------------
uploadRoutes.get('/', async (c) => {
  try {
    const userId = c.get('userId');

    const docs = db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId))
      .all();

    return c.json({
      success: true,
      data: docs.map((d) => ({
        id: d.id,
        file_name: d.fileName,
        document_type: d.documentType,
        label: d.label,
        mime_type: d.mimeType,
        size_bytes: d.sizeBytes,
        status: d.status,
        review_notes: d.reviewNotes,
        created_at: d.createdAt,
      })),
    });
  } catch (error) {
    console.error('[uploads] List error:', error);
    return c.json({ success: false, error: 'Failed to list documents' }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /:id/download — Download a document file
// ---------------------------------------------------------------------------
uploadRoutes.get('/:id/download', async (c) => {
  try {
    const userId = c.get('userId');
    const userRole = c.get('userRole');
    const docId = c.req.param('id');

    const doc = db
      .select()
      .from(documents)
      .where(eq(documents.id, docId))
      .get();

    if (!doc) {
      return c.json({ success: false, error: 'Document not found' }, 404);
    }

    // Only owner or admin can download
    if (doc.userId !== userId && userRole !== 'admin') {
      return c.json({ success: false, error: 'Access denied' }, 403);
    }

    const fullPath = resolve(UPLOADS_DIR, doc.storagePath);
    if (!existsSync(fullPath)) {
      return c.json({ success: false, error: 'File not found on disk' }, 404);
    }

    const fileStat = await stat(fullPath);
    const isImage = doc.mimeType.startsWith('image/');

    c.header('Content-Type', doc.mimeType);
    c.header('Content-Length', String(fileStat.size));
    c.header('Content-Disposition', `${isImage ? 'inline' : 'attachment'}; filename="${doc.fileName}"`);

    return stream(c, async (s) => {
      const readable = fsCreateReadStream(fullPath);
      for await (const chunk of readable) {
        await s.write(chunk as Uint8Array);
      }
    });
  } catch (error) {
    console.error('[uploads] Download error:', error);
    return c.json({ success: false, error: 'Download failed' }, 500);
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id — Delete a document
// ---------------------------------------------------------------------------
uploadRoutes.delete('/:id', async (c) => {
  try {
    const userId = c.get('userId');
    const docId = c.req.param('id');

    const doc = db
      .select()
      .from(documents)
      .where(and(eq(documents.id, docId), eq(documents.userId, userId)))
      .get();

    if (!doc) {
      return c.json({ success: false, error: 'Document not found' }, 404);
    }

    // Delete file from disk
    const fullPath = resolve(UPLOADS_DIR, doc.storagePath);
    if (existsSync(fullPath)) {
      unlinkSync(fullPath);
    }

    // Delete record from DB
    db.delete(documents).where(eq(documents.id, docId)).run();

    return c.json({ success: true, data: { message: 'Document deleted' } });
  } catch (error) {
    console.error('[uploads] Delete error:', error);
    return c.json({ success: false, error: 'Delete failed' }, 500);
  }
});

export { uploadRoutes };
