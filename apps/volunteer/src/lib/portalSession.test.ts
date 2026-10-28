import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { JANE_MILLER, JANE_MILLER_EMAIL, previewStatusForNewAccount } from '../mock/fixtures.ts';
import {
  mockCreateAccount,
  mockSignIn,
  portalStatusForIdentity,
  showWelcomeHome,
} from './portalSession.ts';

describe('mock sign-in', () => {
  it('signs Jane in by email, ignoring case and spaces', () => {
    assert.deepEqual(mockSignIn('  Jane.Miller@Example.com ', {}), JANE_MILLER);
  });

  it('returns null for an unknown email', () => {
    assert.equal(mockSignIn('nobody@example.com', {}), null);
  });

  it('finds an account created earlier in the session', () => {
    const { me } = mockCreateAccount({ name: 'Sam Rivera', email: 'sam@example.com' }, {});
    assert.deepEqual(mockSignIn('SAM@example.com', { 'sam@example.com': me }), me);
  });
});

describe('mock create account', () => {
  it('starts a fresh preview application for a new email', () => {
    const { me, existed } = mockCreateAccount(
      { name: 'Sam Rivera', email: 'sam@example.com' },
      {},
    );
    assert.equal(existed, false);
    assert.equal(me.name, 'Sam Rivera');
    assert.ok(me.steps.every((step) => step.status === 'not_started'));
  });

  it('signs in instead when the email already has an account', () => {
    const { me, existed } = mockCreateAccount(
      { name: 'Someone Else', email: JANE_MILLER_EMAIL },
      {},
    );
    assert.equal(existed, true);
    assert.deepEqual(me, JANE_MILLER);
  });
});

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

describe('showWelcomeHome', () => {
  it('greets a new account that has not opened the first step', () => {
    const me = previewStatusForNewAccount({ name: 'Sam Rivera', email: 'sam@example.com' });
    assert.equal(showWelcomeHome(me), true);
  });

  it('keeps Jane on the progress Home', () => {
    assert.equal(showWelcomeHome(JANE_MILLER), false);
  });

  it('uses the progress Home once the first step has been opened', () => {
    const me = previewStatusForNewAccount({ name: 'Sam Rivera', email: 'sam@example.com' });
    assert.equal(showWelcomeHome({ ...me, applicationStarted: true }), false);
  });
});
