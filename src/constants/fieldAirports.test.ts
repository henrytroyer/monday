import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveFieldAirportIata } from './fieldAirports';

describe('resolveFieldAirportIata', () => {
  it('maps Lesvos to MJT', () => {
    assert.equal(resolveFieldAirportIata('Lesvos'), 'MJT');
    assert.equal(resolveFieldAirportIata('—', 'Lesvos'), 'MJT');
  });

  it('maps Malakasa / Athens to ATH', () => {
    assert.equal(resolveFieldAirportIata('Malakasa'), 'ATH');
    assert.equal(resolveFieldAirportIata('Athens'), 'ATH');
  });

  it('maps Germany locations to FRA', () => {
    assert.equal(resolveFieldAirportIata('Germany'), 'FRA');
    assert.equal(resolveFieldAirportIata('Giessen'), 'FRA');
  });

  it('returns undefined for Other / empty', () => {
    assert.equal(resolveFieldAirportIata('Other'), undefined);
    assert.equal(resolveFieldAirportIata(), undefined);
  });
});
