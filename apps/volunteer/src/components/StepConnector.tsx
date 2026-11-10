import { CONNECTOR, type StepConnectorTone } from '../lib/stepConnector';

/** A thin line ending in an arrow toward the next progress bubble. */
export function StepConnector({
  tone,
  compact = false,
}: {
  tone: StepConnectorTone;
  compact?: boolean;
}) {
  const color = CONNECTOR[tone];
  return (
    <span
      aria-hidden
      className={`mx-1 flex min-w-4 flex-1 items-center sm:mx-2 ${compact ? 'mt-4' : 'mt-5'}`}
    >
      <span
        className="-mr-px h-0.5 min-w-2 flex-1"
        style={{ backgroundImage: `linear-gradient(to right, ${color.from}, ${color.to})` }}
      />
      <svg viewBox="0 0 7 8" className="h-2 w-[7px] shrink-0">
        <path d="M0 0.35 L6.4 4 L0 7.65 Z" fill={color.to} />
      </svg>
    </span>
  );
}
