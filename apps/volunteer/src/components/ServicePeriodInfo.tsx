import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { GUIDE_FACTS } from '../lib/volunteerGuide';

const CHIP_TITLE = 'Three Month Service Period Info';
const PANEL_TITLE = 'Three Month Service Period';

export function ServicePeriodInfo({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-navy/45 p-4"
              onClick={() => setOpen(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="relative max-h-full w-full max-w-5xl overflow-hidden rounded-3xl bg-[#e8eef3] px-5 py-5 shadow-lg sm:px-8"
                onClick={(event) => event.stopPropagation()}
              >
                <h2
                  id={titleId}
                  className="text-center font-display text-2xl font-semibold text-navy sm:text-3xl"
                >
                  {PANEL_TITLE}
                </h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="absolute right-4 top-4 rounded-full px-2 py-1 text-sm font-semibold text-navy hover:bg-white"
                >
                  Close
                </button>
                <ul className="mt-6 grid gap-3 sm:grid-cols-3">
                  {GUIDE_FACTS.map((fact) => (
                    <li
                      key={fact.title}
                      className="rounded-2xl bg-white px-4 py-4 shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <FactIcon title={fact.title} />
                        <h3 className="text-base font-semibold text-navy">{fact.title}</h3>
                      </div>
                      <FactDetail title={fact.title} detail={fact.detail} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>,
            document.body,
          )
        : null}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`relative z-30 flex items-center justify-center rounded-2xl bg-crm-terracotta/40 px-3 py-1.5 text-center text-sm font-semibold text-navy ${className}`}
      >
        {CHIP_TITLE}
      </button>
    </>
  );
}

function FactDetail({ title, detail }: { title: string; detail: string }) {
  if (title !== 'Age Requirement') {
    return <p className="mt-2 text-sm leading-relaxed text-navy/80">{detail}</p>;
  }
  const points = detail
    .split('. ')
    .map((point) => point.replace(/\.$/, ''))
    .filter(Boolean);
  return (
    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-navy/80">
      {points.map((point) => (
        <li key={point}>{point}</li>
      ))}
    </ul>
  );
}

const FACT_ICONS: Record<string, string> = {
  'Length of Service': '/brand/service-period/length-of-service.png',
  'Age Requirement': '/brand/service-period/age-requirement.png',
  'Monthly Expenses': '/brand/service-period/monthly-expenses.png',
  'Travel Costs': '/brand/service-period/travel-costs.png',
  'Service Training': '/brand/service-period/service-training.png',
  Communication: '/brand/service-period/communication.png',
};

function FactIcon({ title }: { title: string }) {
  const src = FACT_ICONS[title];
  if (!src) return null;
  return <img src={src} alt="" className="h-7 w-auto shrink-0 object-contain" />;
}
