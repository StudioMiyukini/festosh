/**
 * Slug generation and validation for festival URLs.
 *
 * Slugs are URL-safe identifiers used in festival routes
 * (e.g., /festival/les-vieilles-charrues).
 */

/**
 * Generate a URL-safe slug from text.
 *
 * - Converts to lowercase
 * - Normalizes accented characters (e.g., e -> e)
 * - Replaces non-alphanumeric characters with hyphens
 * - Removes leading/trailing hyphens
 * - Collapses multiple consecutive hyphens
 *
 * @example slugify("Les Vieilles Charrues 2025") => "les-vieilles-charrues-2025"
 * @example slugify("Fete de la Musique") => "fete-de-la-musique"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, "") // Trim leading/trailing hyphens
    .replace(/-{2,}/g, "-"); // Collapse multiple hyphens
}

/**
 * Validate a slug format.
 *
 * A valid slug:
 * - Contains only lowercase letters, numbers, and hyphens
 * - Starts and ends with a letter or number
 * - Is between 3 and 128 characters long
 * - Does not contain consecutive hyphens
 */
export function isValidSlug(slug: string): boolean {
  if (slug.length < 3 || slug.length > 128) {
    return false;
  }
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}
