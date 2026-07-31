/**
 * termNoteStorage.ts — Local/mock persistence for term-scoped internal notes.
 */

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
  authorId?: string,
): TermNote {
  const note: TermNote = {
    id: `local-${Date.now()}`,
    itemId,
    timelineId,
    body: body.trim(),
    createdAt: new Date().toISOString(),
    authorName,
    authorId,
  };
  const existing = getLocalTermNotes(itemId, timelineId);
  saveLocalTermNotes(itemId, timelineId, [...existing, note]);
  return note;
}

export function updateLocalTermNote(
  itemId: string,
  timelineId: string,
  noteId: string,
  body: string,
): TermNote | null {
  const notes = getLocalTermNotes(itemId, timelineId);
  let updated: TermNote | null = null;
  const next = notes.map((note) => {
    if (note.id === noteId) {
      updated = { ...note, body: body.trim() };
      return updated;
    }
    if (note.replies?.some((reply) => reply.id === noteId)) {
      return {
        ...note,
        replies: note.replies.map((reply) => {
          if (reply.id !== noteId) return reply;
          updated = { ...reply, body: body.trim() };
          return updated;
        }),
      };
    }
    return note;
  });
  if (!updated) return null;
  saveLocalTermNotes(itemId, timelineId, next);
  return updated;
}

export function deleteLocalTermNote(
  itemId: string,
  timelineId: string,
  noteId: string,
): boolean {
  const notes = getLocalTermNotes(itemId, timelineId);
  let changed = false;
  const next = notes
    .filter((note) => {
      if (note.id === noteId) {
        changed = true;
        return false;
      }
      return true;
    })
    .map((note) => {
      if (!note.replies?.length) return note;
      const replies = note.replies.filter((reply) => {
        if (reply.id === noteId) {
          changed = true;
          return false;
        }
        return true;
      });
      if (replies.length === note.replies.length) return note;
      return {
        ...note,
        replies: replies.length > 0 ? replies : undefined,
      };
    });
  if (!changed) return false;
  saveLocalTermNotes(itemId, timelineId, next);
  return true;
}

export function addLocalTermNoteReply(
  itemId: string,
  timelineId: string,
  parentId: string,
  body: string,
  authorName = 'You',
  authorId?: string,
): TermNote | null {
  const notes = getLocalTermNotes(itemId, timelineId);
  const reply: TermNote = {
    id: `local-reply-${Date.now()}`,
    itemId,
    timelineId,
    body: body.trim(),
    createdAt: new Date().toISOString(),
    authorName,
    authorId,
  };
  let found = false;
  const next = notes.map((note) => {
    if (note.id !== parentId) return note;
    found = true;
    return {
      ...note,
      replies: [...(note.replies ?? []), reply],
    };
  });
  if (!found) return null;
  saveLocalTermNotes(itemId, timelineId, next);
  return reply;
}

export function shouldUseLocalTermNotes(itemId: string, isMockMode: boolean): boolean {
  return isMockMode || itemId.startsWith('mock-');
}
