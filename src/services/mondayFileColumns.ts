import type { VolunteerFile } from '../types/volunteer';
import { inferVolunteerFileIsImage } from '../utils/inferVolunteerFileIsImage';
import type { MondayColumnValue } from './mapMondayToCrm';

export function mondayAssetProxyUrl(
  assetId: string,
  proxyBase?: string,
): string | undefined {
  const base = (proxyBase ?? import.meta.env.VITE_MONDAY_API_PROXY_URL)
    ?.trim()
    .replace(/\/$/, '');
  if (!base) return undefined;
  return `${base}/assets/${assetId}`;
}

export function parseAssetIdFromColumn(col: MondayColumnValue): string | undefined {
  if (!col.value) return undefined;
  try {
    const data = JSON.parse(col.value) as {
      files?: Array<{ assetId?: number | string }>;
    };
    const assetId = data.files?.[0]?.assetId;
    return assetId != null ? String(assetId) : undefined;
  } catch {
    return undefined;
  }
}

export function assetIdFromProtectedUrl(text: string): string | undefined {
  const match = text.match(/\/resources\/(\d+)\//);
  return match?.[1];
}

export function resolveColumnFileUrl(
  col: MondayColumnValue | undefined,
  proxyBase?: string,
): string | undefined {
  if (!col) return undefined;

  const assetId =
    parseAssetIdFromColumn(col) ||
    (col.text?.trim().startsWith('http')
      ? assetIdFromProtectedUrl(col.text.trim())
      : undefined);

  if (assetId) {
    return mondayAssetProxyUrl(assetId, proxyBase);
  }

  const text = col.text?.trim();
  if (text?.startsWith('http')) {
    return text;
  }

  return undefined;
}

export function parseMondayFileColumn(
  col: MondayColumnValue | undefined,
  proxyBase?: string,
): VolunteerFile[] {
  if (!col) return [];

  if (col.files?.length) {
    return col.files.map((file, index) => {
      const name = String(file.name ?? 'File');
      const assetId =
        file.asset_id != null ? String(file.asset_id) : undefined;
      const url =
        (assetId ? mondayAssetProxyUrl(assetId, proxyBase) : undefined) ||
        file.url ||
        file.public_url ||
        undefined;
      const isImage =
        file.is_image === true ||
        inferVolunteerFileIsImage(url ?? '', name);
      return {
        id: assetId ?? `file-${index}`,
        name,
        url,
        isImage,
      };
    });
  }

  if (col.value) {
    try {
      const data = JSON.parse(col.value) as {
        files?: Array<Record<string, unknown>>;
      };
      const files = data.files ?? [];
      return files.map((file, index) => {
        const name = String(file.name ?? 'File');
        const assetId =
          file.assetId != null ? String(file.assetId) : undefined;
        const url =
          (assetId ? mondayAssetProxyUrl(assetId, proxyBase) : undefined) ||
          (file.url as string | undefined) ||
          (file.public_url as string | undefined) ||
          (file.linkToFile as string | undefined) ||
          resolveColumnFileUrl(col, proxyBase);
        const isImage = inferVolunteerFileIsImage(
          url ?? '',
          name,
          file.isImage as boolean | string | undefined,
        );

        return {
          id: assetId ?? String(file.id ?? index),
          name,
          url,
          isImage,
        };
      });
    } catch {
      // fall through to text
    }
  }

  const directUrl = resolveColumnFileUrl(col, proxyBase);
  if (directUrl) {
    const name =
      col.text?.trim().split('/').pop()?.split('?')[0] || 'File';
    return [
      {
        id: parseAssetIdFromColumn(col) ?? 'text-0',
        name,
        url: directUrl,
        isImage: inferVolunteerFileIsImage(directUrl, name),
      },
    ];
  }

  if (col.text?.trim()) {
    return col.text.split(',').map((part, index) => {
      const name = part.trim();
      return {
        id: `text-${index}`,
        name,
        isImage: /\.(png|jpe?g|gif|webp|svg)$/i.test(name),
      };
    });
  }

  return [];
}

export function getAllFilesFromColumnValues(
  columnValues: MondayColumnValue[],
  proxyBase?: string,
): VolunteerFile[] {
  const files: VolunteerFile[] = [];
  const seen = new Set<string>();

  for (const col of columnValues) {
    if (col.type !== 'file') continue;
    for (const file of parseMondayFileColumn(col, proxyBase)) {
      const key = `${file.id}-${file.name}-${file.url ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      files.push(file);
    }
  }

  return files;
}

export function resolveProfilePhotoUrl(
  profileCol: MondayColumnValue | undefined,
  filesCol?: MondayColumnValue | undefined,
  proxyBase?: string,
): string | undefined {
  const fromProfile =
    resolveColumnFileUrl(profileCol, proxyBase) ||
    parseMondayFileColumn(profileCol, proxyBase).find(
      (file) => file.isImage && file.url,
    )?.url;
  if (fromProfile) return fromProfile;

  const fromGallery = parseMondayFileColumn(filesCol, proxyBase).find(
    (file) => file.isImage && file.url,
  );
  return fromGallery?.url;
}

function passportFileFromColumn(
  passportCol: MondayColumnValue | undefined,
  proxyBase?: string,
): VolunteerFile | undefined {
  if (!passportCol) return undefined;

  const fromFiles = parseMondayFileColumn(passportCol, proxyBase).find(
    (file) => file.url,
  );
  if (fromFiles) {
    return {
      ...fromFiles,
      name: /passport/i.test(fromFiles.name)
        ? fromFiles.name
        : `Passport - ${fromFiles.name}`,
    };
  }

  const url = resolveColumnFileUrl(passportCol, proxyBase);
  if (!url) return undefined;

  const name =
    passportCol.text?.trim().split('/').pop()?.split('?')[0] || 'Passport';
  return {
    id: parseAssetIdFromColumn(passportCol) ?? 'passport',
    name: /passport/i.test(name) ? name : `Passport - ${name}`,
    url,
    isImage: inferVolunteerFileIsImage(url, name),
  };
}

export function resolvePassportFile(
  passportCol: MondayColumnValue | undefined,
  altPassportCol?: MondayColumnValue | undefined,
  proxyBase?: string,
): VolunteerFile | undefined {
  return (
    passportFileFromColumn(passportCol, proxyBase) ??
    passportFileFromColumn(altPassportCol, proxyBase)
  );
}

export function mergeVolunteerGalleryFiles(
  sources: VolunteerFile[][],
  options?: {
    profilePhotoUrl?: string;
    passportPhotoUrl?: string;
  },
): VolunteerFile[] {
  const merged = sources.flat();
  const seen = new Set<string>();

  return merged.filter((file) => {
    if (
      options?.profilePhotoUrl &&
      file.isImage &&
      file.url === options.profilePhotoUrl
    ) {
      return false;
    }
    if (options?.passportPhotoUrl && file.url === options.passportPhotoUrl) {
      return false;
    }
    const key = `${file.id}-${file.name}-${file.url ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function parseLinkedBoardRelationIds(
  col: MondayColumnValue | undefined,
): string[] {
  if (!col) return [];

  if (col.linked_item_ids?.length) {
    return col.linked_item_ids.map(String);
  }

  if (!col.value) return [];

  try {
    const parsed = JSON.parse(col.value) as {
      linkedPulseIds?: number[];
      linked_item_ids?: string[];
    };
    if (parsed.linkedPulseIds?.length) {
      return parsed.linkedPulseIds.map(String);
    }
    if (parsed.linked_item_ids?.length) {
      return parsed.linked_item_ids.map(String);
    }
  } catch {
    // fall through
  }

  return [];
}

export function certificateFileFromColumn(
  col: MondayColumnValue | undefined,
  proxyBase?: string,
  defaultName = 'Certificate',
): VolunteerFile | undefined {
  const fromFiles = parseMondayFileColumn(col, proxyBase).find((file) => file.url);
  if (fromFiles) {
    return {
      ...fromFiles,
      name: fromFiles.name || defaultName,
      isImage: fromFiles.isImage ?? /\.pdf$/i.test(fromFiles.name),
    };
  }
  return undefined;
}
