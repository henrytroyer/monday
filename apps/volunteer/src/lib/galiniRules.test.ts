import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { GALINI_NAV, GALINI_RULES, GALINI_WIFI } from './galiniRules.ts';

describe('galini apartment rules', () => {
  it('lists the house rules in the order volunteers were given', () => {
    assert.deepEqual(
      GALINI_RULES.map((rule) => rule.title),
      [
        'Hot Water',
        'Electricity',
        'AC',
        'Heat',
        'Doors',
        'Toilet Paper',
        'Roof',
        'Noise Level',
        'Departure',
      ],
    );
  });

  it('keeps the utilities, doors, quiet hours, and checkout instructions', () => {
    const text = GALINI_RULES.flatMap((rule) => rule.items).join(' ');
    assert.match(text, /water heater breaker for 20 minutes, then turn it off again/);
    assert.match(text, /Electricity is very expensive here/);
    assert.match(text, /Always turn off the AC when you leave the room/);
    assert.match(text, /turn off the heat when you leave your apartment/);
    assert.match(text, /Be careful not to slam doors/);
    assert.match(text, /tilt the white doors and windows/);
    assert.match(text, /bathroom window should always stay open/);
    assert.match(text, /15 minutes before and after showers/);
    assert.match(text, /do not flush toilet paper down the toilet/);
    assert.match(text, /The roof is off-limits/);
    assert.match(text, /minimum after 11:00pm/);
    assert.match(text, /sweep, mop, and empty the trash/);
    assert.match(text, /even if others will be staying/);
    assert.match(text, /If it’s too nice to throw away, please take it home with you/);
  });

  it('publishes the Galini WiFi network and password', () => {
    assert.deepEqual([...GALINI_WIFI.networks], ['Galini', 'Galini1']);
    assert.equal(GALINI_WIFI.password, 'panagiouda');
    assert.deepEqual(
      GALINI_NAV.map((item) => item.label),
      ['WiFi', ...GALINI_RULES.map((rule) => rule.title)],
    );
  });
});
