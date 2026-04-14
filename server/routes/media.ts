/**
 * Media upload routes — general purpose image upload.
 * Max 2000x2000px, 15MB. Returns URL.
 */

import { Hono } from 'hono';
import crypto from 'crypto';
import { mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';
import { resolve, extname, join } from 'path';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { authMiddleware } from '../middleware/auth.js';
import { validateFileContent } from '../lib/file-validation.js';

const mediaRoutes = new Hono();

const MEDIA_DIR = resolve(process.cwd(), 'data', 'uploads', 'media');
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const MAX_DIMENSION = 2000; // px

mkdirSync(MEDIA_DIR, { recursive: true });

// ═══════════════════════════════════════════════════════════════════════════
// POST /upload — upload an image
// ═══════════════════════════════════════════════════════════════════════════
mediaRoutes.post('/upload', authMiddleware, async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body['file'];

    if (!file || !(file instanceof File)) {
      return c.json({ success: false, error: 'Aucun fichier fourni' }, 400);
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return c.json({
        success: false,
        error: 'Format non autorise. Acceptes : JPEG, PNG, WebP, GIF, SVG',
      }, 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return c.json({ success: false, error: 'Fichier trop volumineux (max 15 Mo)' }, 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Validate magic bytes
    if (!validateFileContent(buffer, file.type)) {
      return c.json({ success: false, error: 'Le contenu du fichier ne correspond pas au type declare' }, 400);
    }

    // Check image dimensions (for raster formats)
    if (['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      const dimensions = getImageDimensions(buffer, file.type);
      if (dimensions && (dimensions.width > MAX_DIMENSION || dimensions.height > MAX_DIMENSION)) {
        return c.json({
          success: false,
          error: `Image trop grande (${dimensions.width}x${dimensions.height}). Maximum : ${MAX_DIMENSION}x${MAX_DIMENSION} px`,
        }, 400);
      }
    }

    // Save file
    const ext = extname(file.name) || mimeToExt(file.type);
    const filename = `${crypto.randomUUID()}${ext}`;
    const filepath = join(MEDIA_DIR, filename);
    await writeFile(filepath, buffer);

    const url = `/api/media/${filename}`;

    return c.json({
      success: true,
      data: {
        url,
        filename,
        size: file.size,
        mime_type: file.type,
      },
    }, 201);
  } catch (error) {
    console.error('[media] Upload error:', error);
    return c.json({ success: false, error: 'Echec de l\'upload' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /:filename — serve media file
// ═══════════════════════════════════════════════════════════════════════════
mediaRoutes.get('/:filename', async (c) => {
  try {
    const filename = c.req.param('filename');

    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return c.json({ success: false, error: 'Invalid filename' }, 400);
    }

    const filepath = join(MEDIA_DIR, filename);

    let fileSize: number;
    try {
      fileSize = (await stat(filepath)).size;
    } catch {
      return c.json({ success: false, error: 'File not found' }, 404);
    }

    const ext = extname(filename).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.png': 'image/png', '.webp': 'image/webp',
      '.gif': 'image/gif', '.svg': 'image/svg+xml',
    };

    const stream = createReadStream(filepath);
    const readable = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => controller.enqueue(chunk));
        stream.on('end', () => controller.close());
        stream.on('error', (err) => controller.error(err));
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': mimeMap[ext] || 'application/octet-stream',
        'Content-Length': String(fileSize),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('[media] Serve error:', error);
    return c.json({ success: false, error: 'Failed to serve file' }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg', 'image/png': '.png',
    'image/webp': '.webp', 'image/gif': '.gif',
    'image/svg+xml': '.svg',
  };
  return map[mime] || '.bin';
}

/**
 * Extract dimensions from image buffer (basic approach without sharp).
 * Supports JPEG, PNG, GIF, WebP.
 */
function getImageDimensions(buffer: Buffer, mime: string): { width: number; height: number } | null {
  try {
    if (mime === 'image/png') {
      // PNG: width at offset 16 (4 bytes BE), height at 20
      if (buffer.length < 24) return null;
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    }

    if (mime === 'image/gif') {
      // GIF: width at 6 (2 bytes LE), height at 8
      if (buffer.length < 10) return null;
      return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
    }

    if (mime === 'image/webp') {
      // WebP VP8: search for VP8 chunk
      if (buffer.length < 30) return null;
      const vp8Offset = buffer.indexOf('VP8 ');
      if (vp8Offset >= 0 && buffer.length > vp8Offset + 14) {
        const w = buffer.readUInt16LE(vp8Offset + 10) & 0x3FFF;
        const h = buffer.readUInt16LE(vp8Offset + 12) & 0x3FFF;
        return { width: w, height: h };
      }
      // VP8L (lossless)
      const vp8lOffset = buffer.indexOf('VP8L');
      if (vp8lOffset >= 0 && buffer.length > vp8lOffset + 9) {
        const bits = buffer.readUInt32LE(vp8lOffset + 5);
        const w = (bits & 0x3FFF) + 1;
        const h = ((bits >> 14) & 0x3FFF) + 1;
        return { width: w, height: h };
      }
      return null;
    }

    if (mime === 'image/jpeg') {
      // JPEG: scan for SOF markers (0xFFC0-0xFFC3)
      let offset = 2;
      while (offset < buffer.length - 8) {
        if (buffer[offset] !== 0xFF) break;
        const marker = buffer[offset + 1];
        if (marker >= 0xC0 && marker <= 0xC3) {
          const h = buffer.readUInt16BE(offset + 5);
          const w = buffer.readUInt16BE(offset + 7);
          return { width: w, height: h };
        }
        const len = buffer.readUInt16BE(offset + 2);
        offset += 2 + len;
      }
      return null;
    }

    return null;
  } catch {
    return null;
  }
}

export { mediaRoutes };
