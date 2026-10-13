import type {
  VolunteerStep,
  VolunteerStepAudience,
} from '../contract/volunteerApi';
import { StatusBadge } from './StatusBadge';

const AUDIENCE_LABEL: Record<VolunteerStepAudience, string> = {
  volunteer: 'Your step',
  staff: 'Handled by staff',
  system: 'Handled by i58',
};

export function StepCard({
  step,
  emphasized = false,
}: {
  step: VolunteerStep;
  emphasized?: boolean;
}) {
  return (
    <article
      className={`rounded-2xl border bg-white p-4 shadow-sm ${
        emphasized
          ? 'border-navy/35 ring-2 ring-navy/15'
          : 'border-sand/80'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-snug">{step.title}</h2>
          <p className="mt-1 text-xs text-crm-slate">{AUDIENCE_LABEL[step.audience]}</p>
        </div>
        <StatusBadge status={step.status} audience={step.audience} />
      </div>
      {step.youDo ? (
        <p className="mt-3 text-sm leading-relaxed text-crm-text">
          <span className="font-medium text-crm-heading">You do: </span>
          {step.youDo}
        </p>
      ) : (
        <p className="mt-3 text-sm text-crm-slate">Nothing for you to do on this step.</p>
      )}
    </article>
  );
}
