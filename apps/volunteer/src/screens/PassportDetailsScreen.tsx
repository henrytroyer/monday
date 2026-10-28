import { useRef, useState, type DragEvent, type FormEvent } from 'react';
import { useSaveOnExit } from '../lib/useSaveOnExit';
import type {
  VolunteerApplicationStatus,
  VolunteerPassportDetails,
} from '../contract/volunteerApi';
import { BackButton } from '../components/BackButton';
import { FormCard } from '../components/FormCard';
import {
  emptyPassportDetails,
  isPassportDetailsComplete,
  PASSPORT_BROWSE,
  PASSPORT_DETAILS_BANNER,
  PASSPORT_DROP_LEAD,
  PASSPORT_EXAMPLE_ALT,
  PASSPORT_EXAMPLE_SRC,
  PASSPORT_EXPIRATION_LABEL,
  PASSPORT_NUMBER_LABEL,
  PASSPORT_PHOTO_HINT,
  PASSPORT_PHOTO_LABEL,
} from '../process/passportDetails';

export function PassportDetailsScreen({
  me,
  onBack,
  onSave,
  onNext,
}: {
  me: VolunteerApplicationStatus;
  onBack: () => void;
  onSave: (draft: VolunteerPassportDetails) => void;
  onNext: (draft: VolunteerPassportDetails) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<VolunteerPassportDetails>(
    () => me.passportDetails ?? emptyPassportDetails(),
  );
  const [dragging, setDragging] = useState(false);
  const allowNext = isPassportDetailsComplete(draft);
  useSaveOnExit(draft, onSave);

  function patch<K extends keyof VolunteerPassportDetails>(
    key: K,
    value: VolunteerPassportDetails[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function takeFile(file: File | undefined) {
    if (!file) return;
    patch('photoFileName', file.name);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!allowNext) return;
    onNext(draft);
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
    <FormCard onSubmit={handleSubmit}>
      <BackButton onClick={onBack} />

      <p className="mt-5 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white">
        {PASSPORT_DETAILS_BANNER}
      </p>
      <hr className="mt-3 border-crm-taupe/40" />

      <div className="mt-6 flex justify-center">
        <img
          src={PASSPORT_EXAMPLE_SRC}
          alt={PASSPORT_EXAMPLE_ALT}
          className="w-full max-w-[18rem] rounded-md border border-crm-taupe/30 shadow-sm"
        />
      </div>

      <div className="mt-6">
        <label
          htmlFor="passport-photo"
          className="block text-sm font-semibold text-crm-heading"
        >
          {PASSPORT_PHOTO_LABEL}
          <span className="text-advise-rose"> *</span>
        </label>
        <p className="text-xs text-crm-slate">{PASSPORT_PHOTO_HINT}</p>
        <input
          ref={fileInputRef}
          id="passport-photo"
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => takeFile(event.target.files?.[0])}
        />
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              fileInputRef.current?.click();
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
          {draft.photoFileName ? (
            <p className="mt-2 font-medium">{draft.photoFileName}</p>
          ) : (
            <p className="mt-2">
              {PASSPORT_DROP_LEAD}{' '}
              <span className="underline">{PASSPORT_BROWSE}</span>
            </p>
          )}
        </div>
      </div>

      <div className="mt-5">
        <label
          htmlFor="passport-number"
          className="block text-sm font-semibold text-crm-heading"
        >
          {PASSPORT_NUMBER_LABEL}
          <span className="text-advise-rose"> *</span>
        </label>
        <input
          id="passport-number"
          required
          autoComplete="off"
          value={draft.passportNumber}
          onChange={(event) => patch('passportNumber', event.target.value)}
          className="mt-2 min-h-11 w-full rounded-lg border border-crm-taupe/35 bg-white px-3 text-base text-crm-text outline-none focus:border-navy focus:ring-2 focus:ring-navy/15"
        />
      </div>

      <div className="mt-5">
        <label
          htmlFor="passport-expiration"
          className="block text-sm font-semibold text-crm-heading"
        >
          {PASSPORT_EXPIRATION_LABEL}
          <span className="text-advise-rose"> *</span>
        </label>
        <input
          id="passport-expiration"
          type="date"
          required
          value={draft.expirationDate}
          onChange={(event) => patch('expirationDate', event.target.value)}
          className="mt-2 min-h-11 w-full max-w-[12rem] rounded-lg border border-crm-taupe/35 bg-white px-3 text-base text-crm-text outline-none focus:border-navy focus:ring-2 focus:ring-navy/15"
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
