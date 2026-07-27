import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseContactTagLabel } from './mapMondayToContact';

describe('parseContactTagLabel', () => {
  it('maps Parent and Parents to the same CRM tag', () => {
    assert.equal(parseContactTagLabel('Parent'), 'parent');
    assert.equal(parseContactTagLabel('Parents'), 'parent');
    assert.equal(parseContactTagLabel('PARENTS'), 'parent');
  });
});
