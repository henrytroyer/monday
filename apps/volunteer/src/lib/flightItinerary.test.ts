import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  flightItinerariesFor,
  flightItineraryFor,
  itinerariesForPlace,
  itineraryBannerSrc,
  itinerarySheetLeg,
} from './flightItinerary.ts';

describe('flight itinerary', () => {
  it('names the volunteer and keeps the sample record locator', () => {
    const itinerary = flightItineraryFor('  Jane Miller  ');
    assert.equal(itinerary.passenger, 'Jane Miller');
    assert.equal(itinerary.recordLocator, 'I58-7K2M');
    assert.equal(itinerary.airlineLabel, 'Delta, Aegean, Olympic Air');
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

  it('keeps a second record locator beside the main ticket', () => {
    const tickets = flightItinerariesFor('Jane Miller');
    assert.equal(tickets.length, 2);
    assert.equal(tickets[1]?.recordLocator, 'A3-19KX');
    assert.equal(tickets[1]?.airlineLabel, 'Aegean');
    assert.equal(tickets[1]?.passenger, 'Jane Miller');
    assert.equal(tickets[0]?.recordLocator, flightItineraryFor('Jane Miller').recordLocator);
  });

  it('uses the Athens photo for Greece and the castle photo for Germany', () => {
    assert.equal(itineraryBannerSrc('Lesvos'), '/brand/itinerary-greece.jpg');
    assert.equal(itineraryBannerSrc('Greece'), '/brand/itinerary-greece.jpg');
    assert.equal(itineraryBannerSrc('Europe'), '/brand/itinerary-greece.jpg');
    assert.equal(itineraryBannerSrc('Germany'), '/brand/itinerary-germany.png');
    assert.equal(itineraryBannerSrc('germany project'), '/brand/itinerary-germany.png');
  });

  it('routes a Germany itinerary through Frankfurt to Munich', () => {
    const tickets = itinerariesForPlace('Jane Miller', 'Germany');
    assert.equal(tickets.length, 1);
    const itinerary = tickets[0];
    assert.equal(itinerary?.field, 'Germany');
    assert.equal(itinerary?.recordLocator, 'I58-DE4M');
    assert.equal(itinerary?.airlineLabel, 'Delta, Lufthansa');
    const toField = itinerary?.directions[0];
    const home = itinerary?.directions[1];
    assert.equal(toField?.legs[0]?.fromCode, 'CLT');
    assert.equal(toField?.legs.at(-1)?.toCode, 'MUC');
    assert.equal(home?.legs[0]?.fromCode, 'MUC');
    assert.equal(home?.legs.at(-1)?.toCode, 'CLT');
    assert.equal(itinerariesForPlace('Jane Miller', 'Lesvos')[0]?.recordLocator, 'I58-7K2M');
  });

  it('fills the itinerary sheet from a booked leg', () => {
    const leg = flightItineraryFor('Jane Miller').directions[0]?.legs[0];
    assert.ok(leg);
    const sheet = itinerarySheetLeg(leg);
    assert.equal(sheet.date, 'Friday, 5 June 2026');
    assert.equal(sheet.from, 'Charlotte');
    assert.equal(sheet.to, 'Paris');
    assert.equal(sheet.departs, '6:40 PM');
    assert.equal(sheet.arrives, '8:55 AM +1');
    assert.equal(sheet.flight, 'DL 214');
    assert.equal(sheet.airport, 'Charlotte (CLT)');
    assert.equal(sheet.airline, 'Delta');
    assert.equal(sheet.frequentFlyer, '—');
  });
});
