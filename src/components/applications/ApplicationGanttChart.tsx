/**
 * ApplicationGanttChart.tsx — Term-of-service Gantt for applications (name + dates).
 * ~3 months visible at a time; trackpad / mouse-wheel pans horizontally.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Volunteer } from '../../types/volunteer';
import {
  buildApplicationGanttModel,
  collectGanttLocationOptions,
  formatGanttWindowLabelFromScroll,
  GANTT_WINDOW_MONTHS,
  ganttBarStyle,
  ganttScrollLeftForWindowStart,
  ganttTimelineWidthPercent,
  matchesGanttLocation,
  resolveGanttWindowStart,
} from '../../utils/applicationGantt';

interface ApplicationGanttChartProps {
  volunteers: Volunteer[];
  selectedLocations: string[];
  onSelectedLocationsChange: (locations: string[]) => void;
  locationOptions?: string[];
  onSelectVolunteer: (volunteer: Volunteer) => void;
}

function barColorClass(locationLabel: string): string {
  const key = locationLabel.toLowerCase();
  if (key.includes('lesvos')) return 'bg-emerald-700';
  if (key.includes('germany')) return 'bg-sky-800';
  if (key.includes('malakasa') || key.includes('athens')) return 'bg-amber-800';
  return 'bg-crm-slate';
}

/** Horizontal Gantt of application term dates with a location chip filter. */
export default function ApplicationGanttChart({
  volunteers,
  selectedLocations,
  onSelectedLocationsChange,
  locationOptions,
  onSelectVolunteer,
}: ApplicationGanttChartProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const labelScrollRef = useRef<HTMLDivElement>(null);
  const syncingScroll = useRef(false);
  const [scrollRatio, setScrollRatio] = useState(0);

  const locations = useMemo(() => {
    if (locationOptions && locationOptions.length > 0) return locationOptions;
    return collectGanttLocationOptions(volunteers);
  }, [locationOptions, volunteers]);

  const filteredVolunteers = useMemo(
    () =>
      volunteers.filter((volunteer) =>
        matchesGanttLocation(volunteer, selectedLocations),
      ),
    [volunteers, selectedLocations],
  );

  const model = useMemo(
    () => buildApplicationGanttModel(filteredVolunteers),
    [filteredVolunteers],
  );

  const datedRowsFingerprint = model.allRows
    .map((row) => `${row.id}:${row.startMs}:${row.endMs}`)
    .join('|');

  const defaultWindowStartMs = useMemo(() => {
    void datedRowsFingerprint;
    return resolveGanttWindowStart(model.allRows);
  }, [datedRowsFingerprint, model.allRows]);

  const timelineWidth = ganttTimelineWidthPercent(model.months.length);

  const syncScrollRatio = () => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setScrollRatio(maxScroll > 0 ? el.scrollLeft / maxScroll : 0);
  };

  const syncVerticalFrom = (source: 'labels' | 'timeline') => {
    if (syncingScroll.current) return;
    const labels = labelScrollRef.current;
    const timeline = scrollRef.current;
    if (!labels || !timeline) return;
    syncingScroll.current = true;
    if (source === 'labels') {
      timeline.scrollTop = labels.scrollTop;
    } else {
      labels.scrollTop = timeline.scrollTop;
    }
    syncingScroll.current = false;
  };

  // Anchor initial (and data-change) scroll to the default 3-month window.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const apply = () => {
      el.scrollLeft = ganttScrollLeftForWindowStart(
        defaultWindowStartMs,
        model.months,
        el.scrollWidth,
        el.clientWidth,
      );
      syncScrollRatio();
    };

    apply();
    const raf = window.requestAnimationFrame(apply);
    return () => window.cancelAnimationFrame(raf);
  }, [defaultWindowStartMs, datedRowsFingerprint, model.months]);

  const windowLabel = formatGanttWindowLabelFromScroll(
    scrollRatio,
    model.months,
  );

  const toggleLocation = (location: string) => {
    if (selectedLocations.includes(location)) {
      onSelectedLocationsChange(
        selectedLocations.filter((entry) => entry !== location),
      );
      return;
    }
    onSelectedLocationsChange([...selectedLocations, location]);
  };

  const scrollByMonths = (monthDelta: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const monthWidth = el.clientWidth / GANTT_WINDOW_MONTHS;
    el.scrollBy({ left: monthDelta * monthWidth, behavior: 'smooth' });
  };

  const onTimelineWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;

    const maxScroll = el.scrollWidth - el.clientWidth;
    // Trackpad horizontal swipe (deltaX) — let the browser handle it via overflow-x.
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      return;
    }

    // Mouse wheel / vertical trackpad gesture → pan the 3-month window sideways.
    if (maxScroll <= 0 || event.deltaY === 0) return;

    const next = el.scrollLeft + event.deltaY;
    const clamped = Math.min(maxScroll, Math.max(0, next));
    if (clamped === el.scrollLeft) return;

    event.preventDefault();
    el.scrollLeft = clamped;
    syncScrollRatio();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="rounded-2xl border border-crm-taupe/20 bg-crm-taupe-50/60 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-crm-heading">
              Term of service
            </h2>
            <p className="mt-0.5 text-xs text-crm-slate">
              3-month view — scroll sideways with trackpad or mouse wheel.
            </p>
          </div>
          {selectedLocations.length > 0 && (
            <button
              type="button"
              onClick={() => onSelectedLocationsChange([])}
              className="rounded-lg border border-crm-taupe/20 bg-crm-surface px-2.5 py-1 text-xs font-medium text-crm-heading transition hover:bg-crm-taupe-50"
            >
              Clear locations
            </button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {locations.length === 0 ? (
            <span className="text-xs text-crm-slate">No locations available</span>
          ) : (
            locations.map((location) => {
              const active = selectedLocations.includes(location);
              return (
                <button
                  key={location}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleLocation(location)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    active
                      ? 'bg-crm-indigo text-white'
                      : 'border border-crm-taupe/20 bg-crm-surface text-crm-heading hover:bg-crm-taupe-50'
                  }`}
                >
                  {location}
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => scrollByMonths(-1)}
          className="rounded-lg border border-crm-taupe/20 bg-crm-surface px-3 py-1.5 text-xs font-medium text-crm-heading transition hover:bg-crm-taupe-50"
        >
          ← Previous month
        </button>
        <div className="text-sm font-semibold text-crm-heading">
          {windowLabel || 'Term of service'}
        </div>
        <button
          type="button"
          onClick={() => scrollByMonths(1)}
          className="rounded-lg border border-crm-taupe/20 bg-crm-surface px-3 py-1.5 text-xs font-medium text-crm-heading transition hover:bg-crm-taupe-50"
        >
          Next month →
        </button>
      </div>

      {model.allRows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-crm-taupe/28 bg-crm-surface p-10 text-center">
          <p className="text-base font-semibold text-crm-heading">
            No term dates to chart
          </p>
          <p className="mt-2 text-sm text-crm-slate">
            {filteredVolunteers.length === 0
              ? 'No applications match the selected locations.'
              : 'Matching applications do not have resolvable term-of-service dates yet.'}
          </p>
        </div>
      ) : (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-crm-taupe/20 bg-crm-surface">
          <div className="flex min-h-0 min-w-0 flex-1">
            <div className="flex w-56 shrink-0 flex-col border-r border-crm-taupe/20 sm:w-64">
              <div className="shrink-0 border-b border-crm-taupe/20 bg-crm-taupe-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-crm-slate">
                Application
              </div>
              <div
                ref={labelScrollRef}
                className="min-h-0 flex-1 overflow-y-auto"
                onScroll={() => syncVerticalFrom('labels')}
              >
                {model.rows.map((row) => (
                  <button
                    key={`label-${row.id}`}
                    type="button"
                    onClick={() => onSelectVolunteer(row.volunteer)}
                    className="flex w-full flex-col justify-center border-b border-crm-taupe/15 px-3 py-3 text-left transition hover:bg-crm-taupe-50"
                    style={{ height: '3.75rem' }}
                  >
                    <span className="truncate text-sm font-semibold text-crm-heading">
                      {row.name}
                    </span>
                    <span className="mt-0.5 truncate text-xs text-crm-slate">
                      {row.locationLabel}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div
              ref={scrollRef}
              className="min-h-0 min-w-0 flex-1 overflow-auto overscroll-x-contain"
              onScroll={() => {
                syncScrollRatio();
                syncVerticalFrom('timeline');
              }}
              onWheel={onTimelineWheel}
            >
              <div style={{ width: timelineWidth, minWidth: '100%' }}>
                <div className="sticky top-0 z-10 border-b border-crm-taupe/20 bg-crm-taupe-50">
                  <div className="relative h-8">
                    {model.months.map((month) => (
                      <div
                        key={month.key}
                        className="absolute top-0 bottom-0 border-l border-crm-taupe/15 px-2 pt-2 text-[11px] font-medium text-crm-slate"
                        style={{
                          left: `${month.leftPct}%`,
                          width: `${month.widthPct}%`,
                        }}
                      >
                        {month.label}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  {model.rows.map((row) => {
                    const bar = ganttBarStyle(
                      row,
                      model.rangeStartMs,
                      model.rangeEndMs,
                    );
                    return (
                      <button
                        key={`bar-${row.id}`}
                        type="button"
                        onClick={() => onSelectVolunteer(row.volunteer)}
                        className="relative block w-full border-b border-crm-taupe/15 text-left transition hover:bg-crm-taupe-50"
                        style={{ height: '3.75rem' }}
                      >
                        <div className="relative h-full">
                          {model.months.map((month) => (
                            <div
                              key={`${row.id}-${month.key}`}
                              className="absolute inset-y-0 border-l border-crm-taupe/10"
                              style={{ left: `${month.leftPct}%` }}
                            />
                          ))}
                          {bar && (
                            <div
                              className={`absolute top-1/2 flex h-7 -translate-y-1/2 items-center overflow-hidden rounded-md px-2 text-[11px] font-medium text-white shadow-sm ${barColorClass(row.locationLabel)}`}
                              style={{ left: bar.left, width: bar.width }}
                              title={`${row.name}: ${row.termLabel}`}
                            >
                              <span className="truncate">{row.termLabel}</span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {model.skippedWithoutDates > 0 && (
            <p className="border-t border-crm-taupe/15 px-4 py-2 text-xs text-crm-slate">
              {model.skippedWithoutDates} application
              {model.skippedWithoutDates === 1 ? '' : 's'} with no term dates.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
