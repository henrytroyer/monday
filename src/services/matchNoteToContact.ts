import { resolveBoardRole } from '../config/boards';
import { getTimelineLabel } from '../data/timelines';
import {
  isRecruitmentNoteUpdate,
  parseRecruitmentTaggedBody,
} from './contactInternalNotes';
import type { ContactMatchIndex } from './contactNoteIndex';
import { boardRoleLabel } from './contactNoteIndex';
import { stripHtml, TERM_NOTE_PREFIX } from './termNotes';

const TERM_TAG_PATTERN =
  /^\[CRM_TERM_NOTE\s+timeline=([^\]]+)\]\s*([\s\S]*)?$/;

export interface RawMondayNote {
  boardId: string;
  boardName: string;
  itemId: string;
  itemName: string;
  updateId: string;
  body: string;
  createdAt: string;
  authorName?: string;
}

export type NoteMatchReason =
  | 'contacts_item'
  | 'board_relation'
  | 'email_exact'
  | 'crm_tag_recruitment'
  | 'crm_tag_term';

export interface NoteMatchResult {
  matched: boolean;
  contactId?: string;
  contactName?: string;
  matchReason?: NoteMatchReason;
  sourceLabel?: string;
  rejectReason?: string;
}

function parseTermTaggedBody(
  text: string,
): { timelineId: string; body: string } | null {
  const plain = stripHtml(text);
  const match = plain.match(TERM_TAG_PATTERN);
  if (!match) return null;
  return {
    timelineId: match[1].trim(),
    body: (match[2] ?? '').trim(),
  };
}

function isCrmStructuredNote(text: string): boolean {
  const plain = stripHtml(text);
  return (
    plain.startsWith(TERM_NOTE_PREFIX) ||
    isRecruitmentNoteUpdate(text) ||
    plain.startsWith('[CRM_CONTACT_NOTE')
  );
}

export function matchNoteToContact(
  note: RawMondayNote,
  index: ContactMatchIndex,
): NoteMatchResult {
  const role = resolveBoardRole(note.boardId);

  if (role === 'contacts' && index.contactsById.has(note.itemId)) {
    const contact = index.contactsById.get(note.itemId)!;
    return {
      matched: true,
      contactId: contact.id,
      contactName: contact.name,
      matchReason: 'contacts_item',
      sourceLabel: `${boardRoleLabel(note.boardId)} · ${contact.name}`,
    };
  }

  const recruitmentTag = parseRecruitmentTaggedBody(note.body);
  if (recruitmentTag) {
    const contactId = index.prospectToContact.get(recruitmentTag.prospectId);
    if (contactId) {
      const contact = index.contactsById.get(contactId);
      return {
        matched: true,
        contactId,
        contactName: contact?.name,
        matchReason: 'crm_tag_recruitment',
        sourceLabel: 'Recruitment',
      };
    }
    return {
      matched: false,
      rejectReason: 'Recruitment tag with unknown prospect id',
    };
  }

  const termTag = parseTermTaggedBody(note.body);
  if (termTag) {
    const contactId = index.applicationToContact.get(note.itemId);
    if (contactId) {
      const contact = index.contactsById.get(contactId);
      return {
        matched: true,
        contactId,
        contactName: contact?.name,
        matchReason: 'crm_tag_term',
        sourceLabel: getTimelineLabel(termTag.timelineId),
      };
    }
    return {
      matched: false,
      rejectReason: 'Term tag on application not linked to a contact',
    };
  }

  const relationContactId = index.applicationToContact.get(note.itemId);
  if (relationContactId) {
    const contact = index.contactsById.get(relationContactId);
    return {
      matched: true,
      contactId: relationContactId,
      contactName: contact?.name,
      matchReason: 'board_relation',
      sourceLabel: `${boardRoleLabel(note.boardId)} · ${note.itemName}`,
    };
  }

  if (isCrmStructuredNote(note.body)) {
    return {
      matched: false,
      rejectReason: 'Structured CRM note without resolvable contact link',
    };
  }

  return {
    matched: false,
    rejectReason: 'No strict contact match (relation, email, or CRM tag)',
  };
}

export function matchApplicationNoteByEmail(
  note: RawMondayNote,
  itemEmail: string | undefined,
  index: ContactMatchIndex,
): NoteMatchResult | null {
  if (!itemEmail || itemEmail === '—') return null;
  const normalized = itemEmail.trim().toLowerCase();
  const contact = index.contactByEmail.get(normalized);
  if (!contact) return null;

  return {
    matched: true,
    contactId: contact.id,
    contactName: contact.name,
    matchReason: 'email_exact',
    sourceLabel: `${boardRoleLabel(note.boardId)} · ${note.itemName}`,
  };
}

export function resolveContactForHarvest(
  note: RawMondayNote,
  index: ContactMatchIndex,
  itemEmail?: string,
): NoteMatchResult {
  const primary = matchNoteToContact(note, index);
  if (primary.matched) return primary;

  if (resolveBoardRole(note.boardId) === 'applications') {
    const emailMatch = matchApplicationNoteByEmail(note, itemEmail, index);
    if (emailMatch?.matched) return emailMatch;
  }

  return primary;
}
