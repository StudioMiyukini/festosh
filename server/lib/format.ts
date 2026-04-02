/**
 * Convert camelCase keys to snake_case.
 * Used to normalize Drizzle ORM output (camelCase) to the API contract (snake_case).
 */
export function toSnakeCase(key: string): string {
  return key.replace(/([A-Z])/g, '_$1').toLowerCase();
}

/**
 * Recursively convert all keys in an object from camelCase to snake_case.
 * Handles JSON string fields by parsing them first.
 */
export function formatResponse<T extends Record<string, unknown>>(
  obj: T,
  jsonFields: string[] = [],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = toSnakeCase(key);
    if (jsonFields.includes(key) && typeof value === 'string') {
      try {
        result[snakeKey] = JSON.parse(value);
      } catch {
        result[snakeKey] = value;
      }
    } else {
      result[snakeKey] = value;
    }
  }
  return result;
}
