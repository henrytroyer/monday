import { useRef, useState, type DragEvent, type FormEvent } from 'react';
import type {
  VolunteerApplicationStatus,
  VolunteerProfilePhoto,
} from '../contract/volunteerApi';
import { BackButton } from '../components/BackButton';
import { FormCard } from '../components/FormCard';
import {
  emptyProfilePhoto,
  ID_PHOTO_BROWSE,
  ID_PHOTO_DROP_LEAD,
  ID_PHOTO_EXAMPLE_ALT,
  ID_PHOTO_EXAMPLE_SRC,
  ID_PHOTO_LABEL,
  ID_PHOTO_REQUIREMENTS,
  ID_PHOTO_REQUIREMENTS_HEADING,
  isProfilePhotoComplete,
  PROFILE_PHOTO_BANNER,
} from '../process/profilePhoto';

export function ProfilePhotoScreen({
  me,
  onBack,
  onNext,
}: {
  me: VolunteerApplicationStatus;
  onBack: () => void;
  onNext: (draft: VolunteerProfilePhoto) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<VolunteerProfilePhoto>(
    () => me.profilePhoto ?? emptyProfilePhoto(),
  );
  const [dragging, setDragging] = useState(false);
  const allowNext = isProfilePhotoComplete(draft);

  function takeFile(file: File | undefined) {
    if (!file) return;
    setDraft({ photoFileName: file.name });
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
        {PROFILE_PHOTO_BANNER}
      </p>
      <hr className="mt-3 border-crm-taupe/40" />

      <div className="mt-5 flex gap-3 rounded-xl border border-amber-400 bg-advise-wash px-3 py-3 text-sm text-advise-amber">
        <span aria-hidden="true" className="mt-0.5 shrink-0">
          ⚠️
        </span>
        <div>
          <p className="font-semibold">{ID_PHOTO_REQUIREMENTS_HEADING}</p>
          <ul className="mt-1 list-disc space-y-1 pl-4">
            {ID_PHOTO_REQUIREMENTS.map((item) => (
              <li key={item.parts.map((part) => part.text).join('')}>
                {item.parts.map((part) =>
                  part.bold ? (
                    <strong key={part.text}>{part.text}</strong>
                  ) : (
                    <span key={part.text}>{part.text}</span>
                  ),
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 flex justify-center">
        <img
          src={ID_PHOTO_EXAMPLE_SRC}
          alt={ID_PHOTO_EXAMPLE_ALT}
          className="h-40 w-auto object-contain"
        />
      </div>

      <div className="mt-6">
        <label
          htmlFor="id-photo"
          className="block text-sm font-semibold text-crm-heading"
        >
          {ID_PHOTO_LABEL}
          <span className="text-advise-rose"> *</span>
        </label>
        <input
          ref={fileInputRef}
          id="id-photo"
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
              {ID_PHOTO_DROP_LEAD}{' '}
              <span className="underline">{ID_PHOTO_BROWSE}</span>
            </p>
          )}
        </div>
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
