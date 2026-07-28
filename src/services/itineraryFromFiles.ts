/**
 * itineraryFromFiles.ts
 * Select itinerary attachments and extract destination legs from PDF text.
 */
import type { VolunteerItinerary } from '../types/itinerary';
import type { VolunteerFile } from '../types/volunteer';
import { assembleDestinationItinerary } from './itinerary';

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
 * regardless of filename.
 */
export function selectDedicatedItineraryFiles(
  files: VolunteerFile[],
): VolunteerFile[] {
  return files.filter((file) => {
    if (file.isImage) return false;
    const name = file.name.trim();
    if (!name) return false;
    // Still skip obvious non-travel docs even in the itinerary column.
    if (
      /passport|profile|background|safeguard|reference|release\s*form|application\s*form|visa/i.test(
        name,
      )
    ) {
      return false;
    }
    return true;
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

async function fetchAssetExtractedText(assetId: string): Promise<string> {
  if (assetTextCache.has(assetId)) {
    return assetTextCache.get(assetId) ?? '';
  }

  const base = import.meta.env.VITE_MONDAY_API_PROXY_URL?.trim().replace(/\/$/, '');
  if (!base) {
    return '';
  }

  try {
    const res = await fetch(`${base}/assets/${assetId}/text`, {
      signal: AbortSignal.timeout(30_000),
    });
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

/** Parse destination arrival/departure from all itinerary PDFs/docs on the item. */
export async function parseItineraryFromVolunteerFiles(
  files: VolunteerFile[] = [],
  fieldAirport?: string,
): Promise<VolunteerItinerary | null> {
  const candidates = selectItineraryFileCandidates(files);
  const texts: string[] = [];

  for (const file of candidates) {
    const assetId = assetIdFromVolunteerFile(file);
    if (!assetId) continue;

    const text = await fetchAssetExtractedText(assetId);
    if (text) texts.push(text);
  }

  return assembleDestinationItinerary(texts, { fieldAirport });
}
