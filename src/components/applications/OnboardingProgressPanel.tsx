import { useEffect, useState, type ReactNode } from 'react';
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
  /** Optional: jump to a stage when a timeline node is tapped (mobile). */
  onStageSelect?: (stepId: string) => void;
}

function initialExpanded(variant: 'short-term' | 'long-term'): boolean {
  if (typeof window === 'undefined') return variant === 'long-term';
  const isDesktop = window.matchMedia('(min-width: 640px)').matches;
  // Phone: start collapsed. Desktop long-term: expanded.
  if (!isDesktop) return false;
  return variant === 'long-term';
}

export default function OnboardingProgressPanel({
  pipeline,
  variant,
  children,
  onStageSelect,
}: OnboardingProgressPanelProps) {
  const [expanded, setExpanded] = useState(() => initialExpanded(variant));
  const stepDefs: readonly OnboardingPipelineStepDefinition[] =
    getOnboardingStepsForApplication(variant === 'long-term');

  // If viewport crosses sm breakpoint, keep phone collapsed preference only on first paint.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)');
    const onChange = () => {
      if (!mq.matches) {
        // Switched to phone — collapse to avoid huge scroll
        setExpanded(false);
      }
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const doneCount = countCompletedSteps(pipeline);
  const totalCount = stepDefs.length;
  const current = getCurrentStep(pipeline, stepDefs);
  const summaryLabel = current
    ? `${current.definition.title} — in progress`
    : 'All steps complete';

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-crm-taupe/20 bg-crm-white p-3 sm:p-5">
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
          className="flex w-full shrink-0 items-center justify-center gap-1.5 rounded-xl border border-crm-taupe/25 bg-crm-surface px-3 py-2.5 text-sm font-medium text-crm-heading shadow-sm transition hover:border-crm-taupe/40 hover:bg-crm-taupe-50 sm:w-auto sm:justify-start"
          aria-expanded={expanded}
          aria-controls="onboarding-progress-details"
        >
          <span>{expanded ? 'Hide details' : 'Show details'}</span>
          <span className="text-crm-slate" aria-hidden="true">
            {expanded ? '▾' : '▸'}
          </span>
        </button>
      </div>

      <div className="mt-3 min-w-0 border-t border-crm-taupe/10 pt-3">
        <OnboardingTimelineBar
          pipeline={pipeline}
          stepDefs={stepDefs}
          compact={!expanded}
          onStepSelect={
            onStageSelect
              ? (stepId) => {
                  setExpanded(true);
                  onStageSelect(stepId);
                }
              : undefined
          }
        />
      </div>

      {expanded && (
        <div
          id="onboarding-progress-details"
          className="mt-4 min-w-0 border-t border-crm-taupe/10 pt-4"
        >
          {children}
        </div>
      )}
    </div>
  );
}
