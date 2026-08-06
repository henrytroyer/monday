import {
  getOnboardingStepsForApplication,
  getPipelineStepDefinition,
  getPipelineStepKind,
  LONG_TERM_ONBOARDING_STEPS,
  pipelineMatchesStepDefs,
  type OnboardingPipelineStepDefinition,
  type OnboardingStepKind,
} from '../constants/onboardingPipelineSteps';
import { getTimelineById } from '../data/timelines';
import {
  loadPipeline,
  savePipeline,
} from '../services/onboardingPipelineStorage';
import type {
  OnboardingChecklistItemState,
  OnboardingPipeline,
  OnboardingPipelineStep,
  OnboardingStepStatus,
  Volunteer,
  VolunteerDetail,
} from '../types/volunteer';
import { resolveVolunteerFileSlots } from './volunteerFileSlots';

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
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

export function createEmptyStep(stepId: string): OnboardingPipelineStep {
  return { stepId, status: 'not_started' };
}

export function createDefaultPipeline(
  volunteer: Volunteer,
  isLongterm = true,
): OnboardingPipeline {
  const stepDefs = getOnboardingStepsForApplication(isLongterm);
  return {
    volunteerId: volunteer.id,
    timelineId: volunteer.timelineId,
    steps: stepDefs.map((def) => createEmptyStep(def.id)),
  };
}

export function deriveStepHints(
  volunteer: Volunteer,
  detail: VolunteerDetail,
  isLongterm = true,
): OnboardingPipeline {
  const pipeline = createDefaultPipeline(volunteer, isLongterm);
  if (isLongterm) {
    const appDate = detail.itemCreatedAt
      ? detail.itemCreatedAt.slice(0, 10)
      : undefined;
    if (appDate) pipeline.applicationReceivedAt = appDate;
    return pipeline;
  }

  const slots = resolveVolunteerFileSlots(detail.profilePhotoUrl, detail.files);
  const hasApplication =
    detail.applicationFormFields.some((f) => f.answer.trim() !== '') ||
    legacyStepComplete(detail, 'Application Submitted');

  const invoiceId = legacyInvoiceId(detail);
  const invoicePaid = legacyStepComplete(detail, 'Invoice Paid');
  const appDate = addDays(todayIso(), -7);

  pipeline.applicationReceivedAt = appDate;

  for (const step of pipeline.steps) {
    switch (step.stepId) {
      case 'application_received':
        if (hasApplication) {
          step.status = 'complete';
          step.completedDate = appDate;
        }
        break;
      case 'pastor_reference':
        // Received is set only by live sync when the Contacts connect column
        // links a filled pastor-reference form — never from status/name fields.
        if (volunteer.status.toLowerCase().includes('reference')) {
          step.status = 'waiting';
          step.waitingDate = addDays(appDate, 2);
        }
        break;
      case 'in_review':
        if (
          legacyStepComplete(detail, 'Pastor Reference') &&
          !legacyStepComplete(detail, 'Added To Chat Group')
        ) {
          step.status = 'complete';
          step.completedDate = addDays(appDate, 6);
        }
        break;
      case 'background_check':
        if (slots.backgroundCheck) {
          step.status = 'received';
          step.waitingDate = addDays(appDate, 7);
          step.receivedDate = addDays(appDate, 12);
        }
        break;
      case 'child_safeguarding':
        if (slots.childSafeguarding || detail.childSafeguardingFile) {
          const receivedDate =
            detail.childSafeguardingReceivedDate ?? addDays(appDate, 14);
          step.status = 'received';
          step.waitingDate = step.waitingDate ?? addDays(appDate, 10);
          step.receivedDate = receivedDate;
        }
        break;
      case 'invoice':
        if (invoiceId) {
          step.quickbooksInvoiceId = invoiceId;
          if (invoicePaid) {
            step.status = 'received';
            step.waitingDate = addDays(appDate, 3);
            step.receivedDate = addDays(appDate, 8);
          } else {
            step.status = 'waiting';
            step.waitingDate = addDays(appDate, 4);
          }
        }
        break;
      case 'sent_to_field':
        if (
          legacyStepComplete(detail, 'Sent To Field') ||
          volunteer.pipelineStage?.toLowerCase().includes('sent to field') ||
          volunteer.status === 'On Field' ||
          volunteer.status === 'Active'
        ) {
          step.status = 'complete';
          step.completedDate = todayIso();
        }
        break;
      default:
        break;
    }
  }

  return pipeline;
}

function syncSafeguardingStepFromDetail(
  pipeline: OnboardingPipeline,
  detail: VolunteerDetail,
): OnboardingPipeline {
  const slots = resolveVolunteerFileSlots(detail.profilePhotoUrl, detail.files);
  const hasCertificate = Boolean(
    slots.childSafeguarding || detail.childSafeguardingFile,
  );
  if (!hasCertificate) return pipeline;

  const receivedDate = detail.childSafeguardingReceivedDate ?? todayIso();
  let changed = false;

  const steps = pipeline.steps.map((step) => {
    if (step.stepId !== 'child_safeguarding') return step;
    if (step.status === 'received' && step.receivedDate === receivedDate) {
      return step;
    }
    changed = true;
    return {
      ...step,
      status: 'received' as OnboardingStepStatus,
      receivedDate,
      waitingDate: step.waitingDate ?? receivedDate,
    };
  });

  return changed ? { ...pipeline, steps } : pipeline;
}

export function mergePipelineWithStorage(
  volunteer: Volunteer,
  detail: VolunteerDetail,
  isLongterm = true,
): OnboardingPipeline {
  const stepDefs = getOnboardingStepsForApplication(isLongterm);
  const stored = loadPipeline(volunteer.id);
  const base =
    stored && pipelineMatchesStepDefs(stored, stepDefs)
      ? stored
      : deriveStepHints(volunteer, detail, isLongterm);

  const synced = isLongterm
    ? base
    : syncSafeguardingStepFromDetail(base, detail);
  if (synced !== base) {
    savePipeline(synced);
  } else if (!stored || !pipelineMatchesStepDefs(stored, stepDefs)) {
    savePipeline(synced);
  }

  return synced;
}

export function isStepDone(
  step: OnboardingPipelineStep,
  kind?: OnboardingStepKind,
): boolean {
  const stepKind = kind ?? getPipelineStepKind(step.stepId);
  if (stepKind === 'async') {
    return step.status === 'received';
  }
  return step.status === 'complete';
}

export function getStatusLabel(
  step: OnboardingPipelineStep,
  kind?: OnboardingStepKind,
  isLongterm = true,
): string {
  const def = getPipelineStepDefinition(step.stepId, isLongterm);
  const stepKind = kind ?? def?.kind ?? 'simple';

  if (step.status === 'not_started') return 'Not started';
  if (stepKind === 'simple') return 'Complete';
  if (step.status === 'waiting') return 'Waiting';
  if (step.status === 'received') {
    if (step.stepId === 'invoice' && step.paymentStatus === 'open') {
      return 'Open';
    }
    return def?.receivedLabel ?? 'Received';
  }
  return 'Not started';
}

export function isEmailDue(
  step: OnboardingPipelineStep,
  kind?: OnboardingStepKind,
): boolean {
  if (!step.projectedDate) return false;
  if (isStepDone(step, kind)) return false;
  return step.projectedDate <= todayIso();
}

export function isReminderDue(step: OnboardingPipelineStep): boolean {
  if (isStepDone(step)) return false;
  if (step.reminderDate && step.reminderDate <= todayIso()) return true;
  const items = resolveChecklistItems(step);
  return Object.values(items).some(
    (item) =>
      !item.completed &&
      Boolean(item.reminderDate) &&
      (item.reminderDate as string) <= todayIso(),
  );
}

export function resolveChecklistItems(
  step: OnboardingPipelineStep,
): Record<string, OnboardingChecklistItemState> {
  const fromItems = { ...(step.checklistItems ?? {}) };
  if (step.checklistCompleted) {
    for (const [id, completed] of Object.entries(step.checklistCompleted)) {
      if (!fromItems[id]) {
        fromItems[id] = { completed: Boolean(completed) };
      } else if (fromItems[id].completed === undefined) {
        fromItems[id] = {
          ...fromItems[id],
          completed: Boolean(completed),
        };
      }
    }
  }
  return fromItems;
}

export function isChecklistItemCompleted(
  step: OnboardingPipelineStep,
  checklistItemId: string,
): boolean {
  return Boolean(resolveChecklistItems(step)[checklistItemId]?.completed);
}

export function updateStepReminderDate(
  pipeline: OnboardingPipeline,
  stepId: string,
  reminderDate: string,
): OnboardingPipeline {
  const steps = pipeline.steps.map((step) =>
    step.stepId === stepId
      ? { ...step, reminderDate: reminderDate || undefined }
      : step,
  );
  return { ...pipeline, steps };
}

export function updateStepChecklistItem(
  pipeline: OnboardingPipeline,
  stepId: string,
  checklistItemId: string,
  patch: Partial<OnboardingChecklistItemState>,
): OnboardingPipeline {
  const today = todayIso();
  const steps = pipeline.steps.map((step) => {
    if (step.stepId !== stepId) return step;
    const checklistItems = resolveChecklistItems(step);
    const previous = checklistItems[checklistItemId] ?? {};
    const next: OnboardingChecklistItemState = { ...previous, ...patch };

    if (patch.completed === true && !previous.completed) {
      next.completedDate = previous.completedDate ?? today;
    }
    if (patch.completed === false) {
      next.completedDate = undefined;
    }

    // Normalize empty date strings to undefined
    if (next.projectedDate === '') next.projectedDate = undefined;
    if (next.reminderDate === '') next.reminderDate = undefined;

    const cleaned = { ...checklistItems };
    const hasAny =
      next.completed ||
      next.projectedDate ||
      next.reminderDate ||
      next.completedDate;
    if (hasAny) {
      cleaned[checklistItemId] = next;
    } else {
      delete cleaned[checklistItemId];
    }

    // Keep legacy map in sync for older readers
    const checklistCompleted: Record<string, boolean> = {};
    for (const [id, item] of Object.entries(cleaned)) {
      if (item.completed) checklistCompleted[id] = true;
    }

    return {
      ...step,
      checklistItems: Object.keys(cleaned).length > 0 ? cleaned : undefined,
      checklistCompleted:
        Object.keys(checklistCompleted).length > 0
          ? checklistCompleted
          : undefined,
    };
  });
  return { ...pipeline, steps };
}

const SHORT_TERM_STEP_COUNT = getOnboardingStepsForApplication(false).length;

function resolveStepDefinitions(
  pipeline: OnboardingPipeline,
  stepDefs?: readonly OnboardingPipelineStepDefinition[],
): readonly OnboardingPipelineStepDefinition[] {
  if (stepDefs) return stepDefs;
  if (pipelineMatchesStepDefs(pipeline, getOnboardingStepsForApplication(false))) {
    return getOnboardingStepsForApplication(false);
  }
  if (pipelineMatchesStepDefs(pipeline, LONG_TERM_ONBOARDING_STEPS)) {
    return LONG_TERM_ONBOARDING_STEPS;
  }
  return pipeline.steps.length === SHORT_TERM_STEP_COUNT
    ? getOnboardingStepsForApplication(false)
    : LONG_TERM_ONBOARDING_STEPS;
}

export function getCurrentStep(
  pipeline: OnboardingPipeline,
  stepDefs?: readonly OnboardingPipelineStepDefinition[],
): {
  step: OnboardingPipelineStep;
  definition: OnboardingPipelineStepDefinition;
} | null {
  const defs = resolveStepDefinitions(pipeline, stepDefs);
  for (const def of defs) {
    const step = pipeline.steps.find((s) => s.stepId === def.id);
    if (step && !isStepDone(step, def.kind)) {
      return { step, definition: def };
    }
  }
  return null;
}

export function getNextProjectedStep(
  pipeline: OnboardingPipeline,
  stepDefs?: readonly OnboardingPipelineStepDefinition[],
): {
  step: OnboardingPipelineStep;
  definition: OnboardingPipelineStepDefinition;
} | null {
  const defs = resolveStepDefinitions(pipeline, stepDefs);
  for (const def of defs) {
    const step = pipeline.steps.find((s) => s.stepId === def.id);
    if (step && !isStepDone(step, def.kind) && step.projectedDate) {
      return { step, definition: def };
    }
  }
  return getCurrentStep(pipeline, stepDefs);
}

export function suggestProjectedDates(
  pipeline: OnboardingPipeline,
  timelineId: string,
  termStart?: string,
  stepDefs: readonly OnboardingPipelineStepDefinition[] = LONG_TERM_ONBOARDING_STEPS,
): OnboardingPipeline {
  const timeline = getTimelineById(timelineId);
  const startAnchor = pipeline.applicationReceivedAt ?? todayIso();
  const endAnchor =
    termStart?.trim() || timeline?.startDate || addDays(startAnchor, 60);

  const incompleteSteps = stepDefs.filter((def) => {
    const step = pipeline.steps.find((s) => s.stepId === def.id);
    return step && !isStepDone(step, def.kind);
  });

  const count = incompleteSteps.length;
  if (count === 0) return pipeline;

  const startMs = new Date(startAnchor + 'T00:00:00').getTime();
  const endMs = new Date(endAnchor + 'T00:00:00').getTime();
  const span = Math.max(endMs - startMs, count * 24 * 60 * 60 * 1000);

  const updatedSteps = pipeline.steps.map((step) => {
    const def = getPipelineStepDefinition(step.stepId);
    if (!def || isStepDone(step, def.kind)) return step;

    const index = incompleteSteps.findIndex((d) => d.id === step.stepId);
    if (index < 0) return step;

    const fraction = (index + 1) / (count + 1);
    const projectedMs = startMs + span * fraction;
    const d = new Date(projectedMs);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    return { ...step, projectedDate: iso };
  });

  return { ...pipeline, steps: updatedSteps };
}

export function buildProgressSummary(
  pipeline: OnboardingPipeline,
  stepDefs?: readonly OnboardingPipelineStepDefinition[],
): string {
  const defs = resolveStepDefinitions(pipeline, stepDefs);
  const current = getCurrentStep(pipeline, defs);
  const lines: string[] = [];

  for (const def of defs) {
    const step = pipeline.steps.find((s) => s.stepId === def.id);
    if (!step) continue;

    const label = getStatusLabel(
      step,
      def.kind,
      defs === getOnboardingStepsForApplication(false),
    );
    const isDone = isStepDone(step, def.kind);
    const isCurrent = current?.step.stepId === step.stepId;
    const prefix = isDone ? '✓' : isCurrent ? '→' : ' ';

    let datePart = '';
    if (def.kind === 'simple' && step.completedDate) {
      datePart = ` (${formatDisplayDate(step.completedDate)})`;
    } else if (def.kind === 'async') {
      if (step.status === 'waiting' && step.waitingDate) {
        datePart = ` (since ${formatDisplayDate(step.waitingDate)})`;
      } else if (step.status === 'received' && step.receivedDate) {
        datePart = ` (${formatDisplayDate(step.receivedDate)})`;
      }
    }
    if (!isDone && step.projectedDate && !datePart) {
      datePart = ` (projected ${formatDisplayDate(step.projectedDate)})`;
    }

    lines.push(`${prefix} ${def.title} — ${label}${datePart}`);
  }

  return lines.join('\n');
}

export function buildOnboardingMergeContext(
  pipeline: OnboardingPipeline,
  isLongterm = true,
): Record<string, string> {
  const stepDefs = getOnboardingStepsForApplication(isLongterm);
  const current = getCurrentStep(pipeline, stepDefs);
  const next = getNextProjectedStep(pipeline, stepDefs);
  const doneCount = stepDefs.filter((def) => {
    const step = pipeline.steps.find((s) => s.stepId === def.id);
    return step && isStepDone(step, def.kind);
  }).length;

  return {
    onboardingProgressSummary: buildProgressSummary(pipeline, stepDefs),
    currentStepTitle: current?.definition.title ?? 'All steps complete',
    nextStepTitle: next?.definition.title ?? '',
    nextStepProjectedDate: next?.step.projectedDate
      ? formatDisplayDate(next.step.projectedDate)
      : '—',
    completedStepCount: String(doneCount),
    totalStepCount: String(stepDefs.length),
  };
}

export function getOnboardingStepLabel(pipeline: OnboardingPipeline): string {
  const current = getCurrentStep(pipeline);
  if (!current) return 'Complete';
  const label = getStatusLabel(current.step, current.definition.kind);
  return `${current.definition.title} — ${label}`;
}

export function updateStepStatus(
  pipeline: OnboardingPipeline,
  stepId: string,
  action:
    | 'mark_waiting'
    | 'mark_received'
    | 'mark_complete'
    | 'mark_incomplete',
): OnboardingPipeline {
  const today = todayIso();
  const steps = pipeline.steps.map((step) => {
    if (step.stepId !== stepId) return step;

    const kind = getPipelineStepKind(stepId);
    if (action === 'mark_complete' && kind === 'simple') {
      return { ...step, status: 'complete' as OnboardingStepStatus, completedDate: today };
    }
    if (action === 'mark_incomplete') {
      return {
        ...step,
        status: 'not_started' as OnboardingStepStatus,
        completedDate: undefined,
        receivedDate: undefined,
      };
    }
    if (action === 'mark_waiting' && kind === 'async') {
      return {
        ...step,
        status: 'waiting' as OnboardingStepStatus,
        waitingDate: today,
        sentDate: today,
      };
    }
    if (action === 'mark_received' && kind === 'async') {
      return { ...step, status: 'received' as OnboardingStepStatus, receivedDate: today };
    }
    return step;
  });

  return { ...pipeline, steps };
}

export function updateStepProjectedDate(
  pipeline: OnboardingPipeline,
  stepId: string,
  projectedDate: string,
): OnboardingPipeline {
  const steps = pipeline.steps.map((step) =>
    step.stepId === stepId ? { ...step, projectedDate: projectedDate || undefined } : step,
  );
  return { ...pipeline, steps };
}

export function updateStepNote(
  pipeline: OnboardingPipeline,
  stepId: string,
  note: string,
): OnboardingPipeline {
  const steps = pipeline.steps.map((step) =>
    step.stepId === stepId ? { ...step, note: note || undefined } : step,
  );
  return { ...pipeline, steps };
}

export function updateStepInvoiceId(
  pipeline: OnboardingPipeline,
  invoiceId: string,
): OnboardingPipeline {
  const steps = pipeline.steps.map((step) =>
    step.stepId === 'invoice'
      ? { ...step, quickbooksInvoiceId: invoiceId }
      : step,
  );
  return { ...pipeline, steps };
}
