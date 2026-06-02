import type { TermNote } from '../types/volunteer';

const STORAGE_PREFIX = 'crm-term-notes';

function storageKey(itemId: string, timelineId: string): string {
  return `${STORAGE_PREFIX}:${itemId}:${timelineId}`;
}

export function getLocalTermNotes(
  itemId: string,
  timelineId: string,
): TermNote[] {
  try {
    const raw = localStorage.getItem(storageKey(itemId, timelineId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TermNote[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalTermNotes(
  itemId: string,
  timelineId: string,
  notes: TermNote[],
): void {
  localStorage.setItem(storageKey(itemId, timelineId), JSON.stringify(notes));
}

export function addLocalTermNote(
  itemId: string,
  timelineId: string,
  body: string,
  authorName = 'You',
): TermNote {
  const note: TermNote = {
    id: `local-${Date.now()}`,
    itemId,
    timelineId,
    body: body.trim(),
    createdAt: new Date().toISOString(),
    authorName,
  };
  const existing = getLocalTermNotes(itemId, timelineId);
  saveLocalTermNotes(itemId, timelineId, [...existing, note]);
  return note;
}

export function shouldUseLocalTermNotes(itemId: string, isMockMode: boolean): boolean {
  return isMockMode || itemId.startsWith('mock-');
}
