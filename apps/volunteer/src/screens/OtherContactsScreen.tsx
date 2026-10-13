import { useState, type FormEvent, type ReactNode } from 'react';
import type {
  VolunteerApplicationStatus,
  VolunteerOtherContacts,
} from '../contract/volunteerApi';
import { BackButton } from '../components/BackButton';
import { FormCard } from '../components/FormCard';
import {
  ACCOUNTABILITY_INFO_SECTION,
  ACCOUNTABLE_AUTOFILL_LINE_1,
  ACCOUNTABLE_AUTOFILL_LINE_2,
  ACCOUNTABLE_EMAIL_LABEL,
  ACCOUNTABLE_NAME_HINT,
  ACCOUNTABLE_NAME_LABEL,
  ACCOUNTABLE_PHONE_LABEL,
  CHURCH_INFO_SECTION,
  CHURCH_NAME_LABEL,
  EMAIL_HINT,
  EMERGENCY_EMAIL_LABEL,
  EMERGENCY_INFO_SECTION,
  EMERGENCY_NAME_LABEL,
  EMERGENCY_PHONE_LABEL,
  EMERGENCY_RELATION_LABEL,
  EMERGENCY_RELATION_OPTIONS,
  emptyOtherContacts,
  FIELD_CONTACT_HINT,
  FIELD_CONTACT_LABEL,
  FIELD_CONTACT_NAME_LABEL,
  isOtherContactsComplete,
  OTHER_CONTACTS_BANNER,
  PARENT_EMAIL_LABEL,
  PARENT_PHONE_LABEL,
  PARENTS_ENTRY_NOTE_EMPHASIS,
  PARENTS_ENTRY_NOTE_LEAD,
  PARENTS_INFO_SECTION,
  PARENTS_NAMES_HINT,
  PARENTS_NAMES_LABEL,
  PASTOR_EMAIL_HINT,
  PASTOR_EMAIL_LABEL,
  PASTOR_NAME_HINT,
  PASTOR_NAME_LABEL,
  PASTOR_PHONE_LABEL,
  PHONE_HINT,
} from '../process/otherContacts';

export function OtherContactsScreen({
  me,
  onBack,
  onNext,
}: {
  me: VolunteerApplicationStatus;
  onBack: () => void;
  onNext: (draft: VolunteerOtherContacts) => void;
}) {
  const [draft, setDraft] = useState<VolunteerOtherContacts>(
    () => me.otherContacts ?? emptyOtherContacts(),
  );
  const allowNext = isOtherContactsComplete(draft);
  const requireFieldContactName = draft.fieldContact === 'yes';

  function patch<K extends keyof VolunteerOtherContacts>(
    key: K,
    value: VolunteerOtherContacts[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function setParentsNames(value: string) {
    setDraft((current) => ({
      ...current,
      parentsNames: value,
      accountableName:
        current.accountableName.trim().length === 0 ||
        current.accountableName === current.parentsNames
          ? value
          : current.accountableName,
    }));
  }

  function toggleRelation(option: string) {
    setDraft((current) => ({
      ...current,
      emergencyRelation: current.emergencyRelation.includes(option)
        ? current.emergencyRelation.filter((item) => item !== option)
        : [...current.emergencyRelation, option],
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!allowNext) return;
    onNext(draft);
  }

  return (
    <FormCard onSubmit={handleSubmit}>
      <BackButton onClick={onBack} />

      <p className="mt-5 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white">
        {OTHER_CONTACTS_BANNER}
      </p>

      <SectionRule>{CHURCH_INFO_SECTION}</SectionRule>
      <TextField
        id="church-name"
        label={CHURCH_NAME_LABEL}
        required
        value={draft.churchName}
        onChange={(value) => patch('churchName', value)}
      />
      <TextField
        id="pastor-name"
        label={PASTOR_NAME_LABEL}
        hint={PASTOR_NAME_HINT}
        required
        autoComplete="name"
        value={draft.pastorName}
        onChange={(value) => patch('pastorName', value)}
      />
      <EmailField
        id="pastor-email"
        label={PASTOR_EMAIL_LABEL}
        hint={PASTOR_EMAIL_HINT}
        value={draft.pastorEmail}
        onChange={(value) => patch('pastorEmail', value)}
      />
      <PhoneField
        id="pastor-phone"
        label={PASTOR_PHONE_LABEL}
        value={draft.pastorPhone}
        onChange={(value) => patch('pastorPhone', value)}
      />

      <SectionRule>{PARENTS_INFO_SECTION}</SectionRule>
      <InfoCallout>
        <p>
          {PARENTS_ENTRY_NOTE_LEAD}
          <br />
          {PARENTS_ENTRY_NOTE_EMPHASIS}
        </p>
      </InfoCallout>
      <TextField
        id="parents-names"
        label={PARENTS_NAMES_LABEL}
        hint={PARENTS_NAMES_HINT}
        required
        value={draft.parentsNames}
        onChange={setParentsNames}
      />
      <EmailField
        id="parent-email"
        label={PARENT_EMAIL_LABEL}
        value={draft.parentEmail}
        onChange={(value) => patch('parentEmail', value)}
      />
      <PhoneField
        id="parent-phone"
        label={PARENT_PHONE_LABEL}
        value={draft.parentPhone}
        onChange={(value) => patch('parentPhone', value)}
      />

      <SectionRule>{EMERGENCY_INFO_SECTION}</SectionRule>
      <TextField
        id="emergency-name"
        label={EMERGENCY_NAME_LABEL}
        required
        autoComplete="name"
        value={draft.emergencyName}
        onChange={(value) => patch('emergencyName', value)}
      />
      <EmailField
        id="emergency-email"
        label={EMERGENCY_EMAIL_LABEL}
        value={draft.emergencyEmail}
        onChange={(value) => patch('emergencyEmail', value)}
      />
      <PhoneField
        id="emergency-phone"
        label={EMERGENCY_PHONE_LABEL}
        value={draft.emergencyPhone}
        onChange={(value) => patch('emergencyPhone', value)}
      />
      <fieldset className="mt-5">
        <legend className="text-sm font-semibold text-crm-heading">
          {EMERGENCY_RELATION_LABEL} <RequiredMark />
        </legend>
        <div className="mt-3 flex flex-col gap-2">
          {EMERGENCY_RELATION_OPTIONS.map((option) => (
            <label
              key={option}
              className="flex min-h-8 cursor-pointer items-center gap-2 text-sm text-crm-heading"
            >
              <input
                type="checkbox"
                checked={draft.emergencyRelation.includes(option)}
                onChange={() => toggleRelation(option)}
                className="h-4 w-4 accent-navy"
              />
              {option}
            </label>
          ))}
        </div>
      </fieldset>

      <SectionRule>{ACCOUNTABILITY_INFO_SECTION}</SectionRule>
      <TextField
        id="accountable-name"
        label={ACCOUNTABLE_NAME_LABEL}
        hint={ACCOUNTABLE_NAME_HINT}
        required
        value={draft.accountableName}
        onChange={(value) => patch('accountableName', value)}
      />
      <InfoCallout>
        <p>{ACCOUNTABLE_AUTOFILL_LINE_1}</p>
        <p>{ACCOUNTABLE_AUTOFILL_LINE_2}</p>
      </InfoCallout>
      <div className="mt-5 rounded-lg bg-crm-white px-3 py-3">
        <EmailField
          id="accountable-email"
          label={ACCOUNTABLE_EMAIL_LABEL}
          className=""
          value={draft.accountableEmail}
          onChange={(value) => patch('accountableEmail', value)}
        />
        <PhoneField
          id="accountable-phone"
          label={ACCOUNTABLE_PHONE_LABEL}
          value={draft.accountablePhone}
          onChange={(value) => patch('accountablePhone', value)}
        />
      </div>

      <fieldset className="mt-5">
        <legend className="text-sm font-semibold text-crm-heading">
          {FIELD_CONTACT_LABEL} <RequiredMark />
        </legend>
        <p className="text-xs text-crm-slate">{FIELD_CONTACT_HINT}</p>
        <div className="mt-3 flex flex-col items-start gap-2">
          <RadioChoice
            name="field-contact"
            checked={draft.fieldContact === 'yes'}
            onChange={() => patch('fieldContact', 'yes')}
            label="Yes"
          />
          <RadioChoice
            name="field-contact"
            checked={draft.fieldContact === 'no'}
            onChange={() => patch('fieldContact', 'no')}
            label="No"
          />
        </div>
      </fieldset>

      <div className="mt-5 rounded-lg bg-crm-white px-3 py-3">
        <TextField
          id="field-contact-name"
          label={FIELD_CONTACT_NAME_LABEL}
          required
          className=""
          htmlRequired={requireFieldContactName}
          value={draft.fieldContactName}
          onChange={(value) => patch('fieldContactName', value)}
        />
      </div>

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

function RequiredMark() {
  return <span className="text-advise-rose"> *</span>;
}

function SectionRule({ children }: { children: ReactNode }) {
  return (
    <div className="mt-8 flex items-center gap-4 text-xs font-medium text-crm-slate">
      <span className="h-px flex-1 bg-crm-taupe/40" />
      {children}
      <span className="h-px flex-1 bg-crm-taupe/40" />
    </div>
  );
}

function InfoCallout({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-navy">
      <div className="flex gap-3">
        <span aria-hidden="true" className="mt-0.5 shrink-0">
          ℹ️
        </span>
        <div className="space-y-1">{children}</div>
      </div>
    </div>
  );
}

function FieldBlock({
  id,
  label,
  hint,
  required = false,
  className = 'mt-5',
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-semibold text-crm-heading">
        {label}
        {required ? <RequiredMark /> : null}
      </label>
      {hint ? <p className="text-xs text-crm-slate">{hint}</p> : null}
      {children}
    </div>
  );
}

function TextField({
  id,
  label,
  hint,
  required = false,
  htmlRequired,
  className,
  autoComplete,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  required?: boolean;
  htmlRequired?: boolean;
  className?: string;
  autoComplete?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <FieldBlock
      id={id}
      label={label}
      hint={hint}
      required={required}
      className={className}
    >
      <input
        id={id}
        required={htmlRequired ?? required}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-11 w-full rounded-lg border border-crm-taupe/35 bg-white px-3 text-base text-crm-text outline-none focus:border-navy focus:ring-2 focus:ring-navy/15"
      />
    </FieldBlock>
  );
}

function EmailField({
  id,
  label,
  hint = EMAIL_HINT,
  className,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  className?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <FieldBlock id={id} label={label} hint={hint} required className={className}>
      <div className="relative mt-2">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-crm-slate"
        >
          <EnvelopeIcon />
        </span>
        <input
          id={id}
          type="email"
          required
          autoComplete="email"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-11 w-full rounded-lg border border-crm-taupe/35 bg-white py-2 pl-10 pr-3 text-base text-crm-text outline-none focus:border-navy focus:ring-2 focus:ring-navy/15"
        />
      </div>
    </FieldBlock>
  );
}

function PhoneField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <FieldBlock id={id} label={label} hint={PHONE_HINT} required>
      <div className="relative mt-2">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-lg"
        >
          🇺🇸
        </span>
        <input
          id={id}
          required
          inputMode="numeric"
          autoComplete="tel"
          value={value}
          onChange={(event) => onChange(event.target.value.replace(/[^\d]/g, ''))}
          className="min-h-11 w-full rounded-lg border border-crm-taupe/35 bg-white py-2 pl-12 pr-3 text-base text-crm-text outline-none focus:border-navy focus:ring-2 focus:ring-navy/15"
        />
      </div>
    </FieldBlock>
  );
}

function RadioChoice({
  name,
  checked,
  onChange,
  label,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-crm-taupe/40 bg-white px-4 text-sm text-crm-heading">
      <input
        type="radio"
        name={name}
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
