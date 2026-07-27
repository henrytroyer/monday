import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { ContactMatchIndex } from './contactNoteIndex.ts';
import {
  matchNoteByBodyName,
  matchNoteByItemName,
  matchNoteByRecipientEmail,
  matchNoteToContact,
  resolveContactForHarvest,
  type RawMondayNote,
} from './matchNoteToContact.ts';
import type { ContactListItem } from '../types/contact.ts';

const KARA: ContactListItem = {
  id: 'contact-kara',
  name: 'Kara Weaver',
  email: 'karabrynn28@gmail.com',
  tags: [],
};

const JOHN_A: ContactListItem = {
  id: 'contact-john-a',
  name: 'John Smith',
  email: 'john.a@example.com',
  tags: [],
};

const JOHN_B: ContactListItem = {
  id: 'contact-john-b',
  name: 'John Smith',
  email: 'john.b@example.com',
  tags: [],
};

function buildIndex(contacts: ContactListItem[]): ContactMatchIndex {
  const contactsById = new Map(contacts.map((c) => [c.id, c]));
  const contactByEmail = new Map(
    contacts
      .filter((c) => c.email && c.email !== '—')
      .map((c) => [c.email.toLowerCase(), c]),
  );
  const contactByNormalizedName = new Map<string, ContactListItem[]>();
  for (const contact of contacts) {
    const key = contact.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ');
    const existing = contactByNormalizedName.get(key) ?? [];
    existing.push(contact);
    contactByNormalizedName.set(key, existing);
  }

  return {
    contactsById,
    contactByEmail,
    contactByNormalizedName,
    applicationToContact: new Map([['app-kara', 'contact-kara']]),
    prospectToContact: new Map(),
    applicationEmails: new Map([['app-kara-unlinked', 'other@example.com']]),
  };
}

function baseNote(overrides: Partial<RawMondayNote> = {}): RawMondayNote {
  return {
    boardId: 'apps-board',
    boardName: 'Volunteer Service - Short Term',
    itemId: 'app-kara-unlinked',
    itemName: 'Kara Weaver',
    updateId: 'update-1',
    body: '',
    createdAt: '2026-07-23T10:17:59.000Z',
    ...overrides,
  };
}

const KARA_SUPERMAIL = `<span><u><b>Outgoing SuperMail</b></u></span><br><br><span><b>Sent at:</b> Monday, July 27, 2026, 10:51:16 UTC<br><span><b>from:</b> <a>info@i58global.org</a><br><span><b>to:</b> <a>karabrynn28@gmail.com</a></span><br><span><b>Subject:</b> i58Global Child Safeguarding</span><br><span><b>Body:</b></span><br><p>Hello Kara,</p>`;

const KARA_OUTGOING_EMAIL = `<span><u><b>Outgoing Email</b></u></span><br><br><span><b>Sent At:</b> Thursday, July 23rd 2026, 10:17:59 UTC<br><span><b>From:</b> lesvos@i58global.org<br><span><b>To:</b> mlehman@i58global.org<br><span><b>Subject:</b> Camp Registration Reminder</span><br><span><b>Body:</b></span><br><p>Kara Weaver is marked for Lesvos.</p>`;

describe('matchNoteToContact name and recipient matching', () => {
  const index = buildIndex([KARA, JOHN_A, JOHN_B]);

  it('matches Kara SuperMail by recipient email', () => {
    const note = baseNote({ body: KARA_SUPERMAIL });
    const match = matchNoteByRecipientEmail(note, index);
    assert.ok(match?.matched);
    assert.equal(match?.matchReason, 'email_recipient');
    assert.equal(match?.contactId, 'contact-kara');
  });

  it('matches Kara Camp Registration by item name', () => {
    const note = baseNote({ body: KARA_OUTGOING_EMAIL });
    const match = matchNoteByItemName(note, index);
    assert.ok(match?.matched);
    assert.equal(match?.matchReason, 'name_item');
    assert.equal(match?.contactId, 'contact-kara');
  });

  it('matches Kara Camp Registration by full name in email body', () => {
    const note = baseNote({
      itemName: 'Unknown Item',
      body: KARA_OUTGOING_EMAIL,
    });
    const match = matchNoteByBodyName(note, index);
    assert.ok(match?.matched);
    assert.equal(match?.matchReason, 'name_body');
    assert.equal(match?.contactId, 'contact-kara');
  });

  it('does not match first-name-only salutation without full name', () => {
    const note = baseNote({
      itemName: 'Unknown Item',
      body: `<p>Hello Kara,</p>`,
    });
    const match = matchNoteByBodyName(note, index);
    assert.equal(match, null);
  });

  it('skips ambiguous duplicate contact names', () => {
    const note = baseNote({ itemName: 'John Smith', body: 'Some note' });
    const match = matchNoteByItemName(note, index);
    assert.equal(match, null);
  });

  it('resolveContactForHarvest prefers board relation over name match', () => {
    const note = baseNote({
      itemId: 'app-kara',
      body: 'Regular note',
    });
    const match = resolveContactForHarvest(note, index);
    assert.ok(match.matched);
    assert.equal(match.matchReason, 'board_relation');
  });

  it('resolveContactForHarvest falls back to name_item when unlinked', () => {
    const note = baseNote({ body: KARA_OUTGOING_EMAIL });
    const match = resolveContactForHarvest(note, index);
    assert.ok(match.matched);
    assert.equal(match.matchReason, 'name_item');
  });

  it('resolveContactForHarvest falls back to email_recipient for SuperMail', () => {
    const note = baseNote({ body: KARA_SUPERMAIL });
    const match = resolveContactForHarvest(note, index);
    assert.ok(match.matched);
    assert.equal(match.matchReason, 'email_recipient');
  });

  it('returns no match when nothing resolves', () => {
    const note = baseNote({
      itemName: 'Nobody Here',
      body: 'Generic coordinator note',
    });
    const match = matchNoteToContact(note, index);
    assert.equal(match.matched, false);
    assert.match(match.rejectReason ?? '', /No strict contact match/);
  });
});
