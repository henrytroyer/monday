import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { previousValueToMutationJson } from './undoActivityEvent.ts';

describe('previousValueToMutationJson', () => {
  it('restores dropdown ids from chosenValues', () => {
    const json = previousValueToMutationJson('dropdown', {
      chosenValues: [
        { name: 'Parents', id: 11 },
        { name: 'Volunteer', id: 4 },
      ],
    });
    assert.deepEqual(JSON.parse(json), { ids: [11, 4] });
  });

  it('restores status label text', () => {
    const json = previousValueToMutationJson('color', {
      label: { text: 'Applied', index: 1 },
    });
    assert.deepEqual(JSON.parse(json), { label: 'Applied' });
  });

  it('restores timeline ranges', () => {
    const json = previousValueToMutationJson('timerange', {
      from: '2026-06-01',
      to: '2026-08-22',
    });
    assert.deepEqual(JSON.parse(json), {
      from: '2026-06-01',
      to: '2026-08-22',
    });
  });

  it('clears columns when previous value is null', () => {
    assert.equal(previousValueToMutationJson('dropdown', null), '{}');
  });
});
