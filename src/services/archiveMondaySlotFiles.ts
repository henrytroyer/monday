/**
 * archiveMondaySlotFiles.ts — Before a slot upload, keep prior files on the item
 * by renaming them "Old - …" (and clearing dedicated columns so the new file is current).
 */

import { columnMap } from '../config/columnMap';
import {
  archiveVolunteerFileName,
  isArchivedVolunteerFileName,
} from '../utils/archivedVolunteerFiles';
import { mutations, queries } from '../utils/mondayQueries';
import {
  findBoardColumnByTitle,
  type MondayWriteColumn,
} from './mondayColumnWrite';
import { mondayGraphQL as api } from './mondayGraphQL';

/** Slots that replace the previous current file on upload. */
export type ArchivableMondayFileSlot =
  | 'passport'
  | 'releaseForms'
  | 'itineraryFiles'
  | 'profilePhoto'
  | 'files';

type FileColumnAsset = {
  assetId: string;
  name: string;
};

type FileColumnLink = {
  name: string;
  url: string;
};

type ItemFileColumnsResponse = {
  items: Array<{
    id: string;
    column_values: Array<{
      id: string;
      type?: string;
      value?: string | null;
      column?: { title?: string | null } | null;
      files?: Array<{
        asset_id?: string | number | null;
        name?: string | null;
        url?: string | null;
      } | null> | null;
    }>;
  }>;
};

const SLOT_NAME_PATTERN: Partial<Record<ArchivableMondayFileSlot, RegExp>> = {
  passport: /passport/i,
  releaseForms: /release/i,
  itineraryFiles: /itinerary/i,
  profilePhoto: /profile/i,
};

function dedicatedTitlesForSlot(slot: ArchivableMondayFileSlot): string[] {
  switch (slot) {
    case 'profilePhoto':
      return [columnMap.profilePhoto];
    case 'passport':
      return [columnMap.passport, columnMap.passportNew];
    case 'releaseForms':
      return [columnMap.releaseForms];
    case 'itineraryFiles':
      return [columnMap.itineraryFiles];
    default:
      return [];
  }
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

function parseFileColumnContents(
  column: ItemFileColumnsResponse['items'][number]['column_values'][number],
): { assets: FileColumnAsset[]; links: FileColumnLink[] } {
  const assets: FileColumnAsset[] = [];
  const links: FileColumnLink[] = [];
  const seen = new Set<string>();

  for (const file of column.files ?? []) {
    if (!file) continue;
    const assetId =
      file.asset_id != null && String(file.asset_id).trim() !== ''
        ? String(file.asset_id)
        : undefined;
    const name = String(file.name ?? 'File').trim() || 'File';
    if (assetId) {
      if (!seen.has(assetId)) {
        seen.add(assetId);
        assets.push({ assetId, name });
      }
      continue;
    }
    if (file.url?.trim()) links.push({ name, url: file.url.trim() });
  }

  if (column.value) {
    try {
      const data = JSON.parse(column.value) as {
        files?: Array<{
          assetId?: number | string;
          name?: string;
          linkToFile?: string;
          url?: string;
        }>;
      };
      for (const file of data.files ?? []) {
        const assetId =
          file.assetId != null ? String(file.assetId) : undefined;
        const name = String(file.name ?? 'File').trim() || 'File';
        if (assetId) {
          if (!seen.has(assetId)) {
            seen.add(assetId);
            assets.push({ assetId, name });
          }
          continue;
        }
        const url = file.linkToFile || file.url;
        if (url?.trim()) links.push({ name, url: url.trim() });
      }
    } catch {
      // ignore
    }
  }

  return { assets, links };
}

async function setFileColumnAssets(
  boardId: string,
  itemId: string,
  columnId: string,
  assets: FileColumnAsset[],
  links: FileColumnLink[],
): Promise<void> {
  await api(mutations.updateAssetsOnItem, {
    boardId,
    itemId,
    columnId,
    files: [
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
    ],
  });
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

function matchesCurrentSlot(
  name: string,
  slot: ArchivableMondayFileSlot,
): boolean {
  if (isArchivedVolunteerFileName(name)) return false;
  const pattern = SLOT_NAME_PATTERN[slot];
  return pattern ? pattern.test(name) : false;
}

/**
 * Rename current slot files to "Old - …" in the Files column and clear
 * dedicated slot columns so the upcoming upload becomes the active file.
 */
export async function archiveCurrentSlotFilesBeforeUpload(
  boardId: string,
  itemId: string,
  slot: ArchivableMondayFileSlot,
  filesColumn: MondayWriteColumn,
): Promise<void> {
  if (slot === 'files') return;
  if (!SLOT_NAME_PATTERN[slot]) return;

  const data = await api<ItemFileColumnsResponse>(queries.getItem, {
    itemId: [itemId],
  });
  const item = data.items?.[0];
  if (!item) return;

  const dedicatedTitles = new Set(
    dedicatedTitlesForSlot(slot).map(normalizeTitle),
  );
  const dedicatedColumns: Array<{
    columnId: string;
    assets: FileColumnAsset[];
  }> = [];

  let filesCol = item.column_values.find((col) => col.id === filesColumn.id);
  if (!filesCol) {
    // title fallback if id mismatch
    filesCol = item.column_values.find(
      (col) =>
        normalizeTitle(col.column?.title ?? '') ===
        normalizeTitle(filesColumn.title),
    );
  }

  const filesContents = filesCol
    ? parseFileColumnContents(filesCol)
    : { assets: [] as FileColumnAsset[], links: [] as FileColumnLink[] };

  for (const col of item.column_values) {
    if (col.id === filesColumn.id) continue;
    if (col.type && col.type !== 'file') continue;
    const title = normalizeTitle(col.column?.title ?? '');
    if (!dedicatedTitles.has(title)) continue;
    const contents = parseFileColumnContents(col);
    if (contents.assets.length === 0) continue;
    dedicatedColumns.push({
      columnId: col.id,
      assets: contents.assets,
    });
  }

  // Also resolve dedicated columns by configured titles when board column
  // titles are only available through the columns API.
  for (const title of dedicatedTitlesForSlot(slot)) {
    const already = dedicatedColumns.some((c) =>
      item.column_values.some(
        (col) =>
          col.id === c.columnId &&
          normalizeTitle(col.column?.title ?? '') === normalizeTitle(title),
      ),
    );
    if (already) continue;
    const found = await findBoardColumnByTitle(boardId, title);
    if (!found || found.type !== 'file' || found.id === filesColumn.id) continue;
    const col = item.column_values.find((c) => c.id === found.id);
    if (!col) continue;
    const contents = parseFileColumnContents(col);
    if (contents.assets.length === 0) continue;
    dedicatedColumns.push({ columnId: found.id, assets: contents.assets });
  }

  const filesAssetIds = new Set(filesContents.assets.map((a) => a.assetId));
  let changed = false;

  const nextFilesAssets = filesContents.assets.map((asset) => {
    if (!matchesCurrentSlot(asset.name, slot)) return asset;
    changed = true;
    return { ...asset, name: archiveVolunteerFileName(asset.name) };
  });

  for (const dedicated of dedicatedColumns) {
    for (const asset of dedicated.assets) {
      if (isArchivedVolunteerFileName(asset.name)) {
        if (!filesAssetIds.has(asset.assetId)) {
          nextFilesAssets.push({
            assetId: asset.assetId,
            name: asset.name,
          });
          filesAssetIds.add(asset.assetId);
          changed = true;
        }
        continue;
      }
      const archivedName = archiveVolunteerFileName(asset.name);
      if (filesAssetIds.has(asset.assetId)) {
        const idx = nextFilesAssets.findIndex(
          (a) => a.assetId === asset.assetId,
        );
        if (idx >= 0 && nextFilesAssets[idx].name !== archivedName) {
          nextFilesAssets[idx] = {
            ...nextFilesAssets[idx],
            name: archivedName,
          };
          changed = true;
        }
      } else {
        nextFilesAssets.push({
          assetId: asset.assetId,
          name: archivedName,
        });
        filesAssetIds.add(asset.assetId);
        changed = true;
      }
    }
  }

  if (!changed && dedicatedColumns.length === 0) return;

  if (changed) {
    await setFileColumnAssets(
      boardId,
      itemId,
      filesColumn.id,
      nextFilesAssets,
      filesContents.links,
    );
  }

  for (const dedicated of dedicatedColumns) {
    await clearFileColumn(boardId, itemId, dedicated.columnId);
  }
}
