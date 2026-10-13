import { useState, type FormEvent, type ReactNode } from 'react';
import type {
  VolunteerApplicationStatus,
  VolunteerHistorySkillsLanguages,
} from '../contract/volunteerApi';
import { BackButton } from '../components/BackButton';
import { FormCard } from '../components/FormCard';
import {
  emptyHistorySkillsLanguages,
  FRIEND_NAME_LABEL,
  HEAR_ABOUT_LABEL,
  HEAR_ABOUT_OPTIONS,
  HISTORY_BANNER,
  isHistorySkillsLanguagesComplete,
  LANGUAGES_BANNER,
  LANGUAGES_HINT,
  LANGUAGES_LABEL,
  LANGUAGE_OPTIONS,
  LEADERSHIP_EXPERIENCE_LABEL,
  LEADERSHIP_EXPERIENCE_OPTIONS,
  LEADERSHIP_LABEL,
  MEDICAL_HINT,
  MEDICAL_LABEL,
  needsReferralName,
  OCCUPATION_LABEL,
  OTHER_LANGUAGE_LABEL,
  OTHER_SKILLS_HINT,
  OTHER_SKILLS_LABEL,
  SKILLS_BANNER,
  SKILL_OPTIONS,
  TESTIMONY_HINT,
  TESTIMONY_LABEL,
  TRAVEL_LABEL,
  WHY_VOLUNTEER_HINT,
  WHY_VOLUNTEER_LABEL,
  YOUR_SKILLS_HINT,
  YOUR_SKILLS_LABEL,
} from '../process/historySkillsLanguages';

export function HistorySkillsLanguagesScreen({
  me,
  onBack,
  onNext,
}: {
  me: VolunteerApplicationStatus;
  onBack: () => void;
  onNext: (draft: VolunteerHistorySkillsLanguages) => void;
}) {
  const [draft, setDraft] = useState<VolunteerHistorySkillsLanguages>(
    () => me.historySkillsLanguages ?? emptyHistorySkillsLanguages(),
  );
  const allowNext = isHistorySkillsLanguagesComplete(draft);
  const requireReferralName = needsReferralName(draft.heardAbout);
  const requireOtherSkills = draft.skills.includes('Other');
  const requireLeadershipExperience = draft.leadership === 'yes';
  const requireOtherLanguage = draft.languages.includes('Other');

  function patch<K extends keyof VolunteerHistorySkillsLanguages>(
    key: K,
    value: VolunteerHistorySkillsLanguages[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function toggleHeardAbout(id: string) {
    setDraft((current) => ({
      ...current,
      heardAbout: current.heardAbout.includes(id)
        ? current.heardAbout.filter((item) => item !== id)
        : [...current.heardAbout, id],
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

      <SectionBanner className="mt-5">{HISTORY_BANNER}</SectionBanner>
      <hr className="mt-3 border-crm-taupe/40" />

      <LabeledField
        id="hsl-medical"
        label={MEDICAL_LABEL}
        hint={MEDICAL_HINT}
        className="mt-5"
      >
        <TextArea
          id="hsl-medical"
          rows={3}
          value={draft.medical}
          onChange={(value) => patch('medical', value)}
        />
      </LabeledField>

      <fieldset className="mt-5">
        <legend className="text-sm font-semibold text-crm-heading">
          {TRAVEL_LABEL} <RequiredMark />
        </legend>
        <YesNo
          name="hsl-travel"
          value={draft.travelledInternationally}
          onChange={(value) => patch('travelledInternationally', value)}
        />
      </fieldset>

      <fieldset className="mt-5">
        <legend className="text-sm font-semibold text-crm-heading">
          {HEAR_ABOUT_LABEL} <RequiredMark />
        </legend>
        <div className="mt-3 flex flex-col items-start gap-2">
          {HEAR_ABOUT_OPTIONS.map((option) => (
            <label
              key={option.id}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-crm-taupe/40 bg-white px-4 text-sm text-crm-heading"
            >
              <input
                type="checkbox"
                checked={draft.heardAbout.includes(option.id)}
                onChange={() => toggleHeardAbout(option.id)}
                className="h-4 w-4 accent-navy"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <GrayBox className="mt-4">
        <LabeledField id="hsl-friend-name" label={FRIEND_NAME_LABEL}>
          <TextInput
            id="hsl-friend-name"
            required={requireReferralName}
            value={draft.friendName}
            onChange={(value) => patch('friendName', value)}
          />
        </LabeledField>
      </GrayBox>

      <LabeledField
        id="hsl-why"
        label={WHY_VOLUNTEER_LABEL}
        hint={WHY_VOLUNTEER_HINT}
        className="mt-5"
      >
        <TextArea
          id="hsl-why"
          rows={6}
          value={draft.whyVolunteer}
          onChange={(value) => patch('whyVolunteer', value)}
        />
      </LabeledField>

      <LabeledField
        id="hsl-testimony"
        label={TESTIMONY_LABEL}
        hint={TESTIMONY_HINT}
        className="mt-5"
      >
        <TextArea
          id="hsl-testimony"
          rows={6}
          value={draft.testimony}
          onChange={(value) => patch('testimony', value)}
        />
      </LabeledField>

      <SectionBanner className="mt-8">{SKILLS_BANNER}</SectionBanner>

      <LabeledField
        id="hsl-occupation"
        label={OCCUPATION_LABEL}
        className="mt-5"
      >
        <TextInput
          id="hsl-occupation"
          value={draft.occupation}
          onChange={(value) => patch('occupation', value)}
        />
      </LabeledField>

      <LabeledField
        id="hsl-skills"
        label={YOUR_SKILLS_LABEL}
        hint={YOUR_SKILLS_HINT}
        className="mt-5"
      >
        <MultiSelect
          id="hsl-skills"
          options={[...SKILL_OPTIONS]}
          selected={draft.skills}
          onChange={(skills) => patch('skills', skills)}
        />
      </LabeledField>

      <LabeledField
        id="hsl-other-skills"
        label={OTHER_SKILLS_LABEL}
        hint={OTHER_SKILLS_HINT}
        className="mt-5"
      >
        <TextArea
          id="hsl-other-skills"
          rows={3}
          required={requireOtherSkills}
          value={draft.otherSkills}
          onChange={(value) => patch('otherSkills', value)}
        />
      </LabeledField>

      <fieldset className="mt-5">
        <legend className="text-sm font-semibold text-crm-heading">
          {LEADERSHIP_LABEL} <RequiredMark />
        </legend>
        <YesNo
          name="hsl-leadership"
          value={draft.leadership}
          onChange={(value) => patch('leadership', value)}
        />
      </fieldset>

      <GrayBox className="mt-4">
        <LabeledField
          id="hsl-leadership-experience"
          label={LEADERSHIP_EXPERIENCE_LABEL}
        >
          <NativeSelect
            id="hsl-leadership-experience"
            required={requireLeadershipExperience}
            value={draft.leadershipExperience}
            onChange={(value) => patch('leadershipExperience', value)}
            options={[...LEADERSHIP_EXPERIENCE_OPTIONS]}
          />
        </LabeledField>
      </GrayBox>

      <SectionBanner className="mt-8">{LANGUAGES_BANNER}</SectionBanner>

      <LabeledField
        id="hsl-languages"
        label={LANGUAGES_LABEL}
        hint={LANGUAGES_HINT}
        className="mt-5"
      >
        <MultiSelect
          id="hsl-languages"
          options={[...LANGUAGE_OPTIONS]}
          selected={draft.languages}
          onChange={(languages) => patch('languages', languages)}
        />
      </LabeledField>

      <GrayBox className="mt-4">
        <LabeledField id="hsl-other-language" label={OTHER_LANGUAGE_LABEL}>
          <TextInput
            id="hsl-other-language"
            required={requireOtherLanguage}
            value={draft.otherLanguage}
            onChange={(value) => patch('otherLanguage', value)}
          />
        </LabeledField>
      </GrayBox>

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

function GrayBox({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg bg-crm-white px-3 py-3 ${className}`}>
      {children}
    </div>
  );
}

function TextInput({
  id,
  value,
  onChange,
  required = true,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <input
      id={id}
      required={required}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="mt-2 min-h-11 w-full rounded-lg border border-crm-taupe/35 bg-white px-3 text-base text-crm-text outline-none focus:border-navy focus:ring-2 focus:ring-navy/15"
    />
  );
}

function TextArea({
  id,
  rows,
  value,
  onChange,
  required = true,
}: {
  id: string;
  rows: number;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <textarea
      id={id}
      required={required}
      rows={rows}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="mt-2 w-full resize-y rounded-lg border border-crm-taupe/35 bg-white px-3 py-2 text-base text-crm-text outline-none focus:border-navy focus:ring-2 focus:ring-navy/15"
    />
  );
}

function YesNo({
  name,
  value,
  onChange,
}: {
  name: string;
  value: 'yes' | 'no' | '';
  onChange: (value: 'yes' | 'no') => void;
}) {
  return (
    <div className="mt-3 flex flex-col items-start gap-2">
      {(['yes', 'no'] as const).map((option) => (
        <label
          key={option}
          className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-crm-taupe/40 bg-white px-4 text-sm text-crm-heading"
        >
          <input
            type="radio"
            name={name}
            required
            checked={value === option}
            onChange={() => onChange(option)}
            className="h-4 w-4 accent-navy"
          />
          {option === 'yes' ? 'Yes' : 'No'}
        </label>
      ))}
    </div>
  );
}

function NativeSelect({
  id,
  value,
  onChange,
  options,
  required = true,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  required?: boolean;
}) {
  return (
    <select
      id={id}
      required={required}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="mt-2 min-h-11 w-full rounded-lg border border-crm-taupe/35 bg-white px-3 text-base text-crm-text outline-none focus:border-navy focus:ring-2 focus:ring-navy/15"
    >
      <option value="" />
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
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
