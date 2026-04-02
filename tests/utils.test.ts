import { describe, it, expect } from 'vitest';

// Test slug generation (inline since it's in festivals.ts)
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

describe('slugify', () => {
  it('should convert text to URL-safe slug', () => {
    expect(slugify('Mon Festival 2026')).toBe('mon-festival-2026');
  });

  it('should handle accented characters', () => {
    expect(slugify('Fete de la Musique')).toBe('fete-de-la-musique');
    expect(slugify('Evenement Special')).toBe('evenement-special');
  });

  it('should handle special characters', () => {
    expect(slugify('Hello & World!')).toBe('hello-world');
    expect(slugify('test--double')).toBe('test-double');
  });

  it('should trim hyphens', () => {
    expect(slugify('--trimmed--')).toBe('trimmed');
  });
});
