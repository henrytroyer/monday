/**
 * contactUpsertFillGaps.test.ts — fill-gap / prefer-incoming / richest merge rules.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  fillGap,
  mergeFieldByMode,
  pickRicherField,
  preferIncomingValue,
  resolveContactFieldMergeMode,
} from './fieldMerge';

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

  it('richest prefers longer non-empty without wiping', () => {
    assert.equal(pickRicherField('Hi', 'Hello'), 'Hello');
    assert.equal(pickRicherField('Hello', 'Hi'), 'Hello');
    assert.equal(pickRicherField('Old', ''), 'Old');
    assert.equal(pickRicherField('', 'New'), 'New');
    assert.equal(pickRicherField(undefined, undefined), undefined);
  });

  it('mergeFieldByMode dispatches correctly', () => {
    assert.equal(mergeFieldByMode('Old', 'Newer', 'fill-gaps'), 'Old');
    assert.equal(mergeFieldByMode('Old', 'Newer', 'prefer-incoming'), 'Newer');
    assert.equal(mergeFieldByMode('Old', 'Newer!', 'richest'), 'Newer!');
  });

  it('resolveContactFieldMergeMode keeps CSE/Fillout preferIncoming', () => {
    assert.equal(resolveContactFieldMergeMode({}), 'fill-gaps');
    assert.equal(
      resolveContactFieldMergeMode({ preferIncoming: true }),
      'prefer-incoming',
    );
    assert.equal(
      resolveContactFieldMergeMode({
        mergeMode: 'prefer-incoming',
        preferIncoming: true,
      }),
      'prefer-incoming',
    );
    assert.equal(
      resolveContactFieldMergeMode({ mergeMode: 'richest' }),
      'richest',
    );
  });
});
