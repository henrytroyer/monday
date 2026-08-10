/**
 * PipelineLayoutToggle.tsx — Segmented List / Card control for the applications pipeline.
 */

import type { ReactNode } from 'react';
import type { PipelineLayout } from '../../preferences/pipelineLayoutStorage';

interface PipelineLayoutToggleProps {
  value: PipelineLayout;
  onChange: (layout: PipelineLayout) => void;
  /** Layouts to show. Defaults to list / card / gantt. */
  allowedLayouts?: readonly PipelineLayout[];
}

function ListIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      fill="currentColor"
      aria-hidden
    >
      <path d="M2 3.25h12a.75.75 0 0 1 0 1.5H2a.75.75 0 0 1 0-1.5Zm0 4h12a.75.75 0 0 1 0 1.5H2a.75.75 0 0 1 0-1.5Zm0 4h12a.75.75 0 0 1 0 1.5H2a.75.75 0 0 1 0-1.5Z" />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      fill="currentColor"
      aria-hidden
    >
      <path d="M2 2.5A1.5 1.5 0 0 1 3.5 1h3A1.5 1.5 0 0 1 8 2.5v3A1.5 1.5 0 0 1 6.5 7h-3A1.5 1.5 0 0 1 2 5.5v-3Zm6.5 0A1.5 1.5 0 0 1 10 1h3A1.5 1.5 0 0 1 14.5 2.5v3A1.5 1.5 0 0 1 13 7h-3A1.5 1.5 0 0 1 8.5 5.5v-3ZM2 10A1.5 1.5 0 0 1 3.5 8.5h3A1.5 1.5 0 0 1 8 10v3A1.5 1.5 0 0 1 6.5 14.5h-3A1.5 1.5 0 0 1 2 13v-3Zm6.5 0A1.5 1.5 0 0 1 10 8.5h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 8.5 13v-3Z" />
    </svg>
  );
}

function GanttIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      fill="currentColor"
      aria-hidden
    >
      <path d="M1.5 2.25a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5H3.5v10.5h.75a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5H3V3h-.75a.75.75 0 0 1-.75-.75Zm4 2a.75.75 0 0 1 .75-.75H12a.75.75 0 0 1 0 1.5H6.25a.75.75 0 0 1-.75-.75Zm0 3.5a.75.75 0 0 1 .75-.75h7a.75.75 0 0 1 0 1.5h-7a.75.75 0 0 1-.75-.75Zm0 3.5a.75.75 0 0 1 .75-.75H10a.75.75 0 0 1 0 1.5H6.25a.75.75 0 0 1-.75-.75Z" />
    </svg>
  );
}

const OPTIONS: Array<{
  value: PipelineLayout;
  label: string;
  icon: ReactNode;
}> = [
  { value: 'list', label: 'List', icon: <ListIcon /> },
  { value: 'card', label: 'Cards', icon: <CardIcon /> },
  { value: 'gantt', label: 'Gantt', icon: <GanttIcon /> },
];

/** Compact segmented control to switch pipeline list / card / Gantt layout. */
export default function PipelineLayoutToggle({
  value,
  onChange,
  allowedLayouts,
}: PipelineLayoutToggleProps) {
  const options = allowedLayouts
    ? OPTIONS.filter((option) => allowedLayouts.includes(option.value))
    : OPTIONS;

  return (
    <div
      role="group"
      aria-label="Pipeline layout"
      className="inline-flex h-9 items-stretch overflow-hidden rounded-lg border border-crm-taupe/20 bg-crm-surface"
    >
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            title={`${option.label} view`}
            onClick={() => onChange(option.value)}
            className={`inline-flex items-center gap-1.5 px-2.5 text-xs font-medium transition ${
              active
                ? 'bg-crm-indigo text-white'
                : 'text-crm-slate hover:bg-crm-taupe-50 hover:text-crm-heading'
            }`}
          >
            {option.icon}
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
