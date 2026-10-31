import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { flightItineraryFor } from './flightItinerary.ts';

describe('flight itinerary', () => {
  it('names the volunteer and keeps the sample record locator', () => {
    const itinerary = flightItineraryFor('  Jane Miller  ');
    assert.equal(itinerary.passenger, 'Jane Miller');
    assert.equal(itinerary.recordLocator, 'I58-7K2M');
    assert.equal(itinerary.field, 'Lesvos');
  });

  it('uses a placeholder when the account has no name', () => {
    assert.equal(flightItineraryFor('   ').passenger, 'Volunteer');
  });

  it('flies to Mytilene and returns from Mytilene', () => {
    const itinerary = flightItineraryFor('Jane Miller');
    const toField = itinerary.directions[0];
    const home = itinerary.directions[1];
    assert.equal(toField?.id, 'to-field');
    assert.equal(home?.id, 'home');
    assert.equal(toField?.legs.at(-1)?.toCode, 'MJT');
    assert.equal(home?.legs[0]?.fromCode, 'MJT');
    assert.equal(home?.legs.at(-1)?.toCode, 'CLT');
  });

  it('gives every leg a flight number, date, and both times', () => {
    const legs = flightItineraryFor('Jane Miller').directions.flatMap((direction) => direction.legs);
    assert.equal(legs.length, 6);
    for (const leg of legs) {
      assert.match(leg.flight, /^[A-Z0-9]{2} \d+$/);
      assert.ok(leg.date.length > 0);
      assert.ok(leg.departs.length > 0);
      assert.ok(leg.arrives.length > 0);
      assert.ok(leg.fromCode.length === 3);
      assert.ok(leg.toCode.length === 3);
    }
    assert.equal(legs[0]?.nextDay, true);
  });
});
