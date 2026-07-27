import type { OnboardingPipelineStepDefinition } from '../../constants/onboardingPipelineSteps';
import type { OnboardingPipeline, OnboardingPipelineStep } from '../../types/volunteer';
import { getCurrentStep, isStepDone } from '../../utils/onboardingPipeline';

interface OnboardingTimelineBarProps {
  pipeline: OnboardingPipeline;
  stepDefs: readonly OnboardingPipelineStepDefinition[];
  compact?: boolean;
}

const STEP_SHORT_LABELS: Record<string, string> = {
  application_received: 'App',
  pastor_reference: 'Pastor',
  in_review: 'Review',
  background_check: 'Background',
  child_safeguarding: 'Safeguard',
  approved: 'Approved',
  flight_info: 'Flight',
  invoice: 'Invoice',
  sent_to_field: 'Field',
};

function stepShortLabel(stepId: string): string {
  return STEP_SHORT_LABELS[stepId] ?? stepId;
}

function stepNodeClass(
  step: OnboardingPipelineStep | undefined,
  kind: 'simple' | 'async',
  isFocus: boolean,
): string {
  if (!step) return 'bg-crm-taupe/30';

  const done = isStepDone(step, kind);
  if (done) return 'bg-emerald-500';
  if (step.status === 'waiting') return 'bg-amber-400';
  if (step.status === 'received') return 'bg-emerald-400';
  if (isFocus) return 'bg-crm-indigo ring-2 ring-crm-indigo/40 ring-offset-1';
  return 'bg-crm-taupe/40';
}

export default function OnboardingTimelineBar({
  pipeline,
  stepDefs,
  compact = false,
}: OnboardingTimelineBarProps) {
  const focus = getCurrentStep(pipeline, stepDefs);
  const labelClass = compact
    ? 'mt-1 max-w-full truncate text-center text-[10px] font-medium leading-tight text-crm-slate'
    : 'mt-1.5 max-w-full truncate text-center text-[11px] font-medium leading-tight text-crm-slate';

  return (
    <div
      className={`flex w-full min-w-0 items-start gap-0.5 ${compact ? 'py-1' : 'py-2'}`}
      aria-label="Onboarding steps timeline"
    >
      {stepDefs.map((def, index) => {
        const step = pipeline.steps.find((s) => s.stepId === def.id);
        const isFocus = focus?.step.stepId === def.id;
        const nodeSize = compact ? 'h-2.5 w-2.5' : 'h-3 w-3';
        const label = stepShortLabel(def.id);

        return (
          <div key={def.id} className="flex min-w-0 flex-1 items-start">
            <div
              className="relative flex min-w-0 flex-1 flex-col items-center px-0.5"
              title={def.title}
            >
              <div
                className={`shrink-0 rounded-full transition-colors ${nodeSize} ${stepNodeClass(step, def.kind, isFocus)}`}
                aria-hidden="true"
              />
              <span className={labelClass}>{label}</span>
            </div>
            {index < stepDefs.length - 1 && (
              <div
                className={`mx-0.5 min-w-[6px] flex-1 rounded-full bg-crm-taupe/25 ${
                  compact ? 'mt-1 h-0.5' : 'mt-1.5 h-0.5'
                }`}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
