import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseAlertAfterDays } from './replyAlert.ts';

describe('parseAlertAfterDays', () => {
  it('keeps a whole number of days, including zero', () => {
    assert.equal(parseAlertAfterDays('0'), 0);
    assert.equal(parseAlertAfterDays('7'), 7);
    assert.equal(parseAlertAfterDays(' 14 '), 14);
  });

  it('treats a blank or unusable value as no alert', () => {
    assert.equal(parseAlertAfterDays(''), undefined);
    assert.equal(parseAlertAfterDays('   '), undefined);
    assert.equal(parseAlertAfterDays('-1'), undefined);
    assert.equal(parseAlertAfterDays('7.5'), undefined);
    assert.equal(parseAlertAfterDays('soon'), undefined);
  });
});
