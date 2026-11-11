import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  BIKE_LOCK_CODE,
  BRICK_DOOR_CODE,
  BUNKER_DOOR_CODE,
  ORIENTATION_CLOSING,
  ORIENTATION_CODES,
  ORIENTATION_SECTIONS,
  VEHICLE_DAMAGE_COSTS,
  type OrientationSection,
} from './orientationInfo.ts';

function textOf(section: OrientationSection): string {
  if (section.kind === 'bullets') {
    const aside = section.aside?.items.map((item) => `${item.label} ${item.value}`).join(' ') ?? '';
    return [section.title, ...section.items, aside].join(' ');
  }
  if (section.kind === 'events') {
    return [section.title, ...section.items, ...section.events.flatMap((event) => [event.title, event.detail])].join(
      ' ',
    );
  }
  if (section.kind === 'access') {
    return [section.title, section.body, section.codeLabel, section.code, section.note ?? ''].join(' ');
  }
  return [section.title, ...section.chats.flatMap((chat) => [chat.name, chat.description])].join(' ');
}

describe('orientation info', () => {
  it('keeps the Lesvos access codes together', () => {
    assert.equal(BRICK_DOOR_CODE, '2424#');
    assert.equal(BIKE_LOCK_CODE, '4321');
    assert.equal(BUNKER_DOOR_CODE, '2424');
    assert.deepEqual(
      ORIENTATION_CODES.map((code) => [code.id, code.code]),
      [
        ['brick', '2424#'],
        ['bikes', '4321'],
        ['bunker', '2424'],
      ],
    );
  });

  it('covers lodging, the team week, vehicles, chats, and arrival tips', () => {
    assert.deepEqual(
      ORIENTATION_SECTIONS.map((section) => section.title),
      [
        'Lodging and Utilities',
        'Laundry & Cleaning',
        'Schedule',
        'The Brick',
        'Interactions with POC’s',
        'Vehicles',
        'Bikes',
        'SIM Cards',
        'Bunker',
        'Storage Room',
        'WhatsApp Chats & Descriptions',
        'Other Tips',
      ],
    );

    const copy = ORIENTATION_SECTIONS.map(textOf).join('\n');
    assert.match(copy, /greet the owner of the Galini, George/);
    assert.match(copy, /hot water heater/);
    assert.match(copy, /dehumidifier/);
    assert.match(copy, /MarciLyn/);
    assert.match(copy, /Cleaning Schedule/);
    assert.match(copy, /Solo Night/);
    assert.match(copy, /Small Groups/);
    assert.match(copy, /any rides to POC’s or translators without Admin approval/);
    assert.match(copy, /EuroRelief Driver form/);
    assert.match(copy, /Book A Vehicle/);
    assert.match(copy, /BP station in Panagiouda/);
    assert.match(copy, /fingerprint access/);
    assert.match(copy, /Volunteers of Lesvos/);
    assert.match(copy, /Squad of Females Chat/);
    assert.match(copy, /bottled water/);
    assert.match(copy, /Vodafone Greece/);
    assert.match(copy, /contact Nate or Paul/);
    assert.deepEqual(
      VEHICLE_DAMAGE_COSTS.map((cost) => [cost.label, cost.amount]),
      [
        ['Scratches', '100 euros'],
        ['Dents', '150 euros'],
      ],
    );
    assert.match(copy, /100 euros/);
    assert.match(copy, /150 euros/);
    assert.equal(
      ORIENTATION_CLOSING,
      'For any additional questions or needs, please reach out to us.',
    );
  });
});
