import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { VolunteerTerm } from '../types/volunteer';
import {
  attachEndOfServiceReviewsToTerms,
  collectContactEndOfServiceReviews,
} from './matchEndOfServiceReviews';
import type { MondayBoardItem } from './mapMondayToCrm';

function makeTerm(overrides: Partial<VolunteerTerm> & Pick<VolunteerTerm, 'itemId' | 'timelineId' | 'timelineLabel'>): VolunteerTerm {
  return {
    notes: [],
    status: 'Complete',
    pipelineStage: 'Sent To Field',
    ...overrides,
  };
}

function makeReviewItem(
  id: string,
  name: string,
  options: {
    createdAt?: string;
    completedDate?: string;
    contactIds?: string[];
    email?: string;
  } = {},
): MondayBoardItem {
  const columnValues = [];

  if (options.email) {
    columnValues.push({
      id: 'email',
      text: options.email,
      type: 'email',
      column: { title: 'Email' },
    });
  }

  if (options.contactIds?.length) {
    columnValues.push({
      id: 'contacts',
      text: '',
      type: 'board_relation',
      linked_item_ids: options.contactIds,
      column: { title: 'Contacts' },
    });
  }

  if (options.completedDate) {
    columnValues.push({
      id: 'completed',
      text: options.completedDate,
      type: 'date',
      value: JSON.stringify({ date: options.completedDate }),
      column: { title: 'Date Volunteer left' },
    });
  }

  return {
    id,
    name,
    created_at: options.createdAt ?? `${options.completedDate ?? '2024-02-07'}T12:00:00Z`,
    column_values: columnValues,
  };
}

describe('collectContactEndOfServiceReviews', () => {
  it('matches reviews by contact link and email', () => {
    const items = [
      makeReviewItem('r1', 'Alex', {
        contactIds: ['contact-1'],
        email: 'alex@example.com',
        completedDate: '2024-02-10',
      }),
      makeReviewItem('r2', 'Other', {
        contactIds: ['contact-2'],
        email: 'other@example.com',
        completedDate: '2024-03-01',
      }),
    ];

    const reviews = collectContactEndOfServiceReviews(
      items,
      'contact-1',
      'alex@example.com',
    );

    assert.equal(reviews.length, 1);
    assert.equal(reviews[0].itemId, 'r1');
  });
});

describe('attachEndOfServiceReviewsToTerms', () => {
  it('assigns review to the term with the closest end date', () => {
    const terms = [
      makeTerm({
        itemId: 'term-a',
        timelineId: '2023-fall',
        timelineLabel: 'Fall 2023',
        termStart: '2023-09-01',
        termEnd: '2023-12-15',
        recordType: 'service-ended',
      }),
      makeTerm({
        itemId: 'term-b',
        timelineId: '2024-spring',
        timelineLabel: 'Spring 2024',
        termStart: '2024-01-15',
        termEnd: '2024-02-15',
        recordType: 'service-ended',
      }),
    ];

    const reviews = [
      {
        itemId: 'review-1',
        volunteerName: 'Alex',
        completedAt: '2024-02-07',
        contactIds: ['contact-1'],
        email: 'alex@example.com',
        fields: [{ id: 'q1', question: 'Overall rating', answer: '5', columnType: 'rating' }],
      },
    ];

    const attached = attachEndOfServiceReviewsToTerms(terms, reviews);
    const springTerm = attached.find((term) => term.itemId === 'term-b');

    assert.ok(springTerm?.endOfServiceReview);
    assert.equal(springTerm.endOfServiceReview?.itemId, 'review-1');
    assert.equal(attached.find((term) => term.itemId === 'term-a')?.endOfServiceReview, undefined);
  });

  it('assigns two reviews to two distinct terms', () => {
    const terms = [
      makeTerm({
        itemId: 'term-a',
        timelineId: '2023-fall',
        timelineLabel: 'Fall 2023',
        termStart: '2023-09-01',
        termEnd: '2023-12-15',
        recordType: 'service-ended',
      }),
      makeTerm({
        itemId: 'term-b',
        timelineId: '2024-spring',
        timelineLabel: 'Spring 2024',
        termStart: '2024-01-15',
        termEnd: '2024-04-20',
        recordType: 'service-ended',
      }),
    ];

    const reviews = [
      {
        itemId: 'review-a',
        volunteerName: 'Alex',
        completedAt: '2023-12-20',
        contactIds: [],
        email: '',
        fields: [],
      },
      {
        itemId: 'review-b',
        volunteerName: 'Alex',
        completedAt: '2024-02-07',
        contactIds: [],
        email: '',
        fields: [],
      },
    ];

    const attached = attachEndOfServiceReviewsToTerms(terms, reviews);
    assert.equal(attached[0].endOfServiceReview?.itemId, 'review-a');
    assert.equal(attached[1].endOfServiceReview?.itemId, 'review-b');
  });

  it('skips reviews without a completion date', () => {
    const terms = [
      makeTerm({
        itemId: 'term-a',
        timelineId: '2024-spring',
        timelineLabel: 'Spring 2024',
        termStart: '2024-01-15',
        termEnd: '2024-04-20',
      }),
    ];

    const attached = attachEndOfServiceReviewsToTerms(terms, [
      {
        itemId: 'review-a',
        volunteerName: 'Alex',
        contactIds: [],
        email: '',
        fields: [],
      },
    ]);

    assert.equal(attached[0].endOfServiceReview, undefined);
  });
});
