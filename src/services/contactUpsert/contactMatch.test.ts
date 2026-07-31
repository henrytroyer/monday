import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ContactListItem } from '../../types/contact';
import {
  firstNamesFuzzyMatch,
  matchContact,
  normalizeEmail,
  normalizePhoneDigits,
} from './contactMatch';

function contact(
  partial: Partial<ContactListItem> & Pick<ContactListItem, 'id' | 'name'>,
): ContactListItem {
  return {
    email: '—',
    tags: [],
    ...partial,
  };
}

describe('normalizeEmail / phone', () => {
  it('normalizes email and rejects placeholders', () => {
    assert.equal(normalizeEmail('  A@B.com '), 'a@b.com');
    assert.equal(normalizeEmail('—'), null);
  });

  it('uses last 10 phone digits', () => {
    assert.equal(normalizePhoneDigits('+1 555 111 2222'), '5551112222');
    assert.equal(normalizePhoneDigits('555-111-2222'), '5551112222');
  });
});

describe('firstNamesFuzzyMatch', () => {
  it('matches Jonny ≈ Jonathan', () => {
    assert.equal(firstNamesFuzzyMatch('jonny', 'jonathan'), true);
    assert.equal(firstNamesFuzzyMatch('jon', 'jonathan'), true);
  });
});

describe('matchContact', () => {
  const list = [
    contact({
      id: '1',
      name: 'Jonathan Smith',
      email: 'jon@example.com',
      phone: '5551112222',
      tags: ['donor'],
    }),
    contact({
      id: '2',
      name: 'Jane Doe',
      email: 'jane@example.com',
      tags: ['volunteer'],
    }),
  ];

  it('matches by email', () => {
    const result = matchContact(
      { name: 'Other Name', email: 'jon@example.com' },
      list,
    );
    assert.equal(result.tier, 'email');
    assert.equal(result.match?.id, '1');
    assert.equal(result.needsReview, false);
  });

  it('matches exact unique name without email', () => {
    const result = matchContact({ name: 'Jane Doe' }, list);
    assert.equal(result.tier, 'exact_name');
    assert.equal(result.match?.id, '2');
  });

  it('queues fuzzy first-name + exact last for review', () => {
    const result = matchContact({ name: 'Jonny Smith' }, list);
    assert.equal(result.tier, 'fuzzy_name');
    assert.equal(result.needsReview, true);
    assert.equal(result.match, null);
    assert.equal(result.candidates[0]?.contact.id, '1');
  });

  it('returns none when no match', () => {
    const result = matchContact({ name: 'Totally New Person' }, list);
    assert.equal(result.tier, 'none');
    assert.equal(result.match, null);
  });
});
