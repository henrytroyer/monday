import { useRef, useState, type DragEvent, type FormEvent, type ReactNode } from 'react';
import type {
  VolunteerApplicationStatus,
  VolunteerSpouseApplication,
} from '../contract/volunteerApi';
import { BackButton } from '../components/BackButton';
import { FormCard } from '../components/FormCard';
import {
  ID_PHOTO_EXAMPLE_ALT,
  ID_PHOTO_EXAMPLE_SRC,
} from '../process/profilePhoto';
import { PASSPORT_EXAMPLE_ALT, PASSPORT_EXAMPLE_SRC } from '../process/passportDetails';
import {
  emptySpouseApplication,
  FILE_BROWSE,
  FILE_DROP_LEAD,
  isSpouseApplicationComplete,
  PASSPORT_SECTION,
  PROFILE_SECTION,
  SPOUSE_APPLICATION_BANNER,
  SPOUSE_BIRTHDATE_LABEL,
  SPOUSE_EMAIL_HINT,
  SPOUSE_EMAIL_LABEL,
  SPOUSE_GENDER_LABEL,
  SPOUSE_GENDER_OPTIONS,
  SPOUSE_INFO_HEADING,
  SPOUSE_INFO_LINE_1,
  SPOUSE_INFO_LINE_2,
  SPOUSE_JOINING_LABEL,
  SPOUSE_LANGUAGES_HINT,
  SPOUSE_LANGUAGES_LABEL,
  SPOUSE_LANGUAGE_OPTIONS,
  SPOUSE_LAST_TERM_LABEL,
  SPOUSE_MEDICAL_HINT,
  SPOUSE_MEDICAL_LABEL,
  SPOUSE_NAME_HINT,
  SPOUSE_NAME_LABEL,
  SPOUSE_OTHER_LABEL,
  SPOUSE_PASSPORT_EXPIRATION_LABEL,
  SPOUSE_PASSPORT_NUMBER_LABEL,
  SPOUSE_PASSPORT_PHOTO_HINT,
  SPOUSE_PASSPORT_PHOTO_LABEL,
  SPOUSE_PASSPORT_UPDATED_LABEL,
  SPOUSE_PHONE_HINT,
  SPOUSE_PHONE_LABEL,
  SPOUSE_PREVIOUS_LABEL,
  SPOUSE_PROFILE_PICTURE_LABEL,
  SPOUSE_PROFILE_TIP_ACCESS,
  SPOUSE_PROFILE_TIP_HEADING,
  SPOUSE_PROFILE_TIP_LEAD,
  SPOUSE_PROFILE_TIP_NOTE,
  SPOUSE_SKILLS_HINT,
  SPOUSE_SKILLS_LABEL,
  SPOUSE_SKILL_OPTIONS,
  SPOUSE_TESTIMONY_LABEL,
  SPOUSE_UPDATE_PHOTO_LABEL,
} from '../process/spouseApplication';

export function SpouseApplicationScreen({
  me,
  onBack,
  onNext,
}: {
  me: VolunteerApplicationStatus;
  onBack: () => void;
  onNext: (draft: VolunteerSpouseApplication) => void;
}) {
  const [draft, setDraft] = useState<VolunteerSpouseApplication>(
    () => me.spouseApplication ?? emptySpouseApplication(),
  );
  const allowNext = isSpouseApplicationComplete(draft);
  const showSpouseFields = draft.spouseJoining === 'yes';
  const requireLastTerm = draft.previousVolunteer === 'yes';
  const requireOtherLanguage = draft.languages.includes('Other');
  const requireOtherSkills = draft.skills.includes('Other');

  function patch<K extends keyof VolunteerSpouseApplication>(
    key: K,
    value: VolunteerSpouseApplication[K],
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

      <p className="mt-5 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white">
        {SPOUSE_APPLICATION_BANNER}
      </p>

      <fieldset className="mt-5">
        <legend className="text-sm font-semibold text-crm-heading">
          {SPOUSE_JOINING_LABEL} <RequiredMark />
        </legend>
        <div className="mt-3 flex flex-col items-start gap-2">
          <RadioChoice
            name="spouse-joining"
            checked={draft.spouseJoining === 'yes'}
            onChange={() => patch('spouseJoining', 'yes')}
            label="Yes"
          />
          <RadioChoice
            name="spouse-joining"
            checked={draft.spouseJoining === 'no'}
            onChange={() => patch('spouseJoining', 'no')}
            label="No"
          />
        </div>
      </fieldset>

      {!showSpouseFields ? (
        <div className="mt-6 flex justify-center">
          <NextButton disabled={!allowNext} />
        </div>
      ) : (
        <SpouseFields
          draft={draft}
          patch={patch}
          allowNext={allowNext}
          requireLastTerm={requireLastTerm}
          requireOtherLanguage={requireOtherLanguage}
          requireOtherSkills={requireOtherSkills}
        />
      )}
    </FormCard>
  );
}

function SpouseFields({
  draft,
  patch,
  allowNext,
  requireLastTerm,
  requireOtherLanguage,
  requireOtherSkills,
}: {
  draft: VolunteerSpouseApplication;
  patch: <K extends keyof VolunteerSpouseApplication>(
    key: K,
    value: VolunteerSpouseApplication[K],
  ) => void;
  allowNext: boolean;
  requireLastTerm: boolean;
  requireOtherLanguage: boolean;
  requireOtherSkills: boolean;
}) {
  return (
    <>
      <h2 className="mt-8 text-xl font-semibold text-crm-heading">
        {SPOUSE_INFO_HEADING}
      </h2>
      <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-navy">
        <div className="flex gap-3">
          <span aria-hidden="true" className="mt-0.5 shrink-0">
            ℹ️
          </span>
          <div className="space-y-2">
            <p>{SPOUSE_INFO_LINE_1}</p>
            <p>{SPOUSE_INFO_LINE_2}</p>
          </div>
        </div>
      </div>
      <hr className="mt-6 border-crm-taupe/40" />

      <FieldBlock
        id="spouse-name"
        label={SPOUSE_NAME_LABEL}
        hint={SPOUSE_NAME_HINT}
        required
      >
        <TextInput
          id="spouse-name"
          required
          autoComplete="name"
          value={draft.name}
          onChange={(value) => patch('name', value)}
        />
      </FieldBlock>
      <FieldBlock
        id="spouse-email"
        label={SPOUSE_EMAIL_LABEL}
        hint={SPOUSE_EMAIL_HINT}
        required
      >
        <div className="relative mt-2">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-crm-slate"
          >
            <EnvelopeIcon />
          </span>
          <input
            id="spouse-email"
            type="email"
            required
            autoComplete="email"
            value={draft.email}
            onChange={(event) => patch('email', event.target.value)}
            className="min-h-11 w-full rounded-lg border border-crm-taupe/35 bg-white py-2 pl-10 pr-3 text-base text-crm-text outline-none focus:border-navy focus:ring-2 focus:ring-navy/15"
          />
        </div>
      </FieldBlock>
      <FieldBlock
        id="spouse-phone"
        label={SPOUSE_PHONE_LABEL}
        hint={SPOUSE_PHONE_HINT}
        required
      >
        <div className="relative mt-2">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-lg"
          >
            🇺🇸
          </span>
          <input
            id="spouse-phone"
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
      </FieldBlock>

      <fieldset className="mt-5">
        <legend className="text-sm font-semibold text-crm-heading">
          {SPOUSE_PREVIOUS_LABEL} <RequiredMark />
        </legend>
        <div className="mt-3 flex flex-col items-start gap-2">
          <RadioChoice
            name="spouse-previous"
            checked={draft.previousVolunteer === 'no'}
            onChange={() => patch('previousVolunteer', 'no')}
            label="No"
          />
          <RadioChoice
            name="spouse-previous"
            checked={draft.previousVolunteer === 'yes'}
            onChange={() => patch('previousVolunteer', 'yes')}
            label="Yes"
          />
        </div>
      </fieldset>

      <div className="mt-5 rounded-lg bg-crm-white px-3 py-3">
        <FieldBlock
          id="spouse-last-term"
          label={SPOUSE_LAST_TERM_LABEL}
          required
        >
          <DateInput
            id="spouse-last-term"
            required={requireLastTerm}
            value={draft.lastTermDate}
            onChange={(value) => patch('lastTermDate', value)}
          />
        </FieldBlock>
        <FieldBlock
          id="spouse-birthdate"
          label={SPOUSE_BIRTHDATE_LABEL}
          className="mt-4"
          required
        >
          <DateInput
            id="spouse-birthdate"
            required
            value={draft.birthdate}
            onChange={(value) => patch('birthdate', value)}
          />
        </FieldBlock>
        <FieldBlock
          id="spouse-gender"
          label={SPOUSE_GENDER_LABEL}
          className="mt-4"
          required
        >
          <select
            id="spouse-gender"
            required
            value={draft.gender}
            onChange={(event) =>
              patch(
                'gender',
                event.target.value as VolunteerSpouseApplication['gender'],
              )
            }
            className="mt-2 min-h-11 w-full rounded-lg border border-crm-taupe/35 bg-white px-3 text-base text-crm-text outline-none focus:border-navy focus:ring-2 focus:ring-navy/15"
          >
            <option value="" />
            {SPOUSE_GENDER_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </FieldBlock>
      </div>

      <SectionRule>{PASSPORT_SECTION}</SectionRule>

      <fieldset className="mt-5">
        <legend className="text-sm font-semibold text-crm-heading">
          {SPOUSE_PASSPORT_UPDATED_LABEL}
        </legend>
        <div className="mt-3 flex flex-col items-start gap-2">
          <RadioChoice
            name="spouse-passport-updated"
            checked={draft.passportUpdated === 'yes'}
            onChange={() => patch('passportUpdated', 'yes')}
            label="Yes"
            required={false}
          />
          <RadioChoice
            name="spouse-passport-updated"
            checked={draft.passportUpdated === 'no'}
            onChange={() => patch('passportUpdated', 'no')}
            label="No"
            required={false}
          />
        </div>
      </fieldset>

      <div className="mt-6 flex justify-center">
        <img
          src={PASSPORT_EXAMPLE_SRC}
          alt={PASSPORT_EXAMPLE_ALT}
          className="w-full max-w-[18rem] rounded-md border border-crm-taupe/30 shadow-sm"
        />
      </div>
      <FileDrop
        id="spouse-passport-photo"
        label={SPOUSE_PASSPORT_PHOTO_LABEL}
        hint={SPOUSE_PASSPORT_PHOTO_HINT}
        fileName={draft.passportPhotoFileName}
        onFile={(file) => patch('passportPhotoFileName', file.name)}
      />
      <FieldBlock
        id="spouse-passport-number"
        label={SPOUSE_PASSPORT_NUMBER_LABEL}
        required
      >
        <TextInput
          id="spouse-passport-number"
          required
          autoComplete="off"
          value={draft.passportNumber}
          onChange={(value) => patch('passportNumber', value)}
        />
      </FieldBlock>
      <FieldBlock
        id="spouse-passport-expiration"
        label={SPOUSE_PASSPORT_EXPIRATION_LABEL}
        required
      >
        <DateInput
          id="spouse-passport-expiration"
          required
          value={draft.passportExpiration}
          onChange={(value) => patch('passportExpiration', value)}
        />
      </FieldBlock>

      <SectionRule>{PROFILE_SECTION}</SectionRule>

      <fieldset className="mt-5">
        <legend className="text-sm font-semibold text-crm-heading">
          {SPOUSE_UPDATE_PHOTO_LABEL} <RequiredMark />
        </legend>
        <div className="mt-3 flex flex-col items-start gap-2">
          <RadioChoice
            name="spouse-update-photo"
            checked={draft.updateProfilePhoto === 'yes'}
            onChange={() => patch('updateProfilePhoto', 'yes')}
            label="Yes"
          />
          <RadioChoice
            name="spouse-update-photo"
            checked={draft.updateProfilePhoto === 'no'}
            onChange={() => patch('updateProfilePhoto', 'no')}
            label="No"
          />
        </div>
      </fieldset>

      <div className="mt-4 rounded-xl border border-amber-400 bg-advise-wash px-3 py-3 text-sm text-advise-amber">
        <p className="font-semibold">{SPOUSE_PROFILE_TIP_HEADING}</p>
        <p className="mt-1">{SPOUSE_PROFILE_TIP_LEAD}</p>
        <p className="mt-3 flex gap-2">
          <span aria-hidden="true">⚠️</span>
          <span>{SPOUSE_PROFILE_TIP_NOTE}</span>
        </p>
        <p className="mt-3">{SPOUSE_PROFILE_TIP_ACCESS}</p>
      </div>

      <FileDrop
        id="spouse-profile-picture"
        label={SPOUSE_PROFILE_PICTURE_LABEL}
        fileName={draft.profilePhotoFileName}
        onFile={(file) => patch('profilePhotoFileName', file.name)}
      />
      <div className="mt-6 flex justify-center">
        <img
          src={ID_PHOTO_EXAMPLE_SRC}
          alt={ID_PHOTO_EXAMPLE_ALT}
          className="h-40 w-auto object-contain"
        />
      </div>

      <div className="mt-6 rounded-lg bg-crm-white px-3 py-3">
        <FieldBlock
          id="spouse-testimony"
          label={SPOUSE_TESTIMONY_LABEL}
          required
        >
          <textarea
            id="spouse-testimony"
            required
            rows={6}
            value={draft.testimony}
            onChange={(event) => patch('testimony', event.target.value)}
            className="mt-2 w-full resize-y rounded-lg border border-crm-taupe/35 bg-white px-3 py-2 text-base text-crm-text outline-none focus:border-navy focus:ring-2 focus:ring-navy/15"
          />
        </FieldBlock>
        <FieldBlock
          id="spouse-languages"
          label={SPOUSE_LANGUAGES_LABEL}
          hint={SPOUSE_LANGUAGES_HINT}
          className="mt-4"
          required
        >
          <MultiSelect
            id="spouse-languages"
            options={[...SPOUSE_LANGUAGE_OPTIONS]}
            selected={draft.languages}
            onChange={(next) => patch('languages', next)}
          />
        </FieldBlock>
        <FieldBlock
          id="spouse-other-language"
          label={SPOUSE_OTHER_LABEL}
          className="mt-4"
          required
        >
          <TextInput
            id="spouse-other-language"
            required={requireOtherLanguage}
            value={draft.otherLanguage}
            onChange={(value) => patch('otherLanguage', value)}
          />
        </FieldBlock>
        <FieldBlock
          id="spouse-skills"
          label={SPOUSE_SKILLS_LABEL}
          hint={SPOUSE_SKILLS_HINT}
          className="mt-4"
          required
        >
          <MultiSelect
            id="spouse-skills"
            options={[...SPOUSE_SKILL_OPTIONS]}
            selected={draft.skills}
            onChange={(next) => patch('skills', next)}
          />
        </FieldBlock>
        <FieldBlock
          id="spouse-other-skills"
          label={SPOUSE_OTHER_LABEL}
          className="mt-4"
          required
        >
          <TextInput
            id="spouse-other-skills"
            required={requireOtherSkills}
            value={draft.otherSkills}
            onChange={(value) => patch('otherSkills', value)}
          />
        </FieldBlock>
      </div>

      <FieldBlock
        id="spouse-medical"
        label={SPOUSE_MEDICAL_LABEL}
        hint={SPOUSE_MEDICAL_HINT}
      >
        <TextInput
          id="spouse-medical"
          value={draft.medical}
          onChange={(value) => patch('medical', value)}
        />
      </FieldBlock>

      <div className="mt-6 flex justify-center">
        <NextButton disabled={!allowNext} />
      </div>
    </>
  );
}

function NextButton({ disabled }: { disabled: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="min-h-10 rounded-md bg-navy px-8 text-[15px] font-medium text-white hover:bg-navy-dark disabled:cursor-not-allowed disabled:bg-crm-slate"
    >
      Next →
    </button>
  );
}

function RequiredMark() {
  return <span className="text-advise-rose"> *</span>;
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

function TextInput({
  id,
  value,
  onChange,
  required = false,
  autoComplete,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <input
      id={id}
      required={required}
      autoComplete={autoComplete}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="mt-2 min-h-11 w-full rounded-lg border border-crm-taupe/35 bg-white px-3 text-base text-crm-text outline-none focus:border-navy focus:ring-2 focus:ring-navy/15"
    />
  );
}

function DateInput({
  id,
  value,
  onChange,
  required = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <input
      id={id}
      type="date"
      required={required}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="mt-2 min-h-11 w-full max-w-[12rem] rounded-lg border border-crm-taupe/35 bg-white px-3 text-base text-crm-text outline-none focus:border-navy focus:ring-2 focus:ring-navy/15"
    />
  );
}

function RadioChoice({
  name,
  checked,
  onChange,
  label,
  required = true,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-crm-taupe/40 bg-white px-4 text-sm text-crm-heading">
      <input
        type="radio"
        name={name}
        required={required}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 accent-navy"
      />
      {label}
    </label>
  );
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

function FileDrop({
  id,
  label,
  hint,
  fileName,
  onFile,
}: {
  id: string;
  label: string;
  hint?: string;
  fileName: string;
  onFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function takeFile(file: File | undefined) {
    if (!file) return;
    onFile(file);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(true);
  }

  function handleDragLeave() {
    setDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    takeFile(event.dataTransfer.files[0]);
  }

  return (
    <div className="mt-5">
      <label htmlFor={id} className="block text-sm font-semibold text-crm-heading">
        {label}
        <RequiredMark />
      </label>
      {hint ? <p className="text-xs text-crm-slate">{hint}</p> : null}
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => takeFile(event.target.files?.[0])}
      />
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`mt-2 flex min-h-[5.5rem] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 py-5 text-center text-sm ${
          dragging
            ? 'border-navy bg-navy/5 text-crm-heading'
            : 'border-crm-taupe/50 bg-crm-white text-crm-heading'
        }`}
      >
        <FolderIcon />
        {fileName ? (
          <p className="mt-2 font-medium">{fileName}</p>
        ) : (
          <p className="mt-2">
            {FILE_DROP_LEAD} <span className="underline">{FILE_BROWSE}</span>
          </p>
        )}
      </div>
    </div>
  );
}

function MultiSelect({
  id,
  options,
  selected,
  onChange,
}: {
  id: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  function toggle(option: string) {
    onChange(
      selected.includes(option)
        ? selected.filter((item) => item !== option)
        : [...selected, option],
    );
  }

  return (
    <div className="relative mt-2">
      <button
        id={id}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-11 w-full items-center justify-between rounded-lg border border-crm-taupe/35 bg-white px-3 text-left text-base text-crm-text outline-none focus:border-navy focus:ring-2 focus:ring-navy/15"
      >
        <span className={selected.length ? '' : 'text-crm-slate/50'}>
          {selected.length ? selected.join(', ') : ''}
        </span>
        <span aria-hidden="true" className="text-crm-slate">
          ▾
        </span>
      </button>
      {open ? (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-crm-taupe/35 bg-white py-1 shadow-md">
          {options.map((option) => (
            <li key={option}>
              <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-crm-heading hover:bg-crm-white">
                <input
                  type="checkbox"
                  checked={selected.includes(option)}
                  onChange={() => toggle(option)}
                  className="h-4 w-4 accent-navy"
                />
                {option}
              </label>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
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

function FolderIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6 text-crm-slate"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4.2l1.5 1.8H19.5A1.5 1.5 0 0 1 21 9.3v7.2a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.5z" />
    </svg>
  );
}
