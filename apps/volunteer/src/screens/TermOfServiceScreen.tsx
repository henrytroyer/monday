import { useState, type FormEvent, type ReactNode } from 'react';
import { useSaveOnExit } from '../lib/useSaveOnExit';
import type {
  VolunteerApplicationStatus,
  VolunteerTermOfService,
} from '../contract/volunteerApi';
import { BackButton } from '../components/BackButton';
import { FormCard } from '../components/FormCard';
import {
  emptyTermOfService,
  isTermOfServiceComplete,
  LENGTH_OF_TERM_LABEL,
  LENGTH_OF_TERM_OPTIONS,
  LOCATION_PREFERENCE_HINT,
  LOCATION_PREFERENCE_LABEL,
  LOCATION_PREFERENCE_OPTIONS,
  NEARBY_AIRPORT_LABEL,
  OTHER_TERM_LABEL,
  PREFERENCE_HEADING,
  PREFERENCE_NOTE,
  PREFERRED_DATE_OPTIONS,
  PREFERRED_DATES_LABEL,
  SCHEDULE_NOTE,
  TERM_OF_SERVICE_BANNER,
  TRAVEL_NOTE_BODY,
  TRAVEL_NOTE_FOOTER,
  TRAVEL_NOTE_HEADING,
} from '../process/termOfService';

export function TermOfServiceScreen({
  me,
  onBack,
  onSave,
  onNext,
}: {
  me: VolunteerApplicationStatus;
  onBack: () => void;
  onSave: (draft: VolunteerTermOfService) => void;
  onNext: (draft: VolunteerTermOfService) => void;
}) {
  const [draft, setDraft] = useState<VolunteerTermOfService>(
    () => me.termOfService ?? emptyTermOfService(),
  );
  const allowNext = isTermOfServiceComplete(draft);
  useSaveOnExit(draft, onSave);
  const requireOtherTerm = draft.lengthOfTerm === 'other';

  function patch<K extends keyof VolunteerTermOfService>(
    key: K,
    value: VolunteerTermOfService[K],
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
        {TERM_OF_SERVICE_BANNER}
      </p>

      <FieldBlock
        id="term-location-preference"
        label={LOCATION_PREFERENCE_LABEL}
        hint={LOCATION_PREFERENCE_HINT}
        required
      >
        <MultiSelect
          id="term-location-preference"
          options={[...LOCATION_PREFERENCE_OPTIONS]}
          selected={draft.locationPreferences}
          onChange={(next) => patch('locationPreferences', next)}
        />
      </FieldBlock>

      <div className="mt-4 rounded-lg bg-crm-white px-3 py-3">
        <div className="rounded-xl border border-amber-400 bg-advise-wash px-3 py-3 text-sm text-advise-amber">
          <p className="font-semibold">{PREFERENCE_HEADING}</p>
          <p className="mt-2 flex gap-2">
            <span aria-hidden="true">⚠️</span>
            <span>{PREFERENCE_NOTE}</span>
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-navy">
        <div className="flex gap-3">
          <span aria-hidden="true" className="mt-0.5 shrink-0">
            ℹ️
          </span>
          <p>{SCHEDULE_NOTE}</p>
        </div>
      </div>

      <fieldset className="mt-5">
        <legend className="text-sm font-semibold text-crm-heading">
          {LENGTH_OF_TERM_LABEL} <RequiredMark />
        </legend>
        <div className="mt-3 flex flex-col items-start gap-2">
          {LENGTH_OF_TERM_OPTIONS.map((option) => (
            <label
              key={option.id}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-crm-taupe/40 bg-white px-4 text-sm text-crm-heading"
            >
              <input
                type="radio"
                name="term-length"
                required
                checked={draft.lengthOfTerm === option.id}
                onChange={() => patch('lengthOfTerm', option.id)}
                className="h-4 w-4 accent-navy"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-5 rounded-lg bg-crm-white px-3 py-3">
        <FieldBlock
          id="term-other"
          label={OTHER_TERM_LABEL}
          required
          className=""
        >
          <textarea
            id="term-other"
            required={requireOtherTerm}
            rows={4}
            value={draft.otherTerm}
            onChange={(event) => patch('otherTerm', event.target.value)}
            className="mt-2 w-full resize-y rounded-lg border border-crm-taupe/35 bg-white px-3 py-2 text-base text-crm-text outline-none focus:border-navy focus:ring-2 focus:ring-navy/15"
          />
        </FieldBlock>
      </div>

      <FieldBlock
        id="term-preferred-dates"
        label={PREFERRED_DATES_LABEL}
        required
      >
        <select
          id="term-preferred-dates"
          required
          value={draft.preferredDates}
          onChange={(event) => patch('preferredDates', event.target.value)}
          className="mt-2 min-h-11 w-full rounded-lg border border-crm-taupe/35 bg-white px-3 text-base text-crm-text outline-none focus:border-navy focus:ring-2 focus:ring-navy/15"
        >
          <option value="" />
          {PREFERRED_DATE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </FieldBlock>

      <FieldBlock
        id="term-airport"
        label={NEARBY_AIRPORT_LABEL}
        required
      >
        <input
          id="term-airport"
          required
          value={draft.nearbyAirport}
          onChange={(event) => patch('nearbyAirport', event.target.value)}
          className="mt-2 min-h-11 w-full rounded-lg border border-crm-taupe/35 bg-white px-3 text-base text-crm-text outline-none focus:border-navy focus:ring-2 focus:ring-navy/15"
        />
      </FieldBlock>

      <div className="mt-5 rounded-xl border border-amber-400 bg-advise-wash px-3 py-3 text-sm text-advise-amber">
        <p className="flex gap-2">
          <span aria-hidden="true">⚠️</span>
          <span className="font-semibold">{TRAVEL_NOTE_HEADING}</span>
        </p>
        <p className="mt-2">{TRAVEL_NOTE_BODY}</p>
        <p className="mt-3">{TRAVEL_NOTE_FOOTER}</p>
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
