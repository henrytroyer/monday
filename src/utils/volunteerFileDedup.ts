import type { VolunteerFile } from '../types/volunteer';
import { assetIdFromVolunteerFileUrl } from './condenseItineraryPdfFiles';

function normalizeFileUrl(url?: string): string | undefined {
  if (!url) return undefined;
  return url.split('?')[0]?.replace(/\/+$/, '') || undefined;
}

/** Stable keys for matching the same monday.com upload across columns and gallery. */
export function volunteerFileIdentityKeys(file: VolunteerFile): string[] {
  const keys: string[] = [];
  const assetId = assetIdFromVolunteerFileUrl(file);
  if (assetId) keys.push(`asset:${assetId}`);
  if (file.id) keys.push(`id:${file.id}`);
  const url = normalizeFileUrl(file.url);
  if (url) keys.push(`url:${url}`);
  return keys;
}

export function collectListedVolunteerFileKeys(
  files: Array<VolunteerFile | undefined>,
): Set<string> {
  const keys = new Set<string>();
  for (const file of files) {
    if (!file) continue;
    for (const key of volunteerFileIdentityKeys(file)) {
      keys.add(key);
    }
  }
  return keys;
}

export function isDuplicateVolunteerFile(
  file: VolunteerFile,
  listedKeys: Set<string>,
): boolean {
  return volunteerFileIdentityKeys(file).some((key) => listedKeys.has(key));
}

export function excludeListedVolunteerFileDuplicates(
  candidates: VolunteerFile[],
  listedKeys: Set<string>,
): VolunteerFile[] {
  return candidates.filter((file) => !isDuplicateVolunteerFile(file, listedKeys));
}
