import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  encodeTermNoteBody,
  isOwnTermNote,
  parseTermNotes,
} from './termNotes';

describe('parseTermNotes', () => {
  it('keeps author id and nested replies on tagged notes', () => {
    const notes = parseTermNotes(
      'item-1',
      [
        {
          id: 'u1',
          text_body: encodeTermNoteBody('summer-2026', 'Parent note'),
          created_at: '2026-07-01T10:00:00.000Z',
          creator: { id: '42', name: 'Henry Troyer' },
          replies: [
            {
              id: 'r1',
              text_body: 'Thanks for the update',
              created_at: '2026-07-01T11:00:00.000Z',
              creator: { id: '99', name: 'Camille' },
            },
          ],
        },
        {
          id: 'u2',
          text_body: 'Not a CRM term note',
          created_at: '2026-07-01T12:00:00.000Z',
          creator: { id: '1', name: 'Other' },
        },
      ],
      'summer-2026',
    );

    assert.equal(notes.length, 1);
    assert.equal(notes[0]?.authorId, '42');
    assert.equal(notes[0]?.body, 'Parent note');
    assert.equal(notes[0]?.replies?.length, 1);
    assert.equal(notes[0]?.replies?.[0]?.authorId, '99');
    assert.equal(notes[0]?.replies?.[0]?.body, 'Thanks for the update');
  });
});

describe('isOwnTermNote', () => {
  it('matches by author id first', () => {
    assert.equal(
      isOwnTermNote(
        { authorId: '42', authorName: 'Henry Troyer' },
        { id: '42', name: 'Someone Else' },
      ),
      true,
    );
  });

  it('falls back to author name when ids are missing', () => {
    assert.equal(
      isOwnTermNote(
        { authorName: 'Henry Troyer' },
        { id: '', name: 'Henry Troyer' },
      ),
      true,
    );
    assert.equal(
      isOwnTermNote(
        { authorName: 'Henry Troyer' },
        { id: '7', name: 'Camille' },
      ),
      false,
    );
  });
});
