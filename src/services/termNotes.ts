/**
 * termNotes.ts — Encode/parse CRM term-scoped internal notes on monday updates.
 */

import type { TermNote } from '../types/volunteer';

export const TERM_NOTE_PREFIX = '[CRM_TERM_NOTE';

const TAG_PATTERN = /^\[CRM_TERM_NOTE\s+timeline=([^\]]+)\]\s*([\s\S]*)?$/;

export interface MondayItemUpdateRaw {
  id: string;
  text_body: string;
  created_at: string;
  creator?: { id?: string | null; name?: string | null } | null;
  replies?: MondayItemUpdateRaw[] | null;
}

export function encodeTermNoteBody(timelineId: string, text: string): string {
  const trimmed = text.trim();
  return `${TERM_NOTE_PREFIX} timeline=${timelineId}]\n${trimmed}`;
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function isTermNoteUpdate(text: string): boolean {
  const plain = stripHtml(text);
  return plain.startsWith(TERM_NOTE_PREFIX);
}

function parseTaggedBody(text: string): { timelineId: string; body: string } | null {
  const plain = stripHtml(text);
  const match = plain.match(TAG_PATTERN);
  if (!match) return null;
  return {
    timelineId: match[1].trim(),
    body: (match[2] ?? '').trim(),
  };
}

function mapReply(
  itemId: string,
  timelineId: string,
  reply: MondayItemUpdateRaw,
): TermNote {
  return {
    id: reply.id,
    itemId,
    timelineId,
    body: stripHtml(reply.text_body ?? ''),
    createdAt: reply.created_at,
    authorName: reply.creator?.name ?? undefined,
    authorId: reply.creator?.id != null ? String(reply.creator.id) : undefined,
  };
}

export function parseTermNotes(
  itemId: string,
  updates: MondayItemUpdateRaw[] | undefined,
  filterTimelineId?: string,
): TermNote[] {
  if (!updates?.length) return [];

  const notes: TermNote[] = [];

  for (const update of updates) {
    const parsed = parseTaggedBody(update.text_body ?? '');
    if (!parsed) continue;
    if (filterTimelineId && parsed.timelineId !== filterTimelineId) continue;

    const replies = (update.replies ?? [])
      .map((reply) => mapReply(itemId, parsed.timelineId, reply))
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

    notes.push({
      id: update.id,
      itemId,
      timelineId: parsed.timelineId,
      body: parsed.body,
      createdAt: update.created_at,
      authorName: update.creator?.name ?? undefined,
      authorId:
        update.creator?.id != null ? String(update.creator.id) : undefined,
      replies: replies.length > 0 ? replies : undefined,
    });
  }

  return notes.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

/** True when this note was authored by the signed-in monday user. */
export function isOwnTermNote(
  note: Pick<TermNote, 'authorId' | 'authorName'>,
  user: { id?: string | null; name?: string | null } | null | undefined,
): boolean {
  if (!user) return false;
  if (note.authorId && user.id) {
    return String(note.authorId) === String(user.id);
  }
  if (note.authorName?.trim() && user.name?.trim()) {
    return (
      note.authorName.trim().toLowerCase() === user.name.trim().toLowerCase()
    );
  }
  return false;
}

export function formatNoteTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
