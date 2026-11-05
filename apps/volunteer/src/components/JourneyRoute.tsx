import type { ShortTermStepId, VolunteerApplicationStatus } from '../contract/volunteerApi';
import { SHORT_TERM_STEP_DEFAULTS } from '../contract/volunteerApi';
import { stepFillPercent } from '../lib/formProgress';
import { canOpenProcessStep } from '../process/previewAccess';
import { ProgressBubble } from './ProgressBubble';
import { StepConnector } from './StepConnector';

const STEPS_PER_ROW = 5;

interface ApplicationBubble {
  id: ShortTermStepId;
  title: string;
  complete: boolean;
  fill: number;
}

export function JourneyRoute({
  me,
  variant = 'full',
  onSelectStep,
}: {
  me: VolunteerApplicationStatus;
  variant?: 'compact' | 'full';
  onSelectStep?: (id: ShortTermStepId) => void;
}) {
  const steps = applicationBubbles(me);
  const rows = chunk(steps, STEPS_PER_ROW);
  const done = steps.filter((step) => step.complete).length;
  const compact = variant === 'compact';

  return (
    <section
      className={`relative left-1/2 w-screen -translate-x-1/2 bg-white ${
        compact ? 'py-4' : 'py-6 sm:py-8'
      }`}
      aria-label={`Your application progress: ${done} of ${steps.length} complete`}
    >
      <div className="mx-auto max-w-5xl px-5">
        <p
          className={`font-display font-semibold text-navy ${
            compact ? 'text-lg' : 'text-2xl'
          }`}
        >
          Your Application Progress
        </p>

        <div className={compact ? 'mt-4' : 'mt-8'}>
          <div className="hidden sm:block">
            {rows.map((row) => (
              <ol key={row[0]?.id} className="mt-8 flex items-start first:mt-0">
                {row.map((step, index) => (
                  <li key={step.id} className="contents">
                    {index > 0 ? (
                      <StepConnector
                        compact={compact}
                        tone={row[index - 1].fill > 0 && step.fill > 0 ? 'blue' : 'muted'}
                      />
                    ) : null}
                    <StepBubble
                      step={step}
                      steps={me.steps}
                      compact={compact}
                      svgId={`${step.id}-wide`}
                      onSelectStep={onSelectStep}
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
                  steps={me.steps}
                  compact={compact}
                  svgId={`${step.id}-narrow`}
                  onSelectStep={onSelectStep}
                />
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function applicationBubbles(me: VolunteerApplicationStatus): ApplicationBubble[] {
  return SHORT_TERM_STEP_DEFAULTS.map((step) => {
    const live = me.steps.find((item) => item.id === step.id);
    const fill = stepFillPercent(me, step.id);
    return {
      id: step.id,
      title: live?.title ?? step.title,
      complete: live?.status === 'complete',
      fill,
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

function StepBubble({
  step,
  steps,
  compact,
  svgId,
  onSelectStep,
}: {
  step: ApplicationBubble;
  steps: VolunteerApplicationStatus['steps'];
  compact: boolean;
  svgId: string;
  onSelectStep?: (id: ShortTermStepId) => void;
}) {
  const reachable = canOpenProcessStep(step.id, steps);
  const openable = Boolean(onSelectStep) && reachable;
  const className = 'flex w-full flex-col items-center sm:w-24 sm:shrink-0';
  const statusLabel = step.complete
    ? 'complete'
    : !reachable
      ? 'available after the previous step is finished'
      : step.fill > 0
        ? 'in progress'
        : 'not finished';

  const body = (
    <ProgressBubble
      id={step.id}
      title={step.title}
      fill={step.fill}
      complete={step.complete}
      svgId={svgId}
      size={compact ? 'sm' : 'md'}
    />
  );

  if (!openable) {
    return (
      <div className={className} aria-label={`${step.title}, ${statusLabel}`}>
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`${className} cursor-pointer`}
      aria-label={`${step.title}, ${statusLabel}`}
      onClick={() => onSelectStep?.(step.id)}
    >
      {body}
    </button>
  );
}
