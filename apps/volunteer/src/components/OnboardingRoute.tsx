import { useState } from 'react';
import type {
  OnboardingStep,
  OnboardingStepId,
  VolunteerApplicationStatus,
  VolunteerApplicationUpdate,
} from '../contract/volunteerApi';
import {
  showArrivalButton,
  toggleFinalChecklistItem,
  arriveInEurope,
} from '../lib/finalChecklist';
import {
  onboardingFillPercent,
  onboardingWaterTone,
  resolveOnboardingSteps,
  type OnboardingWaterTone,
} from '../lib/onboarding';
import { FinalChecklistPanel } from './FinalChecklistPanel';
import { ProgressBubble } from './ProgressBubble';

const STEPS_PER_ROW = 5;

const THANK_YOU =
  'Thank-you for submitting an application to i58 Global, we hope to welcome you to Europe soon!';

interface OnboardingBubble {
  id: OnboardingStepId;
  title: string;
  complete: boolean;
  fill: number;
  tone: OnboardingWaterTone;
}

export function SubmittedThanks({ onReveal }: { onReveal: () => void }) {
  return (
    <section className="relative left-1/2 w-screen -translate-x-1/2 bg-white py-6 sm:py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center px-5 text-center">
        <p className="font-display text-2xl font-semibold text-navy">
          “{THANK_YOU}”
        </p>
        <button
          type="button"
          onClick={onReveal}
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-crm-terracotta px-5 text-sm font-semibold text-white shadow-sm hover:brightness-95"
        >
          Continue to the next steps
          <ArrowIcon />
        </button>
      </div>
    </section>
  );
}

export function OnboardingRoute({
  me,
  onUpdateMe,
}: {
  me: VolunteerApplicationStatus;
  onUpdateMe: (next: VolunteerApplicationUpdate) => void;
}) {
  const [checklistOpen, setChecklistOpen] = useState(false);
  const steps = onboardingBubbles(me);
  const rows = chunk(steps, STEPS_PER_ROW);
  const done = steps.filter((step) => step.complete).length;

  return (
    <section
      className="relative left-1/2 w-screen -translate-x-1/2 bg-white py-6 sm:py-8"
      aria-label={`Acceptance & Service Preparation Progress: ${done} of ${steps.length} complete`}
    >
      <div className="mx-auto max-w-5xl px-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <p className="font-display text-2xl font-semibold text-navy">
            Acceptance & Service Preparation Progress
          </p>
          {showArrivalButton(me) ? (
            <button
              type="button"
              onClick={() => onUpdateMe(arriveInEurope)}
              className="min-h-11 w-fit shrink-0 rounded-full bg-crm-terracotta px-5 text-sm font-semibold text-white shadow-sm hover:brightness-95"
            >
              CLICK ME once you arrive in Europe!
            </button>
          ) : null}
        </div>

        <div className="mt-8">
          <div className="hidden sm:block">
            {rows.map((row) => (
              <ol key={row[0]?.id} className="mt-8 flex items-start first:mt-0">
                {row.map((step, index) => (
                  <li key={step.id} className="contents">
                    {index > 0 ? (
                      <StampLine
                        flowed={row[index - 1].fill > 0 && step.fill > 0}
                        tone={step.tone}
                      />
                    ) : null}
                    <StepBubble
                      step={step}
                      svgId={`${step.id}-wide`}
                      onOpenChecklist={() => setChecklistOpen(true)}
                    />
                  </li>
                ))}
              </ol>
            ))}
          </div>

          <ol className="grid grid-cols-2 gap-x-3 gap-y-6 sm:hidden">
            {steps.map((step) => (
              <li key={step.id}>
                <StepBubble
                  step={step}
                  svgId={`${step.id}-narrow`}
                  onOpenChecklist={() => setChecklistOpen(true)}
                />
              </li>
            ))}
          </ol>
        </div>
      </div>
      {checklistOpen ? (
        <FinalChecklistPanel
          checked={me.finalChecklistChecked ?? []}
          onToggle={(id) => onUpdateMe((current) => toggleFinalChecklistItem(current, id))}
          onClose={() => setChecklistOpen(false)}
        />
      ) : null}
    </section>
  );
}

export function OnboardingReminder({
  step,
  size = 'sm',
  showLabel = true,
}: {
  step: OnboardingStep;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}) {
  const fill = onboardingFillPercent(step);
  return (
    <ProgressBubble
      mark={<OnboardingIcon id={step.id} />}
      title={step.title}
      fill={fill}
      complete={step.status === 'complete' || step.status === 'received'}
      svgId={`${step.id}-next`}
      size={size}
      showLabel={showLabel}
      labelClassName="font-semibold text-navy"
      waterTone={onboardingWaterTone(step.id)}
    />
  );
}

function onboardingBubbles(me: VolunteerApplicationStatus): OnboardingBubble[] {
  return resolveOnboardingSteps(me).map((step) => {
    const fill = onboardingFillPercent(step);
    return {
      id: step.id,
      title: step.title,
      complete: fill === 100,
      fill,
      tone: onboardingWaterTone(step.id),
    };
  });
}

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }
  return rows;
}

function StampLine({
  flowed,
  tone: water,
}: {
  flowed: boolean;
  tone: OnboardingWaterTone;
}) {
  const tone = flowed
    ? water === 'orange'
      ? 'h-[3px] rounded-full bg-gradient-to-r from-[#8a4320] via-[#c96c39] to-[#f0b48a] shadow-[0_0_10px_rgba(201,108,57,0.45)]'
      : water === 'green'
        ? 'h-[3px] rounded-full bg-gradient-to-r from-[#1b365d] via-[#1f9d55] to-[#8ed4a8] shadow-[0_0_10px_rgba(31,157,85,0.45)]'
        : 'h-[3px] rounded-full bg-gradient-to-r from-[#1b365d] via-[#2f78aa] to-[#7ec8e4] shadow-[0_0_10px_rgba(47,120,170,0.45)]'
    : 'h-px bg-crm-taupe';
  const offset = flowed ? 'mt-[18.5px] sm:mt-[22.5px]' : 'mt-5 sm:mt-6';
  return <span aria-hidden className={`mx-1 min-w-2 flex-1 sm:mx-2 ${tone} ${offset}`} />;
}

function StepBubble({
  step,
  svgId,
  onOpenChecklist,
}: {
  step: OnboardingBubble;
  svgId: string;
  onOpenChecklist: () => void;
}) {
  const bubble = (
    <ProgressBubble
      mark={<OnboardingIcon id={step.id} />}
      title={step.title}
      fill={step.fill}
      complete={step.complete}
      svgId={svgId}
      waterTone={step.tone}
    />
  );
  if (step.id !== 'final_checklist') {
    const statusLabel = step.complete ? 'complete' : 'not finished';
    return (
      <div
        className="flex w-full flex-col items-center sm:w-28 sm:shrink-0"
        aria-label={`${step.title}, ${statusLabel}`}
      >
        {bubble}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onOpenChecklist}
      className="flex w-full flex-col items-center sm:w-28 sm:shrink-0"
      aria-label={`${step.title}, open checklist`}
    >
      {bubble}
    </button>
  );
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0"
      fill="none"
      aria-hidden
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 12h15" />
      <path d="M13 6.5 19 12l-6 5.5" />
    </svg>
  );
}

function OnboardingIcon({ id }: { id: OnboardingStepId }) {
  switch (id) {
    case 'application_received_post':
      return (
        <>
          <path d="M4.2 13.2h3.6l1.4 2h5.6l1.4-2h3.6" />
          <path d="M5.4 13.2 7 6.4h10l1.6 6.8v5.2H5.4v-5.2Z" />
        </>
      );
    case 'pastor_reference_sent':
      return (
        <>
          <path d="M3.4 7.2 12 3.6l8.6 3.6-8.6 4.2L3.4 7.2Z" />
          <path d="M3.4 7.2V16.6h17.2V7.2" />
          <path d="M12 11.4V16.6" />
        </>
      );
    case 'pastor_reference_received':
      return (
        <>
          <rect x="3.4" y="6" width="17.2" height="12" rx="1.5" />
          <path d="M4 7.4 12 12.4 20 7.4" />
        </>
      );
    case 'background_check_sent':
      return (
        <>
          <rect x="6" y="3.6" width="12" height="16.8" rx="1.5" />
          <path d="M9 3.6h6v2.2H9V3.6Z" />
          <path d="M8.6 11.2h6.8M8.6 14.4h4.2" />
        </>
      );
    case 'acceptance':
      return (
        <>
          <circle cx="12" cy="12" r="7.4" />
          <path d="M8.2 12.2 10.8 14.8 15.8 9.4" />
        </>
      );
    case 'safeguarding_certificate':
      return (
        <>
          <circle cx="12" cy="9.2" r="4.4" />
          <path d="M9.2 12.8 8.2 20l3.8-2.1L15.8 20l-1-7.2" />
        </>
      );
    case 'chat_groups':
      return (
        <>
          <path d="M5 6.2h8.4a2 2 0 0 1 2 2V12a2 2 0 0 1-2 2H8.2L5 16.2V8.2a2 2 0 0 1 2-2Z" />
          <path d="M10.2 14.2h4.6a2 2 0 0 1 2 2v3.4l-2.4-1.6h-4.2a2 2 0 0 1-2-2v-1.8" />
        </>
      );
    case 'flights':
      return (
        <image
          href="/brand/flights-airplane.png?v=navy"
          x="1"
          y="4.2"
          width="22"
          height="15.6"
        />
      );
    case 'team_training':
      return (
        <>
          <rect x="3.6" y="4.4" width="16.8" height="11.2" rx="1.4" />
          <path d="M8 19.6h8M12 15.6v4" />
        </>
      );
    case 'final_checklist':
      return (
        <>
          <path d="M4.4 7.2 6 8.8 8.8 5.6" />
          <path d="M11 7.2h8.2" />
          <path d="M4.4 12.2 6 13.8 8.8 10.6" />
          <path d="M11 12.2h8.2" />
          <path d="M4.4 17.2 6 18.8 8.8 15.6" />
          <path d="M11 17.2h8.2" />
        </>
      );
    default:
      return null;
  }
}
