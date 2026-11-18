import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  SUBMISSION_THANKS_MS,
  SUBMISSION_THANKS_NOTE,
  SUBMISSION_THANKS_NOTICE,
  SUBMISSION_THANKS_TITLE,
  submissionThanksSecondsLeft,
} from '../process/guidelines';

export function SubmissionThanksOverlay({
  onFinished,
  hold = false,
  durationMs = SUBMISSION_THANKS_MS,
}: {
  onFinished?: () => void;
  /** Preview only. The fill keeps running, and the box stays up. */
  hold?: boolean;
  /** How long the panel stays up before it closes. Preview loops this same length. */
  durationMs?: number;
}) {
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;
  const [seconds, setSeconds] = useState(() => submissionThanksSecondsLeft(0));

  useEffect(() => {
    const started = performance.now();
    const tick = window.setInterval(() => {
      const sinceStart = performance.now() - started;
      if (!hold && sinceStart >= durationMs) {
        setSeconds(0);
        window.clearInterval(tick);
        onFinishedRef.current?.();
        return;
      }
      const elapsed = hold ? sinceStart % durationMs : sinceStart;
      setSeconds(submissionThanksSecondsLeft(elapsed));
    }, 200);
    return () => window.clearInterval(tick);
  }, [hold, durationMs]);

  return (
    <div className="fixed inset-0 z-50 p-4 sm:p-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="submission-thanks-title"
        className="submission-thanks-zoom relative flex h-full w-full items-center justify-center rounded-3xl bg-neutral-800/90 px-8 py-16 text-center text-white shadow-2xl"
      >
        <div className="max-w-3xl">
          <h2
            id="submission-thanks-title"
            className="font-display text-2xl font-semibold leading-snug text-white! md:text-4xl"
          >
            {SUBMISSION_THANKS_TITLE.split('\n').map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h2>
          <p className="mt-5 text-base leading-relaxed text-white/85 md:text-lg">
            {SUBMISSION_THANKS_NOTICE} {SUBMISSION_THANKS_NOTE}
          </p>
          <button
            type="button"
            onClick={() => onFinishedRef.current?.()}
            className="relative mt-8 inline-flex min-h-11 min-w-44 items-center justify-center overflow-hidden rounded-full bg-white/15 px-7 text-sm font-semibold text-white shadow-sm hover:brightness-110"
            aria-label={`Continue, ${seconds} seconds left`}
          >
            <span
              aria-hidden
              data-loop={hold ? 'true' : undefined}
              className="submission-thanks-fill absolute inset-y-0 left-0 w-full"
              style={{ '--thanks-fill-ms': `${durationMs}ms` } as CSSProperties}
            />
            <span className="relative">Continue</span>
          </button>
        </div>
      </div>
    </div>
  );
}
