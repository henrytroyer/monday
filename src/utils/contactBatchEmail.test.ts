import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ContactListItem } from '../types/contact';
import {
  contactEmailRecipients,
  formatContactFilterTagSummary,
  hasUsableContactEmail,
} from './contactBatchEmail';

describe('hasUsableContactEmail', () => {
  it('rejects placeholders and missing addresses', () => {
    assert.equal(hasUsableContactEmail(undefined), false);
    assert.equal(hasUsableContactEmail('—'), false);
    assert.equal(hasUsableContactEmail('not-an-email'), false);
    assert.equal(hasUsableContactEmail('a@example.com'), true);
  });
});

describe('contactEmailRecipients', () => {
  it('dedupes by email and skips unusable rows', () => {
    const contacts: ContactListItem[] = [
      {
        id: '1',
        name: 'Ann',
        email: 'ann@example.com',
        tags: ['donor'],
      },
      {
        id: '2',
        name: 'Ann Dup',
        email: 'ann@example.com',
        tags: ['volunteer'],
      },
      {
        id: '3',
        name: 'No Email',
        email: '—',
        tags: ['donor'],
      },
    ];
    const recipients = contactEmailRecipients(contacts);
    assert.equal(recipients.length, 1);
    assert.equal(recipients[0]!.email, 'ann@example.com');
  });
});

describe('formatContactFilterTagSummary', () => {
  it('joins selected tag labels', () => {
    assert.equal(
      formatContactFilterTagSummary(['volunteer', 'donor']),
      'Volunteer + Donor',
    );
  });
});
