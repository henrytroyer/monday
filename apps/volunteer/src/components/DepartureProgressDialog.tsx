import { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { OnboardingIcon } from './OnboardingRoute';
import { ProgressBubble } from './ProgressBubble';
import { CONNECTOR } from '../lib/stepConnector';
import type { ProcessRingStep } from '../lib/onboarding';

const TRACK = '#d4c8b8';

export function DepartureProgressDialog({
  percent,
  steps,
  onClose,
}: {
  percent: number;
  steps: ProcessRingStep[];
  onClose: () => void;
}) {
  const titleId = useId();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/45 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-h-full w-full max-w-5xl overflow-y-auto rounded-3xl bg-[#e8eef3] px-4 py-5 shadow-lg sm:px-8"
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id={titleId}
          className="pr-16 text-center font-display text-2xl font-semibold text-navy"
        >
          Progress until departure
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full px-2 py-1 text-sm font-semibold text-navy hover:bg-white"
        >
          Close
        </button>
        <div className="relative mx-auto mt-4 aspect-square w-[min(100%,36rem)]">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
            <circle cx="50" cy="50" r="32" fill="none" stroke={TRACK} strokeWidth="4.5" />
            {steps.map((step) => {
              const length = (step.fill / 100) * step.arc;
              if (length <= 0) return null;
              return (
                <circle
                  key={step.id}
                  cx="50"
                  cy="50"
                  r="32"
                  fill="none"
                  stroke={CONNECTOR[step.tone].to}
                  strokeWidth="4.5"
                  strokeLinecap="butt"
                  pathLength="100"
                  strokeDasharray={`${length} ${100 - length}`}
                  strokeDashoffset={-step.start}
                />
              );
            })}
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-2xl font-semibold text-navy">
            {Math.min(100, Math.max(0, percent))}%
          </span>
          <ul className="absolute inset-0">
            {steps.map((step) => (
              <RingMark key={step.id} step={step} />
            ))}
          </ul>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function RingMark({ step }: { step: ProcessRingStep }) {
  const theta = ((step.start + step.arc / 2) / 100) * Math.PI * 2 - Math.PI / 2;
  const started = step.fill > 0;
  const label =
    step.fill >= 100 ? 'complete' : started ? 'in progress' : 'not finished';
  return (
    <li
      className="absolute flex w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center"
      style={{
        left: `${50 + 44 * Math.cos(theta)}%`,
        top: `${50 + 44 * Math.sin(theta)}%`,
      }}
    >
      <span aria-label={`${step.title}, ${label}`}>
        <ProgressBubble
          {...(step.kind === 'application'
            ? { id: step.id }
            : { mark: <OnboardingIcon id={step.id} /> })}
          title={step.title}
          fill={step.fill}
          complete={step.fill >= 100}
          svgId={`${step.id}-ring`}
          size="xs"
          showLabel={false}
          waterTone={step.tone}
        />
      </span>
      <span className="mt-0.5 text-center text-[10px] leading-tight font-semibold text-navy">
        {step.title}
      </span>
    </li>
  );
}
