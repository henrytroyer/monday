import type { ItinerarySheetLeg } from '../lib/flightItinerary';

const labelClass =
  'text-[10px] font-bold uppercase tracking-[0.14em] text-[#1a5270] sm:text-[11px]';
const valueClass = 'mt-1 text-sm font-semibold text-[#16324f]';

export function ItineraryForm({
  recordLocator,
  legs,
}: {
  recordLocator: string;
  legs: ItinerarySheetLeg[];
}) {
  return (
    <div className="bg-[#f4f8fb] px-4 py-4 text-[#1a5270] sm:px-5">
      <p className={labelClass}>Record locator {recordLocator}</p>
      {legs.map((leg, index) => (
        <section key={`${leg.flight}-${leg.date}`} className={index === 0 ? 'mt-4' : 'mt-8'}>
          {index > 0 ? (
            <div className="mb-6 border-t border-dotted border-[#1a5270]/70" />
          ) : null}
          <div className="grid grid-cols-3 gap-x-3 border-b border-[#1a5270] py-2">
            <Field label="Date" value={leg.date} />
            <Field label="From" value={leg.from} />
            <Field label="To" value={leg.to} />
          </div>
          <div className="grid grid-cols-3 gap-x-3 border-b border-[#1a5270] py-2">
            <Field label="Time departure" value={leg.departs} />
            <Field label="Arrival" value={leg.arrives} />
          </div>
          <div className="grid grid-cols-3 gap-x-3 border-b border-[#1a5270] py-2">
            <Field label="Flight no." value={leg.flight} />
            <Field label="Airport" value={leg.airport} />
          </div>
          <div className="grid grid-cols-3 gap-x-3 border-b border-[#1a5270] py-2">
            <Field label="Airline" value={leg.airline} />
            <Field label="Frequent flyer" value={leg.frequentFlyer} />
          </div>
        </section>
      ))}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className={labelClass}>{label}</p>
      <p className={valueClass}>{value}</p>
    </div>
  );
}
