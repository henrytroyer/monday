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
  acceptPreparationDocument,
  declinePreparationDocument,
  documentIsAccepted,
  documentStage,
  stepDocumentStage,
  type DocumentStage,
} from '../lib/preparationDocuments';

const FORM_DOCUMENT_IDS = ['background_check_sent', 'safeguarding_certificate'] as const;

export function PreparationDocumentsBand({
  me,
  previewStages = {},
  onPreviewStage,
  onOpenDocument,
  onOpenTraining,
  onUpdateMe,
}: {
  me: VolunteerApplicationStatus;
  previewStages?: Partial<Record<PreparationDocumentId, DocumentStage>>;
  onPreviewStage?: (id: PreparationDocumentId, stage: DocumentStage) => void;
  onOpenDocument: (id: PreparationDocumentId) => void;
  onOpenTraining: () => void;
  onUpdateMe: (next: VolunteerApplicationUpdate) => void;
}) {
  return (
    <section className="relative left-1/2 w-screen -translate-x-1/2 bg-[#d4dbe3] py-8">
      <div className="mx-auto max-w-5xl px-5">
        <h2 className="font-display text-2xl font-semibold text-navy">Documents</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
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
        </div>
        <h2 className="mt-10 font-display text-2xl font-semibold text-navy">Flights & Training</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <DocumentCard
            me={me}
            id="flights"
            onPreviewStage={() => undefined}
            onOpen={() => onOpenDocument('flights')}
            onUpdateMe={onUpdateMe}
          />
          <TrainingCard onOpen={onOpenTraining} />
        </div>
      </div>
    </section>
  );
}

function DocumentCard({
  me,
  id,
  previewStage,
  onPreviewStage,
  onOpen,
  onUpdateMe,
}: {
  me: VolunteerApplicationStatus;
  id: PreparationDocumentId;
  previewStage?: DocumentStage;
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
  const formCard = id !== 'flights';

  return (
    <article className="flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-white/70">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-lg font-semibold text-navy">{title}</h3>
        {formCard ? <StageBubble stage={shown} /> : <FlightsMark />}
      </div>
      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="min-h-11 rounded-full bg-navy px-4 text-sm font-semibold leading-tight text-white hover:brightness-110"
        >
          {formCard ? DOCUMENT_STAGE_LABEL[shown] : 'View your itinerary'}
        </button>
        {formCard && shown === 'sent' ? (
          <p className="px-2 text-center text-sm text-crm-slate">
            ... waiting for i58 to receive it ...
          </p>
        ) : null}
        {sent && draft ? (
          <button
            type="button"
            onClick={() => downloadPreparationDocumentPdf(id, draft)}
            className="min-h-11 rounded-full bg-white px-4 text-sm font-semibold text-navy ring-1 ring-navy/20 hover:bg-navy/5"
          >
            Download PDF
          </button>
        ) : null}
        {PREVIEW_DOCUMENT_STAGE_ARROWS && formCard ? (
          <div className="mt-1 flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label="Previous form stage"
              onClick={() => onPreviewStage(stepDocumentStage(shown, -1))}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-white hover:brightness-110"
            >
              ←
            </button>
            <p className="text-center text-[11px] font-semibold leading-tight text-crm-terracotta">
              Remove before production
            </p>
            <button
              type="button"
              aria-label="Next form stage"
              onClick={() => onPreviewStage(stepDocumentStage(shown, 1))}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-white hover:brightness-110"
            >
              →
            </button>
          </div>
        ) : null}
        {formCard && previewStage == null && stage === 'received' ? (
          <>
            <button
              type="button"
              onClick={() => onUpdateMe((current) => acceptPreparationDocument(current, id))}
              className="min-h-11 rounded-full px-4 text-sm font-semibold text-crm-terracotta hover:bg-white"
            >
              Mark accepted
            </button>
            <button
              type="button"
              onClick={() => onUpdateMe((current) => declinePreparationDocument(current, id))}
              className="min-h-11 rounded-full px-4 text-sm font-semibold text-crm-terracotta hover:bg-white"
            >
              Mark not accepted
            </button>
          </>
        ) : null}
      </div>
    </article>
  );
}

function TrainingCard({ onOpen }: { onOpen: () => void }) {
  return (
    <article className="flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-white/70">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-lg font-semibold text-navy">Team Training</h3>
        <TrainingMark />
      </div>
      <div className="mt-5">
        <button
          type="button"
          onClick={onOpen}
          className="min-h-11 w-full rounded-full bg-navy px-4 text-sm font-semibold text-white hover:brightness-110"
        >
          View training details
        </button>
      </div>
    </article>
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
        accepted ? 'bg-[#1f9d55] text-white' : 'bg-crm-taupe text-navy'
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

function TrainingMark() {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-crm-taupe text-navy">
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
        <rect x="3.6" y="4.4" width="16.8" height="11.2" rx="1.4" />
        <path d="M8 19.6h8M12 15.6v4" />
      </svg>
    </span>
  );
}

function FlightsMark() {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-crm-taupe">
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
        <image href="/brand/flights-airplane.png?v=navy" x="1" y="4.2" width="22" height="15.6" />
      </svg>
    </span>
  );
}
