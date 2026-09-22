import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SHORT_TERM_STEP_IDS } from '../contract/volunteerApi.ts';
import { JANE_MILLER_EMAIL, NOT_FOUND_EMAIL } from './fixtures.ts';
import * as client from './volunteerClient.ts';

const WRITE_HELPER_PATTERN =
  /post|put|patch|delete|write|tick|complete|upload|create|update|save/i;

describe('fetchMe', () => {
  it('returns Jane Miller when the in-progress email is used', () => {
    const result = client.fetchMe(JANE_MILLER_EMAIL);
    assert.equal(result.status, 'ok');
    if (result.status !== 'ok') return;
    assert.equal(result.me.name, 'Jane Miller');
    assert.equal(result.me.email, JANE_MILLER_EMAIL);
    assert.ok(result.me.term);
    assert.ok(result.me.location);
  });

  it('is case-insensitive and trims the lookup email', () => {
    const result = client.fetchMe(`  ${JANE_MILLER_EMAIL.toUpperCase()}  `);
    assert.equal(result.status, 'ok');
  });

  it('includes every short-term step exactly once, in contract order', () => {
    const result = client.fetchMe(JANE_MILLER_EMAIL);
    assert.equal(result.status, 'ok');
    if (result.status !== 'ok') return;
    const ids = result.me.steps.map((step) => step.id);
    assert.deepEqual(ids, [...SHORT_TERM_STEP_IDS]);
  });

  it('returns not_found for the not_found fixture email', () => {
    assert.deepEqual(client.fetchMe(NOT_FOUND_EMAIL), { status: 'not_found' });
  });

  it('returns not_found for an unknown email', () => {
    assert.deepEqual(client.fetchMe('stranger@example.com'), { status: 'not_found' });
  });
});

describe('volunteer client surface', () => {
  it('exports only fetchMe — no write helpers', () => {
    assert.deepEqual(Object.keys(client).sort(), ['fetchMe']);
    assert.equal(typeof client.fetchMe, 'function');
    const writeLike = Object.keys(client).filter((key) => WRITE_HELPER_PATTERN.test(key));
    assert.deepEqual(writeLike, []);
  });
});
