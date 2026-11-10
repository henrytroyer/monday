import { useRef, useState, type FormEvent } from 'react';
import type {
  PreparationDocumentId,
  VolunteerApplicationStatus,
  VolunteerApplicationUpdate,
} from '../contract/volunteerApi';
import { BackButton } from '../components/BackButton';
import { DocumentStageMark } from '../components/PreparationDocumentsBand';
import { FormCard } from '../components/FormCard';
import { useSaveOnExit } from '../lib/useSaveOnExit';
import {
  DOCUMENT_FIELDS,
  DOCUMENT_STAGE_LABEL,
  PROVIDER_LINKS,
  documentCanSubmit,
  documentIsAccepted,
  documentStage,
  emptyPreparationDocument,
  CERTIFICATE_WAITING_LINE,
  certificateShowsWaiting,
  certificateStageLabel,
  isCertificateUpload,
  savePreparationDocument,
} from '../lib/preparationDocuments';

export function PreparationDocumentScreen({
  me,
  documentId,
  onBack,
  onUpdateMe,
}: {
  me: VolunteerApplicationStatus;
  documentId: PreparationDocumentId;
  onBack: () => void;
  onUpdateMe: (next: VolunteerApplicationUpdate) => void;
}) {
  const saved = me.preparationDocuments?.[documentId] ?? emptyPreparationDocument();
  if (isCertificateUpload(documentId)) {
    return (
      <CertificateUpload
        me={me}
        documentId={documentId}
        saved={saved}
        onBack={onBack}
        onUpdateMe={onUpdateMe}
      />
    );
  }
  return (
    <AnswerForm
      me={me}
      documentId={documentId}
      saved={saved}
      onBack={onBack}
      onUpdateMe={onUpdateMe}
    />
  );
}

function AnswerForm({
  me,
  documentId,
  saved,
  onBack,
  onUpdateMe,
}: {
  me: VolunteerApplicationStatus;
  documentId: PreparationDocumentId;
  saved: ReturnType<typeof emptyPreparationDocument>;
  onBack: () => void;
  onUpdateMe: (next: VolunteerApplicationUpdate) => void;
}) {
  const fields = DOCUMENT_FIELDS[documentId];
  const [name, setName] = useState(saved.name);
  const [date, setDate] = useState(saved.date);
  const [confirmed, setConfirmed] = useState(saved.confirmed);
  const draft = {
    name,
    date,
    confirmed,
    submitted: saved.submitted,
  };
  const ready = documentCanSubmit(draft);
  const stage = documentStage(
    { ...draft, review: saved.review },
    documentIsAccepted(me, documentId),
  );

  useSaveOnExit(draft, (next) => {
    onUpdateMe((current) => savePreparationDocument(current, documentId, next));
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready) return;
    onUpdateMe((current) =>
      savePreparationDocument(current, documentId, { ...draft, submitted: true }),
    );
    onBack();
  }

  return (
    <FormCard onSubmit={handleSubmit}>
      <BackButton onClick={onBack} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy">{fields.title}</h1>
          <p className="mt-2 text-sm font-semibold text-navy">{DOCUMENT_STAGE_LABEL[stage]}</p>
        </div>
        <DocumentStageMark stage={stage} />
      </div>
      <p className="mt-2 text-sm text-crm-slate">
        These questions are placeholders. Your answers stay on this application.
      </p>
      <div className="mt-6 flex flex-col gap-5">
        <div>
          <label className="text-sm font-semibold text-crm-heading" htmlFor={`${documentId}-name`}>
            {fields.nameLabel}
          </label>
          <input
            id={`${documentId}-name`}
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-2 min-h-11 w-full rounded-lg border border-crm-taupe/35 bg-white px-3 text-base text-crm-text outline-none focus:border-navy focus:ring-2 focus:ring-navy/15"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-crm-heading" htmlFor={`${documentId}-date`}>
            {fields.dateLabel}
          </label>
          <input
            id={`${documentId}-date`}
            type="date"
            required
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="mt-2 min-h-11 w-full rounded-lg border border-crm-taupe/35 bg-white px-3 text-base text-crm-text outline-none focus:border-navy focus:ring-2 focus:ring-navy/15"
          />
        </div>
        <label className="flex min-h-12 items-center gap-3 text-sm font-semibold text-crm-heading">
          <input
            type="checkbox"
            checked={confirmed === 'yes'}
            onChange={(event) => setConfirmed(event.target.checked ? 'yes' : '')}
            className="h-4 w-4 accent-navy"
          />
          {fields.confirmLabel}
        </label>
      </div>
      <div className="mt-6 flex flex-col items-center gap-3">
        {stage === 'sent' ? (
          <p className="text-center text-sm font-bold text-[#1f9d55]">
            Thank-you for submitting this form, you will be notified when i58 marks it as received
          </p>
        ) : saved.submitted ? (
          <p className="text-center text-sm text-crm-slate">Sent. You can still update these answers.</p>
        ) : null}
        <button
          type="submit"
          disabled={!ready || saved.submitted}
          className="min-h-11 rounded-full bg-crm-terracotta px-5 text-sm font-semibold text-white shadow-sm hover:brightness-95 disabled:cursor-not-allowed disabled:bg-crm-slate"
        >
          {saved.submitted ? 'Submitted' : 'Submit'}
        </button>
      </div>
    </FormCard>
  );
}

function CertificateUpload({
  me,
  documentId,
  saved,
  onBack,
  onUpdateMe,
}: {
  me: VolunteerApplicationStatus;
  documentId: 'background_check_sent' | 'safeguarding_certificate';
  saved: ReturnType<typeof emptyPreparationDocument>;
  onBack: () => void;
  onUpdateMe: (next: VolunteerApplicationUpdate) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const link = PROVIDER_LINKS[documentId];
  const stage = documentStage(saved, documentIsAccepted(me, documentId));

  function storeFile(file: File) {
    onUpdateMe((current) =>
      savePreparationDocument(current, documentId, {
        name: file.name,
        date: '',
        confirmed: '',
        fileName: file.name,
        submitted: true,
        review: current.preparationDocuments?.[documentId]?.review,
      }),
    );
  }

  return (
    <FormCard>
      <BackButton onClick={onBack} label="Home" />
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy">
            {DOCUMENT_FIELDS[documentId].title}
          </h1>
          <p className="mt-2 text-sm font-semibold text-navy">{certificateStageLabel(stage)}</p>
          {certificateShowsWaiting(stage) ? (
            <p className="mt-1 text-sm text-crm-slate">{CERTIFICATE_WAITING_LINE}</p>
          ) : null}
        </div>
        <DocumentStageMark stage={stage} />
      </div>

      <div className="mt-8 grid items-stretch gap-4 sm:grid-cols-2">
        <section className="flex flex-col rounded-2xl bg-[#f7f4ef] px-4 py-5 ring-1 ring-navy/10">
          <h2 className="text-sm font-semibold text-navy">1. Fill out the form</h2>
          <p className="mt-1 text-sm leading-6 text-crm-slate">
            Complete it with the provider. They email you the certificate.
          </p>
          <a
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex min-h-11 w-fit items-center rounded-full bg-navy px-5 text-sm font-semibold text-white hover:brightness-110"
          >
            {link.label}
          </a>
          <p className="mt-2 text-sm text-crm-slate">{link.note}</p>
        </section>

        <section className="flex flex-col rounded-2xl bg-[#f7f4ef] px-4 py-5 ring-1 ring-navy/10">
          <h2 className="text-sm font-semibold text-navy">2. Upload the certificate as a PDF</h2>
          <input
            ref={fileInputRef}
            id={`${documentId}-certificate`}
            type="file"
            accept="application/pdf"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) storeFile(file);
            }}
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex min-h-11 cursor-pointer items-center rounded-full bg-crm-terracotta px-5 text-sm font-semibold text-white shadow-sm hover:brightness-95"
            >
              {saved.fileName ? 'Replace file' : 'Choose file'}
            </button>
            <p className="text-sm text-navy">{saved.fileName ?? 'No file chosen'}</p>
          </div>
        </section>
      </div>

      {documentId === 'background_check_sent' ? (
        <div className="mt-8 rounded-2xl bg-[#fff7f4] px-5 py-4 ring-1 ring-[#ff4700]/25">
          <img
            src="/brand/sterling-volunteers.svg"
            alt="Sterling Volunteers"
            className="h-14 w-auto"
          />
        </div>
      ) : null}
    </FormCard>
  );
}
