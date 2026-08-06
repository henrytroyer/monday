import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_ROLE_PERMISSIONS } from '../permissions/defaults.ts';
import { resolveEffectivePermissions } from '../permissions/resolveEffectivePermissions.ts';
import type { ContactDetail } from '../types/contact.ts';
import { filterContactForPermissions } from './filterContactForPermissions.ts';

function sampleDetail(): ContactDetail {
  return {
    id: '1',
    name: 'Test Volunteer',
    email: 'test@example.com',
    tags: ['volunteer', 'donor'],
    emailCorrespondence: [],
    currentApplication: null,
    serviceTerms: [],
    linkedVolunteers: [],
    donations: [
      {
        id: 'd1',
        kind: 'payment',
        amount: 100,
        date: '2026-01-01',
        currency: 'USD',
        description: 'Gift',
      },
    ],
    pastorReference: { name: 'Pastor', email: 'p@example.com' },
    files: [
      {
        id: 'f1',
        name: 'passport.pdf',
        url: 'https://example.com/f',
        isImage: false,
      },
    ],
    linkedDonationItemIds: ['99'],
  };
}

describe('filterContactForPermissions', () => {
  it('strips donations, references, and docs for BASIC', () => {
    const perms = resolveEffectivePermissions(['BASIC']);
    const filtered = filterContactForPermissions(sampleDetail(), perms);
    assert.deepEqual(filtered.donations, []);
    assert.equal(filtered.linkedDonationItemIds, undefined);
    assert.equal(filtered.pastorReference, undefined);
    assert.deepEqual(filtered.files, []);
  });

  it('keeps donations for FINANCE and references for HR', () => {
    const finance = filterContactForPermissions(
      sampleDetail(),
      resolveEffectivePermissions(['FINANCE']),
    );
    assert.equal(finance.donations.length, 1);
    assert.equal(finance.pastorReference, undefined);

    const hr = filterContactForPermissions(
      sampleDetail(),
      resolveEffectivePermissions(['HR']),
    );
    assert.deepEqual(hr.donations, []);
    assert.equal(hr.pastorReference?.name, 'Pastor');
    assert.equal(hr.files?.length, 1);
  });

  it('DEV sees everything', () => {
    const perms = resolveEffectivePermissions(
      ['DEV'],
      DEFAULT_ROLE_PERMISSIONS,
    );
    const filtered = filterContactForPermissions(sampleDetail(), perms);
    assert.equal(filtered.donations.length, 1);
    assert.equal(filtered.pastorReference?.name, 'Pastor');
    assert.equal(filtered.files?.length, 1);
  });
});
