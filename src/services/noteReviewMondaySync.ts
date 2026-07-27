/**
 * Persists note review approve/dismiss decisions on a Contacts-board registry item
 * so local dev and production share the same inbox state via Monday.com.
 */

import {
  canEditContacts,
  resolveContactsBoardId,
  useMockData,
} from '../config/boards';
import type { ApprovedNoteLink } from '../types/noteReview';
import { fetchBoardItemsFull, fetchItemsUpdates } from './crmApi';
import { mondayGraphQL } from './mondayGraphQL';
import { mutations } from '../utils/mondayQueries';
import {
  clearPendingReviewQueue,
  importSyncedReviewState,
  readApprovedLinks,
  readDismissedKeys,
  setHarvestBaselineBefore,
} from './noteReviewStorage';
import {
  encodeNoteReviewRegistryBody,
  parseNoteReviewRegistryUpdates,
  type NoteReviewRegistryEntry,
} from './noteReviewRegistryFormat';

export {
  isNoteReviewRegistryUpdate,
  NOTE_REVIEW_REGISTRY_PREFIX,
} from './noteReviewRegistryFormat';

export const NOTE_REVIEW_REGISTRY_ITEM_NAME = 'CRM Note Review Registry';

const REGISTRY_ITEM_ID_KEY = 'crm-note-review-registry-item-id';

let registryItemIdPromise: Promise<string | null> | null = null;
let lastSyncedApprovedKeys = new Set<string>();
let lastSyncedDismissedKeys = new Set<string>();

function cacheRegistryItemId(itemId: string): void {
  try {
    localStorage.setItem(REGISTRY_ITEM_ID_KEY, itemId);
  } catch {
    // ignore
  }
}

export async function resolveNoteReviewRegistryItemId(): Promise<string | null> {
  if (useMockData()) return null;

  const fromEnv = import.meta.env.VITE_CRM_NOTE_REVIEW_REGISTRY_ITEM_ID?.trim();
  if (fromEnv) return fromEnv;

  const cached = localStorage.getItem(REGISTRY_ITEM_ID_KEY);
  if (cached) return cached;

  const boardId = resolveContactsBoardId();
  if (!boardId) return null;

  const items = await fetchBoardItemsFull(boardId);
  const found = items.find((item) => item.name === NOTE_REVIEW_REGISTRY_ITEM_NAME);
  if (found) {
    cacheRegistryItemId(found.id);
    return found.id;
  }

  if (!canEditContacts()) return null;

  const created = await mondayGraphQL<{
    create_item: { id: string; name: string };
  }>(mutations.createItem, {
    boardId,
    itemName: NOTE_REVIEW_REGISTRY_ITEM_NAME,
  });

  cacheRegistryItemId(created.create_item.id);
  return created.create_item.id;
}

async function getRegistryItemId(): Promise<string | null> {
  if (!registryItemIdPromise) {
    registryItemIdPromise = resolveNoteReviewRegistryItemId().finally(() => {
      registryItemIdPromise = null;
    });
  }
  return registryItemIdPromise;
}

async function fetchRegistryUpdates(): Promise<
  Array<{ text_body?: string; created_at: string }>
> {
  const itemId = await getRegistryItemId();
  if (!itemId) return [];

  const rows = await fetchItemsUpdates([itemId]);
  return rows[0]?.updates ?? [];
}

export async function syncNoteReviewFromMonday(): Promise<{
  approved: number;
  dismissed: number;
}> {
  if (useMockData()) {
    return { approved: 0, dismissed: 0 };
  }

  const updates = await fetchRegistryUpdates();
  const parsed = parseNoteReviewRegistryUpdates(updates);
  importSyncedReviewState(
    parsed.approved,
    parsed.dismissed,
    parsed.baselineBeforeIso,
  );

  lastSyncedApprovedKeys = new Set(parsed.approved.map((link) => link.noteKey));
  lastSyncedDismissedKeys = new Set(parsed.dismissed);

  await migrateUnsyncedLocalReviewToMonday();

  return {
    approved: parsed.approved.length,
    dismissed: parsed.dismissed.length,
  };
}

async function writeRegistryEntry(entry: NoteReviewRegistryEntry): Promise<void> {
  if (useMockData() || !canEditContacts()) return;

  const itemId = await getRegistryItemId();
  if (!itemId) return;

  await mondayGraphQL(mutations.createUpdate, {
    itemId,
    body: encodeNoteReviewRegistryBody(entry),
  });
}

export async function persistApprovedNoteToMonday(
  link: ApprovedNoteLink,
): Promise<void> {
  await writeRegistryEntry({ action: 'approved', link });
  lastSyncedApprovedKeys.add(link.noteKey);
  lastSyncedDismissedKeys.delete(link.noteKey);
}

export async function persistDismissedNoteToMonday(
  noteKey: string,
): Promise<void> {
  await writeRegistryEntry({ action: 'dismissed', noteKey });
  lastSyncedDismissedKeys.add(noteKey);
  lastSyncedApprovedKeys.delete(noteKey);
}

export async function persistHarvestBaselineToMonday(
  beforeIso: string,
): Promise<void> {
  await writeRegistryEntry({ action: 'baseline', beforeIso });
}

/** Clear pending inbox and set baseline so old board history is not re-queued. */
export async function resetNoteReviewInbox(beforeIso = new Date().toISOString()): Promise<number> {
  const cleared = clearPendingReviewQueue();
  setHarvestBaselineBefore(beforeIso);
  try {
    await persistHarvestBaselineToMonday(beforeIso);
  } catch {
    // Local reset still helps even if Monday write fails.
  }
  return cleared;
}

export async function migrateUnsyncedLocalReviewToMonday(): Promise<number> {
  if (useMockData() || !canEditContacts()) return 0;

  let migrated = 0;
  for (const link of readApprovedLinks()) {
    if (lastSyncedApprovedKeys.has(link.noteKey)) continue;
    await persistApprovedNoteToMonday(link);
    migrated += 1;
  }
  for (const noteKey of readDismissedKeys()) {
    if (lastSyncedDismissedKeys.has(noteKey)) continue;
    await persistDismissedNoteToMonday(noteKey);
    migrated += 1;
  }

  return migrated;
}
