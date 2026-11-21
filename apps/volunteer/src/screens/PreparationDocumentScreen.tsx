import { useEffect, useRef, useState, type FormEvent } from 'react';
import type {
  PreparationDocumentId,
  VolunteerApplicationStatus,
  VolunteerApplicationUpdate,
} from '../contract/volunteerApi';
import { BackButton } from '../components/BackButton';
import { CertificatePdfThumb } from '../components/CertificatePdfThumb';
import { DocumentStageMark, PreviewStageArrows } from '../components/PreparationDocumentsBand';
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
  isCertificateUpload,
  PREVIEW_DOCUMENT_STAGE_ARROWS,
  savePreparationDocument,
} from '../lib/preparationDocuments';
import { backgroundCheckAvailability } from '../lib/teamDates';

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

function PdfUploadButton({
  id,
  disabled,
  onFile,
  sterling = false,
  kaya = false,
  flush = false,
  label = 'Upload PDF',
}: {
  id: string;
  disabled?: boolean;
  onFile: (file: File) => void;
  sterling?: boolean;
  kaya?: boolean;
  flush?: boolean;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className={
        flush && sterling ? 'shrink-0' : flush ? 'min-w-0 flex-1' : sterling || kaya ? 'mt-4' : 'mt-3'
      }
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        aria-label="Choose a PDF from your computer"
        className={
          kaya
            ? `inline-flex w-full items-center justify-center gap-3 rounded-full border border-[#dee2e6] bg-white px-4 text-base font-semibold text-[#384042] hover:border-[#F76D36] hover:bg-[#f8f9fa] disabled:cursor-not-allowed disabled:opacity-50 ${flush ? 'h-11' : 'min-h-11 py-2.5'}`
            : sterling
              ? 'inline-flex min-h-11 items-center gap-3 rounded bg-[#ff4700] px-4 text-sm font-bold tracking-wide text-white uppercase hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50'
              : 'inline-flex rounded-lg p-1 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50'
        }
      >
        {kaya ? (
          <>
            <img src="/brand/upload-file.png" alt="" className="h-8 w-8" />
            {label}
          </>
        ) : sterling ? (
          <span className="inline-flex h-9 w-9 items-center justify-center rounded bg-white">
            <img src="/brand/upload-file.png" alt="" className="h-7 w-7" />
          </span>
        ) : (
          <img src="/brand/upload-file.png" alt="" className="h-12 w-12" />
        )}
        {sterling ? label : null}
      </button>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="application/pdf"
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
        }}
      />
    </div>
  );
}

function UploadedCertificate({
  file,
  fileName,
  kaya = false,
  compact = false,
}: {
  file: File | null;
  fileName: string;
  kaya?: boolean;
  compact?: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);

  const page = url ? (
    <div
      className={`relative shrink-0 overflow-hidden rounded border border-[#d7d7d7] bg-white shadow-sm ${compact ? 'h-11 w-8' : 'h-28 w-20'}`}
    >
      <embed
        src={`${url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
        type="application/pdf"
        title={fileName}
        className="pointer-events-none h-full w-full"
      />
      {compact ? null : <div aria-hidden className="absolute inset-x-0 bottom-0 h-4 bg-white" />}
    </div>
  ) : (
    <CertificatePdfThumb kaya={kaya} compact={compact} />
  );

  if (compact) {
    return (
      <div className="upload-pop flex h-11 shrink-0 items-center gap-1.5" role="status">
        <span
          className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white ${kaya ? 'bg-[#F76D36]' : 'bg-[#ff4700]'}`}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 12.5 9.2 17 19 7"
            />
          </svg>
          <span className="sr-only">Upload received</span>
        </span>
        {page}
        <span className="sr-only">{fileName}</span>
      </div>
    );
  }

  return (
    <div className="upload-pop mt-4 flex items-center gap-3" role="status">
      <span
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white ${kaya ? 'bg-[#F76D36]' : 'bg-[#ff4700]'}`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 12.5 9.2 17 19 7"
          />
        </svg>
        <span className="sr-only">Upload received</span>
      </span>
      {page}
      <p className={`min-w-0 text-sm ${kaya ? 'text-[#384042]' : 'text-[#3a3a3a]'}`}>{fileName}</p>
    </div>
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
  const link = PROVIDER_LINKS[documentId];
  const stage = documentStage(saved, documentIsAccepted(me, documentId));
  const background =
    documentId === 'background_check_sent' ? backgroundCheckAvailability(me) : null;
  const providerOpen = background == null || background.open;
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUploaded, setPreviewUploaded] = useState(() => Boolean(saved.fileName));

  function storeFile(file: File) {
    setUploadedFile(file);
    setPreviewUploaded(true);
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

  const backgroundCheck = documentId === 'background_check_sent';
  const showUpload = PREVIEW_DOCUMENT_STAGE_ARROWS ? previewUploaded : Boolean(saved.fileName);
  const uploadName = saved.fileName || 'certificate.pdf';

  const card = (
    <>
      {backgroundCheck ? null : (
        <h1 className="mt-2 whitespace-nowrap text-[clamp(1.35rem,4.6vw,2rem)] font-normal leading-none text-[#384042]">
          {DOCUMENT_FIELDS[documentId].title}
        </h1>
      )}

      {backgroundCheck ? (
        <div>
          <div className="grid gap-4 sm:grid-cols-2">
            <section className="flex flex-col items-center bg-[#fafafa] px-4 py-6 text-center">
              <h2 className="text-lg font-bold text-[#1c1c1c]">1. Fill out background check</h2>
              {providerOpen ? (
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 text-base font-semibold text-[#ff4700] hover:brightness-110"
                >
                  {link.label}
                  <span aria-hidden="true">→</span>
                </a>
              ) : (
                <p className="mt-3 text-base leading-7 text-[#4a4a4a]">{background?.note}</p>
              )}
              <div className="mt-6 flex flex-col items-center">
                <p className="text-sm font-semibold text-[#5c5c5c]">Good Deed Code</p>
                <p className="mt-2 inline-block bg-white px-3 py-2 text-lg font-bold tracking-[0.14em] text-[#1c1c1c] ring-1 ring-[#d7d7d7]">
                  184273
                </p>
              </div>
            </section>

            <section className="flex flex-col items-center justify-center bg-[#fafafa] px-4 py-6 text-center">
              <h2 className="text-lg font-bold text-[#1c1c1c]">2. Upload background check</h2>
              <div className="mt-4 flex h-11 max-w-full items-center justify-center gap-2">
                {showUpload ? (
                  <UploadedCertificate
                    key={`${uploadName}-${uploadedFile?.size ?? 0}`}
                    file={uploadedFile}
                    fileName={uploadName}
                    compact
                  />
                ) : null}
                <PdfUploadButton
                  id={`${documentId}-certificate`}
                  disabled={!providerOpen}
                  onFile={storeFile}
                  sterling
                  flush
                  label={showUpload ? 'Replace PDF' : 'Upload PDF'}
                />
              </div>
            </section>
          </div>

          {PREVIEW_DOCUMENT_STAGE_ARROWS ? (
            <div className="mt-8">
              <PreviewStageArrows
                previousLabel="Previous upload stage"
                nextLabel="Next upload stage"
                onStep={() => setPreviewUploaded((current) => !current)}
              />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-8">
          <h2 className="text-xl font-normal text-[#384042]">1. Fill out this certificate</h2>
          <a
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex h-11 w-full items-center justify-center rounded-full bg-[#F76D36] px-4 text-base font-semibold text-white hover:bg-[#f65211]"
          >
            {link.label}
          </a>
          <hr className="my-6 border-[#dee2e6]" />
          <h2 className="text-xl font-normal text-[#384042]">2. Upload the certificate as a PDF</h2>
          <div className="mt-4 flex h-11 items-center gap-2">
            {showUpload ? (
              <UploadedCertificate
                key={`${uploadName}-${uploadedFile?.size ?? 0}`}
                file={uploadedFile}
                fileName={uploadName}
                compact
              />
            ) : null}
            <PdfUploadButton
              id={`${documentId}-certificate`}
              onFile={storeFile}
              kaya
              flush
              label={showUpload ? 'Replace PDF' : 'Upload PDF'}
            />
          </div>
          {PREVIEW_DOCUMENT_STAGE_ARROWS ? (
            <div className="mt-8">
              <PreviewStageArrows
                previousLabel="Previous upload stage"
                nextLabel="Next upload stage"
                onStep={() => setPreviewUploaded((current) => !current)}
              />
            </div>
          ) : null}
        </div>
      )}
    </>
  );

  if (!backgroundCheck) {
    return (
      <div className="relative left-1/2 -mt-8 min-h-[calc(100dvh-4.5rem)] w-screen -translate-x-1/2 pb-10">
        <img
          src="/brand/safeguarding-camp.jpg"
          alt=""
          className="pointer-events-none absolute inset-x-0 -top-10 h-[calc(100%+2.5rem)] w-full object-cover object-center brightness-105"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-10 z-[1] h-[calc(100%+2.5rem)] bg-white/70"
        />
        <button
          type="button"
          onClick={onBack}
          className="site-nav-link absolute top-4 left-5 z-20 inline-flex w-fit items-center gap-1"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <path
              fill="currentColor"
              d="M14.7 5.3a1 1 0 0 1 0 1.4L9.42 12l5.3 5.3a1 1 0 1 1-1.42 1.4l-6-6a1 1 0 0 1 0-1.4l6-6a1 1 0 0 1 1.42 0z"
            />
          </svg>
          Home
        </button>
        <div className="kaya-card relative z-10 mx-auto mt-4 w-[min(500px,calc(100%-2.5rem))] rounded-2xl bg-white px-8 py-10 shadow-[0_0.5rem_1rem_rgba(0,0,0,0.15)] sm:px-12 sm:py-12">
          <img
            src="/brand/humanitarian-leadership-academy.png?v=2"
            alt="Humanitarian Leadership Academy"
            className="mx-auto mb-8 h-16 w-auto sm:mb-12 sm:h-20"
          />
          {card}
        </div>
      </div>
    );
  }

  return (
    <div className="relative left-1/2 -mt-8 min-h-[calc(100dvh-4.5rem)] w-screen -translate-x-1/2">
      <img
        src="/brand/sterling-team.png"
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="pointer-events-none absolute inset-0 bg-white/65" />
      <button
        type="button"
        onClick={onBack}
        className="site-nav-link absolute top-4 left-5 z-20 inline-flex w-fit items-center gap-1"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path
            fill="currentColor"
            d="M14.7 5.3a1 1 0 0 1 0 1.4L9.42 12l5.3 5.3a1 1 0 1 1-1.42 1.4l-6-6a1 1 0 0 1 0-1.4l6-6a1 1 0 0 1 1.42 0z"
          />
        </svg>
        Home
      </button>
      <div className="relative z-10 grid min-h-[calc(100dvh-4.5rem)] grid-rows-[minmax(6.5rem,1fr)_auto_1fr] px-5">
        <div className="flex items-end justify-center pb-5">
          <img
            src="/brand/sterling-volunteers.svg"
            alt="Sterling Volunteers"
            className="h-20 w-auto"
          />
        </div>
        <div className="mx-auto w-full max-w-3xl bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-[#ececec] bg-[#fafafa] px-6 py-4 sm:px-8">
            <h1 className="text-xl font-semibold tracking-tight text-[#323e48]">
              {DOCUMENT_FIELDS[documentId].title}
            </h1>
            <DocumentStageMark stage={stage} />
          </div>
          <div className="px-6 py-8 sm:px-8">{card}</div>
        </div>
        <div />
      </div>
    </div>
  );
}
