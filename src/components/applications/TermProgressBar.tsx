import { useState } from 'react';
import type { Volunteer } from '../../types/volunteer';
import { resolveTermProgressSnapshot } from '../../utils/termProgress';

interface TermProgressBarProps {
  volunteer: Volunteer;
  compact?: boolean;
  /** Allow collapsing the bar in pipeline rows (click does not open the volunteer). */
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

function stopRowActivation(event: React.MouseEvent | React.KeyboardEvent) {
  event.stopPropagation();
}

export default function TermProgressBar({
  volunteer,
  compact = false,
  collapsible = false,
  defaultExpanded = true,
}: TermProgressBarProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const progress = resolveTermProgressSnapshot(volunteer);

  if (!progress) {
    return (
      <p className="text-xs text-crm-slate">Term dates not available for timeline.</p>
    );
  }

  const fillColor =
    progress.phase === 'complete'
      ? 'bg-emerald-600'
      : progress.phase === 'upcoming'
        ? 'bg-crm-taupe/40'
        : 'bg-emerald-500';

  const labelSize = compact ? 'text-[11px]' : 'text-xs';

  const toggleExpanded = () => {
    setExpanded((current) => !current);
  };

  if (collapsible && !expanded) {
    return (
      <button
        type="button"
        onClick={(event) => {
          stopRowActivation(event);
          toggleExpanded();
        }}
        onKeyDown={stopRowActivation}
        className={`flex w-full min-w-0 items-center gap-1.5 rounded-lg px-1 py-0.5 text-left font-medium text-crm-slate transition hover:bg-crm-taupe/10 hover:text-crm-heading ${labelSize}`}
        aria-expanded={false}
        aria-label="Show term timeline"
      >
        <span className="shrink-0 text-crm-taupe" aria-hidden="true">
          ▸
        </span>
        <span className="truncate">{progress.statusLabel}</span>
      </button>
    );
  }

  const headerClassName = `mb-1 flex w-full min-w-0 items-center justify-between gap-2 text-crm-slate ${labelSize}`;

  const headerContent = (
    <>
      <span className="flex min-w-0 shrink-0 items-center gap-1.5">
        {collapsible && (
          <span className="shrink-0 text-crm-taupe" aria-hidden="true">
            ▾
          </span>
        )}
        <span className="font-medium">{progress.startLabel}</span>
      </span>
      <span className="truncate text-center font-medium text-crm-heading">
        {progress.statusLabel}
      </span>
      <span className="shrink-0 font-medium">{progress.endLabel}</span>
    </>
  );

  return (
    <div className="w-full min-w-0" aria-label="Term progress timeline">
      {collapsible ? (
        <button
          type="button"
          onClick={(event) => {
            stopRowActivation(event);
            toggleExpanded();
          }}
          onKeyDown={stopRowActivation}
          className={`${headerClassName} cursor-pointer rounded-lg px-1 py-0.5 text-left transition hover:bg-crm-taupe/10 hover:text-crm-heading`}
          aria-expanded={expanded}
          aria-label="Hide term timeline"
        >
          {headerContent}
        </button>
      ) : (
        <div className={headerClassName}>{headerContent}</div>
      )}
      <div
        className={`relative overflow-hidden rounded-full bg-crm-taupe/25 ${
          compact ? 'h-2' : 'h-2.5'
        }`}
      >
        <div
          className={`h-full rounded-full transition-[width] ${fillColor}`}
          style={{ width: `${progress.percent}%` }}
        />
        {progress.phase === 'active' && (
          <div
            className={`absolute top-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-emerald-700 shadow-sm ${
              compact ? 'h-3 w-3' : 'h-3.5 w-3.5'
            }`}
            style={{
              left: `calc(${progress.percent}% - ${compact ? 6 : 7}px)`,
            }}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}
