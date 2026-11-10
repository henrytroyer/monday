import type { ServicePeriod } from '../lib/servicePeriod';

const PLANE = '/brand/flights-airplane.png?v=navy';

/**
 * The artwork noses up about 12°.
 * 57° clockwise puts the left plane on a 45° descent.
 * The right plane keeps a shallow climb.
 */
const PLANE_DOWN = 'rotate(57deg)';
const PLANE_UP = 'rotate(-13.5deg)';

/** Whole diagonal bars across the pill. Progress fills bars from the left. */
const STRIPE_COUNT = 28;

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
  const filled = Math.round((progress / 100) * STRIPE_COUNT);
  const Tag = labelled ? 'section' : 'div';

  return (
    <Tag aria-labelledby={labelled ? 'service-period-title' : undefined} className="mx-auto w-full">
      {labelled ? (
        <h2
          id="service-period-title"
          className="mb-8 text-center font-display text-3xl font-extrabold text-navy sm:text-4xl"
        >
          Your time of service
        </h2>
      ) : null}
      <div className="flex items-center gap-2">
        <ServicePlane direction="down" />
        <div
          className="relative h-6 min-w-0 flex-1 overflow-hidden rounded-full border-2 border-navy bg-white"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-label={timelineLabel(period, progress)}
        >
          <div
            aria-hidden
            className="absolute top-1/2 left-1/2 flex h-full w-[170%] gap-1"
            style={{ transform: 'translate(-50%, -50%) skewX(-38deg)' }}
          >
            {Array.from({ length: STRIPE_COUNT }, (_, index) => (
              <span
                key={index}
                className={`h-full min-w-0 flex-1 ${index < filled ? 'bg-crm-terracotta' : 'bg-crm-taupe'}`}
              />
            ))}
          </div>
        </div>
        <ServicePlane direction="up" />
      </div>
      <p className="mt-1.5 text-center font-display text-xl font-extrabold leading-none text-navy">
        {progress}%
      </p>
    </Tag>
  );
}

function shownProgress(period: ServicePeriod): number {
  const value = SERVICE_PROGRESS_PLACEHOLDER ?? period.progress;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function ServicePlane({ direction }: { direction: 'down' | 'up' }) {
  return (
    <img
      src={PLANE}
      alt=""
      className="h-5 w-7 shrink-0"
      style={{ transform: direction === 'down' ? PLANE_DOWN : PLANE_UP }}
    />
  );
}

function timelineLabel(period: ServicePeriod, progress: number): string {
  const length =
    period.months === 1 ? '1-month service period' : `${period.months}-month service period`;
  if (progress >= 100) return `${length}, complete`;
  if (progress <= 0) return `${length}, not started`;
  return `${length}, ${progress}% complete`;
}
