import type { ItineraryLeg } from '../../types/itinerary';
import { itineraryLegHasData } from '../../types/itinerary';
import type { VolunteerItinerary } from '../../types/itinerary';
import { formatDisplayDate } from '../../utils/formatDateOfBirth';

interface ItineraryBubblesProps {
  itinerary: VolunteerItinerary;
}

export default function ItineraryBubbles({ itinerary }: ItineraryBubblesProps) {
  const hasArrival = itineraryLegHasData(itinerary.arrival);
  const hasDeparture = itineraryLegHasData(itinerary.departure);

  if (!hasArrival && !hasDeparture) {
    return (
      <p className="text-sm text-crm-slate">
        Itinerary not added yet. Add dates in the Arrival/Departure Date column
        on monday.com (or separate arrival and departure fields).
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <ItineraryBubble
        title="Arrival"
        variant="arrival"
        leg={itinerary.arrival}
        emptyLabel="Arrival details not set"
      />
      <ItineraryBubble
        title="Departure"
        variant="departure"
        leg={itinerary.departure}
        emptyLabel="Departure details not set"
      />
    </div>
  );
}

function ItineraryBubble({
  title,
  variant,
  leg,
  emptyLabel,
}: {
  title: string;
  variant: 'arrival' | 'departure';
  leg: ItineraryLeg;
  emptyLabel: string;
}) {
  const filled = itineraryLegHasData(leg);
  const accent =
    variant === 'arrival'
      ? 'border-emerald-200 bg-emerald-50/80'
      : 'border-sky-200 bg-sky-50/80';
  const titleColor =
    variant === 'arrival' ? 'text-emerald-800' : 'text-sky-800';

  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${filled ? accent : 'border-crm-taupe/20 bg-crm-taupe-50'}`}
    >
      <h4
        className={`text-xs font-semibold uppercase tracking-wide ${filled ? titleColor : 'text-crm-slate'}`}
      >
        {title}
      </h4>
      {filled ? (
        <dl className="mt-3 space-y-2 text-sm">
          <LegRow label="Date" value={leg.date} formatAsDate />
          <LegRow label="Time" value={leg.time} />
          <LegRow label="Airport" value={leg.airport} />
        </dl>
      ) : (
        <p className="mt-3 text-sm text-crm-slate">{emptyLabel}</p>
      )}
    </div>
  );
}

function LegRow({
  label,
  value,
  formatAsDate = false,
}: {
  label: string;
  value: string;
  formatAsDate?: boolean;
}) {
  const trimmed = value.trim();
  if (!trimmed) {
    return (
      <div className="flex gap-3">
        <dt className="w-16 shrink-0 text-crm-slate">{label}</dt>
        <dd className="font-medium text-crm-heading">—</dd>
      </div>
    );
  }

  const display = formatAsDate
    ? formatDisplayDate(trimmed) ?? trimmed
    : trimmed;
  return (
    <div className="flex gap-3">
      <dt className="w-16 shrink-0 text-crm-slate">{label}</dt>
      <dd className="font-medium text-crm-heading">{display}</dd>
    </div>
  );
}
