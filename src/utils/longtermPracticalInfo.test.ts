import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LONGTERM_HOUSING_PRESETS } from '../constants/longtermPracticalInfo.ts';
import {
  emptyPracticalInfo,
  mergeHousingOptions,
  normalizeBudgetLink,
  normalizeCustomHousingOptions,
  parsePracticalInfo,
} from './longtermPracticalInfo.ts';

describe('parsePracticalInfo', () => {
  it('returns null for invalid payloads', () => {
    assert.equal(parsePracticalInfo(null), null);
    assert.equal(parsePracticalInfo({}), null);
    assert.equal(parsePracticalInfo({ housingLocation: 'Bluehouse' }), null);
  });

  it('parses a valid payload and drops bad visa values', () => {
    const parsed = parsePracticalInfo({
      volunteerId: 'lt-1',
      housingLocation: '  Bluehouse ',
      visaType: 'NotAVisa',
      usesI58Vehicle: true,
      budgetLink: 'https://example.com/budget',
      budgetFile: {
        fileName: 'budget.pdf',
        mimeType: 'application/pdf',
        dataUrl: 'data:application/pdf;base64,AA==',
        sizeBytes: 12,
      },
      updatedAt: '2026-08-01T00:00:00.000Z',
    });
    assert.ok(parsed);
    assert.equal(parsed.volunteerId, 'lt-1');
    assert.equal(parsed.housingLocation, 'Bluehouse');
    assert.equal(parsed.visaType, null);
    assert.equal(parsed.usesI58Vehicle, true);
    assert.equal(parsed.budgetLink, 'https://example.com/budget');
    assert.equal(parsed.budgetFile?.fileName, 'budget.pdf');
  });

  it('accepts known visa types', () => {
    const parsed = parsePracticalInfo({
      volunteerId: 'lt-2',
      visaType: 'Financially Independent',
    });
    assert.equal(parsed?.visaType, 'Financially Independent');
  });

  it('uses fallback volunteer id', () => {
    const parsed = parsePracticalInfo({ housingLocation: 'Hillside' }, 'fallback');
    assert.equal(parsed?.volunteerId, 'fallback');
    assert.equal(parsed?.housingLocation, 'Hillside');
  });
});

describe('mergeHousingOptions', () => {
  it('includes all presets and appends unique custom labels', () => {
    const merged = mergeHousingOptions(['Harbor House', 'bluehouse', 'Harbor House']);
    assert.deepEqual(merged.slice(0, LONGTERM_HOUSING_PRESETS.length), [
      ...LONGTERM_HOUSING_PRESETS,
    ]);
    assert.ok(merged.includes('Harbor House'));
    assert.equal(merged.filter((l) => l.toLowerCase() === 'bluehouse').length, 1);
  });

  it('normalizeCustomHousingOptions drops presets', () => {
    assert.deepEqual(
      normalizeCustomHousingOptions(['Bluehouse', 'Harbor House', '']),
      ['Harbor House'],
    );
  });
});

describe('normalizeBudgetLink', () => {
  it('returns null for empty', () => {
    assert.equal(normalizeBudgetLink(''), null);
    assert.equal(normalizeBudgetLink('   '), null);
  });

  it('accepts http(s) URLs', () => {
    assert.equal(
      normalizeBudgetLink('https://docs.google.com/spreadsheets/d/x'),
      'https://docs.google.com/spreadsheets/d/x',
    );
  });

  it('rejects non-http schemes', () => {
    assert.throws(() => normalizeBudgetLink('javascript:alert(1)'), /http/);
  });
});

describe('emptyPracticalInfo', () => {
  it('creates an empty record for a volunteer', () => {
    const empty = emptyPracticalInfo('abc');
    assert.equal(empty.volunteerId, 'abc');
    assert.equal(empty.housingLocation, null);
    assert.equal(empty.budgetFile, null);
  });
});
