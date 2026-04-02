/** Typed environment variables for the Festosh application. */

interface EnvConfig {
  /** API base URL */
  API_URL: string;
  /** Application domain for subdomain routing */
  APP_DOMAIN: string;
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = import.meta.env[key] as string | undefined;
  if (!value && defaultValue !== undefined) {
    return defaultValue;
  }
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
        `Check your .env file or environment configuration.`
    );
  }
  return value;
}

export const env: EnvConfig = {
  API_URL: getEnvVar("VITE_API_URL", "http://localhost:3001/api"),
  APP_DOMAIN: getEnvVar("VITE_APP_DOMAIN", "miyukini.com"),
} as const;
