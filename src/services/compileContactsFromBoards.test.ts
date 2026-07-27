import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  compileContactsFromBoards,
  isCompiledContactId,
} from './compileContactsFromBoards';
import type { MondayBoardItem } from './mapMondayToCrm';

function col(title: string, text: string) {
  return {
    id: title.toLowerCase().replace(/\s+/g, '_'),
    text,
    value: null,
    type: 'text',
    column: { title },
  };
}

describe('compileContactsFromBoards', () => {
  it('merges donor + volunteer roles onto one contact by email', () => {
    const result = compileContactsFromBoards({
      contacts: [
        {
          id: 'c1',
          name: 'Jane Doe',
          email: 'jane@example.com',
          tags: ['volunteer'],
        },
      ],
      donationItems: [
        {
          id: 'd1',
          name: 'Jane Doe',
          column_values: [
            col('Donor Email', 'jane@example.com'),
            col('Name', 'Jane Doe'),
          ],
        } as unknown as MondayBoardItem,
      ],
    });

    assert.equal(result.contacts.length, 1);
    assert.deepEqual(result.contacts[0]!.tags.sort(), ['donor', 'volunteer']);
    assert.equal(result.contacts[0]!.id, 'c1');
  });

  it('adds people found only on other boards as compiled contacts', () => {
    const result = compileContactsFromBoards({
      contacts: [],
      shortTermApplications: [
        {
          id: 'app-1',
          name: 'Sam Volunteer',
          column_values: [col('Email', 'sam@example.com')],
        } as unknown as MondayBoardItem,
      ],
    });

    const sam = result.contacts.find((c) => c.email === 'sam@example.com');
    assert.ok(sam);
    assert.ok(isCompiledContactId(sam!.id));
    assert.ok(sam!.tags.includes('volunteer'));
  });

  it('pulls parent/pastor from short-term apps with default column titles', () => {
    const result = compileContactsFromBoards({
      contacts: [],
      shortTermApplications: [
        {
          id: 'app-1',
          name: 'Kid',
          column_values: [
            col('Email', 'kid@example.com'),
            col('Parent Email', 'parent@example.com'),
            col('Pastor Email', 'pastor@example.com'),
          ],
        } as unknown as MondayBoardItem,
      ],
      serviceEndedItems: [
        {
          id: 'ended-1',
          name: 'Alumni',
          column_values: [col('Email Address', 'alumni@example.com')],
        } as unknown as MondayBoardItem,
      ],
      longTermApplications: [
        {
          id: 'lt-1',
          name: 'Long Termer',
          column_values: [
            col('Your Email', 'lt@example.com'),
            col('Your Phone Number', '+1 555 000 1111'),
          ],
        } as unknown as MondayBoardItem,
      ],
    });

    const emails = result.contacts.map((c) => c.email).sort();
    assert.deepEqual(emails, [
      'alumni@example.com',
      'kid@example.com',
      'lt@example.com',
      'parent@example.com',
      'pastor@example.com',
    ]);
    assert.ok(
      result.contacts.find((c) => c.email === 'parent@example.com')?.tags.includes(
        'parent',
      ),
    );
    assert.ok(
      result.contacts.find((c) => c.email === 'pastor@example.com')?.tags.includes(
        'pastor',
      ),
    );
    assert.equal(
      result.contacts.find((c) => c.email === 'lt@example.com')?.phone,
      '+1 555 000 1111',
    );
  });

  it('mass-compiles short-term street address onto the contact list demographics', () => {
    const result = compileContactsFromBoards({
      contacts: [
        {
          id: 'c1',
          name: 'Sam Volunteer',
          email: 'sam@example.com',
          tags: ['volunteer'],
          demographics: { city: 'Portland', state: 'OR' },
        },
      ],
      shortTermApplications: [
        {
          id: 'app-1',
          name: 'Sam Volunteer',
          column_values: [
            col('Email', 'sam@example.com'),
            col('Street', '123 Oak Street'),
            col('City', 'Portland'),
            col('State', 'OR'),
            col('Postal Code', '97201'),
            col('Country', 'United States'),
          ],
        } as unknown as MondayBoardItem,
      ],
    });

    assert.equal(result.contacts.length, 1);
    assert.equal(result.contacts[0]!.demographics?.address, '123 Oak Street');
    assert.equal(result.contacts[0]!.demographics?.zip, '97201');
    assert.equal(result.stats.withStreetAddress, 1);
  });

  it('combines same person by name + phone across different emails', () => {
    const result = compileContactsFromBoards({
      contacts: [
        {
          id: 'c1',
          name: 'Alex Smith',
          email: 'alex@example.com',
          phone: '+1 555 111 2222',
          tags: ['volunteer'],
          demographics: { address: '10 Main St', city: 'Boise', state: 'ID' },
        },
      ],
      donationItems: [
        {
          id: 'd1',
          name: 'Alex Smith',
          column_values: [
            col('Donor Email', 'alex.donor@example.com'),
            col('Name', 'Alex Smith'),
          ],
        } as unknown as MondayBoardItem,
      ],
      shortTermApplications: [
        {
          id: 'app-1',
          name: 'Alex Smith',
          column_values: [
            col('Email', 'alex.donor@example.com'),
            col('Phone', '555-111-2222'),
            col('Street', '10 Main St'),
            col('City', 'Boise'),
            col('State', 'ID'),
            col('Postal Code', '83702'),
          ],
        } as unknown as MondayBoardItem,
      ],
    });

    assert.equal(result.contacts.length, 1);
    assert.equal(result.contacts[0]!.id, 'c1');
    assert.ok(result.contacts[0]!.tags.includes('donor'));
    assert.ok(result.contacts[0]!.tags.includes('volunteer'));
    assert.equal(result.contacts[0]!.demographics?.zip, '83702');
    assert.ok(result.stats.mergedDuplicates >= 1);
  });

  it('keeps volunteers without email so tag filters still include them', () => {
    const result = compileContactsFromBoards({
      contacts: [],
      shortTermApplications: [
        {
          id: 'app-no-email',
          name: 'No Email Volunteer',
          column_values: [
            col('Street', '12 Maple Ave'),
            col('City', 'Eugene'),
            col('State', 'OR'),
          ],
        } as unknown as MondayBoardItem,
      ],
    });

    assert.equal(result.contacts.length, 1);
    assert.equal(result.contacts[0]!.email, '—');
    assert.ok(result.contacts[0]!.tags.includes('volunteer'));
    assert.equal(result.contacts[0]!.demographics?.address, '12 Maple Ave');
  });

  it('folds a no-email Contacts row into the unique matching emailed contact', () => {
    const result = compileContactsFromBoards({
      contacts: [
        {
          id: 'c-orphan',
          name: 'Pat Lee',
          email: '—',
          tags: [],
          demographics: { address: '9 Pine Rd', city: 'Salem', state: 'OR' },
        },
        {
          id: 'c-email',
          name: 'Pat Lee',
          email: 'pat@example.com',
          tags: ['volunteer'],
        },
      ],
    });

    assert.equal(result.contacts.length, 1);
    assert.equal(result.contacts[0]!.id, 'c-email');
    assert.equal(result.contacts[0]!.demographics?.address, '9 Pine Rd');
  });
});
