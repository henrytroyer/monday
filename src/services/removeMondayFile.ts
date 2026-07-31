/**
 * removeMondayFile.ts — Remove a slotted volunteer file from Monday file columns.
 * Uses update_assets_on_item to keep remaining files, or clear_all when empty.
 */

import { canEditApplications, useMockData } from '../config/boards';
import type { VolunteerFile } from '../types/volunteer';
import { mutations, queries } from '../utils/mondayQueries';
import { assetIdFromVolunteerFile } from './itineraryFromFiles';
import { mondayGraphQL as api } from './mondayGraphQL';
import { invalidateApplicationDetail } from './sessionDetailCache';

type FileColumnAsset = {
  assetId: string;
  name: string;
};

type FileColumnLink = {
  name: string;
  url: string;
};

type FileColumnContents = {
  columnId: string;
  assets: FileColumnAsset[];
  links: FileColumnLink[];
};

type ItemFileColumnsResponse = {
  items: Array<{
    id: string;
    column_values: Array<{
      id: string;
      type?: string;
      value?: string | null;
      files?: Array<{
        asset_id?: string | number | null;
        name?: string | null;
        url?: string | null;
      } | null> | null;
    }>;
  }>;
};

export function assetIdsToRemoveFromVolunteerFile(
  file: VolunteerFile,
): string[] {
  if (file.mergeSourceAssetIds?.length) {
    return [...new Set(file.mergeSourceAssetIds.filter(Boolean))];
  }
  const id = assetIdFromVolunteerFile(file);
  return id ? [id] : [];
}

function parseFileColumnContents(
  column: ItemFileColumnsResponse['items'][number]['column_values'][number],
): FileColumnContents | null {
  const assets: FileColumnAsset[] = [];
  const links: FileColumnLink[] = [];
  const seenAssets = new Set<string>();

  for (const file of column.files ?? []) {
    if (!file) continue;
    const assetId =
      file.asset_id != null && String(file.asset_id).trim() !== ''
        ? String(file.asset_id)
        : undefined;
    const name = String(file.name ?? 'File').trim() || 'File';
    if (assetId) {
      if (!seenAssets.has(assetId)) {
        seenAssets.add(assetId);
        assets.push({ assetId, name });
      }
      continue;
    }
    if (file.url?.trim()) {
      links.push({ name, url: file.url.trim() });
    }
  }

  if (column.value) {
    try {
      const data = JSON.parse(column.value) as {
        files?: Array<{
          assetId?: number | string;
          name?: string;
          linkToFile?: string;
          url?: string;
          fileType?: string;
        }>;
      };
      for (const file of data.files ?? []) {
        const assetId =
          file.assetId != null ? String(file.assetId) : undefined;
        const name = String(file.name ?? 'File').trim() || 'File';
        if (assetId) {
          if (!seenAssets.has(assetId)) {
            seenAssets.add(assetId);
            assets.push({ assetId, name });
          }
          continue;
        }
        const url = file.linkToFile || file.url;
        if (url?.trim()) {
          links.push({ name, url: url.trim() });
        }
      }
    } catch {
      // ignore malformed column JSON
    }
  }

  if (assets.length === 0 && links.length === 0) return null;
  return { columnId: column.id, assets, links };
}

async function clearFileColumn(
  boardId: string,
  itemId: string,
  columnId: string,
): Promise<void> {
  await api(mutations.updateColumnValue, {
    boardId,
    itemId,
    columnId,
    value: JSON.stringify({ clear_all: true }),
    createLabelsIfMissing: false,
  });
}

async function setFileColumnAssets(
  boardId: string,
  itemId: string,
  columnId: string,
  assets: FileColumnAsset[],
  links: FileColumnLink[],
): Promise<void> {
  const files = [
    ...assets.map((asset) => ({
      fileType: 'asset' as const,
      assetId: asset.assetId,
      name: asset.name,
    })),
    ...links.map((link) => ({
      fileType: 'link' as const,
      name: link.name,
      linkToFile: link.url,
    })),
  ];

  await api(mutations.updateAssetsOnItem, {
    boardId,
    itemId,
    columnId,
    files,
  });
}

/**
 * Remove the given volunteer file asset(s) from every Monday file column
 * that contains them on this item.
 */
export async function removeVolunteerFileFromMonday(
  boardId: string,
  itemId: string,
  file: VolunteerFile,
): Promise<void> {
  if (useMockData()) {
    throw new Error('File removal requires live portal data.');
  }
  if (!canEditApplications()) {
    throw new Error('Applications are read-only: cannot remove files.');
  }

  const removeIds = new Set(assetIdsToRemoveFromVolunteerFile(file));
  if (removeIds.size === 0) {
    throw new Error(
      'Could not identify this file on the board. Refresh and try again.',
    );
  }

  const data = await api<ItemFileColumnsResponse>(queries.getItem, {
    itemId: [itemId],
  });
  const item = data.items?.[0];
  if (!item) {
    throw new Error('Application item not found.');
  }

  let touched = 0;

  for (const column of item.column_values ?? []) {
    if (column.type && column.type !== 'file') continue;
    const contents = parseFileColumnContents(column);
    if (!contents) continue;

    const hasTarget = contents.assets.some((asset) =>
      removeIds.has(asset.assetId),
    );
    if (!hasTarget) continue;

    const remainingAssets = contents.assets.filter(
      (asset) => !removeIds.has(asset.assetId),
    );

    if (remainingAssets.length === 0 && contents.links.length === 0) {
      await clearFileColumn(boardId, itemId, contents.columnId);
    } else {
      await setFileColumnAssets(
        boardId,
        itemId,
        contents.columnId,
        remainingAssets,
        contents.links,
      );
    }
    touched += 1;
  }

  if (touched === 0) {
    throw new Error(
      'This file is not stored in a removable board column (it may only exist in the Files gallery).',
    );
  }

  invalidateApplicationDetail(itemId);
}
