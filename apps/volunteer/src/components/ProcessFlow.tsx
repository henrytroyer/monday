import type { ShortTermStepId, VolunteerStep } from '../contract/volunteerApi';
import { warmerStatusLabel } from '../lib/journey';
import {
  processFlowCell,
  processFlowConnector,
  processFlowTone,
  type ProcessFlowTone,
} from '../lib/processFlow';
import { canOpenProcessStep, previewViewForStep } from '../process/previewAccess';

const TONE_CLASS: Record<ProcessFlowTone, string> = {
  done: 'bg-[#e7f6ec] text-navy ring-[#b7e0c4]',
  current: 'bg-[#fff6d8] text-navy ring-[#f0d48a]',
  todo: 'bg-[#fde8ea] text-navy ring-[#f3c0c6]',
};

export function ProcessFlow({
  steps,
  currentId,
  onOpen,
}: {
  steps: VolunteerStep[];
  currentId?: ShortTermStepId | null;
  onOpen: (id: ShortTermStepId) => void;
}) {
  return (
    <ol className="mx-auto flex w-full max-w-4xl flex-col gap-10 md:grid md:grid-cols-3 md:gap-x-10 md:gap-y-10">
      {steps.map((step, index) => {
        const tone = processFlowTone(step, currentId);
        const openable = canOpenProcessStep(step.id) && Boolean(previewViewForStep(step.id));
        const { row, col } = processFlowCell(index);
        const connector = processFlowConnector(index, steps.length);
        const body = (
          <article
            className={`flex min-h-[7.5rem] flex-col items-center justify-center rounded-xl px-4 py-5 text-center shadow-sm ring-1 ${TONE_CLASS[tone]}`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-navy/50">
              {index + 1}
            </p>
            <h2 className="mt-1 text-sm font-semibold leading-snug sm:text-[15px]">
              {step.title}
            </h2>
            <p className="mt-2 text-xs text-navy/65">
              {warmerStatusLabel(step.status, step.audience)}
            </p>
          </article>
        );

        return (
          <li
            key={step.id}
            className="relative"
            style={{ gridColumn: col + 1, gridRow: row + 1 }}
          >
            {openable ? (
              <button type="button" onClick={() => onOpen(step.id)} className="w-full text-left">
                {body}
              </button>
            ) : (
              body
            )}
            {index < steps.length - 1 ? (
              <span
                aria-hidden
                className="pointer-events-none absolute -bottom-10 left-1/2 h-10 w-0 -translate-x-1/2 border-l-2 border-dotted border-navy/25 md:hidden"
              />
            ) : null}
            {connector === 'right' ? (
              <span
                aria-hidden
                className="pointer-events-none absolute top-1/2 -right-10 hidden h-0 w-10 border-t-2 border-dotted border-navy/25 md:block"
              />
            ) : null}
            {connector === 'left' ? (
              <span
                aria-hidden
                className="pointer-events-none absolute top-1/2 -left-10 hidden h-0 w-10 border-t-2 border-dotted border-navy/25 md:block"
              />
            ) : null}
            {connector === 'down' ? (
              <span
                aria-hidden
                className="pointer-events-none absolute -bottom-10 left-1/2 hidden h-10 w-0 -translate-x-1/2 border-l-2 border-dotted border-navy/25 md:block"
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
