import { I58_LOGO_COLOR_URL } from '../../constants/i58Brand';
import type { ContactEmailMessage } from '../../types/contact';
import {
  EMAIL_ARROW_COLOR,
  EMAIL_DIRECTION_VIEWBOX,
  INBOUND_ARROW_PATH,
  OUTBOUND_ARROW_PATH,
} from './emailDirectionArrowPaths';

interface EmailDirectionIndicatorProps {
  direction: ContactEmailMessage['direction'];
  size?: 'sm' | 'md';
}

/** Narrow crop — mostly the 8, arrow dominates. */
const sizes = {
  sm: { height: 22, width: 26 },
  md: { height: 26, width: 30 },
} as const;

export default function EmailDirectionIndicator({
  direction,
  size = 'sm',
}: EmailDirectionIndicatorProps) {
  const isOutbound = direction === 'outbound';
  const label = isOutbound ? 'Sent from i58' : 'Received into i58';
  const arrowPath = isOutbound ? OUTBOUND_ARROW_PATH : INBOUND_ARROW_PATH;
  const { height, width } = sizes[size];

  return (
    <span
      className="relative mt-0.5 inline-block shrink-0 overflow-hidden"
      style={{ height, width }}
      aria-label={label}
      title={label}
    >
      <img
        src={I58_LOGO_COLOR_URL}
        alt=""
        className="absolute top-0 right-0 h-full w-auto max-w-none opacity-40"
        aria-hidden
      />
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox={EMAIL_DIRECTION_VIEWBOX}
        preserveAspectRatio="xMidYMid meet"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path d={arrowPath} fill={EMAIL_ARROW_COLOR} />
      </svg>
    </span>
  );
}
