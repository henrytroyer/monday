import { I58_LOGO_COLOR_URL } from '../../constants/i58Brand';
import type { ContactEmailMessage } from '../../types/contact';
import {
  EMAIL_ARROW_FILL,
  EMAIL_ARROW_STROKE,
  EMAIL_DIRECTION_VIEWBOX,
  I58_LOGO_HEIGHT,
  I58_LOGO_WIDTH,
  INBOUND_ARROW_PATH,
  OUTBOUND_ARROW_PATH,
} from './emailDirectionArrowPaths';

interface EmailDirectionIndicatorProps {
  direction: ContactEmailMessage['direction'];
  size?: 'sm' | 'md';
}

const sizes = {
  sm: { height: 28, width: 34 },
  md: { height: 34, width: 40 },
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
      className="relative mt-0.5 inline-block shrink-0"
      style={{ height, width }}
      aria-label={label}
      title={label}
    >
      <svg
        className="h-full w-full drop-shadow-sm"
        viewBox={EMAIL_DIRECTION_VIEWBOX}
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-hidden
      >
        <image
          href={I58_LOGO_COLOR_URL}
          x="0"
          y="0"
          width={I58_LOGO_WIDTH}
          height={I58_LOGO_HEIGHT}
          opacity="1"
        />
        <path
          d={arrowPath}
          fill={EMAIL_ARROW_FILL}
          stroke={EMAIL_ARROW_STROKE}
          strokeWidth="18"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
