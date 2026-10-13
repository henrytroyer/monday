import type { ShortTermStepId, VolunteerApplicationStatus } from '../contract/volunteerApi';
import {
  journeyArrived,
  journeyCurrentStep,
  journeyDestination,
  journeyProgress,
} from '../lib/journey';
import {
  WORLD_VIEWBOX,
  journeyEndpoint,
  journeyFlightPathD,
  journeyFlightPoint,
  journeyStartPoint,
} from '../lib/journeyMap';
import { JOURNEY_PLANE, WORLD_MAP } from '../lib/nav';

export function JourneyRoute({
  me,
  variant = 'full',
  onSelectStep,
}: {
  me: VolunteerApplicationStatus;
  variant?: 'compact' | 'full';
  onSelectStep?: (id: ShortTermStepId) => void;
}) {
  const progress = journeyProgress(me);
  const arrived = journeyArrived(me);
  const destination = journeyDestination(me);
  const compact = variant === 'compact';
  const start = journeyStartPoint();
  const end = journeyEndpoint(destination.region);
  const plane = journeyFlightPoint(progress, destination.region);
  const current = journeyCurrentStep(me);
  const percent = Math.round(progress * 100);

  function openCurrentStep() {
    const id = current?.id ?? me.steps[0]?.id;
    if (id) onSelectStep?.(id);
  }

  return (
    <section
      className={`rounded-2xl bg-white shadow-sm ring-1 ring-sand/70 ${
        compact ? 'p-4' : 'p-5 sm:p-6'
      } ${onSelectStep ? 'cursor-pointer' : ''}`}
      role={onSelectStep ? 'button' : undefined}
      tabIndex={onSelectStep ? 0 : undefined}
      onClick={onSelectStep ? openCurrentStep : undefined}
      onKeyDown={
        onSelectStep
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openCurrentStep();
              }
            }
          : undefined
      }
      aria-label={
        arrived
          ? `Your journey has arrived in ${destination.label}`
          : `Your journey toward ${destination.label}, ${percent}% of the way`
      }
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-navy/70">
          Your journey
        </p>
        <p
          className={`font-display font-semibold text-navy ${
            compact ? 'mt-1 text-lg' : 'mt-2 text-2xl'
          }`}
        >
          {arrived ? `You’re headed to ${destination.label}` : `Toward ${destination.label}`}
        </p>
      </div>

      <div className={`relative ${compact ? 'mt-3' : 'mt-4'}`}>
        <img src={WORLD_MAP} alt="" className="w-full" />
        <svg
          viewBox={WORLD_VIEWBOX}
          className="absolute inset-0 h-full w-full"
          aria-hidden
        >
          <path
            d={journeyFlightPathD(destination.region)}
            fill="none"
            stroke="#c96c39"
            strokeWidth="1.8"
            strokeDasharray="5 4"
            strokeLinecap="round"
          />
          <circle cx={start.x} cy={start.y} r="4" fill="#c96c39" />
          <circle cx={end.x} cy={end.y} r="4" fill="#c96c39" />
          <g
            transform={`translate(${plane.x} ${plane.y}) rotate(${plane.angle + 28})`}
            style={{ transition: 'transform 0.7s ease' }}
          >
            <image
              href={JOURNEY_PLANE}
              x={-33}
              y={-14.5}
              width={66}
              height={29}
              preserveAspectRatio="xMidYMid meet"
            />
          </g>
        </svg>
      </div>
    </section>
  );
}
