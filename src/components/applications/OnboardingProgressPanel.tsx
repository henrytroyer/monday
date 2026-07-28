import { useState, type ReactNode } from 'react';
import {
  getOnboardingStepsForApplication,
  type OnboardingPipelineStepDefinition,
} from '../../constants/onboardingPipelineSteps';
import type { OnboardingPipeline } from '../../types/volunteer';
import { countCompletedSteps } from '../../services/shortTermOnboardingSync';
import { getCurrentStep } from '../../utils/onboardingPipeline';
import OnboardingTimelineBar from './OnboardingTimelineBar';

interface OnboardingProgressPanelProps {
  pipeline: OnboardingPipeline;
  variant: 'short-term' | 'long-term';
  children: ReactNode;
}

export default function OnboardingProgressPanel({
  pipeline,
  variant,
  children,
}: OnboardingProgressPanelProps) {
  const [expanded, setExpanded] = useState(variant === 'long-term');
  const stepDefs: readonly OnboardingPipelineStepDefinition[] =
    getOnboardingStepsForApplication(variant === 'long-term');

  const doneCount = countCompletedSteps(pipeline);
  const totalCount = stepDefs.length;
  const current = getCurrentStep(pipeline, stepDefs);
  const summaryLabel = current
    ? `${current.definition.title} — in progress`
    : 'All steps complete';

  return (
    <div className="rounded-2xl border border-crm-taupe/20 bg-crm-white p-5">
      <div className="flex w-full items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-crm-heading">
            {variant === 'long-term'
              ? 'Long-term Process'
              : 'Onboarding Progress'}
          </h3>
          <p className="mt-1 text-sm text-crm-slate">
            {doneCount}/{totalCount} complete · {summaryLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-crm-taupe/25 bg-crm-surface px-3 py-2 text-sm font-medium text-crm-heading shadow-sm transition hover:border-crm-taupe/40 hover:bg-crm-taupe-50"
          aria-expanded={expanded}
          aria-controls="onboarding-progress-details"
        >
          <span>{expanded ? 'Hide details' : 'Show details'}</span>
          <span className="text-crm-slate" aria-hidden="true">
            {expanded ? '▾' : '▸'}
          </span>
        </button>
      </div>

      <div className="mt-3 border-t border-crm-taupe/10 pt-3">
        <OnboardingTimelineBar
          pipeline={pipeline}
          stepDefs={stepDefs}
          compact={!expanded}
        />
      </div>

      {expanded && (
        <div
          id="onboarding-progress-details"
          className="mt-4 border-t border-crm-taupe/10 pt-4"
        >
          {children}
        </div>
      )}
    </div>
  );
}
