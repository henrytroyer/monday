import { useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react';
import { useSaveOnExit } from '../lib/useSaveOnExit';
import type {
  VolunteerApplicationStatus,
  VolunteerGeneralInformation,
} from '../contract/volunteerApi';
import { BackButton } from '../components/BackButton';
import { FormCard } from '../components/FormCard';
import {
  BIRTHDATE_LABEL,
  CITY_LABEL,
  COUNTRY_HINT,
  COUNTRY_LABEL,
  emptyGeneralInformation,
  GENDER_LABEL,
  isGeneralInformationComplete,
  MAILING_ADDRESS_BANNER,
  PHONE_HINT,
  PHONE_LABEL,
  POSTAL_LABEL,
  STATE_HINT,
  STATE_LABEL,
  STREET_LABEL,
  VOLUNTEER_INFO_BANNER,
} from '../process/generalInformation';

export function GeneralInformationScreen({
  me,
  onBack,
  onSave,
  onNext,
}: {
  me: VolunteerApplicationStatus;
  onBack: () => void;
  onSave: (draft: VolunteerGeneralInformation) => void;
  onNext: (draft: VolunteerGeneralInformation) => void;
}) {
  const [draft, setDraft] = useState<VolunteerGeneralInformation>(
    () => me.generalInformation ?? emptyGeneralInformation(),
  );
  const allowNext = isGeneralInformationComplete(draft);
  useSaveOnExit(draft, onSave);

  function patch<K extends keyof VolunteerGeneralInformation>(
    key: K,
    value: VolunteerGeneralInformation[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!allowNext) return;
    onNext(draft);
  }

  return (
    <FormCard onSubmit={handleSubmit}>
      <BackButton onClick={onBack} />

      <SectionBanner>{VOLUNTEER_INFO_BANNER}</SectionBanner>
      <hr className="mt-3 border-crm-taupe/40" />

      <fieldset className="mt-5">
        <legend className="text-sm font-semibold text-crm-heading">
          {GENDER_LABEL} <RequiredMark />
        </legend>
        <div className="mt-3 flex flex-col items-start gap-2">
          <GenderChoice
            checked={draft.gender === 'male'}
            onChange={() => patch('gender', 'male')}
            label="Male"
          />
          <GenderChoice
            checked={draft.gender === 'female'}
            onChange={() => patch('gender', 'female')}
            label="Female"
          />
        </div>
      </fieldset>

      <LabeledField
        id="general-birthdate"
        label={BIRTHDATE_LABEL}
        className="mt-5"
      >
        <input
          id="general-birthdate"
          type="date"
          required
          value={draft.birthdate}
          onChange={(event) => patch('birthdate', event.target.value)}
          className="mt-2 min-h-11 w-full max-w-[12rem] rounded-lg border border-crm-taupe/35 bg-white px-3 text-base text-crm-text outline-none focus:border-navy focus:ring-2 focus:ring-navy/15"
        />
      </LabeledField>

      <LabeledField
        id="general-phone"
        label={PHONE_LABEL}
        hint={PHONE_HINT}
        className="mt-5"
      >
        <div className="relative mt-2">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-lg"
          >
            🇺🇸
          </span>
          <input
            id="general-phone"
            required
            inputMode="numeric"
            autoComplete="tel"
            value={draft.phone}
            onChange={(event) =>
              patch('phone', event.target.value.replace(/[^\d]/g, ''))
            }
            className="min-h-11 w-full rounded-lg border border-crm-taupe/35 bg-white py-2 pl-12 pr-3 text-base text-crm-text outline-none focus:border-navy focus:ring-2 focus:ring-navy/15"
          />
        </div>
      </LabeledField>

      <hr className="mt-6 border-crm-taupe/40" />
      <SectionBanner className="mt-5">{MAILING_ADDRESS_BANNER}</SectionBanner>

      <LabeledField
        id="general-street"
        label={STREET_LABEL}
        className="mt-5"
      >
        <TextInput
          id="general-street"
          placeholder="123 Main St"
          autoComplete="address-line1"
          value={draft.street}
          onChange={(event) => patch('street', event.target.value)}
        />
      </LabeledField>
      <LabeledField id="general-city" label={CITY_LABEL} className="mt-5">
        <TextInput
          id="general-city"
          placeholder="Springfield"
          autoComplete="address-level2"
          value={draft.city}
          onChange={(event) => patch('city', event.target.value)}
        />
      </LabeledField>
      <LabeledField
        id="general-state"
        label={STATE_LABEL}
        hint={STATE_HINT}
        className="mt-5"
      >
        <TextInput
          id="general-state"
          placeholder="IL/British Columbia"
          autoComplete="address-level1"
          value={draft.state}
          onChange={(event) => patch('state', event.target.value)}
        />
      </LabeledField>
      <LabeledField id="general-postal" label={POSTAL_LABEL} className="mt-5">
        <TextInput
          id="general-postal"
          autoComplete="postal-code"
          value={draft.postalCode}
          onChange={(event) => patch('postalCode', event.target.value)}
        />
      </LabeledField>
      <LabeledField
        id="general-country"
        label={COUNTRY_LABEL}
        hint={COUNTRY_HINT}
        className="mt-5"
      >
        <TextInput
          id="general-country"
          placeholder="USA/Canada"
          autoComplete="country-name"
          value={draft.country}
          onChange={(event) => patch('country', event.target.value)}
        />
      </LabeledField>

      <div className="mt-6 flex justify-center">
        <button
          type="submit"
          disabled={!allowNext}
          className="min-h-10 rounded-md bg-navy px-8 text-[15px] font-medium text-white hover:bg-navy-dark disabled:cursor-not-allowed disabled:bg-crm-slate"
        >
          Next →
        </button>
      </div>
    </FormCard>
  );
}

function SectionBanner({
  children,
  className = '',
}: {
  children: string;
  className?: string;
}) {
  return (
    <p
      className={`rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white ${className}`}
    >
      {children}
    </p>
  );
}

function RequiredMark() {
  return <span className="text-advise-rose"> *</span>;
}

function LabeledField({
  id,
  label,
  hint,
  className = '',
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-semibold text-crm-heading">
        {label}
        <RequiredMark />
      </label>
      {hint ? <p className="text-xs text-crm-slate">{hint}</p> : null}
      {children}
    </div>
  );
}

function TextInput({
  id,
  ...props
}: { id: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      id={id}
      required
      className="mt-2 min-h-11 w-full rounded-lg border border-crm-taupe/35 bg-white px-3 text-base text-crm-text outline-none placeholder:text-crm-slate/60 focus:border-navy focus:ring-2 focus:ring-navy/15"
    />
  );
}

function GenderChoice({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-crm-taupe/40 bg-white px-4 text-sm text-crm-heading">
      <input
        type="radio"
        name="general-gender"
        required
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 accent-navy"
      />
      {label}
    </label>
  );
}
