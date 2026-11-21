import type { ReactNode } from 'react';
import type {
  PreparationDocumentId,
  VolunteerApplicationStatus,
  VolunteerApplicationUpdate,
} from '../contract/volunteerApi';
import { downloadPreparationDocumentPdf } from '../lib/preparationDocumentPdf';
import {
  DOCUMENT_FIELDS,
  DOCUMENT_STAGE_LABEL,
  PREVIEW_DOCUMENT_STAGE_ARROWS,
  CERTIFICATE_WAITING_LINE,
  acceptPreparationDocument,
  certificateShowsWaiting,
  certificateStageLabel,
  declinePreparationDocument,
  documentIsAccepted,
  documentStage,
  isCertificateUpload,
  staffUploadWaitingLine,
  stepCertificateStage,
  stepStaffUpload,
  type DocumentStage,
  type StaffUploadStage,
} from '../lib/preparationDocuments';

const FORM_DOCUMENT_IDS = ['background_check_sent', 'safeguarding_certificate'] as const;

export function PreparationDocumentsBand({
  me,
  previewStages = {},
  flightsUpload,
  trainingUpload,
  onFlightsUpload,
  onTrainingUpload,
  onPreviewStage,
  onOpenDocument,
  onOpenTraining,
  onUpdateMe,
}: {
  me: VolunteerApplicationStatus;
  previewStages?: Partial<Record<PreparationDocumentId, DocumentStage>>;
  flightsUpload: StaffUploadStage;
  trainingUpload: StaffUploadStage;
  onFlightsUpload: (stage: StaffUploadStage) => void;
  onTrainingUpload: (stage: StaffUploadStage) => void;
  onPreviewStage?: (id: PreparationDocumentId, stage: DocumentStage) => void;
  onOpenDocument: (id: PreparationDocumentId) => void;
  onOpenTraining: () => void;
  onUpdateMe: (next: VolunteerApplicationUpdate) => void;
}) {
  return (
    <section className="relative left-1/2 w-screen -translate-x-1/2 bg-gradient-to-b from-[#667b96] via-[#647fa8] to-[#224a6d] py-8">
      <div className="mx-auto max-w-4xl px-5">
        <div className="mb-4 hidden grid-cols-4 gap-3 md:grid">
          <h2 className="col-span-2 font-display text-2xl font-semibold text-white!">Documents</h2>
          <h2 className="col-span-2 font-display text-2xl font-semibold text-white!">
            Flights & Training
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <h2 className="font-display text-2xl font-semibold text-white! md:hidden">Documents</h2>
          {FORM_DOCUMENT_IDS.map((id) => (
            <DocumentCard
              key={id}
              me={me}
              id={id}
              previewStage={PREVIEW_DOCUMENT_STAGE_ARROWS ? previewStages[id] : undefined}
              onPreviewStage={(stage) => onPreviewStage?.(id, stage)}
              onOpen={() => onOpenDocument(id)}
              onUpdateMe={onUpdateMe}
            />
          ))}
          <h2 className="mt-6 font-display text-2xl font-semibold text-white! md:hidden">
            Flights & Training
          </h2>
          <DocumentCard
            me={me}
            id="flights"
            uploadStage={flightsUpload}
            onUploadStage={(delta) => onFlightsUpload(stepStaffUpload(flightsUpload, delta))}
            onPreviewStage={() => undefined}
            onOpen={() => onOpenDocument('flights')}
            onUpdateMe={onUpdateMe}
          />
          <TrainingCard
            uploaded={trainingUpload === 'uploaded'}
            onUploadStage={(delta) => onTrainingUpload(stepStaffUpload(trainingUpload, delta))}
            onOpen={onOpenTraining}
          />
        </div>
      </div>
    </section>
  );
}

function DocumentCard({
  me,
  id,
  previewStage,
  uploadStage = 'waiting',
  onUploadStage,
  onPreviewStage,
  onOpen,
  onUpdateMe,
}: {
  me: VolunteerApplicationStatus;
  id: PreparationDocumentId;
  previewStage?: DocumentStage;
  uploadStage?: StaffUploadStage;
  onUploadStage?: (delta: -1 | 1) => void;
  onPreviewStage: (stage: DocumentStage) => void;
  onOpen: () => void;
  onUpdateMe: (next: VolunteerApplicationUpdate) => void;
}) {
  const draft = me.preparationDocuments?.[id];
  const accepted = documentIsAccepted(me, id);
  const sent = Boolean(draft?.submitted);
  const stage = documentStage(draft, accepted);
  const shown = previewStage ?? stage;
  const title = DOCUMENT_FIELDS[id].title;
  const certificate = isCertificateUpload(id);
  const formCard = id !== 'flights';
  const uploaded = !formCard && uploadStage === 'uploaded';

  return (
    <CardShell title={title} mark={formCard ? <StageGlyph stage={shown} /> : <FlightsGlyph />}>
      <button type="button" onClick={onOpen} className={cardActionClass}>
        {formCard
          ? certificate
            ? certificateStageLabel(shown)
            : DOCUMENT_STAGE_LABEL[shown]
          : 'View your itinerary'}
      </button>
      {!formCard ? <StaffWaitingNote kind="flights" uploaded={uploaded} /> : null}
      {certificate && certificateShowsWaiting(shown) ? (
        <p className={cardNoteClass}>{CERTIFICATE_WAITING_LINE}</p>
      ) : null}
      {formCard && !certificate && shown === 'sent' ? (
        <p className={cardNoteClass}>... waiting for i58 to receive it ...</p>
      ) : null}
      {formCard && !certificate && shown === 'received' ? (
        <p className={cardNoteClass}>... waiting for i58 to accept it ...</p>
      ) : null}
      {sent && draft && !certificate ? (
        <button
          type="button"
          onClick={() => downloadPreparationDocumentPdf(id, draft, me.name)}
          className={cardQuietClass}
        >
          Download PDF
        </button>
      ) : null}
      {PREVIEW_DOCUMENT_STAGE_ARROWS && formCard ? (
        <PreviewStageArrows
          previousLabel="Previous form stage"
          nextLabel="Next form stage"
          onStep={(delta) => onPreviewStage(stepCertificateStage(shown, delta))}
        />
      ) : null}
      {PREVIEW_DOCUMENT_STAGE_ARROWS && onUploadStage ? (
        <PreviewStageArrows
          previousLabel="Previous flights stage"
          nextLabel="Next flights stage"
          onStep={onUploadStage}
        />
      ) : null}
      {formCard && previewStage == null && stage === 'received' ? (
        <div className="flex w-full flex-wrap justify-center gap-x-3 gap-y-1">
          <button
            type="button"
            onClick={() => onUpdateMe((current) => acceptPreparationDocument(current, id))}
            className="text-xs font-semibold text-crm-terracotta hover:underline"
          >
            Mark accepted
          </button>
          <button
            type="button"
            onClick={() => onUpdateMe((current) => declinePreparationDocument(current, id))}
            className="text-xs font-semibold text-crm-terracotta hover:underline"
          >
            Mark not accepted
          </button>
        </div>
      ) : null}
    </CardShell>
  );
}

function TrainingCard({
  uploaded,
  onUploadStage,
  onOpen,
}: {
  uploaded: boolean;
  onUploadStage: (delta: -1 | 1) => void;
  onOpen: () => void;
}) {
  return (
    <CardShell title="Team Training" mark={<TrainingGlyph />}>
      <button type="button" onClick={onOpen} className={cardActionClass}>
        View training details
      </button>
      <StaffWaitingNote kind="training" uploaded={uploaded} />
      {PREVIEW_DOCUMENT_STAGE_ARROWS ? (
        <PreviewStageArrows
          previousLabel="Previous training stage"
          nextLabel="Next training stage"
          onStep={onUploadStage}
        />
      ) : null}
    </CardShell>
  );
}

export function PreviewStageArrows({
  previousLabel,
  nextLabel,
  onStep,
}: {
  previousLabel: string;
  nextLabel: string;
  onStep: (delta: -1 | 1) => void;
}) {
  return (
    <div className="flex w-full items-center justify-between gap-2">
      <button
        type="button"
        aria-label={previousLabel}
        onClick={() => onStep(-1)}
        className="flex h-7 w-7 shrink-0 items-center justify-center border border-navy bg-white text-xs text-navy hover:bg-navy hover:text-white!"
      >
        ←
      </button>
      <p className="text-center text-[10px] font-semibold leading-tight text-crm-terracotta">
        Remove before production
      </p>
      <button
        type="button"
        aria-label={nextLabel}
        onClick={() => onStep(1)}
        className="flex h-7 w-7 shrink-0 items-center justify-center border border-navy bg-white text-xs text-navy hover:bg-navy hover:text-white!"
      >
        →
      </button>
    </div>
  );
}

const cardActionClass =
  'inline-flex h-auto min-h-8 items-center self-center border border-navy bg-navy px-3 py-1.5 text-center text-xs font-semibold leading-tight text-white! hover:bg-navy-dark';

const cardNoteClass = 'w-full text-center text-xs leading-snug text-crm-slate';

function StaffWaitingNote({
  kind,
  uploaded,
}: {
  kind: 'flights' | 'training';
  uploaded: boolean;
}) {
  const line = staffUploadWaitingLine(kind, uploaded);
  if (!line) return null;
  return <p className={cardNoteClass}>{line}</p>;
}

const cardQuietClass =
  'inline-flex h-8 items-center self-center border border-navy/25 bg-white px-3 text-xs font-semibold text-navy hover:border-navy';

function CardShell({
  title,
  mark,
  children,
}: {
  title: string;
  mark: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="flex h-full flex-col border border-[#c9d0d8] bg-white">
      <div className="flex items-center justify-center gap-2.5 border-b border-[#e4e8ed] px-3.5 py-3 text-center">
        <span className="flex h-6 w-7 shrink-0 items-center justify-center text-navy">{mark}</span>
        <h3 className="text-center font-display text-[15px] font-bold leading-tight text-navy">
          {title}
        </h3>
      </div>
      <div className="flex flex-1 flex-col items-center gap-2.5 px-3.5 py-3 text-center">{children}</div>
    </article>
  );
}

function StageGlyph({ stage }: { stage: DocumentStage }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      aria-hidden
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <StageIcon stage={stage} />
    </svg>
  );
}

function FlightsGlyph() {
  return (
    <span
      aria-hidden
      className="h-6 w-8 bg-current [mask-image:url('/brand/flights-airplane.png?v=navy')] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]"
    />
  );
}

function TrainingGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      aria-hidden
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.6" y="4.4" width="16.8" height="11.2" rx="1.4" />
      <path d="M8 19.6h8M12 15.6v4" />
    </svg>
  );
}

export function DocumentStageMark({ stage }: { stage: DocumentStage }) {
  return <StageBubble stage={stage} />;
}

function StageBubble({ stage }: { stage: DocumentStage }) {
  const accepted = stage === 'accepted';
  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
        accepted ? 'bg-[#1f9d55] text-white!' : 'bg-crm-taupe text-navy'
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        aria-hidden
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <StageIcon stage={stage} />
      </svg>
    </span>
  );
}

function StageIcon({ stage }: { stage: DocumentStage }) {
  switch (stage) {
    case 'start':
      return <rect x="6" y="3.4" width="12" height="17.2" rx="1.6" />;
    case 'continue':
      return (
        <>
          <rect x="3.6" y="3.4" width="11.2" height="15.2" rx="1.4" />
          <path d="M6.2 8h6.2M6.2 11.2h4" />
          <path d="M13.4 13.4 18.8 8l1.8 1.8-5.4 5.4-2.4.6.6-2.4Z" />
        </>
      );
    case 'sent':
      return (
        <>
          <path d="M3.6 11.4 20.4 4.4 14.2 20.2 11.2 13.2 3.6 11.4Z" />
          <path d="M11.2 13.2 20.4 4.4" />
        </>
      );
    case 'received':
      return (
        <>
          <path d="M4.2 13.2h3.6l1.4 2h5.6l1.4-2h3.6" />
          <path d="M5.4 13.2 7 6.4h10l1.6 6.8v5.2H5.4v-5.2Z" />
        </>
      );
    case 'accepted':
      return <path d="M7.2 12.4 10.4 15.6 16.8 8.6" />;
    case 'declined':
      return (
        <>
          <path d="M8 8 16 16" />
          <path d="M16 8 8 16" />
        </>
      );
  }
}
