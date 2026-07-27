/**
 * Street-level geocoding for the Contacts map.
 * Always geocodes the full mailing address — never city/region centroids.
 */

import type { ContactListDemographics } from '../types/contact';
import { normalizeContactDemographics } from '../utils/contactDemographicsMerge';
import { formatContactAddress } from '../utils/formatContactAddress';
import {
  getCachedGeocode,
  setCachedGeocode,
  type GeocodeCoords,
} from './geocodeCache';

export type { GeocodeCoords };

const PHOTON_URL = 'https://photon.komoot.io/api/';
/** Concurrent lookups against Photon. */
const LIVE_CONCURRENCY = 6;

/** Full mailing address used for display + geocode query. */
export function addressQueryFromDemographics(
  demographics?: ContactListDemographics | null,
): string | null {
  const normalized = normalizeContactDemographics(demographics);
  if (!normalized?.address?.trim()) return null;
  const formatted = formatContactAddress(normalized);
  if (!formatted) return null;
  return formatted.replace(/\n/g, ', ').replace(/\s+/g, ' ').trim() || null;
}

/**
 * True when demographics include a street line (required for map pins).
 */
export function hasStreetAddress(
  demographics?: ContactListDemographics | null,
): boolean {
  return Boolean(normalizeContactDemographics(demographics)?.address?.trim());
}

/**
 * Geocode query list: only the full mailing address (no city-only fallbacks).
 */
export function buildGeocodeQueries(
  demographics?: ContactListDemographics | null,
): string[] {
  const full = addressQueryFromDemographics(demographics);
  return full ? [full] : [];
}

async function fetchPhoton(query: string): Promise<GeocodeCoords | null> {
  const url = new URL(PHOTON_URL);
  url.searchParams.set('q', query);
  url.searchParams.set('limit', '1');
  url.searchParams.set('lang', 'en');

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Photon geocode failed (${response.status})`);
  }

  const data = (await response.json()) as {
    features?: Array<{
      geometry?: { coordinates?: [number, number] };
    }>;
  };

  const coords = data.features?.[0]?.geometry?.coordinates;
  if (!coords || coords.length < 2) return null;

  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

async function lookupFullAddress(
  query: string,
): Promise<{ coords: GeocodeCoords | null; networkError: boolean }> {
  try {
    const coords = await fetchPhoton(query);
    return { coords, networkError: false };
  } catch {
    return { coords: null, networkError: true };
  }
}

/**
 * Resolve an address synchronously from cache only.
 * Returns `undefined` when a network lookup is still needed.
 */
export function geocodeAddressSync(
  address: string,
): GeocodeCoords | null | undefined {
  const query = address.replace(/\s+/g, ' ').trim();
  if (!query) return null;
  return getCachedGeocode(query);
}

export interface GeocodeRequest {
  /** Cache / identity key — the full formatted address. */
  key: string;
  /** Geocode queries (full address only). */
  queries: string[];
}

/**
 * Resolve lat/lng for the full address. Caches under `key`.
 * Network errors are not cached as permanent failures.
 */
export async function geocodeAddressRequest(
  request: GeocodeRequest,
): Promise<GeocodeCoords | null> {
  const key = request.key.replace(/\s+/g, ' ').trim();
  if (!key) return null;

  const cached = getCachedGeocode(key);
  if (cached !== undefined) return cached;

  const queries = request.queries.length > 0 ? request.queries : [key];

  let sawNetworkError = false;
  for (const query of queries) {
    const result = await lookupFullAddress(query);
    if (result.coords) {
      setCachedGeocode(key, result.coords);
      return result.coords;
    }
    if (result.networkError) sawNetworkError = true;
  }

  // Only cache a miss when Photon responded with "not found".
  // If we hit network/rate-limit errors, leave uncached so the next pass retries.
  if (!sawNetworkError) {
    setCachedGeocode(key, null);
  }
  return null;
}

/**
 * Resolve lat/lng for a full mailing address string.
 */
export async function geocodeAddress(
  address: string,
  demographics?: ContactListDemographics | null,
): Promise<GeocodeCoords | null> {
  const query = address.replace(/\s+/g, ' ').trim();
  if (!query) return null;

  // Prefer demographics-built full address when street is present; otherwise
  // geocode the provided string as-is (must already be a full address).
  const queries = demographics
    ? buildGeocodeQueries(demographics)
    : [query];
  if (queries.length === 0) return null;

  return geocodeAddressRequest({ key: queries[0]!, queries });
}

export async function geocodeContactDemographics(
  demographics?: ContactListDemographics | null,
): Promise<GeocodeCoords | null> {
  const query = addressQueryFromDemographics(demographics);
  if (!query) return null;
  return geocodeAddress(query, demographics);
}

/**
 * Resolve many unique addresses with bounded concurrency.
 * Invokes `onResolved` as each request finishes.
 */
export async function geocodeAddressesBatched(
  requests: GeocodeRequest[],
  onResolved: (key: string, coords: GeocodeCoords | null) => void,
  options?: { concurrency?: number; signal?: { cancelled: boolean } },
): Promise<void> {
  const concurrency = options?.concurrency ?? LIVE_CONCURRENCY;
  let index = 0;

  async function worker(): Promise<void> {
    while (index < requests.length) {
      if (options?.signal?.cancelled) return;
      const current = requests[index]!;
      index += 1;
      const coords = await geocodeAddressRequest(current);
      if (options?.signal?.cancelled) return;
      onResolved(current.key, coords);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, Math.max(1, requests.length)) },
    () => worker(),
  );
  await Promise.all(workers);
}
