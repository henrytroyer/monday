import { getTimelineById } from '../data/timelines';
import type { ContactEmailMessage } from '../types/contact';
import type { QuickBooksInvoice } from '../types/quickbooks';
import type {
  OnboardingPipeline,
  OnboardingPipelineStep,
  OnboardingStepStatus,
  Volunteer,
  VolunteerDetail,
} from '../types/volunteer';
import { findFirstOutboundEmailDate } from '../utils/onboardingEmailMatchers';
import { formatItineraryLegSummary } from '../utils/formatItinerary';
import { itineraryHasData } from '../types/itinerary';
import { hasConfirmedLocation } from '../utils/volunteerLocation';
import { hasConfirmedTerm } from '../utils/volunteerTerm';
import { isStepDone } from '../utils/onboardingPipeline';
import { getPipelineStepKind } from '../constants/onboardingPipelineSteps';
import type { PastorReferenceReceivedSnapshot } from './pastorReferenceBoard';
import { resolveVolunteerFileSlots } from '../utils/volunteerFileSlots';

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toIsoDateFromTimestamp(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function legacyStepComplete(detail: VolunteerDetail, title: string): boolean {
  return (
    detail.onboardingSteps.find((s) => s.title === title)?.status === 'Complete'
  );
}

function legacyInvoiceId(detail: VolunteerDetail): string | undefined {
  return detail.onboardingSteps.find((s) => s.title === 'Invoice Paid')
    ?.quickbooksInvoiceId;
}

function updateStep(
  steps: OnboardingPipelineStep[],
  stepId: string,
  patch: Partial<OnboardingPipelineStep>,
): OnboardingPipelineStep[] {
  return steps.map((step) =>
    step.stepId === stepId ? { ...step, ...patch } : step,
  );
}

function applyAsyncSent(
  step: OnboardingPipelineStep,
  sentDate: string | undefined,
): OnboardingPipelineStep {
  if (!sentDate) return step;
  if (step.status === 'received') {
    return {
      ...step,
      sentDate: step.sentDate ?? sentDate,
      waitingDate: step.waitingDate ?? sentDate,
    };
  }
  if (step.status === 'not_started') {
    return {
      ...step,
      status: 'waiting',
      sentDate,
      waitingDate: sentDate,
    };
  }
  return { ...step, sentDate: step.sentDate ?? sentDate };
}

function applyAsyncReceived(
  step: OnboardingPipelineStep,
  receivedDate: string | undefined,
): OnboardingPipelineStep {
  if (!receivedDate) return step;
  return {
    ...step,
    status: 'received',
    receivedDate,
    waitingDate: step.waitingDate ?? step.sentDate ?? receivedDate,
    sentDate: step.sentDate ?? step.waitingDate,
  };
}

function applySimpleComplete(
  step: OnboardingPipelineStep,
  completedDate: string,
): OnboardingPipelineStep {
  if (step.status === 'complete') {
    return { ...step, completedDate: step.completedDate ?? completedDate };
  }
  return { ...step, status: 'complete', completedDate };
}

function formatItineraryNote(detail: VolunteerDetail): string | undefined {
  if (!detail.itinerary || !itineraryHasData(detail.itinerary)) return undefined;
  const arrival = formatItineraryLegSummary(detail.itinerary.arrival);
  const departure = formatItineraryLegSummary(detail.itinerary.departure);
  const parts: string[] = [];
  if (arrival) parts.push(`Arrival: ${arrival}`);
  if (departure) parts.push(`Departure: ${departure}`);
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

function flightProjectedDate(
  volunteer: Volunteer,
  pipeline: OnboardingPipeline,
): string | undefined {
  const anchor =
    volunteer.termStart?.trim() ||
    getTimelineById(volunteer.timelineId)?.startDate ||
    pipeline.applicationReceivedAt;
  if (!anchor) return undefined;
  return addDays(anchor, -42);
}

function stepById(
  pipeline: OnboardingPipeline,
  stepId: string,
): OnboardingPipelineStep | undefined {
  return pipeline.steps.find((step) => step.stepId === stepId);
}

export function isApprovedGateMet(
  pipeline: OnboardingPipeline,
  volunteer: Volunteer,
  detail: VolunteerDetail,
): boolean {
  const pastor = stepById(pipeline, 'pastor_reference');
  const background = stepById(pipeline, 'background_check');
  const safeguarding = stepById(pipeline, 'child_safeguarding');

  const pastorDone = pastor ? isStepDone(pastor, 'async') : false;
  const backgroundDone = background ? isStepDone(background, 'async') : false;
  const safeguardingDone = safeguarding
    ? isStepDone(safeguarding, 'async')
    : false;

  return (
    pastorDone &&
    backgroundDone &&
    safeguardingDone &&
    hasConfirmedTerm(detail) &&
    hasConfirmedLocation(volunteer)
  );
}

export interface ShortTermOnboardingSyncOptions {
  volunteer: Volunteer;
  detail: VolunteerDetail;
  messages: ContactEmailMessage[];
  pastorReference?: PastorReferenceReceivedSnapshot;
  quickBooksInvoice?: QuickBooksInvoice;
}

export function syncShortTermOnboarding(
  pipeline: OnboardingPipeline,
  options: ShortTermOnboardingSyncOptions,
): OnboardingPipeline {
  const { volunteer, detail, messages, pastorReference, quickBooksInvoice } =
    options;

  let next: OnboardingPipeline = { ...pipeline };

  const applicationReceivedAt =
    toIsoDateFromTimestamp(detail.itemCreatedAt) ?? pipeline.applicationReceivedAt;
  next.applicationReceivedAt = applicationReceivedAt;

  let steps = [...next.steps];

  // Application received
  if (applicationReceivedAt) {
    steps = updateStep(steps, 'application_received', {
      status: 'complete',
      completedDate: applicationReceivedAt,
    });
  }

  // Pastor reference — email sent; Received only when Contacts "Pastor Reference"
  // connect column links a filled form item (pastorReference snapshot).
  const pastorSent = findFirstOutboundEmailDate(messages, 'pastor_reference');
  let pastorStep = steps.find((s) => s.stepId === 'pastor_reference');
  if (pastorStep) {
    pastorStep = applyAsyncSent(pastorStep, pastorSent);
    if (pastorReference?.received) {
      pastorStep = applyAsyncReceived(
        pastorStep,
        pastorReference.receivedDate ?? todayIso(),
      );
    } else if (pastorStep.status === 'received') {
      // Clear stale Received from localStorage / old status-column heuristics.
      const sentDate = pastorStep.sentDate ?? pastorSent;
      pastorStep = {
        ...pastorStep,
        status: sentDate ? 'waiting' : 'not_started',
        sentDate,
        waitingDate: sentDate ?? pastorStep.waitingDate,
        receivedDate: undefined,
      };
    }
    steps = updateStep(steps, 'pastor_reference', pastorStep);
  }

  // In review — complete when pastor reference received
  const pastorReceived = steps.find((s) => s.stepId === 'pastor_reference');
  if (pastorReceived && isStepDone(pastorReceived, 'async')) {
    steps = updateStep(
      steps,
      'in_review',
      applySimpleComplete(
        steps.find((s) => s.stepId === 'in_review') ?? {
          stepId: 'in_review',
          status: 'not_started',
        },
        pastorReceived.receivedDate ?? todayIso(),
      ),
    );
  }

  // Background check — email sent only (received deferred / manual / file)
  const backgroundSent = findFirstOutboundEmailDate(messages, 'background_check');
  let backgroundStep = steps.find((s) => s.stepId === 'background_check');
  if (backgroundStep) {
    backgroundStep = applyAsyncSent(backgroundStep, backgroundSent);
    const slots = resolveVolunteerFileSlots(detail.profilePhotoUrl, detail.files);
    if (slots.backgroundCheck) {
      backgroundStep = applyAsyncReceived(
        backgroundStep,
        backgroundStep.receivedDate ?? todayIso(),
      );
    }
    steps = updateStep(steps, 'background_check', backgroundStep);
  }

  // Child safeguarding
  const safeguardingSent = findFirstOutboundEmailDate(
    messages,
    'child_safeguarding',
  );
  let safeguardingStep = steps.find((s) => s.stepId === 'child_safeguarding');
  if (safeguardingStep) {
    safeguardingStep = applyAsyncSent(safeguardingStep, safeguardingSent);
    if (detail.childSafeguardingFile || detail.childSafeguardingReceivedDate) {
      safeguardingStep = applyAsyncReceived(
        safeguardingStep,
        detail.childSafeguardingReceivedDate ?? todayIso(),
      );
    }
    steps = updateStep(steps, 'child_safeguarding', safeguardingStep);
  }

  // Approved gate
  next = { ...next, steps };
  if (isApprovedGateMet(next, volunteer, detail)) {
    steps = updateStep(
      steps,
      'approved',
      applySimpleComplete(
        steps.find((s) => s.stepId === 'approved') ?? {
          stepId: 'approved',
          status: 'not_started',
        },
        todayIso(),
      ),
    );
  }

  // Flight info — projected date + itinerary note
  const flightProjected = flightProjectedDate(volunteer, next);
  const itineraryNote = formatItineraryNote(detail);
  const flightStep = steps.find((s) => s.stepId === 'flight_info');
  if (flightStep) {
    const flightPatch: Partial<OnboardingPipelineStep> = {};
    if (flightProjected && !flightStep.projectedDate) {
      flightPatch.projectedDate = flightProjected;
    }
    if (itineraryNote && !flightStep.note?.trim()) {
      flightPatch.note = itineraryNote;
      if (flightStep.status === 'not_started') {
        flightPatch.status = 'complete';
        flightPatch.completedDate = todayIso();
      }
    }
    if (Object.keys(flightPatch).length > 0) {
      steps = updateStep(steps, 'flight_info', { ...flightStep, ...flightPatch });
    }
  }

  // Invoice — Monday column + QuickBooks
  const invoiceId = legacyInvoiceId(detail);
  const invoicePaidLegacy = legacyStepComplete(detail, 'Invoice Paid');
  let invoiceStep = steps.find((s) => s.stepId === 'invoice');
  if (invoiceStep) {
    if (invoiceId) {
      invoiceStep = { ...invoiceStep, quickbooksInvoiceId: invoiceId };
    }
    if (quickBooksInvoice) {
      invoiceStep = {
        ...invoiceStep,
        quickbooksInvoiceId: quickBooksInvoice.id,
        paymentStatus: quickBooksInvoice.isPaid ? 'paid' : 'open',
      };
      if (quickBooksInvoice.isPaid) {
        invoiceStep = applyAsyncReceived(
          invoiceStep,
          toIsoDateFromTimestamp(quickBooksInvoice.txnDate) ?? todayIso(),
        );
      } else if (invoiceStep.status === 'not_started') {
        invoiceStep = {
          ...invoiceStep,
          status: 'waiting' as OnboardingStepStatus,
          waitingDate: invoiceStep.waitingDate ?? todayIso(),
        };
      }
    } else if (invoicePaidLegacy) {
      invoiceStep = applyAsyncReceived(invoiceStep, todayIso());
      invoiceStep = { ...invoiceStep, paymentStatus: 'paid' };
    } else if (invoiceId && invoiceStep.status === 'not_started') {
      invoiceStep = {
        ...invoiceStep,
        status: 'waiting',
        waitingDate: todayIso(),
        paymentStatus: 'open',
      };
    }
    steps = updateStep(steps, 'invoice', invoiceStep);
  }

  // Sent to field
  if (
    legacyStepComplete(detail, 'Sent To Field') ||
    volunteer.pipelineStage?.toLowerCase().includes('sent to field') ||
    volunteer.status === 'On Field' ||
    volunteer.status === 'Active'
  ) {
    steps = updateStep(
      steps,
      'sent_to_field',
      applySimpleComplete(
        steps.find((s) => s.stepId === 'sent_to_field') ?? {
          stepId: 'sent_to_field',
          status: 'not_started',
        },
        todayIso(),
      ),
    );
  }

  return { ...next, steps };
}

export function countCompletedSteps(pipeline: OnboardingPipeline): number {
  return pipeline.steps.filter((step) =>
    isStepDone(step, getPipelineStepKind(step.stepId)),
  ).length;
}
