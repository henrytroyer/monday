import type { ShortTermStepId, VolunteerApplicationStatus } from '../contract/volunteerApi';
import {
  applicationPhaseProgress,
  greetingBackdrop,
  journeyCurrentStep,
  journeyDestination,
  type ApplicationPhaseProgress,
} from '../lib/journey';

export function JourneyRoute({
  me,
  variant = 'full',
  onSelectStep,
}: {
  me: VolunteerApplicationStatus;
  variant?: 'compact' | 'full';
  onSelectStep?: (id: ShortTermStepId) => void;
}) {
  const destination = journeyDestination(me);
  const { phases, serviceComplete } = applicationPhaseProgress(me);
  const active = phases.find((phase) => phase.tone === 'active') ?? null;
  const compact = variant === 'compact';
  const current = journeyCurrentStep(me);

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
      aria-label={progressLabel(active, serviceComplete, destination.label)}
    >
      <div className="mx-auto max-w-5xl px-5">
        <p
          className={`font-display font-semibold text-navy ${
            compact ? 'text-lg' : 'text-2xl'
          }`}
        >
          Your Application Progress
        </p>

        <ol className={`flex items-start ${compact ? 'mt-4' : 'mt-8'}`}>
          {phases.map((phase, index) => (
            <li key={phase.id} className="contents">
              {index > 0 ? <StampLine compact={compact} /> : null}
              <PhaseStamp phase={phase} compact={compact} />
            </li>
          ))}
          <li className="contents">
            <StampLine compact={compact} />
            <DestinationMark
              label={destination.label}
              photo={greetingBackdrop(destination.region)}
              awake={serviceComplete}
              compact={compact}
            />
          </li>
        </ol>
      </div>
    </section>
  );
}

function StampLine({ compact }: { compact: boolean }) {
  return (
    <span
      aria-hidden
      className={`mx-1 mt-5 h-px min-w-2 flex-1 bg-crm-taupe sm:mx-2 ${
        compact ? '' : 'sm:mt-6'
      }`}
    />
  );
}

function progressLabel(
  active: ApplicationPhaseProgress | null,
  serviceComplete: boolean,
  place: string,
): string {
  if (serviceComplete || !active) {
    return `Your application progress: complete, headed to ${place}`;
  }
  return `Your application progress: ${active.title}, ${active.done} of ${active.total}, headed to ${place}`;
}

function PhaseStamp({
  phase,
  compact,
}: {
  phase: ApplicationPhaseProgress;
  compact: boolean;
}) {
  const fill = phase.total === 0 ? 100 : Math.round((phase.done / phase.total) * 100);
  const complete = fill >= 100;
  const size = compact ? 'h-10 w-10' : 'h-10 w-10 sm:h-12 sm:w-12';
  const circle = complete ? 'bg-crm-terracotta text-white' : 'bg-crm-taupe text-navy';
  const label =
    phase.tone === 'upcoming' ? 'text-crm-slate' : 'font-semibold text-navy';

  return (
    <div className="flex w-[4.25rem] shrink-0 flex-col items-center sm:w-24">
      <span
        className={`relative flex items-center justify-center overflow-hidden rounded-full ${circle} ${size}`}
      >
        <PhaseIcon id={phase.id} />
        {complete || fill === 0 ? null : <WaterFill id={phase.id} fill={fill} />}
      </span>
      <span className={`mt-2 text-center text-[11px] leading-tight sm:text-sm ${label}`}>
        {phase.title}
      </span>
      {phase.tone === 'active' ? (
        <span className="mt-0.5 text-xs text-crm-slate">
          {phase.done} of {phase.total}
        </span>
      ) : null}
    </div>
  );
}

function WaterFill({ id, fill }: { id: ApplicationPhaseProgress['id']; fill: number }) {
  const level = 48 - (48 * fill) / 100;
  const gradientId = `water-${id}`;
  const clipId = `water-clip-${id}`;
  const surface = waveEdge(level);
  return (
    <svg viewBox="0 0 48 48" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <linearGradient
          id={gradientId}
          x1="0"
          y1={level}
          x2="0"
          y2="48"
          gradientUnits="userSpaceOnUse"
        >
          {WATER_COLORS[id].map((color, index) => (
            <stop key={color} offset={WATER_STOPS[index]} stopColor={color} />
          ))}
        </linearGradient>
        <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
          <path d={waveBody(level)}>
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 0; -48 0"
              dur="5.5s"
              repeatCount="indefinite"
            />
          </path>
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect width="48" height="48" fill={`url(#${gradientId})`} />
        <g
          transform="translate(12 12)"
          fill="none"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <PhaseIconPaths id={id} />
        </g>
      </g>
      <path fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.15" d={surface}>
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0 0; -48 0"
          dur="5.5s"
          repeatCount="indefinite"
        />
      </path>
    </svg>
  );
}

function waveEdge(level: number): string {
  const y = level.toFixed(2);
  const hi = (level - 3.4).toFixed(2);
  return `M0 ${y} Q12 ${hi} 24 ${y} T48 ${y} T72 ${y} T96 ${y}`;
}

function waveBody(level: number): string {
  return `${waveEdge(level)} V52 H0 Z`;
}

const WATER_STOPS = ['0%', '16%', '48%', '100%'] as const;

const WATER_COLORS: Record<ApplicationPhaseProgress['id'], readonly [string, string, string, string]> = {
  'about-you': ['#e9f8fd', '#7ec8e4', '#2f78aa', '#1b365d'],
  'your-story': ['#e8f8ee', '#7dce9a', '#2f9a62', '#1b6b42'],
  'your-service': ['#fde8ee', '#f4a3b8', '#e15d7a', '#c43756'],
};

function DestinationMark({
  label,
  photo,
  awake,
  compact,
}: {
  label: string;
  photo: string;
  awake: boolean;
  compact: boolean;
}) {
  return (
    <div className="flex w-[4.25rem] shrink-0 flex-col items-center sm:w-24">
      <img
        src={photo}
        alt=""
        className={`rounded-full object-cover ${
          compact ? 'h-10 w-10' : 'h-10 w-10 sm:h-12 sm:w-12'
        } ${awake ? '' : 'opacity-40 grayscale'}`}
      />
      <span
        className={`mt-2 text-center text-[11px] leading-tight sm:text-sm ${
          awake ? 'font-semibold text-navy' : 'text-crm-slate'
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function PhaseIcon({ id }: { id: ApplicationPhaseProgress['id'] }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 sm:h-6 sm:w-6"
      fill="none"
      aria-hidden
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <PhaseIconPaths id={id} />
    </svg>
  );
}

function PhaseIconPaths({ id }: { id: ApplicationPhaseProgress['id'] }) {
  if (id === 'about-you') {
    return (
      <>
        <circle cx="12" cy="8" r="3.1" />
        <path d="M5.2 19.2c.9-3.3 3.4-5 6.8-5s5.9 1.7 6.8 5" />
      </>
    );
  }
  if (id === 'your-story') {
    return (
      <>
        <path d="M4.2 6.4c2.3-.6 4.5-.1 7.8 1.6 3.3-1.7 5.5-2.2 7.8-1.6v11.8c-2.3-.6-4.5-.1-7.8 1.6-3.3-1.7-5.5-2.2-7.8-1.6V6.4Z" />
        <path d="M12 8v11.8" />
      </>
    );
  }
  return (
    <path d="M12 18.6s-5.8-3.5-5.8-7.4A3.2 3.2 0 0 1 12 8.4a3.2 3.2 0 0 1 5.8 2.8c0 3.9-5.8 7.4-5.8 7.4Z" />
  );
}
