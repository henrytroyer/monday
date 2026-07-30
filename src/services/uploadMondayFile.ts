/**
 * uploadMondayFile.ts — Upload a file into the item's Monday Files column via the API proxy.
 * Slot labels only affect the stored filename so the CRM can categorize after refresh.
 */

import { canEditApplications, useMockData } from '../config/boards';
import { columnMap } from '../config/columnMap';
import {
  fetchWriteBoardColumns,
  findBoardColumnByTitle,
  type MondayWriteColumn,
} from './mondayColumnWrite';
import {
  getCachedMondayProxyAuthToken,
  getMondayProxyBaseOverride,
} from './mondayProxyAuth';
import { invalidateApplicationDetail } from './sessionDetailCache';

export type MondayFileSlot =
  | 'passport'
  | 'releaseForms'
  | 'itineraryFiles'
  | 'profilePhoto'
  | 'files';

/** Filename hints so Files-column uploads still categorize in the CRM UI. */
const SLOT_NAME_PREFIX: Partial<Record<MondayFileSlot, string>> = {
  passport: 'Passport',
  releaseForms: 'Release Forms',
  itineraryFiles: 'Itinerary',
  profilePhoto: 'Profile',
};

function proxyBase(): string {
  const base = (
    getMondayProxyBaseOverride() ??
    import.meta.env.VITE_MONDAY_API_PROXY_URL
  )
    ?.trim()
    .replace(/\/$/, '');
  if (!base) {
    throw new Error('API proxy URL is not configured.');
  }
  return base;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('File read failed'));
    reader.readAsDataURL(file);
  });
}

function ensureSlotFileName(slot: MondayFileSlot, originalName: string): string {
  const prefix = SLOT_NAME_PREFIX[slot];
  if (!prefix) return originalName;
  if (new RegExp(prefix, 'i').test(originalName)) return originalName;
  return `${prefix} - ${originalName}`;
}

async function resolveFilesColumn(boardId: string): Promise<MondayWriteColumn> {
  const filesCol = await findBoardColumnByTitle(boardId, columnMap.files);
  if (filesCol?.type === 'file') return filesCol;

  const columns = await fetchWriteBoardColumns(boardId);
  const anyFiles = columns.find(
    (c) => c.type === 'file' && /^files?$/i.test(c.title.trim()),
  );
  if (anyFiles) return anyFiles;

  throw new Error(
    `No Files column found on this board (looked for "${columnMap.files}"). Add a Files column or set VITE_COL_FILES.`,
  );
}

export async function uploadFileToApplicationColumn(
  boardId: string,
  itemId: string,
  slot: MondayFileSlot,
  file: File,
): Promise<{ assetId: string | null }> {
  if (useMockData()) {
    throw new Error('File upload requires live portal data.');
  }
  if (!canEditApplications()) {
    throw new Error('Applications are read-only: cannot upload files.');
  }

  const column = await resolveFilesColumn(boardId);
  const fileName = ensureSlotFileName(slot, file.name);

  const base64 = await fileToBase64(file);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = getCachedMondayProxyAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${proxyBase()}/assets/upload`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      itemId,
      columnId: column.id,
      fileName,
      contentType: file.type || 'application/octet-stream',
      base64,
    }),
  });

  const payload = (await res.json().catch(() => ({}))) as {
    error?: string;
    asset?: { id?: string };
  };
  if (!res.ok) {
    throw new Error(payload.error || `Upload failed (${res.status})`);
  }

  invalidateApplicationDetail(itemId);
  return { assetId: payload.asset?.id ? String(payload.asset.id) : null };
}
