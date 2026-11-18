import { serviceDayLabel, serviceRatioLabel, type ServicePeriod } from '../lib/servicePeriod';

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
      <div className="relative">
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
        <p className="mt-2.5 text-center text-sm font-semibold tracking-wide text-navy">
          {serviceRatioLabel(period) ?? `${progress}%`}
        </p>
      </div>
    </Tag>
  );
}

function shownProgress(period: ServicePeriod): number {
  return Math.min(100, Math.max(0, Math.round(period.progress)));
}

function timelineLabel(period: ServicePeriod, progress: number): string {
  if (!period.start || !period.end || period.days <= 0) return 'Service period, dates not on file';
  const days = `${serviceDayLabel(period.served)} of ${serviceDayLabel(period.days)}`;
  if (progress >= 100) return `${days}, complete`;
  if (progress <= 0) return `${days}, not started`;
  return `${days}, ${progress}% complete`;
}
