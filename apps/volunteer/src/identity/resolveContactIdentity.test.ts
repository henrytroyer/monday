import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { VolunteerProfile } from './profile.ts';
import {
  decideContactIdentity,
  type ContactSnapshot,
} from './resolveContactIdentity.ts';

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

function contact(overrides: Partial<ContactSnapshot> = {}): ContactSnapshot {
  return {
    id: '1',
    name: 'Jane Miller',
    email: 'jane@example.com',
    altEmail: '',
    phone: '5550101212',
    street: '1 Main',
    city: 'Lancaster',
    state: 'PA',
    zip: '17601',
    country: 'USA',
    dateOfBirth: '1994-04-02',
    ...overrides,
  };
}

describe('decideContactIdentity', () => {
  it('creates a contact when nothing matches', () => {
    const decision = decideContactIdentity({
      profile,
      emailMatches: [],
      phoneNameMatches: [],
    });
    assert.deepEqual(decision, { status: 'created' });
  });

  it('fills only blank fields on the one email match', () => {
    const decision = decideContactIdentity({
      profile,
      emailMatches: [contact({ phone: '', street: '1 Main', dateOfBirth: '' })],
      phoneNameMatches: [],
    });
    assert.equal(decision.status, 'found');
    if (decision.status !== 'found') return;
    assert.equal(decision.fills.phone, profile.phone);
    assert.equal(decision.fills.dateOfBirth, profile.dateOfBirth);
    assert.equal(decision.fills.street, undefined);
    assert.equal(decision.fills.name, undefined);
  });

  it('does not pick a contact when two items share the email', () => {
    const decision = decideContactIdentity({
      profile,
      emailMatches: [contact({ id: '1' }), contact({ id: '2' })],
      phoneNameMatches: [],
    });
    assert.deepEqual(decision, { status: 'needs_staff', reason: 'duplicate_email' });
  });

  it('asks to confirm one phone and last-name match', () => {
    const decision = decideContactIdentity({
      profile,
      emailMatches: [],
      phoneNameMatches: [contact({ id: '9', email: 'other@example.com' })],
    });
    assert.deepEqual(decision, { status: 'confirm_match', contactId: '9' });
  });

  it('leaves several phone and last-name matches for staff', () => {
    const decision = decideContactIdentity({
      profile,
      emailMatches: [],
      phoneNameMatches: [
        contact({ id: '9', email: 'other@example.com' }),
        contact({ id: '10', email: 'second@example.com' }),
      ],
    });
    assert.deepEqual(decision, { status: 'needs_staff', reason: 'phone_name_match' });
  });

  it('fills a blank contact name', () => {
    const decision = decideContactIdentity({
      profile,
      emailMatches: [contact({ name: '—' })],
      phoneNameMatches: [],
    });
    assert.equal(decision.status, 'found');
    if (decision.status !== 'found') return;
    assert.equal(decision.fills.name, 'Jane Miller');
  });
});
