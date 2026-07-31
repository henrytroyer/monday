/**
 * syncContactFiles.ts — Copy Profile/Passport assets onto a Contacts item
 * via the Monday API proxy (replaces Make.com download/upload).
 */

import { canEditContacts, useMockData } from '../../config/boards';
import { contactMap } from '../../config/contactMap';
import {
  findBoardColumnByTitle,
  type MondayWriteColumn,
} from '../mondayColumnWrite';
import {
  getCachedMondayProxyAuthToken,
  getMondayProxyBaseOverride,
} from '../mondayProxyAuth';
import { mondayAssetProxyUrl } from '../mondayFileColumns';

export type ContactFileSlot = 'profilePhoto' | 'passport' | 'spouseProfilePhoto' | 'spousePassport';

const SLOT_TO_TITLE: Record<ContactFileSlot, string> = {
  profilePhoto: contactMap.profilePhoto,
  passport: contactMap.passport,
  spouseProfilePhoto: contactMap.spouseProfilePhoto,
  spousePassport: contactMap.spousePassport,
};

const SLOT_FILENAME_PREFIX: Record<ContactFileSlot, string> = {
  profilePhoto: 'Profile',
  passport: 'Passport',
  spouseProfilePhoto: 'Spouse Profile',
  spousePassport: 'Spouse Passport',
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

async function fileColumnHasAssets(
  _boardId: string,
  itemId: string,
  column: MondayWriteColumn,
): Promise<boolean> {
  // Best-effort: if we cannot inspect, allow upload.
  try {
    const { mondayGraphQL } = await import('../mondayGraphQL');
    const data = await mondayGraphQL<{
      items: Array<{
        column_values: Array<{ id: string; text: string | null; value: string | null }>;
      }>;
    }>(
      `query ($ids: [ID!]!) {
        items(ids: $ids) {
          column_values(ids: ["${column.id}"]) { id text value }
        }
      }`,
      { ids: [itemId] },
    );
    const col = data.items?.[0]?.column_values?.[0];
    if (col?.text?.trim()) return true;
    if (col?.value && col.value !== '{}' && col.value !== 'null') return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Download an asset by id and upload it onto a Contacts board file column.
 * Skips when the target slot already has a file (unless force).
 */
export async function syncAssetToContactColumn(options: {
  contactsBoardId: string;
  contactId: string;
  slot: ContactFileSlot;
  sourceAssetId: string;
  sourceFileName?: string;
  force?: boolean;
}): Promise<{ uploaded: boolean; reason: string }> {
  if (useMockData()) {
    return { uploaded: false, reason: 'mock' };
  }
  if (!canEditContacts()) {
    return { uploaded: false, reason: 'read-only' };
  }

  const column = await findBoardColumnByTitle(
    options.contactsBoardId,
    SLOT_TO_TITLE[options.slot],
  );
  if (!column || column.type !== 'file') {
    return {
      uploaded: false,
      reason: `Column "${SLOT_TO_TITLE[options.slot]}" not found`,
    };
  }

  if (!options.force) {
    const has = await fileColumnHasAssets(
      options.contactsBoardId,
      options.contactId,
      column,
    );
    if (has) {
      return { uploaded: false, reason: 'slot already filled' };
    }
  }

  const downloadUrl = mondayAssetProxyUrl(options.sourceAssetId);
  if (!downloadUrl) {
    return { uploaded: false, reason: 'proxy URL not configured' };
  }
  const headers: Record<string, string> = {};
  const token = getCachedMondayProxyAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const downloaded = await fetch(downloadUrl, { headers });
  if (!downloaded.ok) {
    return {
      uploaded: false,
      reason: `download failed (${downloaded.status})`,
    };
  }

  const blob = await downloaded.blob();
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  const base64 = btoa(binary);

  const originalName =
    options.sourceFileName?.trim() ||
    `${SLOT_FILENAME_PREFIX[options.slot]}.bin`;
  const fileName = new RegExp(SLOT_FILENAME_PREFIX[options.slot], 'i').test(
    originalName,
  )
    ? originalName
    : `${SLOT_FILENAME_PREFIX[options.slot]} - ${originalName}`;

  const uploadRes = await fetch(`${proxyBase()}/assets/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({
      itemId: options.contactId,
      columnId: column.id,
      fileName,
      contentType: blob.type || 'application/octet-stream',
      base64,
    }),
  });

  if (!uploadRes.ok) {
    const payload = (await uploadRes.json().catch(() => ({}))) as {
      error?: string;
    };
    return {
      uploaded: false,
      reason: payload.error || `upload failed (${uploadRes.status})`,
    };
  }

  return { uploaded: true, reason: 'ok' };
}
