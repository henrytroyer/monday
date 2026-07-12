import {
  getPipelineStepDefinition,
  getPipelineStepKind,
  ONBOARDING_PIPELINE_STEPS,
  type OnboardingStepKind,
} from '../constants/onboardingPipelineSteps';
import { getTimelineById } from '../data/timelines';
import {
  loadPipeline,
  savePipeline,
} from '../services/onboardingPipelineStorage';
import type {
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

export function createDefaultPipeline(volunteer: Volunteer): OnboardingPipeline {
  return {
    volunteerId: volunteer.id,
    timelineId: volunteer.timelineId,
    steps: ONBOARDING_PIPELINE_STEPS.map((def) => createEmptyStep(def.id)),
  };
}

export function deriveStepHints(
  volunteer: Volunteer,
  detail: VolunteerDetail,
): OnboardingPipeline {
  const pipeline = createDefaultPipeline(volunteer);
  const slots = resolveVolunteerFileSlots(detail.profilePhotoUrl, detail.files);
  const hasPastorRef =
    detail.pastorReferenceFormFields.some((f) => f.answer.trim() !== '') ||
    detail.files.some((f) => /pastor.*reference|reference/i.test(f.name)) ||
    legacyStepComplete(detail, 'Pastor Reference');
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
        if (hasPastorRef) {
          step.status = 'received';
          step.waitingDate = addDays(appDate, 1);
          step.receivedDate = addDays(appDate, 5);
        } else if (volunteer.status.toLowerCase().includes('reference')) {
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
          step.status = 'received';
          step.waitingDate = addDays(appDate, 10);
          step.receivedDate = addDays(appDate, 14);
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

export function mergePipelineWithStorage(
  volunteer: Volunteer,
  detail: VolunteerDetail,
): OnboardingPipeline {
  const stored = loadPipeline(volunteer.id);
  if (stored && stored.steps.length === ONBOARDING_PIPELINE_STEPS.length) {
    return stored;
  }
  const hinted = deriveStepHints(volunteer, detail);
  savePipeline(hinted);
  return hinted;
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
): string {
  const def = getPipelineStepDefinition(step.stepId);
  const stepKind = kind ?? def?.kind ?? 'simple';

  if (step.status === 'not_started') return 'Not started';
  if (stepKind === 'simple') return 'Complete';
  if (step.status === 'waiting') return 'Waiting';
  if (step.status === 'received') {
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

export function getCurrentStep(
  pipeline: OnboardingPipeline,
): { step: OnboardingPipelineStep; definition: (typeof ONBOARDING_PIPELINE_STEPS)[number] } | null {
  for (const def of ONBOARDING_PIPELINE_STEPS) {
    const step = pipeline.steps.find((s) => s.stepId === def.id);
    if (step && !isStepDone(step, def.kind)) {
      return { step, definition: def };
    }
  }
  return null;
}

export function getNextProjectedStep(
  pipeline: OnboardingPipeline,
): { step: OnboardingPipelineStep; definition: (typeof ONBOARDING_PIPELINE_STEPS)[number] } | null {
  for (const def of ONBOARDING_PIPELINE_STEPS) {
    const step = pipeline.steps.find((s) => s.stepId === def.id);
    if (step && !isStepDone(step, def.kind) && step.projectedDate) {
      return { step, definition: def };
    }
  }
  return getCurrentStep(pipeline);
}

export function suggestProjectedDates(
  pipeline: OnboardingPipeline,
  timelineId: string,
  termStart?: string,
): OnboardingPipeline {
  const timeline = getTimelineById(timelineId);
  const startAnchor = pipeline.applicationReceivedAt ?? todayIso();
  const endAnchor =
    termStart?.trim() || timeline?.startDate || addDays(startAnchor, 60);

  const incompleteSteps = ONBOARDING_PIPELINE_STEPS.filter((def) => {
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

export function buildProgressSummary(pipeline: OnboardingPipeline): string {
  const current = getCurrentStep(pipeline);
  const lines: string[] = [];

  for (const def of ONBOARDING_PIPELINE_STEPS) {
    const step = pipeline.steps.find((s) => s.stepId === def.id);
    if (!step) continue;

    const label = getStatusLabel(step, def.kind);
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
): Record<string, string> {
  const current = getCurrentStep(pipeline);
  const next = getNextProjectedStep(pipeline);
  const doneCount = ONBOARDING_PIPELINE_STEPS.filter((def) => {
    const step = pipeline.steps.find((s) => s.stepId === def.id);
    return step && isStepDone(step, def.kind);
  }).length;

  return {
    onboardingProgressSummary: buildProgressSummary(pipeline),
    currentStepTitle: current?.definition.title ?? 'All steps complete',
    nextStepTitle: next?.definition.title ?? '',
    nextStepProjectedDate: next?.step.projectedDate
      ? formatDisplayDate(next.step.projectedDate)
      : '—',
    completedStepCount: String(doneCount),
    totalStepCount: String(ONBOARDING_PIPELINE_STEPS.length),
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
  action: 'mark_waiting' | 'mark_received' | 'mark_complete',
): OnboardingPipeline {
  const today = todayIso();
  const steps = pipeline.steps.map((step) => {
    if (step.stepId !== stepId) return step;

    const kind = getPipelineStepKind(stepId);
    if (action === 'mark_complete' && kind === 'simple') {
      return { ...step, status: 'complete' as OnboardingStepStatus, completedDate: today };
    }
    if (action === 'mark_waiting' && kind === 'async') {
      return { ...step, status: 'waiting' as OnboardingStepStatus, waitingDate: today };
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
