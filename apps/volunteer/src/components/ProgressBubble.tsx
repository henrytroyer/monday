import type { ReactNode } from 'react';
import type { ShortTermStepId } from '../contract/volunteerApi';
import { WATER_COLORS, WATER_STOPS } from '../lib/bubbleWater';

export type WaterTone = 'blue' | 'green' | 'orange';

export function ProgressBubble({
  id,
  mark,
  title,
  fill,
  complete,
  svgId,
  size = 'md',
  labelClassName,
  showLabel = true,
  waterTone = 'blue',
}: {
  id?: ShortTermStepId;
  /** Path elements drawn in place of the application-step icon. */
  mark?: ReactNode;
  title: string;
  fill: number;
  complete: boolean;
  svgId: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  labelClassName?: string;
  showLabel?: boolean;
  waterTone?: WaterTone;
}) {
  const circle =
    size === 'lg'
      ? 'h-18 w-18 shadow-[0_6px_16px_rgba(15,30,55,0.35)]'
      : size === 'xs'
        ? 'h-7 w-7'
        : size === 'sm'
          ? 'h-10 w-10'
          : 'h-10 w-10 sm:h-12 sm:w-12';
  const icon =
    size === 'lg'
      ? 'h-8 w-8'
      : size === 'xs'
        ? 'h-4 w-4'
        : size === 'sm'
          ? 'h-5 w-5'
          : 'h-5 w-5 sm:h-6 sm:w-6';
  const labelSize =
    size === 'lg'
      ? 'mt-2 max-w-24 text-sm leading-tight'
      : size === 'xs'
        ? 'mt-0.5 text-[10px] leading-tight'
        : 'mt-2 text-[11px] leading-tight sm:text-sm';
  const labelTone =
    labelClassName ?? (complete ? 'font-semibold text-navy' : 'text-crm-slate');
  const glyph = mark ?? (id ? <StepIconPaths id={id} /> : null);

  return (
    <span className="flex w-full flex-col items-center">
      <span
        className={`relative flex items-center justify-center overflow-hidden rounded-full bg-crm-taupe text-navy ${circle}`}
      >
        <StepIcon mark={glyph} className={icon} />
        {fill === 0 ? null : (
          <WaterFill mark={glyph} svgId={svgId} fill={fill} tone={waterTone} />
        )}
      </span>
      {showLabel ? (
        <span className={`text-center ${labelSize} ${labelTone}`}>{title}</span>
      ) : null}
    </span>
  );
}

function WaterFill({
  mark,
  svgId,
  fill,
  tone,
}: {
  mark: ReactNode;
  svgId: string;
  fill: number;
  tone: WaterTone;
}) {
  const level = 48 - (48 * fill) / 100;
  const gradientId = `water-${svgId}`;
  const clipId = `water-clip-${svgId}`;
  const colors = WATER_COLORS[tone];
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
          {colors.map((color, index) => (
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
          className="[&_image]:brightness-0 [&_image]:invert"
        >
          {mark}
        </g>
      </g>
      <path fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.15" d={waveEdge(level)}>
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

function StepIcon({ mark, className }: { mark: ReactNode; className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      aria-hidden
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {mark}
    </svg>
  );
}

function StepIconPaths({ id }: { id: ShortTermStepId }) {
  switch (id) {
    case 'application_received':
      return (
        <>
          <path d="M6.5 20V4.2h7.2V20" />
          <path d="M13.7 4.5 19 7.2V20h-5.3" />
          <circle cx="16.4" cy="12.4" r="0.7" fill="currentColor" stroke="none" />
        </>
      );
    case 'pastor_reference':
      return (
        <>
          <circle cx="12" cy="8" r="3.1" />
          <path d="M5.2 19.2c.9-3.3 3.4-5 6.8-5s5.9 1.7 6.8 5" />
        </>
      );
    case 'in_review':
      return (
        <>
          <rect x="5" y="3.5" width="14" height="17" rx="1.6" />
          <circle cx="12" cy="10" r="2.3" />
          <path d="M8.2 16.2h7.6" />
        </>
      );
    case 'background_check':
      return (
        <>
          <path d="M8.2 7.4 9.4 5.4h5.2l1.2 2H19v11.2H5V7.4h3.2Z" />
          <circle cx="12" cy="12.6" r="2.7" />
        </>
      );
    case 'child_safeguarding':
      return (
        <>
          <path d="M4.2 6.4c2.3-.6 4.5-.1 7.8 1.6 3.3-1.7 5.5-2.2 7.8-1.6v11.8c-2.3-.6-4.5-.1-7.8 1.6-3.3-1.7-5.5-2.2-7.8-1.6V6.4Z" />
          <path d="M12 8v11.8" />
        </>
      );
    case 'approved':
      return (
        <>
          <circle cx="8.2" cy="8.2" r="2.2" />
          <circle cx="15.6" cy="8.8" r="1.8" />
          <path d="M3.6 19.4c.7-2.8 2.4-4.3 4.6-4.3s3.9 1.5 4.6 4.3" />
          <path d="M13.4 15.4c1.5-.4 2.9.3 3.8 1.8.5.9.9 2.2 1 2.2" />
        </>
      );
    case 'flight_info':
      return (
        <>
          <path d="M12 4.4 13.6 7.1 12 9.2 10.4 7.1Z" />
          <circle cx="12" cy="15.2" r="4.2" />
        </>
      );
    case 'invoice':
      return (
        <>
          <rect x="4.2" y="5.2" width="15.6" height="14.2" rx="1.6" />
          <path d="M4.2 9.4h15.6M8 3.6v3.2M16 3.6v3.2" />
        </>
      );
    case 'sent_to_field':
      return (
        <>
          <rect x="3.4" y="6" width="17.2" height="12" rx="1.6" />
          <circle cx="8.6" cy="11" r="1.7" />
          <path d="M6.2 15.2c.4-1.3 1.3-2 2.4-2s2 .7 2.4 2" />
          <path d="M13.2 10.2h4.4M13.2 13.2h4.4" />
        </>
      );
    case 'guidelines':
      return (
        <>
          <path d="M4.6 7.2 6.2 8.9 9.2 5.4" />
          <path d="M11.4 7.2h8" />
          <path d="M4.6 15.2 6.2 16.9 9.2 13.4" />
          <path d="M11.4 15.2h8" />
        </>
      );
    default:
      return null;
  }
}
