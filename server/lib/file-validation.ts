/**
 * Validate file content by checking magic bytes (file signatures).
 * Prevents MIME type spoofing where a client sends a malicious file
 * with a forged Content-Type header.
 */

const MAGIC_BYTES: Record<string, { bytes: number[]; offset?: number }[]> = {
  'image/jpeg': [{ bytes: [0xFF, 0xD8, 0xFF] }],
  'image/png': [{ bytes: [0x89, 0x50, 0x4E, 0x47] }],
  'image/webp': [{ bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, { bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 }],
  'application/pdf': [{ bytes: [0x25, 0x50, 0x44, 0x46] }], // %PDF
};

/**
 * Check if a buffer's magic bytes match the claimed MIME type.
 * Returns true if the file content matches, false if spoofed.
 * Returns true for unknown types (allow-by-default for types we don't check).
 */
export function validateFileContent(buffer: Buffer, claimedMime: string): boolean {
  const signatures = MAGIC_BYTES[claimedMime];
  if (!signatures) return true; // Unknown type, skip check

  for (const sig of signatures) {
    const offset = sig.offset ?? 0;
    if (buffer.length < offset + sig.bytes.length) return false;

    const matches = sig.bytes.every((byte, i) => buffer[offset + i] === byte);
    if (!matches) return false;
  }

  return true;
}

/**
 * Sanitize a filename for use in HTTP headers and filesystem.
 * Removes path traversal, special characters, and enforces safe naming.
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/\.\./g, '')
    .replace(/[/\\]/g, '')
    .replace(/[^\w\s.\-]/g, '_')
    .trim()
    .slice(0, 255);
}
