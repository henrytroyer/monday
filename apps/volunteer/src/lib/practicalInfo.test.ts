import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  APARTMENT_CARE,
  MAILING_ADDRESS,
  MAILING_ADDRESS_NOTE,
  PRACTICAL_NAV,
  PRACTICAL_PLACES,
} from './practicalInfo.ts';

describe('practical info', () => {
  it('covers Panagiouda cafes, groceries, and the pharmacy', () => {
    const place = PRACTICAL_PLACES.find((item) => item.id === 'panagiouda');
    assert.ok(place);
    const food = place.topics.find((topic) => topic.id === 'food');
    assert.deepEqual(
      food?.spots?.map((spot) => spot.name),
      ['Skiniko', 'Caprice Cafe'],
    );
    assert.match(food?.note ?? '', /purchase a drink or some food/);
    assert.match(food?.reminders?.[0]?.body ?? '', /tipping at restaurants is not expected/);
    assert.match(food?.reminders?.[1]?.body ?? '', /do not order “to go” and then stay/);
    const grocery = place.topics.find((topic) => topic.id === 'grocery');
    assert.match(grocery?.body ?? '', /three small grocery stores/);
    assert.match(grocery?.body ?? '', /fresh bread every morning/);
    const pharmacy = place.topics.find((topic) => topic.id === 'pharmacy');
    assert.match(pharmacy?.body ?? '', /liquid vitamin C/);
    assert.match(pharmacy?.hours ?? '', /Monday to Friday, 8:00 AM to 2:30 PM/);
  });

  it('covers Mytilini parking, shops, and people asking for money', () => {
    const place = PRACTICAL_PLACES.find((item) => item.id === 'mytilini');
    assert.ok(place);
    const text = place.topics.map((topic) => topic.body).join(' ');
    assert.match(text, /free parking lot/);
    assert.match(text, /will result in a fine/);
    assert.match(text, /The Meating/);
    assert.match(text, /AB and Lidl/);
    assert.match(text, /Western Union/);
    assert.match(text, /Bring your passport/);
    assert.match(text, /Adaptors, chargers, and phone necessities/);
    assert.match(text, /do not encourage giving money/);
    assert.match(text, /love and attention as individuals/);
  });

  it('includes apartment care and the Galini mailing address', () => {
    assert.match(APARTMENT_CARE.body ?? '', /empty it regularly/);
    assert.match(APARTMENT_CARE.body ?? '', /prevent black mold/);
    assert.equal(MAILING_ADDRESS, 'Galini Apartments, Panagiouda, Lesvos 81100, Greece');
    assert.match(MAILING_ADDRESS_NOTE, /admin couples/);
    assert.deepEqual(
      PRACTICAL_NAV.map((item) => item.label),
      ['Panagiouda', 'Mytilini', 'Dehumidifiers', 'Mailing address'],
    );
  });
});
