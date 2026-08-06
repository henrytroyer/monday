/**
 * slimBillingTerms.ts — Finance-safe VolunteerTerm projection (no HR notes/files).
 */

import type { VolunteerTerm } from '../types/volunteer';

/** Keep only fields Finance needs for billing / invoice UI. */
export function slimBillingTerm(term: VolunteerTerm): VolunteerTerm {
  return {
    itemId: term.itemId,
    timelineId: term.timelineId,
    timelineLabel: term.timelineLabel,
    termStart: term.termStart,
    termEnd: term.termEnd,
    status: term.status,
    notes: [],
    pipelineStage: term.pipelineStage,
    quickbooksInvoiceId: term.quickbooksInvoiceId,
    locationPreference: term.locationPreference,
    recordType: term.recordType,
    recruitmentProspectId: term.recruitmentProspectId,
    linkedApplicationItemId: term.linkedApplicationItemId,
  };
}

export function slimBillingTerms(terms: VolunteerTerm[]): VolunteerTerm[] {
  return terms.map(slimBillingTerm);
}
