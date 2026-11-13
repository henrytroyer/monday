import type { ServicePeriod } from '../lib/servicePeriod';

/**
 * Stand-in for the arrival-to-departure percent.
 * Set this to null to show `period.progress`.
 */
const SERVICE_PROGRESS_PLACEHOLDER: number | null = 30;

export function ServicePeriodTimeline({
  period,
  labelled = true,
}: {
  period: ServicePeriod;
  labelled?: boolean;
}) {
  const progress = shownProgress(period);
  const Tag = labelled ? 'section' : 'div';

  return (
    <Tag aria-labelledby={labelled ? 'service-period-title' : undefined} className="mx-auto w-full">
      {labelled ? (
        <h2
          id="service-period-title"
          className="mb-8 text-center font-display text-3xl font-extrabold text-navy sm:text-4xl"
        >
          Your Service Period
        </h2>
      ) : null}
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-navy/10"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        aria-label={timelineLabel(period, progress)}
      >
        <div
          className="h-full rounded-full bg-crm-terracotta"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-2 text-center text-sm font-semibold tracking-wide text-navy">{progress}%</p>
    </Tag>
  );
}

function shownProgress(period: ServicePeriod): number {
  const value = SERVICE_PROGRESS_PLACEHOLDER ?? period.progress;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function timelineLabel(period: ServicePeriod, progress: number): string {
  const length =
    period.months === 1 ? '1-month service period' : `${period.months}-month service period`;
  if (progress >= 100) return `${length}, complete`;
  if (progress <= 0) return `${length}, not started`;
  return `${length}, ${progress}% complete`;
}
