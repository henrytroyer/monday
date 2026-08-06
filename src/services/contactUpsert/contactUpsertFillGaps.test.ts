/**
 * contactUpsertFillGaps.test.ts — Document fill-gap vs CSE prefer-incoming merge rules.
 * Mirrors helpers in contactUpsert.ts (kept local so the public API stays small).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

function fillGap(
  existing: string | undefined,
  incoming: string | undefined,
): string | undefined {
  const e = existing?.trim();
  const i = incoming?.trim();
  if (e) return e;
  if (i) return i;
  return undefined;
}

function preferIncomingValue(
  existing: string | undefined,
  incoming: string | undefined,
): string | undefined {
  const e = existing?.trim();
  const i = incoming?.trim();
  if (i) return i;
  if (e) return e;
  return undefined;
}

describe('contact upsert field merge', () => {
  it('fill gaps keeps existing when both set', () => {
    assert.equal(fillGap('Old', 'New'), 'Old');
    assert.equal(fillGap('Old', ''), 'Old');
    assert.equal(fillGap('', 'New'), 'New');
  });

  it('CSE prefer-incoming takes newer non-empty without wiping', () => {
    assert.equal(preferIncomingValue('Old', 'New'), 'New');
    assert.equal(preferIncomingValue('Old', ''), 'Old');
    assert.equal(preferIncomingValue('', 'New'), 'New');
  });
});
