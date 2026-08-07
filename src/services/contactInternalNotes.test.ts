import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseContactHubNotes } from './contactInternalNotes.ts';

describe('parseContactHubNotes', () => {
  it('includes CRM-tagged contact notes', () => {
    const notes = parseContactHubNotes('c1', [
      {
        id: 'u1',
        text_body: '[CRM_CONTACT_NOTE source=contact]\nthis is a public note',
        created_at: '2026-08-07T11:50:00Z',
        creator: { name: 'Henry Troyer' },
      },
    ]);
    assert.equal(notes.length, 1);
    assert.equal(notes[0]?.body, 'this is a public note');
    assert.equal(notes[0]?.sourceLabel, 'Contact');
  });

  it('includes untagged monday Updates written on the contact item', () => {
    const notes = parseContactHubNotes('c1', [
      {
        id: 'u2',
        text_body: 'this is for the portal',
        created_at: '2026-08-07T12:55:00Z',
        creator: { name: 'Paul' },
      },
    ]);
    assert.equal(notes.length, 1);
    assert.equal(notes[0]?.body, 'this is for the portal');
    assert.equal(notes[0]?.authorName, 'Paul');
    assert.equal(notes[0]?.visibility, 'public');
  });

  it('includes replies on CRM notes and plain updates', () => {
    const notes = parseContactHubNotes('c1', [
      {
        id: 'u3',
        text_body: '[CRM_CONTACT_NOTE source=contact]\nthis is a public note',
        created_at: '2026-08-07T11:50:00Z',
        creator: { name: 'Henry Troyer' },
        replies: [
          {
            id: 'r1',
            text_body: 'this is a note for the portal',
            created_at: '2026-08-07T12:00:00Z',
            creator: { name: 'Paul' },
          },
        ],
      },
    ]);
    assert.equal(notes.length, 2);
    assert.ok(notes.some((n) => n.body === 'this is a public note'));
    const reply = notes.find((n) => n.id === 'r1');
    assert.equal(reply?.body, 'this is a note for the portal');
    assert.equal(reply?.sourceLabel, 'Contact · reply');
  });

  it('skips SuperMail and automation updates', () => {
    const notes = parseContactHubNotes('c1', [
      {
        id: 'u4',
        text_body: '<b>Outgoing SuperMail</b><br>Body',
        created_at: '2026-08-07T12:00:00Z',
        creator: { name: 'Henry' },
      },
      {
        id: 'u5',
        text_body: 'Status moved automatically',
        created_at: '2026-08-07T12:01:00Z',
        creator: { name: 'Automation' },
      },
    ]);
    assert.equal(notes.length, 0);
  });
});
