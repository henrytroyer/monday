import type { ServicePeriod } from '../lib/servicePeriod';

const PLANE = '/brand/flights-airplane.png?v=navy';

/**
 * The artwork noses up about 12°.
 * 57° clockwise puts the left plane on a 45° descent.
 * The right plane keeps a shallow climb.
 */
const PLANE_DOWN = 'rotate(57deg)';
const PLANE_UP = 'rotate(-13.5deg)';

export function ServicePeriodTimeline({
  period,
  labelled = true,
}: {
  period: ServicePeriod;
  labelled?: boolean;
}) {
  const progress = Math.min(100, Math.max(0, period.progress));
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
      <div
        className="flex items-center gap-2"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        aria-label={timelineLabel(period)}
      >
        <ServicePlane direction="down" />
        <div className="relative h-6 min-w-0 flex-1">
          <span
            aria-hidden
            className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-[#e4e2dc]"
          />
          <span
            aria-hidden
            className="absolute top-1/2 left-0 h-2 -translate-y-1/2 rounded-full bg-gradient-to-r from-[#c45b78] to-[#f0b7c4]"
            style={{ width: `${progress}%` }}
          />
          <span
            aria-hidden
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${progress}%` }}
          >
            <ServiceHeart />
          </span>
        </div>
        <ServicePlane direction="up" />
      </div>
      <div className="mt-1 flex justify-between text-xs font-medium text-navy/70">
        <span>{period.start ? formatDay(period.start) : 'Arrival'}</span>
        <span>{period.end ? formatDay(period.end) : 'Departure'}</span>
      </div>
    </Tag>
  );
}

function ServicePlane({ direction }: { direction: 'down' | 'up' }) {
  return (
    <img
      src={PLANE}
      alt=""
      className="h-6 w-8 shrink-0"
      style={{ transform: direction === 'down' ? PLANE_DOWN : PLANE_UP }}
    />
  );
}

function ServiceHeart() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#d56b86] drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]">
      <path
        fill="currentColor"
        d="M12 20.2s-6.6-4.1-6.6-8.6C5.4 8.8 7 7.2 9 7.2c1.2 0 2.2.6 3 1.5.8-.9 1.8-1.5 3-1.5 2 0 3.6 1.6 3.6 4.4 0 4.5-6.6 8.6-6.6 8.6z"
      />
    </svg>
  );
}

function formatDay(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function timelineLabel(period: ServicePeriod): string {
  const length =
    period.months === 1 ? '1-month service period' : `${period.months}-month service period`;
  if (period.progress >= 100) return `${length}, complete`;
  if (period.progress <= 0) return `${length}, not started`;
  return `${length}, ${period.progress}% complete`;
}
