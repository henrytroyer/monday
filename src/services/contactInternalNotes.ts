import { getTimelineLabel } from '../data/timelines';
import type {
  ContactInternalNote,
  ContactInternalNoteTarget,
} from '../types/contact';
import type { VolunteerTerm } from '../types/volunteer';
import { isRecruitmentServiceTerm } from './contactServiceRecordStorage';
import { isNoteReviewRegistryUpdate } from './noteReviewRegistryFormat';
import { isSuperMailUpdate } from './parseSuperMailUpdate';
import {
  isTermNoteUpdate,
  parseTermNotes,
  stripHtml,
  type MondayItemUpdateRaw,
} from './termNotes';

function isAutomationNoteAuthor(authorName?: string | null): boolean {
  if (!authorName?.trim()) return false;
  return authorName.trim().toLowerCase() === 'automation';
}

export const RECRUITMENT_NOTE_PREFIX = '[CRM_RECRUITMENT_NOTE';
export const CONTACT_HUB_NOTE_PREFIX = '[CRM_CONTACT_NOTE';

const RECRUITMENT_TAG_PATTERN =
  /^\[CRM_RECRUITMENT_NOTE\s+prospect=([^\]]+)\]\s*([\s\S]*)?$/;

const CONTACT_HUB_TAG_PATTERN =
  /^\[CRM_CONTACT_NOTE\s+source=(\w+)([^\]]*)\]\s*([\s\S]*)?$/;

const MIGRATED_PREFIX = 'crm-recruitment-notes-migrated:';

export function encodeContactHubNoteBody(
  target: ContactInternalNoteTarget,
  text: string,
): string {
  const trimmed = text.trim();
  if (target.kind === 'contact') {
    return `${CONTACT_HUB_NOTE_PREFIX} source=contact]\n${trimmed}`;
  }
  if (target.kind === 'recruitment') {
    return `${CONTACT_HUB_NOTE_PREFIX} source=recruitment prospect=${target.prospectId}]\n${trimmed}`;
  }
  return `${CONTACT_HUB_NOTE_PREFIX} source=term timeline=${target.timelineId} application=${target.itemId}]\n${trimmed}`;
}

/** @deprecated Use encodeContactHubNoteBody for new writes */
export function encodeRecruitmentNoteBody(
  prospectId: string,
  text: string,
): string {
  const trimmed = text.trim();
  return `${RECRUITMENT_NOTE_PREFIX} prospect=${prospectId}]\n${trimmed}`;
}

export function isRecruitmentNoteUpdate(text: string): boolean {
  const plain = stripHtml(text);
  return plain.startsWith(RECRUITMENT_NOTE_PREFIX);
}

export function parseRecruitmentTaggedBody(
  text: string,
): { prospectId: string; body: string } | null {
  const plain = stripHtml(text);
  const match = plain.match(RECRUITMENT_TAG_PATTERN);
  if (!match) return null;
  return {
    prospectId: match[1].trim(),
    body: (match[2] ?? '').trim(),
  };
}

export function isContactHubNoteUpdate(text: string): boolean {
  const plain = stripHtml(text);
  return plain.startsWith(CONTACT_HUB_NOTE_PREFIX);
}

/**
 * Free-text monday updates on the Contacts item (and their replies) belong in
 * Internal notes. Skip email logs, automation, and CRM registry markers.
 */
function shouldIncludePlainMondayUpdate(
  body: string,
  authorName?: string | null,
): boolean {
  if (!body.trim()) return false;
  if (isAutomationNoteAuthor(authorName)) return false;
  if (isSuperMailUpdate(body)) return false;
  if (isNoteReviewRegistryUpdate(body)) return false;
  if (isTermNoteUpdate(body)) return false;
  if (isRecruitmentNoteUpdate(body)) return false;
  if (isContactHubNoteUpdate(body)) return false;
  return true;
}

function pushPlainContactNote(
  notes: ContactInternalNote[],
  contactItemId: string,
  update: MondayItemUpdateRaw,
  body: string,
  sourceLabel = 'Contact',
): void {
  const trimmed = body.trim();
  if (!trimmed) return;
  notes.push({
    id: update.id,
    body: trimmed,
    createdAt: update.created_at,
    authorName: update.creator?.name ?? undefined,
    source: 'contact',
    sourceLabel,
    mondayItemId: contactItemId,
    visibility: 'public',
  });
}

function appendRepliesAsNotes(
  notes: ContactInternalNote[],
  contactItemId: string,
  update: MondayItemUpdateRaw,
): void {
  for (const reply of update.replies ?? []) {
    const replyBody = stripHtml(reply.text_body ?? '');
    if (isContactHubNoteUpdate(replyBody)) {
      const match = replyBody.match(CONTACT_HUB_TAG_PATTERN);
      const body = (match?.[3] ?? replyBody).trim();
      pushPlainContactNote(notes, contactItemId, reply, body, 'Contact · reply');
      continue;
    }
    if (!shouldIncludePlainMondayUpdate(replyBody, reply.creator?.name)) {
      continue;
    }
    pushPlainContactNote(
      notes,
      contactItemId,
      reply,
      replyBody,
      'Contact · reply',
    );
  }
}

export function parseContactHubNotes(
  contactItemId: string,
  updates: MondayItemUpdateRaw[] | undefined,
): ContactInternalNote[] {
  if (!updates?.length) return [];

  const notes: ContactInternalNote[] = [];

  for (const update of updates) {
    const plain = stripHtml(update.text_body ?? '');
    const match = plain.match(CONTACT_HUB_TAG_PATTERN);

    if (match) {
      const sourceKind = match[1].trim();
      const attrs = match[2] ?? '';
      const body = (match[3] ?? '').trim();

      if (sourceKind === 'recruitment') {
        const prospectMatch = attrs.match(/prospect=([^\s\]]+)/);
        const prospectId = prospectMatch?.[1]?.trim();
        notes.push({
          id: update.id,
          body,
          createdAt: update.created_at,
          authorName: update.creator?.name ?? undefined,
          source: 'recruitment',
          sourceLabel: 'Recruitment',
          recruitmentProspectId: prospectId,
          mondayItemId: contactItemId,
        });
        appendRepliesAsNotes(notes, contactItemId, update);
        continue;
      }

      if (sourceKind === 'contact') {
        notes.push({
          id: update.id,
          body,
          createdAt: update.created_at,
          authorName: update.creator?.name ?? undefined,
          source: 'contact',
          sourceLabel: 'Contact',
          mondayItemId: contactItemId,
          visibility: 'public',
        });
        appendRepliesAsNotes(notes, contactItemId, update);
        continue;
      }

      if (sourceKind === 'term') {
        const timelineMatch = attrs.match(/timeline=([^\s\]]+)/);
        const applicationMatch = attrs.match(/application=([^\s\]]+)/);
        const timelineId = timelineMatch?.[1]?.trim() ?? '';
        const applicationItemId = applicationMatch?.[1]?.trim();
        notes.push({
          id: update.id,
          body,
          createdAt: update.created_at,
          authorName: update.creator?.name ?? undefined,
          source: 'term',
          sourceLabel: getTimelineLabel(timelineId),
          timelineId,
          applicationItemId,
          mondayItemId: contactItemId,
        });
        appendRepliesAsNotes(notes, contactItemId, update);
        continue;
      }
    }

    // Untagged monday.com Updates on the contact item (typed in monday UI).
    if (
      shouldIncludePlainMondayUpdate(plain, update.creator?.name)
    ) {
      pushPlainContactNote(notes, contactItemId, update, plain);
      appendRepliesAsNotes(notes, contactItemId, update);
    }
  }

  return notes;
}

export function parseRecruitmentNotes(
  contactItemId: string,
  updates: MondayItemUpdateRaw[] | undefined,
): ContactInternalNote[] {
  if (!updates?.length) return [];

  const notes: ContactInternalNote[] = [];

  for (const update of updates) {
    const parsed = parseRecruitmentTaggedBody(update.text_body ?? '');
    if (!parsed) continue;

    notes.push({
      id: update.id,
      body: parsed.body,
      createdAt: update.created_at,
      authorName: update.creator?.name ?? undefined,
      source: 'recruitment',
      sourceLabel: 'Recruitment',
      recruitmentProspectId: parsed.prospectId,
      mondayItemId: contactItemId,
    });
  }

  return notes;
}

export function termNotesToContactInternalNotes(
  itemId: string,
  updates: MondayItemUpdateRaw[] | undefined,
  serviceTerms: VolunteerTerm[],
): ContactInternalNote[] {
  const termNotes = parseTermNotes(itemId, updates);
  const labelByTimeline = new Map<string, string>();

  for (const term of serviceTerms) {
    if (isRecruitmentServiceTerm(term)) continue;
    if (term.itemId !== itemId) continue;
    labelByTimeline.set(
      term.timelineId,
      term.timelineLabel || getTimelineLabel(term.timelineId),
    );
  }

  return termNotes.map((note) => ({
    id: note.id,
    body: note.body,
    createdAt: note.createdAt,
    authorName: note.authorName,
    source: 'term' as const,
    sourceLabel: `${
      labelByTimeline.get(note.timelineId) ??
      getTimelineLabel(note.timelineId)
    } (Applications legacy)`,
    timelineId: note.timelineId,
    applicationItemId: itemId,
    mondayItemId: itemId,
  }));
}

export function sortContactInternalNotesNewestFirst(
  notes: ContactInternalNote[],
): ContactInternalNote[] {
  return [...notes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function mergeContactInternalNotes(
  ...groups: ContactInternalNote[][]
): ContactInternalNote[] {
  const merged = sortContactInternalNotesNewestFirst(groups.flat());
  const seen = new Set<string>();
  return merged.filter((note) => {
    if (seen.has(note.id)) return false;
    seen.add(note.id);
    return true;
  });
}

export function recruitmentNotesMigratedKey(prospectId: string): string {
  return `${MIGRATED_PREFIX}${prospectId}`;
}

export function isRecruitmentNotesMigrated(prospectId: string): boolean {
  return localStorage.getItem(recruitmentNotesMigratedKey(prospectId)) === '1';
}

export function markRecruitmentNotesMigrated(prospectId: string): void {
  localStorage.setItem(recruitmentNotesMigratedKey(prospectId), '1');
}
