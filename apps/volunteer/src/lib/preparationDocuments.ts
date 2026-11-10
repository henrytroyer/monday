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

/** Stand-in addresses until the real provider links are confirmed. */
export const PROVIDER_LINKS = {
  background_check_sent: {
    href: 'https://www.sterlingvolunteers.com/',
    label: 'Open Sterling Volunteers (placeholder)',
    note: 'Placeholder link. This opens a new tab and does not submit your background check.',
  },
  safeguarding_certificate: {
    href: 'https://www.i58global.org/',
    label: 'Open the safeguarding course (placeholder)',
    note: 'Placeholder link. This opens a new tab and does not record your course.',
  },
} as const;

export const CERTIFICATE_WAITING_LINE = '... waiting for i58 to accept it ...';

export function isCertificateUpload(
  id: PreparationDocumentId,
): id is 'background_check_sent' | 'safeguarding_certificate' {
  return id === 'background_check_sent' || id === 'safeguarding_certificate';
}

/**
 * Background check and safeguarding move through four steps.
 * The last step is accepted or not accepted.
 */
export const CERTIFICATE_STAGE_CYCLE: DocumentStage[] = [
  'start',
  'continue',
  'sent',
  'accepted',
  'declined',
];

export const CERTIFICATE_STAGE_LABEL: Record<DocumentStage, string> = {
  start: 'Fill-out form',
  continue: 'Upload form',
  sent: 'Form uploaded',
  received: 'Form uploaded',
  accepted: 'Form accepted',
  declined: 'Form not accepted',
};

/** Equal quarters. The bubble is full only when the form is accepted. */
export const CERTIFICATE_STAGE_FILL: Record<DocumentStage, number> = {
  start: 25,
  continue: 50,
  sent: 75,
  received: 75,
  accepted: 100,
  declined: 75,
};

export function certificateStageLabel(stage: DocumentStage): string {
  return CERTIFICATE_STAGE_LABEL[stage];
}

export function certificateStageFill(stage: DocumentStage): number {
  return CERTIFICATE_STAGE_FILL[stage];
}

export function certificateShowsWaiting(stage: DocumentStage): boolean {
  return stage === 'sent' || stage === 'received';
}

export function stepCertificateStage(stage: DocumentStage, delta: -1 | 1): DocumentStage {
  const current = stage === 'received' ? 'sent' : stage;
  const index = CERTIFICATE_STAGE_CYCLE.indexOf(current);
  const start = index < 0 ? 0 : index;
  const next = (start + delta + CERTIFICATE_STAGE_CYCLE.length) % CERTIFICATE_STAGE_CYCLE.length;
  return CERTIFICATE_STAGE_CYCLE[next] ?? 'start';
}

export function emptyPreparationDocument(): PreparationDocumentDraft {
  return { name: '', date: '', confirmed: '', submitted: false };
}

export function documentIsEdited(draft: PreparationDocumentDraft | undefined): boolean {
  if (!draft) return false;
  return Boolean(
    draft.submitted || draft.fileName || draft.name.trim() || draft.date.trim() || draft.confirmed,
  );
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
  if (draft.fileName) {
    if (draft.review === 'declined') return CERTIFICATE_STAGE_FILL.declined;
    if (draft.review === 'accepted') return CERTIFICATE_STAGE_FILL.accepted;
    return draft.submitted ? CERTIFICATE_STAGE_FILL.sent : CERTIFICATE_STAGE_FILL.continue;
  }
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

export const CHAT_GROUP_CYCLE = ['waiting', 'added'] as const;

export type ChatGroupStage = (typeof CHAT_GROUP_CYCLE)[number];

export function chatGroupLabel(stage: ChatGroupStage): string {
  return stage === 'added' ? 'Added' : 'Waiting to be added';
}

export function stepChatGroup(stage: ChatGroupStage, delta: -1 | 1): ChatGroupStage {
  const index = CHAT_GROUP_CYCLE.indexOf(stage);
  const next = (index + delta + CHAT_GROUP_CYCLE.length) % CHAT_GROUP_CYCLE.length;
  return CHAT_GROUP_CYCLE[next] ?? 'waiting';
}

/** Chat stays a status. Added fills the bubble. Waiting leaves it empty. */
export function withChatGroupProgress(
  me: VolunteerApplicationStatus,
  stage: ChatGroupStage,
): VolunteerApplicationStatus {
  return {
    ...me,
    onboardingSteps: resolveOnboardingSteps(me).map((step) => {
      if (step.id !== 'chat_groups') return step;
      if (stage === 'added') return { ...step, status: 'complete', progress: 100 };
      return { ...step, status: 'not_started', progress: 0 };
    }),
  };
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
