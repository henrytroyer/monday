/**
 * approvedHarvestNotes.ts — Surface approved Note-review harvest on contact Internal Notes.
 *
 * Free-text Monday updates are harvested into the review inbox. After approve they
 * must appear on the contact: mirror as a CRM-tagged update when writable, and
 * always merge approved links into the Internal Notes fetch as a fallback.
 */

import { canEditContacts, useMockData } from '../config/boards';
import type { ContactInternalNote } from '../types/contact';
import type { ApprovedNoteLink } from '../types/noteReview';
import { isCompiledContactId } from './compileContactsFromBoards';
import { addContactHubNoteOnContact } from './crmApi';
import { getApprovedNotesForContact } from './noteReviewStorage';

function noteFingerprint(createdAt: string, body: string): string {
  return `${createdAt}|${body.trim()}`;
}

/** Map approved harvest links into Internal Notes rows (deduped against existing). */
export function approvedNotesToContactInternalNotes(
  contactId: string,
  existing: ContactInternalNote[] = [],
): ContactInternalNote[] {
  const seen = new Set(
    existing.map((note) => noteFingerprint(note.createdAt, note.body)),
  );

  const notes: ContactInternalNote[] = [];
  for (const link of getApprovedNotesForContact(contactId)) {
    const body = link.body.trim();
    if (!body) continue;
    const key = noteFingerprint(link.createdAt, body);
    if (seen.has(key)) continue;
    seen.add(key);
    notes.push({
      id: `approved:${link.noteKey}`,
      body,
      bodyHtml: link.bodyHtml,
      createdAt: link.createdAt,
      authorName: link.authorName,
      source: 'contact',
      sourceLabel: link.sourceLabel?.trim() || 'Monday',
      mondayItemId: contactId,
    });
  }
  return notes;
}

/**
 * Copy an approved harvest note onto the Contacts item as a CRM hub note so
 * Internal Notes (and other clients) can read it via the normal Monday update path.
 */
export async function mirrorApprovedNoteToContact(
  link: ApprovedNoteLink,
): Promise<void> {
  if (useMockData()) return;
  if (!canEditContacts()) return;
  if (isCompiledContactId(link.contactId)) return;

  const body = link.body.trim();
  if (!body) return;

  await addContactHubNoteOnContact(
    link.contactId,
    { kind: 'contact', sourceLabel: 'Contact' },
    body,
  );
}
