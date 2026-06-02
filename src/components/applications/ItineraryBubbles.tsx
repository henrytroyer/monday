import type { ItineraryLeg } from '../../types/itinerary';
import { itineraryLegHasData } from '../../types/itinerary';
import type { VolunteerItinerary } from '../../types/itinerary';

interface ItineraryBubblesProps {
  itinerary: VolunteerItinerary;
}

export default function ItineraryBubbles({ itinerary }: ItineraryBubblesProps) {
  const hasArrival = itineraryLegHasData(itinerary.arrival);
  const hasDeparture = itineraryLegHasData(itinerary.departure);

  if (!hasArrival && !hasDeparture) {
    return (
      <p className="text-sm text-slate-500">
        Itinerary not added yet. Add arrival and departure in the Itinerary
        column on monday.com.
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
      className={`rounded-2xl border p-4 shadow-sm ${filled ? accent : 'border-slate-200 bg-slate-50'}`}
    >
      <h4
        className={`text-xs font-semibold uppercase tracking-wide ${filled ? titleColor : 'text-slate-500'}`}
      >
        {title}
      </h4>
      {filled ? (
        <dl className="mt-3 space-y-2 text-sm">
          <LegRow label="Date" value={leg.date} />
          <LegRow label="Time" value={leg.time} />
          <LegRow label="Airport" value={leg.airport} />
        </dl>
      ) : (
        <p className="mt-3 text-sm text-slate-400">{emptyLabel}</p>
      )}
    </div>
  );
}

function LegRow({ label, value }: { label: string; value: string }) {
  const display = value.trim() || '—';
  return (
    <div className="flex gap-3">
      <dt className="w-16 shrink-0 text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{display}</dd>
    </div>
  );
}
