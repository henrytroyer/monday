/**
 * enrichPipelineItineraries.ts
 * Enrich pipeline rows with destination itinerary parsed from attached
 * itinerary PDFs/docs. Successful file parses replace column itinerary.
 *
 * Cache keys include itinerary file asset ids so a newly uploaded PDF
 * re-runs assembly. Failed parses are not cached.
 */
import { resolveFieldAirportIata } from '../constants/fieldAirports';
import {
  itineraryHasData,
  type VolunteerItinerary,
} from '../types/itinerary';
import type { PipelineSection, Volunteer, VolunteerFile } from '../types/volunteer';
import { condenseItineraryPdfFiles } from '../utils/condenseItineraryPdfFiles';
import {
  assetIdFromVolunteerFile,
  clearAssetTextCache,
  forcePromoteItineraryFileNames,
  parseItineraryFromVolunteerFiles,
  selectDedicatedItineraryFiles,
  selectItineraryFileCandidates,
} from './itineraryFromFiles';
import {
  getAllFilesFromColumnValues,
  mapMondayGalleryAssets,
  parseMondayFileColumn,
} from './mondayFileColumns';
import type { MondayBoardItem, MondayColumnValue } from './mapMondayToCrm';
import { columnMap } from '../config/columnMap';

const PIPELINE_ITINERARY_CONCURRENCY = 4;

/** Session cache: volunteerId:fieldAirport:fileFingerprint → successful parse only. */
const volunteerFileItineraryCache = new Map<
  string,
  NonNullable<Awaited<ReturnType<typeof parseItineraryFromVolunteerFiles>>>
>();

/** Stable fingerprint of itinerary file assets (changes when uploads change). */
export function itineraryFilesFingerprint(files: VolunteerFile[]): string {
  return files
    .map((file) => assetIdFromVolunteerFile(file) ?? file.id ?? file.name)
    .filter(Boolean)
    .sort()
    .join(',');
}

/** Bump when destination-assembly rules change so stale success caches re-parse. */
const ITINERARY_ASSEMBLY_CACHE_VERSION = 'v2-field-legs';

function itineraryCacheKey(
  volunteerId: string,
  fieldAirport: string | undefined,
  fingerprint: string,
): string {
  return `${ITINERARY_ASSEMBLY_CACHE_VERSION}:${volunteerId}:${fieldAirport ?? ''}:${fingerprint}`;
}

/** Drop cached file-parsed itineraries and PDF text so Refresh retries extraction. */
export function invalidateVolunteerFileItineraryCache(volunteerId?: string): void {
  clearAssetTextCache();

  if (!volunteerId) {
    volunteerFileItineraryCache.clear();
    return;
  }
  const needle = `:${volunteerId}:`;
  for (const key of volunteerFileItineraryCache.keys()) {
    if (key.includes(needle)) {
      volunteerFileItineraryCache.delete(key);
    }
  }
}

function findColumnByMapKey(
  columnValues: MondayColumnValue[],
  fieldKey: keyof typeof columnMap,
): MondayColumnValue | undefined {
  const title = columnMap[fieldKey];
  return columnValues.find(
    (col) => col.column?.title?.trim().toLowerCase() === title.trim().toLowerCase(),
  );
}

function dedupeVolunteerFiles(files: VolunteerFile[]): VolunteerFile[] {
  const seen = new Set<string>();
  return files.filter((file) => {
    const key =
      assetIdFromVolunteerFile(file) ||
      file.id ||
      `${file.name}:${file.url ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Collect itinerary parse candidates from pipeline column values AND the
 * item Files-tab gallery. Dedicated Itinerary-column files are always included
 * (any filename). Gallery "Traveler Receipt" PDFs are included by name match.
 */
export function itineraryFilesFromBoardItem(
  item: MondayBoardItem,
): VolunteerFile[] {
  const dedicated = forcePromoteItineraryFileNames(
    selectDedicatedItineraryFiles(
      parseMondayFileColumn(
        findColumnByMapKey(item.column_values, 'itineraryFiles'),
      ),
    ),
  );
  const general = selectItineraryFileCandidates(
    parseMondayFileColumn(findColumnByMapKey(item.column_values, 'files')),
  );
  const fromAllFileCols = selectItineraryFileCandidates(
    getAllFilesFromColumnValues(item.column_values),
  );
  const fromGallery = selectItineraryFileCandidates(
    mapMondayGalleryAssets(item.assets),
  );
  return dedupeVolunteerFiles([
    ...dedicated,
    ...general,
    ...fromAllFileCols,
    ...fromGallery,
  ]);
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index]!);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, Math.max(items.length, 1)) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

/** Prefer a single merged itinerary PDF when multiple receipts exist. */
export function itineraryPreviewFileFromCandidates(
  files: VolunteerFile[],
  proxyBase?: string,
): VolunteerFile | undefined {
  const condensed = condenseItineraryPdfFiles(files, proxyBase);
  const preview = condensed[0];
  if (!preview?.url) return undefined;
  return preview;
}

type PipelineItineraryEnrichment = {
  itinerary: VolunteerItinerary | undefined;
  itineraryPreviewFile: VolunteerFile | undefined;
};

/**
 * Attach destination itinerary from uploaded PDFs onto pipeline volunteers.
 * No preferred-airport / timeline fallback — chip stays hidden until a file
 * parses successfully. Also attaches itineraryPreviewFile for chip → PDF open.
 */
export async function enrichPipelineItinerariesFromFiles(
  sections: PipelineSection[],
  items: MondayBoardItem[],
): Promise<PipelineSection[]> {
  const itemsById = new Map(items.map((item) => [item.id, item]));

  const targets: Array<{
    volunteer: Volunteer;
    sectionIndex: number;
    volunteerIndex: number;
  }> = [];

  sections.forEach((section, sectionIndex) => {
    section.volunteers.forEach((volunteer, volunteerIndex) => {
      targets.push({ volunteer, sectionIndex, volunteerIndex });
    });
  });

  if (targets.length === 0) return sections;

  const enriched = await mapPool(
    targets,
    PIPELINE_ITINERARY_CONCURRENCY,
    async ({ volunteer }): Promise<PipelineItineraryEnrichment> => {
      const item = itemsById.get(volunteer.id);
      if (!item) {
        return {
          itinerary: undefined,
          itineraryPreviewFile: undefined,
        };
      }

      const fieldAirport = resolveFieldAirportIata(
        volunteer.location,
        volunteer.locationPreference,
      );
      const files = itineraryFilesFromBoardItem(item);
      const itineraryPreviewFile = itineraryPreviewFileFromCandidates(files);

      if (files.length === 0) {
        return {
          itinerary: undefined,
          itineraryPreviewFile: undefined,
        };
      }

      const fingerprint = itineraryFilesFingerprint(files);
      const cacheKey = itineraryCacheKey(
        volunteer.id,
        fieldAirport,
        fingerprint,
      );

      const cached = volunteerFileItineraryCache.get(cacheKey);
      if (cached && itineraryHasData(cached)) {
        return { itinerary: cached, itineraryPreviewFile };
      }

      try {
        const fromFiles = await parseItineraryFromVolunteerFiles(
          files,
          fieldAirport,
        );
        if (fromFiles && itineraryHasData(fromFiles)) {
          const volunteerNeedle = `:${volunteer.id}:`;
          for (const key of [...volunteerFileItineraryCache.keys()]) {
            if (key.includes(volunteerNeedle) && key !== cacheKey) {
              volunteerFileItineraryCache.delete(key);
            }
          }
          volunteerFileItineraryCache.set(cacheKey, fromFiles);
          return { itinerary: fromFiles, itineraryPreviewFile };
        }
      } catch {
        // Leave uncached so the next Refresh retries.
      }

      // Files present but not yet parseable — wait; do not use columns.
      return {
        itinerary: undefined,
        itineraryPreviewFile,
      };
    },
  );

  const next = sections.map((section) => ({
    ...section,
    volunteers: section.volunteers.map((volunteer) => ({ ...volunteer })),
  }));

  targets.forEach((target, index) => {
    const result = enriched[index];
    const volunteer =
      next[target.sectionIndex]?.volunteers[target.volunteerIndex];
    if (!volunteer || !result) return;
    volunteer.itinerary = result.itinerary;
    volunteer.itineraryPreviewFile = result.itineraryPreviewFile;
  });

  return next;
}
