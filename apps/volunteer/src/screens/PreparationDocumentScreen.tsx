import { useState, type FormEvent } from 'react';
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
  documentCanSubmit,
  documentIsAccepted,
  documentStage,
  emptyPreparationDocument,
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
