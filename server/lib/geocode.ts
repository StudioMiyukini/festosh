/**
 * Geocoding via OpenStreetMap Nominatim API (free, no API key).
 * Rate limit: max 1 request per second as per Nominatim usage policy.
 */

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

let lastRequestTime = 0;

async function throttle(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < 1100) {
    await new Promise((r) => setTimeout(r, 1100 - elapsed));
  }
  lastRequestTime = Date.now();
}

/**
 * Geocode an address/city to lat/lng coordinates.
 * Returns null if not found or on error.
 */
export async function geocodeAddress(
  query: string,
  country?: string,
): Promise<{ lat: number; lng: number; displayName: string } | null> {
  try {
    await throttle();

    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: '1',
      addressdetails: '0',
    });
    if (country) {
      params.set('countrycodes', country.toLowerCase());
    }

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        headers: {
          'User-Agent': 'Festosh/1.0 (festival management platform)',
          'Accept-Language': 'fr',
        },
      },
    );

    if (!response.ok) return null;

    const results: NominatimResult[] = await response.json();
    if (results.length === 0) return null;

    return {
      lat: parseFloat(results[0].lat),
      lng: parseFloat(results[0].lon),
      displayName: results[0].display_name,
    };
  } catch (error) {
    console.error('[geocode] Error:', error);
    return null;
  }
}

/**
 * Build a geocoding query from festival fields.
 */
export function buildGeoQuery(fields: {
  address?: string | null;
  city?: string | null;
  country?: string | null;
}): string | null {
  const parts = [fields.address, fields.city, fields.country].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}
