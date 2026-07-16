import type { VolunteerItinerary } from '../types/itinerary';
import { itineraryHasData } from '../types/itinerary';
import type { VolunteerFile } from '../types/volunteer';
import {
  mergeVolunteerItinerary,
  parseItineraryFreeText,
} from './itinerary';

const ITINERARY_NAME_PATTERN =
  /itinerary|flight|travel|traveler\s+receipt|e-?ticket|boarding\s*pass|airline|trip\s+itinerary|booking\s+information/i;

const EXCLUDED_FILE_PATTERN =
  /passport|profile|background|safeguard|reference|release\s*form|application\s*form|visa|child|connect|kaya|photo|\.(jpg|jpeg|png|heic|webp|zip)$/i;

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

async function fetchAssetExtractedText(assetId: string): Promise<string> {
  const base = import.meta.env.VITE_MONDAY_API_PROXY_URL?.trim().replace(/\/$/, '');
  if (!base) return '';

  try {
    const res = await fetch(`${base}/assets/${assetId}/text`, {
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return '';
    const body = (await res.json()) as { text?: string };
    return body.text?.trim() ?? '';
  } catch {
    return '';
  }
}

/** Parse arrival/departure from itinerary PDFs or docs attached on monday.com. */
export async function parseItineraryFromVolunteerFiles(
  files: VolunteerFile[] = [],
): Promise<VolunteerItinerary | null> {
  const candidates = selectItineraryFileCandidates(files);
  let merged: VolunteerItinerary | null = null;

  for (const file of candidates) {
    const assetId = assetIdFromVolunteerFile(file);
    if (!assetId) continue;

    const text = await fetchAssetExtractedText(assetId);
    if (!text) continue;

    const parsed = parseItineraryFreeText(text);
    if (!parsed || !itineraryHasData(parsed)) continue;

    merged = merged ? mergeVolunteerItinerary(merged, parsed) : parsed;
  }

  return merged;
}
