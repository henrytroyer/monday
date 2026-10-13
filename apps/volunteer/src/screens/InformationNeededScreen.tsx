import { useId, useState, type ReactNode } from 'react';
import { BackButton } from '../components/BackButton';
import { FormCard } from '../components/FormCard';
import {
  CONTACT_INFO_ITEMS,
  CONTACT_INFO_SUBHEAD,
  CONTACT_INFO_TITLE,
  INFORMATION_NEEDED_HEADING,
  PASSPORT_PHOTO_TITLE,
  PASSPORT_TIPS,
  PASSPORT_TIPS_HEADING,
  PROFILE_PHOTO_TITLE,
  PROFILE_REQUIREMENTS,
  PROFILE_REQUIREMENTS_HEADING,
} from '../process/informationNeeded';

export function InformationNeededScreen({
  onBack,
  onContinue,
}: {
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <FormCard>
      <BackButton onClick={onBack} />

      <h1 className="text-lg font-bold text-navy">
        {INFORMATION_NEEDED_HEADING}
      </h1>
      <hr className="mt-3 border-crm-taupe/40" />

      <div className="mt-5 flex flex-col gap-3">
        <AdviceSection title={CONTACT_INFO_TITLE}>
          <p className="text-center text-sm font-bold text-crm-heading">
            {CONTACT_INFO_SUBHEAD}
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-crm-heading">
            {CONTACT_INFO_ITEMS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </AdviceSection>

        <AdviceSection title={PASSPORT_PHOTO_TITLE}>
          <TipCallout heading={PASSPORT_TIPS_HEADING}>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              {PASSPORT_TIPS.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </TipCallout>
        </AdviceSection>

        <AdviceSection title={PROFILE_PHOTO_TITLE}>
          <TipCallout heading={PROFILE_REQUIREMENTS_HEADING}>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              {PROFILE_REQUIREMENTS.map((row) => (
                <li key={row.bold}>
                  {row.before}
                  <strong>{row.bold}</strong>
                  {row.after}
                </li>
              ))}
            </ul>
          </TipCallout>
        </AdviceSection>
      </div>

      <hr className="mt-8 border-crm-taupe/40" />
      <div className="mt-6 flex justify-center">
        <button
          type="button"
          onClick={onContinue}
          className="min-h-10 rounded-md bg-navy px-8 text-[15px] font-medium text-white hover:bg-navy-dark"
        >
          Continue
        </button>
      </div>
    </FormCard>
  );
}

function AdviceSection({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-11 w-full items-center justify-between rounded-lg bg-navy px-4 text-left text-sm font-semibold text-white"
      >
        {title}
        <Chevron down={open} />
      </button>
      {open ? (
        <div id={panelId} className="px-1 pb-2 pt-4">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function TipCallout({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl border border-amber-400 bg-advise-wash px-3 py-3 text-sm text-advise-amber">
      <span aria-hidden="true" className="mt-0.5 shrink-0 text-base">
        ⚠️
      </span>
      <div>
        <p className="font-bold">{heading}</p>
        {children}
      </div>
    </div>
  );
}

function Chevron({ down }: { down: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`h-4 w-4 shrink-0 transition-transform ${down ? 'rotate-180' : ''}`}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M5.2 7.5 10 12.3l4.8-4.8 1.4 1.4L10 15.2 3.8 8.9z"
      />
    </svg>
  );
}
