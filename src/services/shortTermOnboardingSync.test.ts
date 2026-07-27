import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ContactEmailMessage } from '../types/contact';
import { createDefaultPipeline } from '../utils/onboardingPipeline';
import { syncShortTermOnboarding, isApprovedGateMet } from './shortTermOnboardingSync';
import type { Volunteer, VolunteerDetail } from '../types/volunteer';

function baseVolunteer(): Volunteer {
  return {
    id: 'app-1',
    name: 'Jane Doe',
    locationPreference: 'Lesvos',
    location: 'Lesvos',
    status: 'Approved',
    timelineId: '2026-summer',
    termStart: '2026-07-01',
    termEnd: '2026-07-21',
  };
}

function baseDetail(): VolunteerDetail {
  return {
    ...baseVolunteer(),
    email: 'jane@example.com',
    emails: [{ role: 'volunteer', label: 'Volunteer', address: 'jane@example.com' }],
    housing: 'Team house',
    coordinator: 'Alex',
    itemCreatedAt: '2026-03-01T08:00:00.000Z',
    applicationFormFields: [],
    pastorReferenceFormFields: [],
    onboardingSteps: [],
    files: [],
    termNotes: [],
    activityTimeline: [],
    itinerary: {
      arrival: { date: '2026-07-01', time: '14:30', airport: 'MJT' },
      departure: { date: '', time: '', airport: '' },
    },
  };
}

describe('syncShortTermOnboarding', () => {
  it('marks application received from itemCreatedAt', () => {
    const pipeline = createDefaultPipeline(baseVolunteer(), false);
    const synced = syncShortTermOnboarding(pipeline, {
      volunteer: baseVolunteer(),
      detail: baseDetail(),
      messages: [],
    });

    const step = synced.steps.find((s) => s.stepId === 'application_received');
    assert.equal(step?.status, 'complete');
    assert.equal(step?.completedDate, '2026-03-01');
  });

  it('sets pastor reference waiting from outbound email', () => {
    const pipeline = createDefaultPipeline(baseVolunteer(), false);
    const messages: ContactEmailMessage[] = [
      {
        id: 'email-1',
        contactId: 'app-1',
        direction: 'outbound',
        senderName: 'Coord',
        senderEmail: 'coord@example.com',
        recipientName: 'Pastor',
        recipientEmail: 'pastor@example.com',
        subject: 'Pastor Letter 2',
        body: 'pastoral reference',
        sentAt: '2026-03-05T10:00:00.000Z',
        source: 'application',
        sourceLabel: 'Summer',
      },
    ];

    const synced = syncShortTermOnboarding(pipeline, {
      volunteer: baseVolunteer(),
      detail: baseDetail(),
      messages,
    });

    const step = synced.steps.find((s) => s.stepId === 'pastor_reference');
    assert.equal(step?.status, 'waiting');
    assert.equal(step?.sentDate, '2026-03-05');
  });

  it('auto-fills flight info from itinerary', () => {
    const pipeline = createDefaultPipeline(baseVolunteer(), false);
    const synced = syncShortTermOnboarding(pipeline, {
      volunteer: baseVolunteer(),
      detail: baseDetail(),
      messages: [],
    });

    const step = synced.steps.find((s) => s.stepId === 'flight_info');
    assert.match(step?.note ?? '', /Arrival:/);
    assert.equal(step?.projectedDate, '2026-05-20');
  });
});

describe('isApprovedGateMet', () => {
  it('requires prerequisites and confirmed term/location', () => {
    const pipeline = createDefaultPipeline(baseVolunteer(), false);
    const detail = baseDetail();
    assert.equal(isApprovedGateMet(pipeline, baseVolunteer(), detail), false);

    const synced = syncShortTermOnboarding(pipeline, {
      volunteer: baseVolunteer(),
      detail,
      messages: [],
      pastorReference: { received: true, receivedDate: '2026-03-10' },
    });

    const steps = synced.steps.map((step) => {
      if (step.stepId === 'background_check') {
        return { ...step, status: 'received' as const, receivedDate: '2026-03-12' };
      }
      if (step.stepId === 'child_safeguarding') {
        return { ...step, status: 'received' as const, receivedDate: '2026-03-14' };
      }
      return step;
    });

    const withChecks = { ...synced, steps };
    assert.equal(isApprovedGateMet(withChecks, baseVolunteer(), detail), true);
  });
});
