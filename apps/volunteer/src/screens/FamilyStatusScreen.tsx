import { useState, type FormEvent } from 'react';
import type {
  VolunteerApplicationStatus,
  VolunteerFamilyStatus,
} from '../contract/volunteerApi';
import { BackButton } from '../components/BackButton';
import { FormCard } from '../components/FormCard';
import {
  CHILDREN_18_HEADING,
  CHILDREN_18_NOTE,
  CHILDREN_COMING_LABEL,
  emptyFamilyStatus,
  FAMILY_MEMBERS_HINT,
  FAMILY_MEMBERS_LABEL,
  FAMILY_STATUS_BANNER,
  isFamilyStatusComplete,
  MARITAL_STATUS_LABEL,
  MARITAL_STATUS_OPTIONS,
} from '../process/familyStatus';

export function FamilyStatusScreen({
  me,
  onBack,
  onNext,
}: {
  me: VolunteerApplicationStatus;
  onBack: () => void;
  onNext: (draft: VolunteerFamilyStatus) => void;
}) {
  const [draft, setDraft] = useState<VolunteerFamilyStatus>(
    () => me.familyStatus ?? emptyFamilyStatus(),
  );
  const allowNext = isFamilyStatusComplete(draft);
  const requireFamilyMembers = draft.childrenComing === 'yes';

  function patch<K extends keyof VolunteerFamilyStatus>(
    key: K,
    value: VolunteerFamilyStatus[K],
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
        {FAMILY_STATUS_BANNER}
      </p>
      <hr className="mt-3 border-crm-taupe/40" />

      <fieldset className="mt-5">
        <legend className="text-sm font-semibold text-crm-heading">
          {MARITAL_STATUS_LABEL} <RequiredMark />
        </legend>
        <div className="mt-3 flex flex-col items-start gap-2">
          {MARITAL_STATUS_OPTIONS.map((option) => (
            <label
              key={option.id}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-crm-taupe/40 bg-white px-4 text-sm text-crm-heading"
            >
              <input
                type="radio"
                name="family-marital"
                required
                checked={draft.maritalStatus === option.id}
                onChange={() => patch('maritalStatus', option.id)}
                className="h-4 w-4 accent-navy"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-5 rounded-lg bg-crm-white px-3 py-3">
        <fieldset>
          <legend className="text-sm font-semibold text-crm-heading">
            {CHILDREN_COMING_LABEL} <RequiredMark />
          </legend>
          <div className="mt-3 flex flex-col items-start gap-2">
            {(['yes', 'no'] as const).map((option) => (
              <label
                key={option}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-crm-taupe/40 bg-white px-4 text-sm text-crm-heading"
              >
                <input
                  type="radio"
                  name="family-children"
                  required
                  checked={draft.childrenComing === option}
                  onChange={() => patch('childrenComing', option)}
                  className="h-4 w-4 accent-navy"
                />
                {option === 'yes' ? 'Yes' : 'No'}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="mt-4 flex gap-3 rounded-xl border border-amber-400 bg-advise-wash px-3 py-3 text-sm text-advise-amber">
        <span aria-hidden="true" className="mt-0.5 shrink-0">
          ⚠️
        </span>
        <div>
          <p className="font-semibold">{CHILDREN_18_HEADING}</p>
          <p className="mt-1">{CHILDREN_18_NOTE}</p>
        </div>
      </div>

      <div className="mt-5 rounded-lg bg-crm-white px-3 py-3">
        <label
          htmlFor="family-members"
          className="block text-sm font-semibold text-crm-heading"
        >
          {FAMILY_MEMBERS_LABEL}
          <RequiredMark />
        </label>
        <p className="text-xs text-crm-slate">{FAMILY_MEMBERS_HINT}</p>
        <textarea
          id="family-members"
          required={requireFamilyMembers}
          rows={6}
          value={draft.familyMembers}
          onChange={(event) => patch('familyMembers', event.target.value)}
          className="mt-2 w-full resize-y rounded-lg border border-crm-taupe/35 bg-white px-3 py-2 text-base text-crm-text outline-none focus:border-navy focus:ring-2 focus:ring-navy/15"
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
