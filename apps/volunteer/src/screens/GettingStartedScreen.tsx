import { useState, type FormEvent, type InputHTMLAttributes } from 'react';
import type { VolunteerApplicationStatus } from '../contract/volunteerApi';
import { useSaveOnExit } from '../lib/useSaveOnExit';
import { BackButton } from '../components/BackButton';
import { FormCard } from '../components/FormCard';
import {
  EMAIL_HINT,
  EMAIL_LABEL,
  FIRST_NAME_HINT,
  FIRST_NAME_LABEL,
  FULL_NAME_HINT,
  FULL_NAME_LABEL,
  GETTING_STARTED_BANNER,
  PREVIOUS_NO_EXAMPLE,
  PREVIOUS_NO_NOTE,
  PREVIOUS_VOLUNTEER_LABEL,
  PREVIOUS_YES_NOTE,
  RETURNING_VOLUNTEER_HOLD,
  canContinueNoPath,
  type GettingStartedDraft,
} from '../process/gettingStarted';

export function GettingStartedScreen({
  me,
  onBack,
  onSave,
  onNext,
}: {
  me: VolunteerApplicationStatus;
  onBack: () => void;
  onSave: (draft: GettingStartedDraft) => void;
  onNext: (draft: GettingStartedDraft & { previousVolunteer: 'no' }) => void;
}) {
  const saved = me.gettingStarted;
  const [fullName, setFullName] = useState(saved?.fullName ?? me.name);
  const [firstName, setFirstName] = useState(
    saved?.firstName ?? me.firstName ?? firstNameFrom(me.name),
  );
  const [email, setEmail] = useState(saved?.email ?? me.email);
  const [previousVolunteer, setPreviousVolunteer] = useState<
    GettingStartedDraft['previousVolunteer']
  >(saved?.previousVolunteer ?? me.previousVolunteer ?? '');

  const draft: GettingStartedDraft = {
    fullName,
    firstName,
    email,
    previousVolunteer,
  };
  const allowNoNext = canContinueNoPath(draft);
  useSaveOnExit(draft, onSave);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!allowNoNext) return;
    onNext({ ...draft, previousVolunteer: 'no' });
  }

  return (
    <FormCard onSubmit={handleSubmit}>
      <BackButton onClick={onBack} />

      <p className="mt-5 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white">
        {GETTING_STARTED_BANNER}
      </p>

      <div className="mt-5 flex flex-col gap-5">
        <FormField
          id="getting-started-full-name"
          label={FULL_NAME_LABEL}
          hint={FULL_NAME_HINT}
          required
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
        />
        <FormField
          id="getting-started-first-name"
          label={FIRST_NAME_LABEL}
          hint={FIRST_NAME_HINT}
          required
          autoComplete="given-name"
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
        />
        <FormField
          id="getting-started-email"
          label={EMAIL_LABEL}
          hint={EMAIL_HINT}
          required
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          withEnvelope
        />
      </div>

      <hr className="mt-6 border-crm-taupe/40" />

      <fieldset className="mt-5">
        <legend className="text-sm font-semibold text-crm-heading">
          {PREVIOUS_VOLUNTEER_LABEL} <RequiredMark />
        </legend>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Choice
            name="previous-volunteer"
            value="yes"
            checked={previousVolunteer === 'yes'}
            onChange={() => setPreviousVolunteer('yes')}
            label="Yes"
          />
          <Choice
            name="previous-volunteer"
            value="no"
            checked={previousVolunteer === 'no'}
            onChange={() => setPreviousVolunteer('no')}
            label="No"
          />
        </div>
      </fieldset>

      <div className="mt-4 rounded-xl border border-amber-400 bg-advise-wash px-3 py-3 text-sm text-advise-amber">
        <p>
          <span aria-hidden="true">⚠️ </span>
          <span className="font-semibold">{PREVIOUS_YES_NOTE}</span>
        </p>
      </div>

      <div className="mt-3 rounded-md bg-crm-white p-2">
        <div className="rounded-xl border border-advise-rose/40 bg-advise-rose-wash px-3 py-3 text-sm text-advise-rose">
          <p className="font-semibold">{PREVIOUS_NO_NOTE}</p>
          <p className="mt-1">{PREVIOUS_NO_EXAMPLE}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center gap-3">
        {previousVolunteer === 'yes' ? (
          <p className="text-center text-sm text-crm-slate">
            {RETURNING_VOLUNTEER_HOLD}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={!allowNoNext}
          className="min-h-10 rounded-md bg-navy px-8 text-[15px] font-medium text-white hover:bg-navy-dark disabled:cursor-not-allowed disabled:bg-crm-slate"
        >
          Next →
        </button>
      </div>
    </FormCard>
  );
}

function firstNameFrom(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}

function RequiredMark() {
  return <span className="text-advise-rose"> *</span>;
}

function FormField({
  id,
  label,
  hint,
  withEnvelope = false,
  ...props
}: {
  id: string;
  label: string;
  hint: string;
  withEnvelope?: boolean;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold text-crm-heading">
        {label}
        <RequiredMark />
      </label>
      <p className="text-xs text-crm-slate">{hint}</p>
      <div className="relative mt-2">
        {withEnvelope ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-crm-slate"
          >
            <EnvelopeIcon />
          </span>
        ) : null}
        <input
          {...props}
          id={id}
          className={`min-h-11 w-full rounded-lg border border-crm-taupe/35 bg-white px-3 text-base text-crm-text outline-none focus:border-navy focus:ring-2 focus:ring-navy/15 ${
            withEnvelope ? 'pl-10' : ''
          }`}
        />
      </div>
    </div>
  );
}

function Choice({
  name,
  value,
  checked,
  onChange,
  label,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center gap-2 rounded-lg border border-crm-taupe/40 bg-white px-4 text-sm text-crm-heading">
      <input
        type="radio"
        name={name}
        value={value}
        required
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 accent-navy"
      />
      {label}
    </label>
  );
}

function EnvelopeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 7 9-7" />
    </svg>
  );
}
