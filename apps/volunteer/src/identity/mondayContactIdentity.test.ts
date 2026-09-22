import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { VolunteerProfile } from './profile.ts';
import {
  mergedAltEmail,
  runContactIdentity,
  type MondayColumn,
  type MondayGraphql,
  type MondayItem,
} from './mondayContactIdentity.ts';

const profile: VolunteerProfile = {
  fullName: 'Jane Miller',
  dateOfBirth: '1994-04-02',
  phone: '5550101212',
  street: '10 Oak Street',
  city: 'Lancaster',
  state: 'PA',
  zip: '17601',
  country: 'USA',
};

const columns: MondayColumn[] = [
  { id: 'email', title: 'Email', type: 'email' },
  { id: 'alt', title: 'Alt Email', type: 'text' },
  { id: 'phone', title: 'Phone', type: 'phone' },
  { id: 'street', title: 'Street', type: 'text' },
  { id: 'city', title: 'City', type: 'text' },
  { id: 'state', title: 'State/Providence', type: 'text' },
  { id: 'zip', title: 'Zip Code', type: 'text' },
  { id: 'country', title: 'Country', type: 'text' },
  { id: 'dob', title: 'Date of birth', type: 'date' },
  { id: 'tags', title: 'Tags', type: 'status', settings_str: JSON.stringify({ limit_select: 0 }) },
];

function item(
  overrides: Partial<MondayItem> & { email?: string; phone?: string; city?: string; altEmail?: string },
): MondayItem {
  return {
    id: overrides.id ?? '1',
    name: overrides.name ?? 'Jane Miller',
    column_values: [
      { id: 'email', text: overrides.email ?? '' },
      { id: 'alt', text: overrides.altEmail ?? '' },
      { id: 'phone', text: overrides.phone ?? '' },
      { id: 'street', text: '1 Main' },
      { id: 'city', text: overrides.city ?? 'Lancaster' },
      { id: 'state', text: 'PA' },
      { id: 'zip', text: '17601' },
      { id: 'country', text: 'USA' },
      { id: 'dob', text: '1994-04-02' },
    ],
  };
}

function fakeGraphql(itemsFor: (columnId: string) => MondayItem[]): {
  graphql: MondayGraphql;
  mutations: string[];
} {
  const mutations: string[] = [];
  const graphql: MondayGraphql = async (query, variables) => {
    if (query.includes('VolunteerIdentityColumns')) {
      return { boards: [{ columns }] };
    }
    if (query.includes('VolunteerIdentitySearch')) {
      const columnId = String(variables?.columnId ?? '');
      return { boards: [{ items_page: { items: itemsFor(columnId) } }] };
    }
    if (query.includes('VolunteerIdentityCreate')) {
      mutations.push('create');
      return { create_item: { id: 'new-1', name: profile.fullName } };
    }
    if (query.includes('VolunteerIdentityUpdate')) {
      mutations.push(`update:${String(variables?.itemId)}`);
      const written = JSON.parse(String(variables?.columnValues)) as Record<string, unknown>;
      mutations.push(`columns:${Object.keys(written).sort().join(',')}`);
      return { change_multiple_column_values: { id: variables?.itemId } };
    }
    if (query.includes('VolunteerIdentityRename')) {
      mutations.push('rename');
      return { change_simple_column_value: { id: variables?.itemId } };
    }
    throw new Error(`unexpected query ${query.slice(0, 40)}`);
  };
  return { graphql, mutations };
}

describe('runContactIdentity', () => {
  it('creates a contact with email, address, and the volunteer tag', async () => {
    const fake = fakeGraphql(() => []);
    const result = await runContactIdentity({
      graphql: fake.graphql,
      boardId: '2463183745',
      email: 'Jane@Example.com',
      profile,
    });
    assert.equal(result.status, 'created');
    assert.equal(result.email, 'jane@example.com');
    assert.ok(fake.mutations.includes('create'));
    const columnsWritten = fake.mutations.find((entry) => entry.startsWith('columns:'));
    assert.equal(columnsWritten, 'columns:city,country,dob,email,phone,state,street,tags,zip');
  });

  it('writes the Type dropdown when the board has no Tags column', async () => {
    const withoutTags = columns.filter((column) => column.id !== 'tags');
    const mutations: string[] = [];
    const graphql: MondayGraphql = async (query, variables) => {
      if (query.includes('VolunteerIdentityColumns')) {
        return { boards: [{ columns: [...withoutTags, { id: 'type1', title: 'Type', type: 'dropdown' }] }] };
      }
      if (query.includes('VolunteerIdentitySearch')) {
        return { boards: [{ items_page: { items: [] } }] };
      }
      if (query.includes('VolunteerIdentityCreate')) {
        return { create_item: { id: 'new-2', name: profile.fullName } };
      }
      if (query.includes('VolunteerIdentityUpdate')) {
        const written = JSON.parse(String(variables?.columnValues)) as Record<string, unknown>;
        mutations.push(JSON.stringify(written.type1));
        return { change_multiple_column_values: { id: 'new-2' } };
      }
      throw new Error(query.slice(0, 40));
    };
    const result = await runContactIdentity({
      graphql,
      boardId: '2463183745',
      email: 'jane@example.com',
      profile,
    });
    assert.equal(result.status, 'created');
    assert.equal(mutations[0], JSON.stringify({ labels: ['Volunteer'] }));
  });

  it('fills a blank phone on the matching email and does not create', async () => {
    const fake = fakeGraphql((columnId) =>
      columnId === 'email' ? [item({ email: 'jane@example.com', phone: '' })] : [],
    );
    const result = await runContactIdentity({
      graphql: fake.graphql,
      boardId: '2463183745',
      email: 'jane@example.com',
      profile,
    });
    assert.equal(result.status, 'found');
    assert.equal(fake.mutations.includes('create'), false);
    assert.ok(fake.mutations.includes('update:1'));
    assert.ok(fake.mutations.includes('columns:phone'));
  });

  it('asks staff to sort out two contacts with the same email', async () => {
    const fake = fakeGraphql((columnId) =>
      columnId === 'email'
        ? [
            item({ id: '1', email: 'jane@example.com' }),
            item({ id: '2', email: 'jane@example.com' }),
          ]
        : [],
    );
    const result = await runContactIdentity({
      graphql: fake.graphql,
      boardId: '2463183745',
      email: 'jane@example.com',
      profile,
    });
    assert.deepEqual(result, {
      status: 'needs_staff',
      name: 'Jane Miller',
      email: 'jane@example.com',
      reason: 'duplicate_email',
    });
    assert.deepEqual(fake.mutations, []);
  });

  it('returns the matched name and email for one phone and last-name hit', async () => {
    const fake = fakeGraphql((columnId) =>
      columnId === 'phone'
        ? [item({ id: '9', name: 'Pat Miller', email: 'henry@i58global.org', phone: '555-010-1212' })]
        : [],
    );
    const result = await runContactIdentity({
      graphql: fake.graphql,
      boardId: '2463183745',
      email: 'jane@example.com',
      profile,
    });
    assert.deepEqual(result, {
      status: 'confirm_match',
      name: 'Jane Miller',
      email: 'jane@example.com',
      matchedName: 'Pat Miller',
      matchedEmail: 'henry@i58global.org',
    });
    assert.equal('contactId' in result, false);
    assert.deepEqual(fake.mutations, []);
  });

  it('links a confirmed phone match without changing the primary email', async () => {
    const written: Array<Record<string, unknown>> = [];
    const fake = fakeGraphql((columnId) =>
      columnId === 'phone'
        ? [
            item({
              id: '9',
              name: 'Pat Miller',
              email: 'henry@i58global.org',
              phone: '555-010-1212',
              city: '',
              altEmail: 'work@example.com',
            }),
          ]
        : [],
    );
    const original = fake.graphql;
    const graphql: MondayGraphql = async (query, variables) => {
      if (query.includes('VolunteerIdentityUpdate')) {
        written.push(JSON.parse(String(variables?.columnValues)) as Record<string, unknown>);
      }
      return original(query, variables);
    };
    const result = await runContactIdentity({
      graphql,
      boardId: '2463183745',
      email: 'jane@example.com',
      profile,
      confirmMatch: true,
    });
    assert.deepEqual(result, {
      status: 'found',
      name: 'Pat Miller',
      email: 'jane@example.com',
    });
    assert.equal(fake.mutations.includes('create'), false);
    assert.deepEqual(
      written.map((payload) => Object.keys(payload).sort().join(',')).sort(),
      ['alt', 'city'],
    );
    assert.equal(written.some((payload) => 'email' in payload), false);
    assert.equal(written.find((payload) => 'alt' in payload)?.alt, 'work@example.com, jane@example.com');
  });

  it('creates Alt Email when confirming and the column is missing', async () => {
    const withoutAlt = columns.filter((column) => column.id !== 'alt');
    const written: Array<Record<string, unknown>> = [];
    const graphql: MondayGraphql = async (query, variables) => {
      if (query.includes('VolunteerIdentityColumns')) {
        return { boards: [{ columns: withoutAlt }] };
      }
      if (query.includes('VolunteerIdentitySearch')) {
        const columnId = String(variables?.columnId ?? '');
        const items =
          columnId === 'phone'
            ? [item({ id: '9', email: 'henry@i58global.org', phone: '555-010-1212' })]
            : [];
        return { boards: [{ items_page: { items } }] };
      }
      if (query.includes('VolunteerIdentityCreateColumn')) {
        return { create_column: { id: 'alt_new', title: 'Alt Email', type: 'text' } };
      }
      if (query.includes('VolunteerIdentityUpdate')) {
        written.push(JSON.parse(String(variables?.columnValues)) as Record<string, unknown>);
        return { change_multiple_column_values: { id: variables?.itemId } };
      }
      if (query.includes('VolunteerIdentityCreate')) {
        throw new Error('must not create a contact');
      }
      throw new Error(`unexpected query ${query.slice(0, 48)}`);
    };
    const result = await runContactIdentity({
      graphql,
      boardId: '2463183745',
      email: 'jane@example.com',
      profile,
      confirmMatch: true,
    });
    assert.equal(result.status, 'found');
    assert.equal(written.some((payload) => payload.alt_new === 'jane@example.com'), true);
    assert.equal(written.some((payload) => 'email' in payload), false);
  });

  it('does not create a contact when a confirmation no longer matches', async () => {
    const fake = fakeGraphql(() => []);
    const result = await runContactIdentity({
      graphql: fake.graphql,
      boardId: '2463183745',
      email: 'jane@example.com',
      profile,
      confirmMatch: true,
    });
    assert.equal(result.status, 'needs_staff');
    assert.equal(result.reason, 'phone_name_match');
    assert.equal(fake.mutations.includes('create'), false);
  });
});

describe('mergedAltEmail', () => {
  it('adds the Google address beside an existing alt email', () => {
    assert.equal(
      mergedAltEmail('henry@i58global.org', 'jane@example.com'),
      'henry@i58global.org, jane@example.com',
    );
  });

  it('leaves an alt email that already has the Google address', () => {
    assert.equal(mergedAltEmail('Jane@Example.com', 'jane@example.com'), null);
  });
});
