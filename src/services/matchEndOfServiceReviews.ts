import type { VolunteerTerm } from '../types/volunteer';
import { normalizePersonName } from '../utils/personNameMatch';
import {
  parseFlexibleDate,
  resolveVolunteerTermDateRange,
  type VolunteerTermDateRange,
} from '../utils/volunteerTerm';
import type { EndOfServiceReviewSummary } from './mapEndOfServiceReview';
import { mapEndOfServiceReviewItem } from './mapEndOfServiceReview';
import type { MondayBoardItem } from './mapMondayToCrm';
import {
  isRecruitmentServiceTerm,
  isServiceEndedTerm,
} from './contactServiceRecordStorage';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Match VS Exit Survey item name to the volunteer contact. */
export function exitSurveyNamesMatch(
  reviewName: string,
  contactName: string,
): boolean {
  const a = normalizePersonName(reviewName);
  const b = normalizePersonName(contactName);
  if (!a || !b) return false;
  if (a === b) return true;

  // Couples on the survey board: "Pete and Jan Bontrager"
  if (a.includes(' and ') || b.includes(' and ')) {
    const parts = a.split(/\s+and\s+/).map((p) => p.trim()).filter(Boolean);
    if (parts.some((part) => part === b || b.includes(part) || part.includes(b))) {
      return true;
    }
  }

  const aParts = a.split(' ').filter(Boolean);
  const bParts = b.split(' ').filter(Boolean);
  if (aParts.length < 2 || bParts.length < 2) return false;
  const aLast = aParts[aParts.length - 1]!;
  const bLast = bParts[bParts.length - 1]!;
  if (aLast !== bLast) return false;
  const aFirst = aParts[0]!;
  const bFirst = bParts[0]!;
  if (aFirst === bFirst) return true;
  const prefixLen = Math.min(3, aFirst.length, bFirst.length);
  return (
    prefixLen >= 2 &&
    aFirst.slice(0, prefixLen) === bFirst.slice(0, prefixLen)
  );
}

function termToVolunteerAdapter(term: VolunteerTerm) {
  return {
    id: term.itemId,
    name: '',
    locationPreference: term.locationPreference ?? '',
    location: '',
    status: term.status ?? '',
    timelineId: term.timelineId,
    preferredDates: term.timelineLabel,
    termStart: term.termStart,
    termEnd: term.termEnd,
    pipelineStage: term.pipelineStage,
  };
}

function resolveTermDateRange(term: VolunteerTerm): VolunteerTermDateRange | null {
  return resolveVolunteerTermDateRange(termToVolunteerAdapter(term));
}

function dayDistance(a: Date, b: Date): number {
  const msPerDay = 86_400_000;
  return Math.abs(
    Math.round((normalizeToNoon(a).getTime() - normalizeToNoon(b).getTime()) / msPerDay),
  );
}

function normalizeToNoon(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
}

function reviewBelongsToContact(
  review: EndOfServiceReviewSummary,
  contactId: string,
  emailNorm: string,
  contactName?: string,
): boolean {
  if (review.contactIds.includes(contactId)) return true;
  const reviewEmail = normalizeEmail(review.email);
  if (reviewEmail !== '' && emailNorm !== '' && reviewEmail === emailNorm) {
    return true;
  }
  if (contactName && exitSurveyNamesMatch(review.volunteerName, contactName)) {
    return true;
  }
  return false;
}

interface TermScore {
  termIndex: number;
  distance: number;
  midpointDistance: number;
  isServiceEnded: boolean;
  yearOverlap: boolean;
}

function scoreReviewAgainstTerm(
  reviewCompleted: Date,
  term: VolunteerTerm,
  termIndex: number,
): TermScore | null {
  const range = resolveTermDateRange(term);
  if (!range) return null;

  const endDistance = dayDistance(reviewCompleted, range.end);
  const midpoint = normalizeToNoon(
    new Date((range.start.getTime() + range.end.getTime()) / 2),
  );
  const midpointDistance = dayDistance(reviewCompleted, midpoint);
  const reviewYear = reviewCompleted.getFullYear();
  const yearOverlap =
    reviewYear >= range.start.getFullYear() &&
    reviewYear <= range.end.getFullYear();

  return {
    termIndex,
    distance: endDistance,
    midpointDistance,
    isServiceEnded: term.recordType === 'service-ended',
    yearOverlap,
  };
}

function compareTermScores(a: TermScore, b: TermScore): number {
  if (a.distance !== b.distance) return a.distance - b.distance;
  if (a.midpointDistance !== b.midpointDistance) {
    return a.midpointDistance - b.midpointDistance;
  }
  if (a.isServiceEnded !== b.isServiceEnded) {
    return a.isServiceEnded ? -1 : 1;
  }
  if (a.yearOverlap !== b.yearOverlap) {
    return a.yearOverlap ? -1 : 1;
  }
  return a.termIndex - b.termIndex;
}

export function collectContactEndOfServiceReviews(
  reviewItems: MondayBoardItem[],
  contactId: string,
  emailNorm: string,
  contactName?: string,
): EndOfServiceReviewSummary[] {
  const reviews: EndOfServiceReviewSummary[] = [];
  const seen = new Set<string>();

  for (const item of reviewItems) {
    const review = mapEndOfServiceReviewItem(item);
    if (!reviewBelongsToContact(review, contactId, emailNorm, contactName)) {
      continue;
    }
    if (seen.has(review.itemId)) continue;
    seen.add(review.itemId);
    reviews.push(review);
  }

  return reviews;
}

export function attachEndOfServiceReviewsToTerms(
  terms: VolunteerTerm[],
  reviews: EndOfServiceReviewSummary[],
): VolunteerTerm[] {
  // Prefer volunteers who have left the field (Current Service Ended terms).
  const leftFieldTerms = terms
    .map((term, index) => ({ term, index }))
    .filter(
      ({ term }) =>
        !isRecruitmentServiceTerm(term) && isServiceEndedTerm(term),
    );
  const eligibleTerms =
    leftFieldTerms.length > 0
      ? leftFieldTerms
      : terms
          .map((term, index) => ({ term, index }))
          .filter(({ term }) => !isRecruitmentServiceTerm(term));

  if (eligibleTerms.length === 0 || reviews.length === 0) {
    return terms;
  }

  const assignedTermIndices = new Set<number>();
  const reviewAssignments = new Map<string, number>();

  const sortedReviews = [...reviews].sort((a, b) => {
    const aDate = a.completedAt ? Date.parse(a.completedAt) : Number.POSITIVE_INFINITY;
    const bDate = b.completedAt ? Date.parse(b.completedAt) : Number.POSITIVE_INFINITY;
    return aDate - bDate;
  });

  for (const review of sortedReviews) {
    if (!review.completedAt?.trim()) {
      if (import.meta.env?.DEV) {
        console.debug(
          `[eos-review] Skipping review ${review.itemId} — no completion date`,
        );
      }
      continue;
    }

    const reviewCompleted = parseFlexibleDate(review.completedAt);
    if (!reviewCompleted) continue;

    const scores: TermScore[] = [];
    for (const { term, index } of eligibleTerms) {
      if (assignedTermIndices.has(index)) continue;
      const score = scoreReviewAgainstTerm(reviewCompleted, term, index);
      if (score) scores.push(score);
    }

    if (scores.length === 0) continue;

    scores.sort(compareTermScores);
    const best = scores[0];
    assignedTermIndices.add(best.termIndex);
    reviewAssignments.set(review.itemId, best.termIndex);
  }

  return terms.map((term, index) => {
    const review = sortedReviews.find(
      (candidate) => reviewAssignments.get(candidate.itemId) === index,
    );
    if (!review) return term;

    return {
      ...term,
      endOfServiceReview: {
        itemId: review.itemId,
        completedAt: review.completedAt,
        fields: review.fields,
      },
    };
  });
}

export function matchEndOfServiceReviewsForContact(
  terms: VolunteerTerm[],
  reviewItems: MondayBoardItem[],
  contactId: string,
  contactEmail: string,
  contactName?: string,
): VolunteerTerm[] {
  const emailNorm = normalizeEmail(contactEmail);
  const reviews = collectContactEndOfServiceReviews(
    reviewItems,
    contactId,
    emailNorm,
    contactName,
  );
  return attachEndOfServiceReviewsToTerms(terms, reviews);
}
