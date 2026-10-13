import { useState, type FormEvent, type ReactNode } from 'react';
import type {
  VolunteerApplicationStatus,
  VolunteerGuidelines,
} from '../contract/volunteerApi';
import { BackButton } from '../components/BackButton';
import { FormCard } from '../components/FormCard';
import {
  AGREEMENT_LABEL,
  AGREEMENT_NOTE,
  AGREEMENT_SECTION,
  COPY_EMAIL_PLACEHOLDER,
  COPY_HEADING,
  COPY_HINT,
  COPY_SEND_LABEL,
  COPY_SENT_MESSAGE,
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
  isCopyEmailValid,
  isGuidelinesComplete,
  PERSONAL_CONDUCT_BULLETS,
  PERSONAL_CONDUCT_HEADING,
  THANK_YOU_CONTACT_END,
  THANK_YOU_CONTACT_LEAD,
  THANK_YOU_EMAIL,
  THANK_YOU_PHONE,
  THANK_YOU_SUBTITLE,
  THANK_YOU_TITLE,
  THANK_YOU_WAIT,
} from '../process/guidelines';

export function GuidelinesScreen({
  me,
  onBack,
  onSubmit,
  onFinished,
}: {
  me: VolunteerApplicationStatus;
  onBack: () => void;
  onSubmit: (draft: VolunteerGuidelines) => void;
  onFinished: () => void;
}) {
  const [draft, setDraft] = useState<VolunteerGuidelines>(
    () => me.guidelines ?? emptyGuidelines(),
  );
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
      <FormCard onSubmit={handleSubmit} hidden={submitted}>
        <BackButton onClick={onBack} />

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
      {submitted ? <ThankYouDialog onBack={onFinished} /> : null}
    </>
  );
}

function ThankYouDialog({ onBack }: { onBack: () => void }) {
  const [copyEmail, setCopyEmail] = useState('');
  const [copySent, setCopySent] = useState(false);
  const allowSend = isCopyEmailValid(copyEmail);

  function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!allowSend) return;
    setCopySent(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-10">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="guidelines-thank-you-title"
        className="w-full max-w-md rounded-2xl bg-white px-5 py-8 shadow-lg"
      >
        <BackButton onClick={onBack} />
        <h2
          id="guidelines-thank-you-title"
          className="mt-4 text-center text-xl font-semibold leading-snug text-crm-heading"
        >
          {THANK_YOU_TITLE}
          <span className="mt-1 block">{THANK_YOU_SUBTITLE}</span>
        </h2>
        <hr className="mt-5 border-crm-taupe/40" />
        <div className="mt-5 rounded-xl border border-sky-300 bg-sky-50 px-4 py-3 text-sm text-[#2b6cb0]">
          <div className="flex gap-3">
            <span aria-hidden="true" className="mt-0.5 shrink-0">
              ℹ️
            </span>
            <div className="space-y-2">
              <p className="font-semibold">{THANK_YOU_WAIT}</p>
              <p>
                {THANK_YOU_CONTACT_LEAD}{' '}
                <a
                  className="font-semibold underline-offset-2 hover:underline"
                  href={`mailto:${THANK_YOU_EMAIL}`}
                >
                  {THANK_YOU_EMAIL}
                </a>{' '}
                or call{' '}
                <a
                  className="font-semibold underline-offset-2 hover:underline"
                  href={`tel:${THANK_YOU_PHONE.replace(/\s+/g, '')}`}
                >
                  {THANK_YOU_PHONE}
                </a>{' '}
                {THANK_YOU_CONTACT_END}
              </p>
            </div>
          </div>
        </div>
        <hr className="mt-5 border-crm-taupe/40" />
        <form
          onSubmit={handleSend}
          className="mt-5 rounded-xl border border-crm-taupe/30 bg-crm-surface px-4 py-5"
        >
          <h3 className="text-center text-base font-semibold text-crm-heading">
            {COPY_HEADING}
          </h3>
          <p className="mt-1 text-center text-sm text-crm-slate">{COPY_HINT}</p>
          <div className="mt-4 flex gap-2">
            <input
              id="application-copy-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              aria-label="Email"
              placeholder={COPY_EMAIL_PLACEHOLDER}
              value={copyEmail}
              onChange={(event) => {
                setCopyEmail(event.target.value);
                setCopySent(false);
              }}
              className="min-h-10 min-w-0 flex-1 rounded-md border border-crm-taupe/40 bg-white px-3 text-sm text-crm-heading outline-none placeholder:text-crm-slate/70 focus:border-navy focus:ring-2 focus:ring-navy/15"
            />
            <button
              type="submit"
              disabled={!allowSend}
              className="min-h-10 shrink-0 rounded-md bg-black px-5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-crm-slate"
            >
              {COPY_SEND_LABEL}
            </button>
          </div>
          {copySent ? (
            <p role="status" className="mt-3 text-center text-sm text-crm-heading">
              {COPY_SENT_MESSAGE}
            </p>
          ) : null}
        </form>
      </div>
    </div>
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
