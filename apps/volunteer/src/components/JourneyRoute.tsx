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
      className={`relative left-1/2 w-screen -translate-x-1/2 bg-white ${
        compact ? 'py-4' : 'py-6 sm:py-8'
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
          ? `Your application progress: complete, headed to ${destination.label}`
          : `Your application progress: ${percent}% of the way to ${destination.label}`
      }
    >
      <div className="mx-auto max-w-5xl px-5">
        <p
          className={`font-display font-semibold text-navy ${
            compact ? 'text-lg' : 'text-2xl'
          }`}
        >
          Your Application Progress
        </p>
      </div>

      <div className={`mx-auto max-w-5xl px-5 ${compact ? 'mt-3' : 'mt-4'}`}>
        <div className="relative">
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
              strokeWidth="2.8"
              strokeDasharray="8 7"
              strokeLinecap="round"
            />
            <circle cx={start.x} cy={start.y} r="6.5" fill="#c96c39" />
            <circle cx={end.x} cy={end.y} r="6.5" fill="#c96c39" />
            <g
              transform={`translate(${plane.x} ${plane.y}) rotate(${plane.angle + 28})`}
              style={{ transition: 'transform 0.7s ease' }}
            >
              <image
                href={JOURNEY_PLANE}
                x={-54}
                y={-24}
                width={108}
                height={48}
                preserveAspectRatio="xMidYMid meet"
              />
            </g>
          </svg>
        </div>
      </div>
    </section>
  );
}
