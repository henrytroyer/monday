import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { tornWashClassName, tornWashStyle, washStyle } from './TornWash';

export type InfoTopic = {
  id: string;
  label: string;
};

const CARD_GRADIENT = 'bg-gradient-to-b from-[#667b96] via-[#647fa8] to-[#224a6d]';

export function InfoTopicGrid({
  header,
  ariaLabel,
  topics,
  render,
}: {
  header?: ReactNode;
  ariaLabel: string;
  topics: readonly InfoTopic[];
  render: (index: number) => ReactNode;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const titleId = useId();
  const backRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const topic = open == null ? null : topics[open];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (open == null) return;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    backRef.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(null);
    }

    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
      trigger?.focus();
    };
  }, [open]);

  return (
    <div className="relative left-1/2 -my-8 w-screen -translate-x-1/2">
      {header}
      <div
        className={`relative z-10 ${header ? '-mt-[4.25rem]' : ''} ${tornWashClassName}`}
        style={header ? tornWashStyle : washStyle}
      >
        <div
          className={`mx-auto w-full max-w-6xl px-5 ${
            header ? 'pt-[calc(4.25rem+1.75rem)] pb-8' : 'py-8'
          }`}
        >
        <ul aria-label={ariaLabel} className="grid grid-cols-5 gap-2">
          {topics.map((item, index) => (
            <li key={item.id}>
              <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={open === index}
                onClick={(event) => {
                  triggerRef.current = event.currentTarget;
                  setOpen(index);
                }}
                className={`flex min-h-14 w-full items-center justify-center rounded-lg px-2 py-2 text-center shadow-[0_8px_16px_rgba(27,54,93,0.14)] hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy ${CARD_GRADIENT}`}
              >
                <span className="font-display text-xs font-extrabold leading-tight text-white!">
                  {item.label}
                </span>
              </button>
            </li>
          ))}
        </ul>
        </div>
      </div>
      {topic == null || open == null
        ? null
        : createPortal(
            <div
              className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/45 p-4 sm:p-8"
              onClick={() => setOpen(null)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className={`relative flex max-h-[min(88dvh,52rem)] min-h-[min(70dvh,32rem)] w-full max-w-5xl flex-col overflow-y-auto rounded-3xl px-5 py-5 text-white shadow-[0_16px_40px_rgba(27,54,93,0.28)] sm:px-8 sm:py-6 ${CARD_GRADIENT}`}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start gap-2">
                  <button
                    ref={backRef}
                    type="button"
                    aria-label="Back"
                    onClick={() => setOpen(null)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white hover:bg-white/15"
                  >
                    <BackArrow />
                  </button>
                  <h2 id={titleId} className="pt-1.5 font-display text-3xl font-extrabold text-white!">
                    {topic.label}
                  </h2>
                </div>
                <div className="mt-5">{render(open)}</div>
              </div>
            </div>,
            document.body,
          )}
    </div>
  );
}

function BackArrow() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 12H5" />
      <path d="m11 6-6 6 6 6" />
    </svg>
  );
}
