import { mondayMergedAssetsProxyUrl } from '../services/mondayFileColumns';
import type { VolunteerFile } from '../types/volunteer';

export function assetIdFromVolunteerFileUrl(
  file: VolunteerFile,
): string | undefined {
  if (file.id && /^\d+$/.test(file.id)) return file.id;
  return file.url?.match(/\/assets\/(\d+)/)?.[1];
}

/** Collapse multiple itinerary PDFs into one combined download/preview URL. */
export function condenseItineraryPdfFiles(
  files: VolunteerFile[],
  proxyBase?: string,
): VolunteerFile[] {
  if (files.length <= 1) return files;

  const pdfs = files.filter(
    (file) => /\.pdf$/i.test(file.name) && Boolean(file.url),
  );
  if (pdfs.length <= 1) return files;

  const assetIds = pdfs
    .map(assetIdFromVolunteerFileUrl)
    .filter((id): id is string => Boolean(id));
  if (assetIds.length <= 1) return files;

  const mergeUrl = mondayMergedAssetsProxyUrl(assetIds, proxyBase);
  if (!mergeUrl) return files;

  const nonPdfItineraries = files.filter((file) => !pdfs.includes(file));

  return [
    {
      id: `itinerary-merged-${assetIds.join('-')}`,
      name: 'Itinerary.pdf',
      url: mergeUrl,
      isImage: false,
      mergeSourceAssetIds: assetIds,
    },
    ...nonPdfItineraries,
  ];
}
