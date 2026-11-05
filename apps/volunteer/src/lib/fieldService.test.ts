import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { FIELD_SERVICE_WAYS } from './fieldService.ts';

describe('field service ways', () => {
  it('names the three cards under the schedule bar', () => {
    assert.deepEqual(
      FIELD_SERVICE_WAYS.map((way) => way.title),
      ['Book a Vehicle', 'Team Photos', 'i58 Feedback'],
    );
  });
});
