/**
 * DestinationItineraryVisual.tsx
 * Compact destination arrival/departure display for pipeline rows
 * (any group) when itinerary files/columns have been parsed.
 * Click opens the itinerary PDF preview when a file is available.
 *
 * Uses role="button" (not <button>) because the pipeline row is already a
 * <button> — nested buttons are invalid HTML.
 */
import type { ItineraryLeg, VolunteerItinerary } from '../../types/itinerary';
import { itineraryHasData, itineraryLegHasData } from '../../types/itinerary';
import { formatDisplayDate } from '../../utils/formatDateOfBirth';

interface DestinationItineraryVisualProps {
  itinerary: VolunteerItinerary | undefined;
  /** Open itinerary PDF preview (stops row select). */
  onOpen?: () => void;
}

function formatLegDate(date: string): string {
  const trimmed = date.trim();
  if (!trimmed) return '—';
  return formatDisplayDate(trimmed) ?? trimmed;
}

function LegLine({
  label,
  leg,
  accentClass,
}: {
  label: string;
  leg: ItineraryLeg;
  accentClass: string;
}) {
  if (!itineraryLegHasData(leg)) {
    return (
      <div className="text-[11px] text-crm-slate">
        <span className={`font-semibold ${accentClass}`}>{label}</span>
        <span className="ml-1">not set</span>
      </div>
    );
  }

  const airport = leg.airport.trim() || '—';
  const date = formatLegDate(leg.date);
  const time = leg.time.trim() || '—';
  const flight = leg.flightNumber?.trim();

  return (
    <div className="text-[11px] leading-snug text-crm-heading">
      <span className={`font-semibold ${accentClass}`}>
        {label} {airport}
      </span>
      <span className="ml-1 text-crm-slate">
        {date} · {time}
        {flight ? ` · ${flight}` : ''}
      </span>
    </div>
  );
}

export default function DestinationItineraryVisual({
  itinerary,
  onOpen,
}: DestinationItineraryVisualProps) {
  if (!itinerary || !itineraryHasData(itinerary)) return null;

  const body = (
    <div className="min-w-0 space-y-0.5">
      <LegLine
        label="Arrive"
        leg={itinerary.arrival}
        accentClass="text-emerald-800"
      />
      <LegLine
        label="Depart"
        leg={itinerary.departure}
        accentClass="text-sky-800"
      />
    </div>
  );

  const shellClass =
    'min-w-[10rem] max-w-[16rem] rounded-xl border border-crm-taupe/25 bg-crm-taupe-50/60 px-2.5 py-1.5 text-left';

  if (onOpen) {
    return (
      <div
        role="button"
        tabIndex={0}
        className={`${shellClass} cursor-pointer transition hover:border-crm-indigo/40 hover:bg-crm-indigo/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crm-indigo`}
        title="Open itinerary"
        aria-label="Open itinerary"
        onClick={(event) => {
          event.stopPropagation();
          onOpen();
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onOpen();
          }
        }}
      >
        {body}
      </div>
    );
  }

  return (
    <div
      className={shellClass}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      role="note"
    >
      {body}
    </div>
  );
}
