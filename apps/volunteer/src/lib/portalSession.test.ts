import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { JANE_MILLER, JANE_MILLER_EMAIL } from '../mock/fixtures.ts';
import { portalStatusForIdentity } from './portalSession.ts';

describe('portalStatusForIdentity', () => {
  it('opens Jane’s fixture when her contact is found', () => {
    const me = portalStatusForIdentity({
      status: 'found',
      name: 'Jane Miller',
      email: JANE_MILLER_EMAIL,
    });
    assert.deepEqual(me, JANE_MILLER);
  });

  it('starts a fresh preview application for a newly created contact', () => {
    const me = portalStatusForIdentity({
      status: 'created',
      name: 'Sam Rivera',
      email: 'Sam.Rivera@Example.com',
    });
    assert.ok(me);
    assert.equal(me.name, 'Sam Rivera');
    assert.equal(me.email, 'sam.rivera@example.com');
    assert.ok(me.steps.every((step) => step.status === 'not_started'));
  });

  it('keeps the portal closed until the contact is confirmed or staff step in', () => {
    assert.equal(
      portalStatusForIdentity({
        status: 'confirm_match',
        name: 'Jane Miller',
        email: JANE_MILLER_EMAIL,
      }),
      null,
    );
    assert.equal(
      portalStatusForIdentity({
        status: 'needs_staff',
        name: 'Jane Miller',
        email: JANE_MILLER_EMAIL,
        reason: 'duplicate_email',
      }),
      null,
    );
  });
});
