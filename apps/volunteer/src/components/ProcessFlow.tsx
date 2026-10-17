import {
  SHORT_TERM_STEP_DEFAULTS,
  type ShortTermStepId,
  type VolunteerStep,
} from '../contract/volunteerApi';
import { warmerStatusLabel } from '../lib/journey';
import { processFlowTone } from '../lib/processFlow';
import { canOpenProcessStep, previewViewForStep } from '../process/previewAccess';

export function ProcessFlow({
  steps,
  currentId,
  onOpen,
  startNumber = 1,
}: {
  steps: VolunteerStep[];
  currentId?: ShortTermStepId | null;
  onOpen: (id: ShortTermStepId) => void;
  startNumber?: number;
}) {
  return (
    <ol className="grid w-full grid-cols-1 gap-6 md:grid-cols-3">
      {steps.map((step, index) => {
        const tone = processFlowTone(step, currentId);
        return (
          <li key={step.id} className="flex">
            <ProcessStepControl
              step={step}
              number={startNumber + index}
              emphasized={tone === 'current'}
              onOpen={onOpen}
            />
          </li>
        );
      })}
    </ol>
  );
}

export function ProcessStepControl({
  step,
  number,
  emphasized = false,
  onOpen,
}: {
  step: VolunteerStep;
  number: number;
  emphasized?: boolean;
  onOpen: (id: ShortTermStepId) => void;
}) {
  const openable =
    canOpenProcessStep(step.id) && Boolean(previewViewForStep(step.id));
  const card = (
    <ProcessStepCard step={step} number={number} emphasized={emphasized} />
  );
  if (!openable) return card;
  return (
    <button
      type="button"
      onClick={() => onOpen(step.id)}
      className="flex h-full w-full text-left"
    >
      {card}
    </button>
  );
}

function ProcessStepCard({
  step,
  number,
  emphasized,
}: {
  step: VolunteerStep;
  number: number;
  emphasized: boolean;
}) {
  const bodyCopy = stepCopy(step);
  return (
    <article
      className={`flex h-full w-full flex-col rounded-2xl bg-white p-6 shadow-[0_8px_24px_rgba(27,54,93,0.08)] ${
        emphasized ? 'ring-2 ring-navy/40' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-crm-terracotta text-sm font-semibold text-white">
          {step.status === 'complete' ? <CheckIcon /> : number}
        </span>
        <h2 className="font-display text-xl font-bold leading-snug text-navy">
          {step.title}
        </h2>
      </div>
      {bodyCopy ? (
        <p className="mt-4 text-[0.95rem] leading-relaxed text-navy">{bodyCopy}</p>
      ) : null}
      <p className="mt-auto pt-4 text-sm text-navy/70">
        {warmerStatusLabel(step.status, step.audience)}
      </p>
    </article>
  );
}

function stepCopy(step: VolunteerStep): string | null {
  if (step.youDo) return step.youDo;
  return SHORT_TERM_STEP_DEFAULTS.find((item) => item.id === step.id)?.youDo ?? null;
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 12.5 9.5 17 19 7"
      />
    </svg>
  );
}
