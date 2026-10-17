import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { JANE_MILLER, previewStatusForNewAccount } from '../mock/fixtures.ts';
import {
  applicationPhaseProgress,
  greetingBackdrop,
  journeyArrived,
  journeyDestination,
  journeyPlaneIndex,
  journeyProgress,
  warmerStatusLabel,
} from './journey.ts';
import { GERMANY_GREETING_BACKDROP, HOME_GREETING_BACKDROP } from './nav.ts';
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

describe('greeting backdrop', () => {
  const germanyPreference = {
    locationPreferences: ['Germany'],
    lengthOfTerm: '3-months' as const,
    otherTerm: '',
    preferredDates: 'Summer 2026',
    nearbyAirport: 'PHL',
  };

  it('keeps Jane on the Greece photo while she is assigned to Lesvos', () => {
    const assigned = {
      ...JANE_MILLER,
      termOfService: germanyPreference,
    };
    assert.equal(
      greetingBackdrop(journeyDestination(assigned).region),
      HOME_GREETING_BACKDROP,
    );
  });

  it('uses the Germany photo when that preference is not yet assigned', () => {
    const prospect = {
      ...JANE_MILLER,
      location: 'Preference not listed',
      termOfService: germanyPreference,
    };
    assert.equal(
      greetingBackdrop(journeyDestination(prospect).region),
      GERMANY_GREETING_BACKDROP,
    );
  });

  it('uses the Greece photo for Lesvos and Athens preferences', () => {
    for (const preference of ['Lesvos Greece', 'Athens/Malakasa Greece']) {
      const prospect = {
        ...JANE_MILLER,
        location: 'Preference not listed',
        termOfService: {
          ...germanyPreference,
          locationPreferences: [preference],
        },
      };
      assert.equal(
        greetingBackdrop(journeyDestination(prospect).region),
        HOME_GREETING_BACKDROP,
      );
    }
  });

  it('keeps the Greece photo when nothing is chosen', () => {
    const fresh = {
      ...JANE_MILLER,
      location: 'Preference not listed',
      termOfService: undefined,
    };
    assert.equal(
      greetingBackdrop(journeyDestination(fresh).region),
      HOME_GREETING_BACKDROP,
    );
  });
});

describe('application phases', () => {
  it('keeps Jane in Your info until every form in that phase is done', () => {
    const progress = applicationPhaseProgress(JANE_MILLER);
    assert.deepEqual(
      progress.phases.map((phase) => [phase.title, phase.tone, phase.done, phase.total]),
      [
        ['Your info', 'active', 2, 4],
        ['Your story', 'upcoming', 0, 3],
        ['Your service', 'upcoming', 0, 3],
      ],
    );
    assert.equal(progress.serviceComplete, false);
  });

  it('does not count waiting or received forms as done', () => {
    const aboutYou = applicationPhaseProgress(JANE_MILLER).phases[0];
    const unfinished = JANE_MILLER.steps.filter(
      (step) =>
        ['application_received', 'pastor_reference', 'in_review', 'background_check'].includes(
          step.id,
        ) && step.status !== 'complete',
    );
    assert.equal(unfinished.length, aboutYou.total - aboutYou.done);
    assert.ok(unfinished.every((step) => step.status === 'received' || step.status === 'waiting'));
  });

  it('moves to Your story only after Your info is complete', () => {
    const midStory = {
      ...JANE_MILLER,
      steps: JANE_MILLER.steps.map((step) =>
        ['application_received', 'pastor_reference', 'in_review', 'background_check'].includes(
          step.id,
        )
          ? { ...step, status: 'complete' as const }
          : step,
      ),
    };
    const progress = applicationPhaseProgress(midStory);
    assert.equal(progress.phases[0]?.tone, 'done');
    assert.equal(progress.phases[1]?.tone, 'active');
    assert.equal(progress.phases[1]?.done, 0);
    assert.equal(progress.phases[2]?.tone, 'upcoming');
  });

  it('colors the destination only when Your service is complete', () => {
    const done = {
      ...JANE_MILLER,
      steps: JANE_MILLER.steps.map((step) => ({
        ...step,
        status: 'complete' as const,
      })),
    };
    const progress = applicationPhaseProgress(done);
    assert.equal(progress.serviceComplete, true);
    assert.ok(progress.phases.every((phase) => phase.tone === 'done'));
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
