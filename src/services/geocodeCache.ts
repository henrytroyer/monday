/**
 * Persist geocode results in localStorage so Contacts map revisits
 * do not re-hit the geocoder for the same address string.
 *
 * v5: full-address-only geocoding — drop city-centroid cache entries from v4.
 */

export interface GeocodeCoords {
  lat: number;
  lng: number;
}

interface GeocodeCacheEntry {
  coords: GeocodeCoords | null;
  savedAt: number;
}

const CACHE_KEY = 'crm-geocode-cache-v5';
/** Drop older cache keys (including city-fallback results). */
const LEGACY_CACHE_KEYS = [
  'crm-geocode-cache-v2',
  'crm-geocode-cache-v2-street',
  'crm-geocode-cache-v3',
  'crm-geocode-cache-v4',
];

/** Successful lookups stay warm for 30 days. */
const SUCCESS_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Failed lookups retry after 15 minutes (Photon miss / rate limit / bad street). */
const FAILURE_TTL_MS = 15 * 60 * 1000;

function clearLegacyCaches(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    for (const key of LEGACY_CACHE_KEYS) {
      localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}

clearLegacyCaches();

type GeocodeCacheStore = Record<string, GeocodeCacheEntry>;

function readStore(): GeocodeCacheStore {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as GeocodeCacheStore;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: GeocodeCacheStore): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(store));
  } catch {
    // Quota / private mode — ignore; geocode still works without persistence.
  }
}

export function normalizeGeocodeCacheKey(address: string): string {
  return address
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s,.-]/g, '')
    .trim();
}

export function getCachedGeocode(
  address: string,
): GeocodeCoords | null | undefined {
  const key = normalizeGeocodeCacheKey(address);
  if (!key) return null;

  const store = readStore();
  const entry = store[key];
  if (!entry) return undefined;

  const ttl = entry.coords == null ? FAILURE_TTL_MS : SUCCESS_TTL_MS;
  if (Date.now() - entry.savedAt > ttl) {
    delete store[key];
    writeStore(store);
    return undefined;
  }
  return entry.coords;
}

export function setCachedGeocode(
  address: string,
  coords: GeocodeCoords | null,
): void {
  const key = normalizeGeocodeCacheKey(address);
  if (!key) return;

  const store = readStore();
  store[key] = { coords, savedAt: Date.now() };
  writeStore(store);
}

/** Drop cached failures (and optionally all entries) so the map can re-locate. */
export function clearGeocodeFailures(): number {
  const store = readStore();
  let removed = 0;
  for (const [key, entry] of Object.entries(store)) {
    if (entry.coords == null) {
      delete store[key];
      removed += 1;
    }
  }
  if (removed > 0) writeStore(store);
  return removed;
}
