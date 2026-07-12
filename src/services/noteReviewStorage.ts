import type { ApprovedNoteLink, NoteReviewItem } from '../types/noteReview';

const QUEUE_KEY = 'crm-note-review-queue';
const APPROVED_KEY = 'crm-approved-note-links';
const DISMISSED_KEY = 'crm-dismissed-note-keys';

function readQueue(): NoteReviewItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as NoteReviewItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(items: NoteReviewItem[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

function readApproved(): ApprovedNoteLink[] {
  try {
    const raw = localStorage.getItem(APPROVED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ApprovedNoteLink[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeApproved(links: ApprovedNoteLink[]): void {
  localStorage.setItem(APPROVED_KEY, JSON.stringify(links));
}

function readDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function writeDismissed(keys: Set<string>): void {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...keys]));
}

export function noteReviewKey(
  boardId: string,
  itemId: string,
  updateId: string,
): string {
  return `${boardId}:${itemId}:${updateId}`;
}

export function getPendingReviewItems(): NoteReviewItem[] {
  return readQueue().filter((item) => item.status === 'pending');
}

export function getPendingReviewCount(): number {
  return getPendingReviewItems().length;
}

export function isNoteDismissed(noteKey: string): boolean {
  return readDismissed().has(noteKey);
}

export function isNoteApproved(noteKey: string): boolean {
  return readApproved().some((link) => link.noteKey === noteKey);
}

export function upsertReviewItems(incoming: NoteReviewItem[]): number {
  const dismissed = readDismissed();
  const approved = new Set(readApproved().map((link) => link.noteKey));
  const queue = readQueue();
  const byId = new Map(queue.map((item) => [item.id, item]));
  let added = 0;

  for (const item of incoming) {
    if (dismissed.has(item.id) || approved.has(item.id)) continue;
    const existing = byId.get(item.id);
    if (existing?.status === 'approved' || existing?.status === 'dismissed') {
      continue;
    }
    if (!existing) added += 1;
    byId.set(item.id, { ...existing, ...item, status: 'pending' });
  }

  writeQueue([...byId.values()]);
  return added;
}

export function approveReviewItem(
  noteKey: string,
  contactId: string,
  contactName: string,
): ApprovedNoteLink | null {
  const queue = readQueue();
  const item = queue.find((entry) => entry.id === noteKey);
  if (!item) return null;

  const link: ApprovedNoteLink = {
    noteKey: item.id,
    contactId,
    boardId: item.boardId,
    boardName: item.boardName,
    itemId: item.itemId,
    itemName: item.itemName,
    body: item.body,
    createdAt: item.createdAt,
    authorName: item.authorName,
    sourceLabel: item.sourceLabel ?? item.boardName,
    matchReason: item.matchReason ?? 'manual_approve',
  };

  const approved = readApproved().filter((entry) => entry.noteKey !== noteKey);
  approved.push(link);
  writeApproved(approved);

  writeQueue(
    queue.map((entry) =>
      entry.id === noteKey
        ? {
            ...entry,
            status: 'approved' as const,
            suggestedContactId: contactId,
            suggestedContactName: contactName,
          }
        : entry,
    ),
  );

  return link;
}

export function dismissReviewItem(noteKey: string): void {
  const dismissed = readDismissed();
  dismissed.add(noteKey);
  writeDismissed(dismissed);

  const queue = readQueue();
  writeQueue(
    queue.map((entry) =>
      entry.id === noteKey ? { ...entry, status: 'dismissed' as const } : entry,
    ),
  );
}

export function getPendingReviewItemsForContact(
  contactId: string,
): NoteReviewItem[] {
  return getPendingReviewItems().filter(
    (item) =>
      item.suggestedContactId === contactId || item.itemId === contactId,
  );
}

export function autoApproveContactItemNote(link: ApprovedNoteLink): void {
  if (isNoteApproved(link.noteKey)) return;

  const approved = readApproved().filter(
    (entry) => entry.noteKey !== link.noteKey,
  );
  approved.push(link);
  writeApproved(approved);

  const queue = readQueue();
  const existing = queue.find((entry) => entry.id === link.noteKey);
  if (existing) {
    writeQueue(
      queue.map((entry) =>
        entry.id === link.noteKey
          ? {
              ...entry,
              status: 'approved' as const,
              suggestedContactId: link.contactId,
            }
          : entry,
      ),
    );
  }
}

export function getApprovedNotesForContact(
  contactId: string,
): ApprovedNoteLink[] {
  return readApproved().filter((link) => link.contactId === contactId);
}

export function bulkApproveSuggestedReviewItems(): {
  approved: number;
  skipped: number;
  contactIds: string[];
} {
  const pending = getPendingReviewItems();
  let approved = 0;
  let skipped = 0;
  const contactIds = new Set<string>();

  for (const item of pending) {
    if (!item.suggestedContactId) {
      skipped += 1;
      continue;
    }

    const link = approveReviewItem(
      item.id,
      item.suggestedContactId,
      item.suggestedContactName ?? 'Contact',
    );
    if (link) {
      approved += 1;
      contactIds.add(item.suggestedContactId);
    } else {
      skipped += 1;
    }
  }

  return {
    approved,
    skipped,
    contactIds: [...contactIds],
  };
}

export function dismissUnmatchedReviewItems(): number {
  const pending = getPendingReviewItems().filter(
    (item) => !item.suggestedContactId,
  );

  for (const item of pending) {
    dismissReviewItem(item.id);
  }

  return pending.length;
}

export function clearNoteReviewData(): void {
  localStorage.removeItem(QUEUE_KEY);
  localStorage.removeItem(APPROVED_KEY);
  localStorage.removeItem(DISMISSED_KEY);
}
