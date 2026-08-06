import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_ROLE_PERMISSIONS } from '../permissions/defaults.ts';
import { resolveEffectivePermissions } from '../permissions/resolveEffectivePermissions.ts';
import type { ContactDetail } from '../types/contact.ts';
import type { VolunteerDetail } from '../types/volunteer.ts';
import {
  filterContactForPermissions,
  filterContactListItemForPermissions,
  filterVolunteerDetailForPermissions,
} from './filterContactForPermissions.ts';

function sampleDetail(): ContactDetail {
  return {
    id: '1',
    name: 'Test Volunteer',
    email: 'test@example.com',
    tags: ['volunteer', 'donor'],
    emailCorrespondence: [
      {
        id: 'e1',
        contactId: '1',
        direction: 'outbound',
        senderName: 'A',
        senderEmail: 'a@example.com',
        recipientName: 'B',
        recipientEmail: 'b@example.com',
        subject: 'Hi',
        body: 'Hello',
        sentAt: '2026-01-01',
        source: 'general',
        sourceLabel: 'General',
      },
    ],
    currentApplication: {
      itemId: 'app1',
      stage: 'Applied',
      status: 'Active',
      timelineLabel: 'Spring',
    },
    serviceTerms: [
      {
        itemId: 't1',
        timelineId: 'spring',
        timelineLabel: 'Spring',
        notes: [
          {
            id: 'n1',
            itemId: 't1',
            timelineId: 'spring',
            body: 'secret',
            createdAt: '2026-01-01',
          },
        ],
      },
    ],
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
  it('strips HR and finance domains for BASIC', () => {
    const perms = resolveEffectivePermissions(['BASIC']);
    const filtered = filterContactForPermissions(sampleDetail(), perms, {});
    assert.deepEqual(filtered.donations, []);
    assert.equal(filtered.linkedDonationItemIds, undefined);
    assert.equal(filtered.pastorReference, undefined);
    assert.deepEqual(filtered.files, []);
    assert.equal(filtered.currentApplication, null);
    assert.deepEqual(filtered.serviceTerms, []);
    assert.deepEqual(filtered.emailCorrespondence, []);
  });

  it('keeps donations for FINANCE and HR surfaces for HR', () => {
    const finance = filterContactForPermissions(
      sampleDetail(),
      resolveEffectivePermissions(['FINANCE']),
      {},
    );
    assert.equal(finance.donations.length, 1);
    assert.equal(finance.pastorReference, undefined);
    assert.deepEqual(finance.files, []);
    assert.equal(finance.serviceTerms.length, 1);
    assert.deepEqual(finance.serviceTerms[0]?.notes, []);
    assert.equal(finance.currentApplication, null);

    const hr = filterContactForPermissions(
      sampleDetail(),
      resolveEffectivePermissions(['HR']),
      {},
    );
    assert.deepEqual(hr.donations, []);
    assert.equal(hr.pastorReference?.name, 'Pastor');
    assert.equal(hr.files?.length, 1);
    assert.ok(hr.currentApplication);
    assert.equal(hr.serviceTerms[0]?.notes.length, 1);
  });

  it('keeps slim billing terms for FINANCE without HR notes', () => {
    const detail = sampleDetail();
    detail.serviceTerms[0] = {
      ...detail.serviceTerms[0]!,
      quickbooksInvoiceId: 'INV-42',
      pastorReferenceStatus: 'Done',
    };
    const finance = filterContactForPermissions(
      detail,
      resolveEffectivePermissions(['FINANCE']),
      {},
    );
    assert.equal(finance.serviceTerms[0]?.quickbooksInvoiceId, 'INV-42');
    assert.deepEqual(finance.serviceTerms[0]?.notes, []);
    assert.equal(finance.serviceTerms[0]?.pastorReferenceStatus, undefined);
  });

  it('honors domain override moving donations to HR', () => {
    const hr = resolveEffectivePermissions(['HR']);
    const filtered = filterContactForPermissions(sampleDetail(), hr, {
      'contact.donations': 'hr',
    });
    assert.equal(filtered.donations.length, 1);
  });

  it('DEV sees everything', () => {
    const perms = resolveEffectivePermissions(
      ['DEV'],
      DEFAULT_ROLE_PERMISSIONS,
    );
    const filtered = filterContactForPermissions(sampleDetail(), perms, {});
    assert.equal(filtered.donations.length, 1);
    assert.equal(filtered.pastorReference?.name, 'Pastor');
    assert.equal(filtered.files?.length, 1);
    assert.equal(filtered.emailCorrespondence.length, 1);
  });

  it('strips donor tag from list items without finance access', () => {
    const item = filterContactListItemForPermissions(
      {
        id: '1',
        name: 'Donor',
        email: 'd@example.com',
        tags: ['donor', 'volunteer'],
      },
      resolveEffectivePermissions(['BASIC']),
      {},
    );
    assert.deepEqual(item.tags, ['volunteer']);
  });
});

describe('filterVolunteerDetailForPermissions', () => {
  it('strips HR fields for FINANCE-only; keeps invoice', () => {
    const detail = {
      id: 'a1',
      name: 'Vol',
      email: 'v@example.com',
      emails: [],
      phone: '1',
      files: [{ id: 'f', name: 'x.pdf', isImage: false }],
      housing: '',
      itinerary: { legs: [] },
      coordinator: '',
      termNotes: [
        {
          id: 'n',
          itemId: 'a1',
          timelineId: 't',
          body: 'note',
          createdAt: '2026-01-01',
        },
      ],
      onboardingSteps: [],
      activityTimeline: [],
      applicationFormFields: [{ id: 'q', question: 'Q', answer: 'A' }],
      pastorReferenceFormFields: [{ id: 'p', question: 'P', answer: 'B' }],
      quickbooksInvoiceId: 'INV-1',
      timelineId: 't',
      status: 'Active',
      location: 'Lesvos',
    } as unknown as VolunteerDetail;

    const filtered = filterVolunteerDetailForPermissions(
      detail,
      resolveEffectivePermissions(['FINANCE']),
      {},
    );
    assert.deepEqual(filtered.files, []);
    assert.deepEqual(filtered.termNotes, []);
    assert.deepEqual(filtered.applicationFormFields, []);
    assert.equal(filtered.quickbooksInvoiceId, 'INV-1');
  });
});
