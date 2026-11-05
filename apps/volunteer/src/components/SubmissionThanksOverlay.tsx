import { useEffect, useRef, useState } from 'react';
import {
  SUBMISSION_THANKS_MS,
  SUBMISSION_THANKS_NOTE,
  SUBMISSION_THANKS_NOTICE,
  SUBMISSION_THANKS_TITLE,
  submissionThanksSecondsLeft,
} from '../process/guidelines';

const THANKS_RING_RADIUS = 24;
const THANKS_RING_LENGTH = 2 * Math.PI * THANKS_RING_RADIUS;

export function SubmissionThanksOverlay({
  onFinished,
  hold = false,
  durationMs = SUBMISSION_THANKS_MS,
}: {
  onFinished?: () => void;
  /** Preview only. The ring keeps running, and the box stays up. */
  hold?: boolean;
  /** How long the panel stays up before it closes. Preview loops this same length. */
  durationMs?: number;
}) {
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = performance.now();
    let frame = 0;
    let done = false;
    const tick = (now: number) => {
      const sinceStart = now - started;
      if (!hold && sinceStart >= durationMs) {
        setElapsed(durationMs);
        if (!done) {
          done = true;
          onFinishedRef.current?.();
        }
        return;
      }
      setElapsed(hold ? sinceStart % durationMs : sinceStart);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [hold, durationMs]);

  const seconds = submissionThanksSecondsLeft(elapsed);
  const remaining = Math.max(0, durationMs - elapsed) / durationMs;

  return (
    <div className="fixed inset-0 z-50 p-4 sm:p-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="submission-thanks-title"
        className="submission-thanks-zoom relative flex h-full w-full items-center justify-center rounded-3xl bg-neutral-800/90 px-8 py-16 text-center text-white shadow-2xl"
      >
        <div
          className="absolute top-5 right-5 grid h-14 w-14 place-items-center"
          role="timer"
          aria-label={`${seconds} seconds left`}
        >
          <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90" aria-hidden>
            <circle
              cx="28"
              cy="28"
              r={THANKS_RING_RADIUS}
              fill="none"
              stroke="rgba(255,255,255,0.28)"
              strokeWidth="3"
            />
            <circle
              cx="28"
              cy="28"
              r={THANKS_RING_RADIUS}
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={THANKS_RING_LENGTH}
              strokeDashoffset={THANKS_RING_LENGTH * (1 - remaining)}
            />
          </svg>
          <span className="relative grid h-9 w-9 place-items-center rounded-full bg-white/15 text-sm font-semibold tabular-nums">
            {seconds}
          </span>
        </div>
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
        </div>
      </div>
    </div>
  );
}
