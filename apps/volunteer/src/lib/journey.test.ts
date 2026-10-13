import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { JANE_MILLER, previewStatusForNewAccount } from '../mock/fixtures.ts';
import {
  journeyArrived,
  journeyDestination,
  journeyPlaneIndex,
  journeyProgress,
  warmerStatusLabel,
} from './journey.ts';
import {
  WORLD_WIDTH,
  journeyEndpoint,
  journeyFlightPoint,
  journeyStartPoint,
} from './journeyMap.ts';

describe('journey plane', () => {
  it('places Jane’s plane on Profile Photo', () => {
    assert.equal(journeyPlaneIndex(JANE_MILLER), 3);
    assert.equal(JANE_MILLER.steps[3]?.title, 'Profile Photo');
    assert.equal(journeyArrived(JANE_MILLER), false);
    assert.equal(journeyProgress(JANE_MILLER), 0.3);
  });

  it('starts over North America before any volunteer step is done', () => {
    const fresh = previewStatusForNewAccount({
      name: 'New Volunteer',
      email: 'new@example.com',
    });
    assert.equal(journeyProgress(fresh), 0);
    const start = journeyStartPoint();
    const europe = journeyEndpoint('europe');
    const plane = journeyFlightPoint(0, 'europe');
    assert.ok(start.x < europe.x);
    assert.ok(start.x < WORLD_WIDTH * 0.45);
    assert.equal(plane.x, start.x);
    assert.equal(plane.y, start.y);
  });

  it('sits at the destination when every volunteer youDo step is done', () => {
    const done = {
      ...JANE_MILLER,
      steps: JANE_MILLER.steps.map((step) => ({
        ...step,
        status: 'complete' as const,
        youDo: null,
      })),
    };
    assert.equal(journeyPlaneIndex(done), done.steps.length);
    assert.equal(journeyArrived(done), true);
    assert.equal(journeyProgress(done), 1);
    const end = journeyEndpoint('greece');
    const plane = journeyFlightPoint(1, 'greece');
    assert.equal(plane.x, end.x);
    assert.equal(plane.y, end.y);
  });

  it('flies Jane east from North America toward Europe', () => {
    const start = journeyStartPoint();
    const end = journeyEndpoint('greece');
    const plane = journeyFlightPoint(journeyProgress(JANE_MILLER), 'greece');
    assert.ok(start.x < plane.x);
    assert.ok(plane.x < end.x);
    assert.ok(end.x > WORLD_WIDTH * 0.45);
  });
});

describe('journey destination', () => {
  it('reads Lesvos from Jane’s confirmed location', () => {
    assert.deepEqual(journeyDestination(JANE_MILLER), {
      label: 'Lesvos',
      region: 'greece',
    });
  });

  it('uses Germany from the term preference when location is not listed', () => {
    const prospect = {
      ...JANE_MILLER,
      location: 'Preference not listed',
      termOfService: {
        locationPreferences: ['Germany'],
        lengthOfTerm: '3-months' as const,
        otherTerm: '',
        preferredDates: '',
        nearbyAirport: '',
      },
    };
    assert.deepEqual(journeyDestination(prospect), {
      label: 'Germany',
      region: 'germany',
    });
  });

  it('falls back to Europe when nothing is chosen', () => {
    const fresh = {
      ...JANE_MILLER,
      location: 'Preference not listed',
      termOfService: undefined,
    };
    assert.deepEqual(journeyDestination(fresh), {
      label: 'Europe',
      region: 'europe',
    });
  });
});

describe('warmer status labels', () => {
  it('keeps the same statuses with warmer words', () => {
    assert.equal(warmerStatusLabel('not_started'), 'Not started');
    assert.equal(warmerStatusLabel('waiting'), 'Waiting');
    assert.equal(warmerStatusLabel('complete'), 'Done');
    assert.equal(warmerStatusLabel('received', 'staff'), 'Waiting on i58');
    assert.equal(
      warmerStatusLabel('received', 'volunteer'),
      'Waiting on your reference',
    );
  });
});
