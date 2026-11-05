import type {
  OnboardingStepId,
  PreparationDocumentDraft,
  PreparationDocumentId,
  PreparationDocumentReview,
  VolunteerApplicationStatus,
} from '../contract/volunteerApi';
import { resolveOnboardingSteps } from './onboarding';

export const PREPARATION_DOCUMENT_IDS = [
  'background_check_sent',
  'safeguarding_certificate',
  'flights',
] as const satisfies readonly PreparationDocumentId[];

/** Water stops short of full until the document is accepted. */
export const DOCUMENT_FILL_CAP = 85;

export const DOCUMENT_FIELD_TOTAL = 3;

export const DOCUMENT_FIELDS: Record<
  PreparationDocumentId,
  { title: string; nameLabel: string; dateLabel: string; confirmLabel: string }
> = {
  background_check_sent: {
    title: 'Background check',
    nameLabel: 'Full legal name',
    dateLabel: 'Date of birth',
    confirmLabel: 'I consent to this background check',
  },
  safeguarding_certificate: {
    title: 'Safeguarding certificate',
    nameLabel: 'Certificate holder',
    dateLabel: 'Completion date',
    confirmLabel: 'I confirm this certificate is mine',
  },
  flights: {
    title: 'Flights',
    nameLabel: 'Departure airport',
    dateLabel: 'Preferred travel date',
    confirmLabel: 'I confirm these travel details',
  },
};

export function emptyPreparationDocument(): PreparationDocumentDraft {
  return { name: '', date: '', confirmed: '', submitted: false };
}

export function documentIsEdited(draft: PreparationDocumentDraft | undefined): boolean {
  if (!draft) return false;
  return Boolean(draft.submitted || draft.name.trim() || draft.date.trim() || draft.confirmed);
}

export function documentFieldCount(draft: PreparationDocumentDraft): number {
  return [
    draft.name.trim().length > 0,
    draft.date.trim().length > 0,
    draft.confirmed === 'yes',
  ].filter(Boolean).length;
}

/** Share of the bubble used while the form is open or sent, never a full fill. */
export function documentProgress(draft: PreparationDocumentDraft): number {
  return Math.round((documentFieldCount(draft) / DOCUMENT_FIELD_TOTAL) * DOCUMENT_FILL_CAP);
}

export function documentCanSubmit(draft: PreparationDocumentDraft): boolean {
  return documentFieldCount(draft) === DOCUMENT_FIELD_TOTAL;
}

export type DocumentStage =
  | 'start'
  | 'continue'
  | 'sent'
  | 'received'
  | 'accepted'
  | 'declined';

export const DOCUMENT_STAGE_LABEL: Record<DocumentStage, string> = {
  start: 'Fill out this form',
  continue: 'Continue filling out this form',
  sent: 'Form completed & sent',
  received: 'Form received by i58',
  accepted: 'Form accepted',
  declined: 'Form not accepted',
};

/** Turn this off and delete the card arrows before production. */
export const PREVIEW_DOCUMENT_STAGE_ARROWS = true;

export const DOCUMENT_STAGE_CYCLE: DocumentStage[] = [
  'start',
  'continue',
  'sent',
  'received',
  'accepted',
  'declined',
];

/**
 * Timeline water for each card stage. The five forward stages rise in equal
 * steps, and the bubble is full only when the form is accepted.
 */
export const DOCUMENT_STAGE_FILL: Record<DocumentStage, number> = {
  start: 0,
  continue: 25,
  sent: 50,
  received: 75,
  accepted: 100,
  declined: 75,
};

export function documentStageFill(stage: DocumentStage): number {
  return DOCUMENT_STAGE_FILL[stage];
}

/** Waiting for staff, then the itinerary or training details are on the card. */
export const STAFF_UPLOAD_CYCLE = ['waiting', 'uploaded'] as const;

export type StaffUploadStage = (typeof STAFF_UPLOAD_CYCLE)[number];

const STAFF_UPLOAD_WAITING = {
  flights: '... waiting for i58 to upload flight info ...',
  training: '... waiting for i58 to upload training info ...',
} as const;

/**
 * Flights and Team Training stay empty until i58 uploads, then the bubble is full.
 * Other preparation steps are left as they are.
 */
export function withStaffUploadProgress(
  me: VolunteerApplicationStatus,
  uploads: { flights: StaffUploadStage; training: StaffUploadStage },
): VolunteerApplicationStatus {
  return {
    ...me,
    onboardingSteps: resolveOnboardingSteps(me).map((step) => {
      const stage =
        step.id === 'flights' ? uploads.flights : step.id === 'team_training' ? uploads.training : null;
      if (stage == null) return step;
      if (stage === 'uploaded') return { ...step, status: 'complete', progress: 100 };
      return { ...step, status: 'not_started', progress: 0 };
    }),
  };
}

/** Copy under the card, and on the opened page, until i58 uploads the details. */
export function staffUploadWaitingLine(
  kind: keyof typeof STAFF_UPLOAD_WAITING,
  uploaded: boolean,
): string | null {
  if (uploaded) return null;
  return STAFF_UPLOAD_WAITING[kind];
}

/** Preview-only. Switches a flights or training card between waiting and uploaded. */
export function stepStaffUpload(stage: StaffUploadStage, delta: -1 | 1): StaffUploadStage {
  const index = STAFF_UPLOAD_CYCLE.indexOf(stage);
  const next = (index + delta + STAFF_UPLOAD_CYCLE.length) % STAFF_UPLOAD_CYCLE.length;
  return STAFF_UPLOAD_CYCLE[next] ?? 'waiting';
}

/** Preview-only. Steps the card label and icon without writing the account. */
export function stepDocumentStage(stage: DocumentStage, delta: -1 | 1): DocumentStage {
  const index = DOCUMENT_STAGE_CYCLE.indexOf(stage);
  const next = (index + delta + DOCUMENT_STAGE_CYCLE.length) % DOCUMENT_STAGE_CYCLE.length;
  return DOCUMENT_STAGE_CYCLE[next] ?? 'start';
}

export function documentStage(
  draft: PreparationDocumentDraft | undefined,
  accepted = false,
): DocumentStage {
  if (draft?.review === 'declined') return 'declined';
  if (draft?.review === 'accepted' || accepted) return 'accepted';
  if (draft?.review === 'received') return 'received';
  if (draft?.submitted) return 'sent';
  if (documentIsEdited(draft)) return 'continue';
  return 'start';
}

export function documentIsAccepted(me: VolunteerApplicationStatus, id: PreparationDocumentId): boolean {
  return resolveOnboardingSteps(me).some((step) => step.id === id && step.status === 'received');
}

export function savePreparationDocument(
  me: VolunteerApplicationStatus,
  id: PreparationDocumentId,
  draft: PreparationDocumentDraft,
): VolunteerApplicationStatus {
  const existing = me.preparationDocuments?.[id];
  const nextDraft: PreparationDocumentDraft = {
    ...draft,
    submitted: Boolean(draft.submitted || existing?.submitted),
    review: draft.review ?? existing?.review,
  };
  return writeDocument(me, id, nextDraft);
}

export function receivePreparationDocument(
  me: VolunteerApplicationStatus,
  id: PreparationDocumentId,
): VolunteerApplicationStatus {
  return withReview(me, id, 'received');
}

export function declinePreparationDocument(
  me: VolunteerApplicationStatus,
  id: PreparationDocumentId,
): VolunteerApplicationStatus {
  const draft = me.preparationDocuments?.[id];
  if (draft?.review !== 'received') return me;
  return withReview(me, id, 'declined');
}

export function acceptPreparationDocument(
  me: VolunteerApplicationStatus,
  id: PreparationDocumentId,
): VolunteerApplicationStatus {
  const draft = me.preparationDocuments?.[id];
  if (!draft?.submitted) return me;
  const steps = resolveOnboardingSteps(me).map((step) =>
    step.id === id ? { ...step, status: 'received' as const, progress: undefined } : step,
  );
  return {
    ...me,
    preparationDocuments: {
      ...me.preparationDocuments,
      [id]: { ...draft, review: 'accepted' },
    },
    onboardingSteps: steps,
  };
}

function withReview(
  me: VolunteerApplicationStatus,
  id: PreparationDocumentId,
  review: PreparationDocumentReview,
): VolunteerApplicationStatus {
  const draft = me.preparationDocuments?.[id];
  if (!draft?.submitted || draft.review === 'accepted' || draft.review === 'declined') return me;
  return {
    ...me,
    preparationDocuments: {
      ...me.preparationDocuments,
      [id]: { ...draft, review },
    },
  };
}

function writeDocument(
  me: VolunteerApplicationStatus,
  id: PreparationDocumentId,
  draft: PreparationDocumentDraft,
): VolunteerApplicationStatus {
  const accepted = documentIsAccepted(me, id);
  const steps = resolveOnboardingSteps(me).map((step) => {
    if (step.id !== id) return step;
    if (accepted) return { ...step, status: 'received' as const, progress: undefined };
    return {
      ...step,
      status: draft.submitted ? ('waiting' as const) : ('not_started' as const),
      progress: documentProgress(draft),
    };
  });
  return {
    ...me,
    preparationDocuments: { ...me.preparationDocuments, [id]: draft },
    onboardingSteps: steps,
  };
}

export function isPreparationDocument(id: OnboardingStepId): id is PreparationDocumentId {
  return (PREPARATION_DOCUMENT_IDS as readonly string[]).includes(id);
}
