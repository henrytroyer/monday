/**
 * uploadMondayFile.ts — Upload a file into a Monday file column via the API proxy.
 */

import { canEditApplications, useMockData } from '../config/boards';
import { columnMap } from '../config/columnMap';
import {
  findBoardColumnByTitle,
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

const SLOT_TO_MAP: Record<MondayFileSlot, keyof typeof columnMap> = {
  passport: 'passport',
  releaseForms: 'releaseForms',
  itineraryFiles: 'itineraryFiles',
  profilePhoto: 'profilePhoto',
  files: 'files',
};

function proxyBase(): string {
  const base = (
    getMondayProxyBaseOverride() ??
    import.meta.env.VITE_MONDAY_API_PROXY_URL
  )
    ?.trim()
    .replace(/\/$/, '');
  if (!base) {
    throw new Error('Monday API proxy URL is not configured.');
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

export async function uploadFileToApplicationColumn(
  boardId: string,
  itemId: string,
  slot: MondayFileSlot,
  file: File,
): Promise<{ assetId: string | null }> {
  if (useMockData()) {
    throw new Error('File upload requires live monday.com data.');
  }
  if (!canEditApplications()) {
    throw new Error('Applications are read-only: cannot upload files.');
  }

  const columnTitle = columnMap[SLOT_TO_MAP[slot]];
  const column = await findBoardColumnByTitle(boardId, columnTitle);
  if (!column) {
    throw new Error(
      `Column "${columnTitle}" not found. Add it on Monday or set the matching VITE_COL_* override.`,
    );
  }

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
      fileName: file.name,
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
