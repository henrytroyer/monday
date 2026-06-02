import type { TermNote } from '../types/volunteer';

export const TERM_NOTE_PREFIX = '[CRM_TERM_NOTE';

const TAG_PATTERN = /^\[CRM_TERM_NOTE\s+timeline=([^\]]+)\]\s*([\s\S]*)?$/;

export interface MondayItemUpdateRaw {
  id: string;
  text_body: string;
  created_at: string;
  creator?: { name?: string | null } | null;
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

    notes.push({
      id: update.id,
      itemId,
      timelineId: parsed.timelineId,
      body: parsed.body,
      createdAt: update.created_at,
      authorName: update.creator?.name ?? undefined,
    });
  }

  return notes.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
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
