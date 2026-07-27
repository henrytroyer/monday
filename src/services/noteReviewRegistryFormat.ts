import type { ApprovedNoteLink } from '../types/noteReview';
import { stripHtml } from './termNotes';

export const NOTE_REVIEW_REGISTRY_PREFIX = '[CRM_NOTE_REVIEW]';

export type NoteReviewRegistryEntry =
  | { action: 'approved'; link: ApprovedNoteLink }
  | { action: 'dismissed'; noteKey: string }
  | { action: 'baseline'; beforeIso: string };

export function isNoteReviewRegistryUpdate(text: string): boolean {
  return stripHtml(text).startsWith(NOTE_REVIEW_REGISTRY_PREFIX);
}

export function encodeNoteReviewRegistryBody(
  entry: NoteReviewRegistryEntry,
): string {
  return `${NOTE_REVIEW_REGISTRY_PREFIX}\n${JSON.stringify(entry)}`;
}

export function parseNoteReviewRegistryEntry(
  text: string,
): NoteReviewRegistryEntry | null {
  const plain = stripHtml(text).trim();
  if (!plain.startsWith(NOTE_REVIEW_REGISTRY_PREFIX)) return null;

  const jsonLine = plain
    .slice(NOTE_REVIEW_REGISTRY_PREFIX.length)
    .trim()
    .split('\n')
    .find((line) => line.trim().startsWith('{'));
  if (!jsonLine) return null;

  try {
    const parsed = JSON.parse(jsonLine) as NoteReviewRegistryEntry;
    if (parsed.action === 'dismissed' && typeof parsed.noteKey === 'string') {
      return parsed;
    }
    if (parsed.action === 'baseline' && typeof parsed.beforeIso === 'string') {
      return parsed;
    }
    if (
      parsed.action === 'approved' &&
      parsed.link &&
      typeof parsed.link.noteKey === 'string'
    ) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

export function parseNoteReviewRegistryUpdates(
  updates: Array<{ text_body?: string; created_at: string }> | undefined,
): {
  approved: ApprovedNoteLink[];
  dismissed: string[];
  baselineBeforeIso: string | null;
} {
  const approvedByKey = new Map<string, ApprovedNoteLink>();
  const dismissed = new Set<string>();
  let baselineBeforeIso: string | null = null;

  if (!updates?.length) {
    return { approved: [], dismissed: [], baselineBeforeIso: null };
  }

  const sorted = [...updates].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  for (const update of sorted) {
    const entry = parseNoteReviewRegistryEntry(update.text_body ?? '');
    if (!entry) continue;
    if (entry.action === 'approved') {
      approvedByKey.set(entry.link.noteKey, entry.link);
      dismissed.delete(entry.link.noteKey);
      continue;
    }
    if (entry.action === 'dismissed') {
      dismissed.add(entry.noteKey);
      approvedByKey.delete(entry.noteKey);
      continue;
    }
    baselineBeforeIso = entry.beforeIso;
  }

  return {
    approved: [...approvedByKey.values()],
    dismissed: [...dismissed],
    baselineBeforeIso,
  };
}
