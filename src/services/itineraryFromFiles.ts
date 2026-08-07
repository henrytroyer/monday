/**
 * itineraryFromFiles.ts
 * Select itinerary attachments and extract destination legs from PDF text.
 */
import type { VolunteerItinerary } from '../types/itinerary';
import type { VolunteerFile } from '../types/volunteer';
import { assembleDestinationItinerary } from './itinerary';
import {
  getMondayProxyAuthToken,
  getMondayProxyBaseOverride,
} from './mondayProxyAuth';

const ITINERARY_NAME_PATTERN =
  /itinerary|flight|travel|traveler\s+receipt|e-?ticket|boarding\s*pass|airline|trip\s+itinerary|booking\s+information/i;

const EXCLUDED_FILE_PATTERN =
  /passport|profile|background|safeguard|reference|release\s*form|application\s*form|visa|child|connect|kaya|photo|\.(jpg|jpeg|png|heic|webp|zip)$/i;

/** Session cache: asset id → extracted text. Empty failures are not cached. */
const assetTextCache = new Map<string, string>();

export function assetIdFromVolunteerFile(
  file: VolunteerFile,
): string | undefined {
  if (file.id && /^\d+$/.test(file.id)) return file.id;

  const fromUrl = file.url?.match(/\/assets\/(\d+)/);
  return fromUrl?.[1];
}

export function isItineraryFileCandidate(file: VolunteerFile): boolean {
  if (file.isImage) return false;
  const name = file.name.trim();
  if (!name) return false;
  if (EXCLUDED_FILE_PATTERN.test(name)) return false;
  if (/^Itinerary - /i.test(name)) return true;
  return ITINERARY_NAME_PATTERN.test(name);
}

export function selectItineraryFileCandidates(
  files: VolunteerFile[],
): VolunteerFile[] {
  return files.filter(isItineraryFileCandidate);
}

/**
 * Non-image files from the dedicated Itinerary column — always parse candidates
 * regardless of filename (no name filter).
 */
export function selectDedicatedItineraryFiles(
  files: VolunteerFile[],
): VolunteerFile[] {
  return files.filter((file) => {
    if (file.isImage) return false;
    return Boolean(file.name.trim());
  });
}

/** Prefix travel-like attachments so they appear under the Itinerary file slot. */
export function promoteItineraryFileNames(
  files: VolunteerFile[],
): VolunteerFile[] {
  return files.map((file) => {
    if (/^Itinerary - /i.test(file.name)) return file;
    if (!isItineraryFileCandidate(file)) return file;
    return { ...file, name: `Itinerary - ${file.name}` };
  });
}

/**
 * Always prefix dedicated Itinerary-column uploads so they stay in the
 * itinerary slot and remain parse candidates even with opaque filenames.
 */
export function forcePromoteItineraryFileNames(
  files: VolunteerFile[],
): VolunteerFile[] {
  return files.map((file) => {
    if (/^Itinerary - /i.test(file.name)) return file;
    if (file.isImage) return file;
    const name = file.name.trim();
    if (!name) return file;
    return { ...file, name: `Itinerary - ${name}` };
  });
}

/** Clear PDF text cache (e.g. on Refresh so proxy retries are allowed). */
export function clearAssetTextCache(): void {
  assetTextCache.clear();
}

/** Test helper: whether extracted text for an asset is session-cached. */
export function assetTextCacheHas(assetId: string): boolean {
  return assetTextCache.has(assetId);
}

function resolveProxyBase(): string | undefined {
  const override = getMondayProxyBaseOverride();
  if (override) return override;
  return (import.meta.env.VITE_MONDAY_API_PROXY_URL as string | undefined)
    ?.trim()
    .replace(/\/$/, '');
}

/**
 * Fetch extracted PDF/text for an asset via the monday proxy.
 * Production Cloud Function requires Firebase auth (Bearer or ?token=).
 */
async function fetchAssetExtractedText(assetId: string): Promise<string> {
  if (assetTextCache.has(assetId)) {
    return assetTextCache.get(assetId) ?? '';
  }

  const base = resolveProxyBase();
  if (!base) {
    return '';
  }

  try {
    const idToken = await getMondayProxyAuthToken();
    const headers: Record<string, string> = {};
    if (idToken) {
      headers.Authorization = `Bearer ${idToken}`;
    }

    const url = idToken
      ? `${base}/assets/${assetId}/text?token=${encodeURIComponent(idToken)}`
      : `${base}/assets/${assetId}/text`;

    let res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(45_000),
    });

    // One refresh retry on 401 when using Firebase auth (Admin embed).
    if (!res.ok && res.status === 401 && idToken) {
      const refreshed = await getMondayProxyAuthToken(true);
      if (refreshed) {
        res = await fetch(
          `${base}/assets/${assetId}/text?token=${encodeURIComponent(refreshed)}`,
          {
            headers: { Authorization: `Bearer ${refreshed}` },
            signal: AbortSignal.timeout(45_000),
          },
        );
      }
    }

    if (!res.ok) {
      return '';
    }
    const body = (await res.json()) as { text?: string };
    const text = body.text?.trim() ?? '';
    // Only cache successful extractions so Refresh can retry transient failures.
    if (text) {
      assetTextCache.set(assetId, text);
    }
    return text;
  } catch {
    return '';
  }
}

/**
 * Parse destination arrival/departure from itinerary PDFs/docs.
 * Callers should force-promote dedicated Itinerary-column files first so opaque
 * names (e.g. "Camille Bowman.pdf") remain candidates via the "Itinerary - " prefix.
 */
export async function parseItineraryFromVolunteerFiles(
  files: VolunteerFile[] = [],
  fieldAirport?: string,
): Promise<VolunteerItinerary | null> {
  const byKey = new Map<string, VolunteerFile>();
  for (const file of selectItineraryFileCandidates(files)) {
    const key = assetIdFromVolunteerFile(file) ?? `${file.id}:${file.name}`;
    byKey.set(key, file);
  }
  // Dedicated-column uploads may already be force-promoted; keep them even if
  // a future name-pattern tweak would drop opaque originals.
  for (const file of files) {
    if (file.isImage || !/^Itinerary - /i.test(file.name)) continue;
    const key = assetIdFromVolunteerFile(file) ?? `${file.id}:${file.name}`;
    byKey.set(key, file);
  }

  const texts: string[] = [];
  for (const file of byKey.values()) {
    const assetId = assetIdFromVolunteerFile(file);
    if (!assetId) continue;

    const text = await fetchAssetExtractedText(assetId);
    if (text) texts.push(text);
  }

  return assembleDestinationItinerary(texts, { fieldAirport });
}
