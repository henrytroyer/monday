import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ContactListItem } from '../types/contact';
import { emptyContactFilters } from '../types/contact';
import { filterContacts } from './filterContacts';

const contacts: ContactListItem[] = [
  {
    id: '1',
    name: 'Volunteer Donor',
    email: 'vd@example.com',
    tags: ['volunteer', 'donor'],
  },
  {
    id: '2',
    name: 'Volunteer Only',
    email: 'v@example.com',
    tags: ['volunteer'],
  },
  {
    id: '3',
    name: 'Donor Only',
    email: 'd@example.com',
    tags: ['donor'],
  },
  {
    id: '4',
    name: 'Pastor Donor Parent',
    email: 'pdp@example.com',
    tags: ['pastor', 'donor', 'parent'],
  },
];

describe('filterContacts search hints', () => {
  it('matches volunteer when searching a linked pastor name', () => {
    const withPastor: ContactListItem[] = [
      {
        id: 'v1',
        name: 'Volunteer One',
        email: 'v1@example.com',
        tags: ['volunteer'],
        pastorName: 'Pastor Pat',
        connectedTo: 'Pastor Pat, Couple: Volunteer One & Spouse Two',
        searchHints: 'Pastor Pat Couple: Volunteer One & Spouse Two',
      },
    ];
    const filtered = filterContacts(withPastor, {
      ...emptyContactFilters(),
      searchQuery: 'pastor pat',
    });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.id, 'v1');
  });
});

describe('filterContacts tag AND semantics', () => {
  it('returns contacts that have every selected tag', () => {
    const filtered = filterContacts(contacts, {
      ...emptyContactFilters(),
      tags: ['volunteer', 'donor'],
    });
    assert.deepEqual(
      filtered.map((contact) => contact.id),
      ['1'],
    );
  });

  it('requires all three tags when three are selected', () => {
    const filtered = filterContacts(contacts, {
      ...emptyContactFilters(),
      tags: ['pastor', 'donor', 'parent'],
    });
    assert.deepEqual(
      filtered.map((contact) => contact.id),
      ['4'],
    );
  });

  it('with a single tag still matches anyone who has it', () => {
    const filtered = filterContacts(contacts, {
      ...emptyContactFilters(),
      tags: ['donor'],
    });
    assert.deepEqual(
      filtered.map((contact) => contact.id).sort(),
      ['1', '3', '4'],
    );
  });

  it('includes contacts with no email when filtering by tag', () => {
    const filtered = filterContacts(
      [
        ...contacts,
        {
          id: 'no-email',
          name: 'No Email Donor',
          email: '—',
          tags: ['donor'],
        },
      ],
      {
        ...emptyContactFilters(),
        tags: ['donor'],
      },
    );
    assert.ok(filtered.some((contact) => contact.id === 'no-email'));
  });
});
