import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mapItemToContactListItem } from './mapMondayToContact.ts';

describe('mapItemToContactListItem demographics', () => {
  it('reads Street / State/Providence / Zip Code from the Contacts board', () => {
    const mapped = mapItemToContactListItem({
      id: '1',
      name: 'Duane Hoover',
      column_values: [
        {
          id: 'email',
          text: 'archeryhunter1992@gmail.com',
          type: 'email',
          value: null,
          column: { title: 'Email' },
        },
        {
          id: 'street',
          text: '2850 Buffalo Road',
          type: 'text',
          value: '"2850 Buffalo Road"',
          column: { title: 'Street' },
        },
        {
          id: 'city',
          text: 'Lewisburg',
          type: 'text',
          value: '"Lewisburg"',
          column: { title: 'City' },
        },
        {
          id: 'state',
          text: 'PA',
          type: 'text',
          value: '"PA"',
          column: { title: 'State/Providence' },
        },
        {
          id: 'zip',
          text: '17837',
          type: 'text',
          value: '"17837"',
          column: { title: 'Zip Code' },
        },
        {
          id: 'country',
          text: 'United States',
          type: 'text',
          value: '"United States"',
          column: { title: 'Country' },
        },
      ],
    });

    assert.deepEqual(mapped.demographics, {
      address: '2850 Buffalo Road',
      city: 'Lewisburg',
      state: 'PA',
      zip: '17837',
      country: 'United States',
    });
  });

  it('reads Birthdate column aliases into dateOfBirth', () => {
    const mapped = mapItemToContactListItem({
      id: '3',
      name: 'Birthday Person',
      column_values: [
        {
          id: 'dob',
          text: '1990-03-14',
          type: 'date',
          value: JSON.stringify({ date: '1990-03-14' }),
          column: { title: 'Birthdate' },
        },
      ],
    });

    assert.equal(mapped.demographics?.dateOfBirth, 'March 14, 1990');
  });

  it('fills gaps from a location mailing column', () => {
    const mapped = mapItemToContactListItem({
      id: '2',
      name: 'Location Donor',
      column_values: [
        {
          id: 'loc',
          text: '',
          type: 'location',
          value: JSON.stringify({
            address: '10 Main St, Boise, ID 83702, USA',
            street: 'Main St',
            street_number: '10',
            city: 'Boise',
            state_short: 'ID',
            zip: '83702',
            country: 'USA',
          }),
          column: { title: 'z Mailing Address' },
        },
      ],
    });

    assert.equal(mapped.demographics?.address, '10 Main St, Boise, ID 83702, USA');
    assert.equal(mapped.demographics?.city, 'Boise');
    assert.equal(mapped.demographics?.state, 'ID');
    assert.equal(mapped.demographics?.zip, '83702');
    assert.equal(mapped.demographics?.country, 'USA');
  });
});
