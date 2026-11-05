import { useState, type FormEvent, type ReactNode } from 'react';
import { useSaveOnExit } from '../lib/useSaveOnExit';
import type {
  VolunteerApplicationStatus,
  VolunteerGuidelines,
} from '../contract/volunteerApi';
import { BackButton } from '../components/BackButton';
import { FormCard } from '../components/FormCard';
import { SubmissionThanksOverlay } from '../components/SubmissionThanksOverlay';
import {
  AGREEMENT_LABEL,
  AGREEMENT_NOTE,
  AGREEMENT_SECTION,
  DRESS_CODE_BRACELET_NOTE,
  DRESS_CODE_GENERAL_BULLETS,
  DRESS_CODE_GENERAL_HEADING,
  DRESS_CODE_HEADING,
  DRESS_CODE_LADIES_BULLETS,
  DRESS_CODE_LADIES_HEADING,
  DRESS_CODE_MEN_BULLETS,
  DRESS_CODE_MEN_HEADING,
  emptyGuidelines,
  GUIDELINES_BANNER,
  isGuidelinesComplete,
  PERSONAL_CONDUCT_BULLETS,
  PERSONAL_CONDUCT_HEADING,
} from '../process/guidelines';

export function GuidelinesScreen({
  me,
  onBack,
  backLabel,
  onSave,
  onSubmit,
  onFinished,
}: {
  me: VolunteerApplicationStatus;
  onBack: () => void;
  backLabel: 'Back' | 'Home';
  onSave: (draft: VolunteerGuidelines) => void;
  onSubmit: (draft: VolunteerGuidelines) => void;
  onFinished: () => void;
}) {
  const [draft, setDraft] = useState<VolunteerGuidelines>(
    () => me.guidelines ?? emptyGuidelines(),
  );
  useSaveOnExit(draft, onSave);
  const [submitted, setSubmitted] = useState(false);
  const allowSubmit = isGuidelinesComplete(draft);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!allowSubmit) return;
    onSubmit(draft);
    setSubmitted(true);
  }

  return (
    <>
      <FormCard onSubmit={handleSubmit} hidden={submitted} className={submitted ? 'invisible' : undefined}>
        <BackButton label={backLabel} onClick={onBack} />

        <p className="mt-5 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white">
          {GUIDELINES_BANNER}
        </p>

        <SectionHeading>{PERSONAL_CONDUCT_HEADING}</SectionHeading>
        <BulletList items={PERSONAL_CONDUCT_BULLETS} />
        <hr className="mt-6 border-crm-taupe/40" />

        <SectionHeading>{DRESS_CODE_HEADING}</SectionHeading>
        <p className="mt-4 text-sm font-semibold text-crm-heading">
          {DRESS_CODE_LADIES_HEADING}
        </p>
        <BulletList items={DRESS_CODE_LADIES_BULLETS} />
        <p className="mt-4 text-sm font-semibold text-crm-heading">
          {DRESS_CODE_MEN_HEADING}
        </p>
        <BulletList items={DRESS_CODE_MEN_BULLETS} />
        <p className="mt-4 text-sm italic leading-relaxed text-crm-heading">
          {DRESS_CODE_BRACELET_NOTE}
        </p>
        <p className="mt-4 text-sm font-semibold text-crm-heading">
          {DRESS_CODE_GENERAL_HEADING}
        </p>
        <BulletList items={DRESS_CODE_GENERAL_BULLETS} />

        <div className="mt-8 flex items-center gap-4 text-xs font-medium text-crm-slate">
          <span className="h-px flex-1 bg-crm-taupe/40" />
          {AGREEMENT_SECTION}
          <span className="h-px flex-1 bg-crm-taupe/40" />
        </div>

        <p className="mt-5 text-sm font-semibold text-crm-heading">
          {AGREEMENT_LABEL}
          <span className="text-advise-rose"> *</span>
        </p>
        <button
          type="button"
          role="switch"
          aria-checked={draft.agreed}
          aria-label={AGREEMENT_LABEL}
          onClick={() => setDraft({ agreed: !draft.agreed })}
          className={`mt-3 flex h-7 w-12 items-center rounded-full p-0.5 transition-colors ${
            draft.agreed ? 'bg-navy' : 'bg-crm-taupe/60'
          }`}
        >
          <span
            className={`h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
              draft.agreed ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>

        <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-navy">
          <div className="flex gap-3">
            <span aria-hidden="true" className="mt-0.5 shrink-0">
              ℹ️
            </span>
            <p>{AGREEMENT_NOTE}</p>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <button
            type="submit"
            disabled={!allowSubmit}
            className="min-h-10 rounded-md bg-navy px-8 text-[15px] font-medium text-white hover:bg-navy-dark disabled:cursor-not-allowed disabled:bg-crm-slate"
          >
            Submit
          </button>
        </div>
      </FormCard>
      {submitted ? <SubmissionThanksOverlay onFinished={onFinished} /> : null}
    </>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="mt-6 text-center text-lg font-semibold text-navy underline">
      {children}
    </h3>
  );
}

function BulletList({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-crm-heading">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
