import type { VolunteerApplicationStatus } from '../contract/volunteerApi';
import { BackButton } from '../components/BackButton';
import { FormCard, PageHeader } from '../components/FormCard';
import { flightItineraryFor, type FlightLeg } from '../lib/flightItinerary';

export function FlightItineraryScreen({
  me,
  onBack,
}: {
  me: VolunteerApplicationStatus;
  onBack: () => void;
}) {
  const itinerary = flightItineraryFor(me.name);

  return (
    <div>
      <BackButton onClick={onBack} />
      <PageHeader
        eyebrow="Flights"
        title="Your itinerary"
        description={`${itinerary.term} · ${itinerary.field}`}
      />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <FormCard>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-navy/70">
                Passenger
              </dt>
              <dd className="mt-1 text-lg font-semibold text-navy">{itinerary.passenger}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-navy/70">
                Record locator
              </dt>
              <dd className="mt-1 text-lg font-semibold tracking-wide text-navy">
                {itinerary.recordLocator}
              </dd>
            </div>
          </dl>
        </FormCard>
        {itinerary.directions.map((direction) => (
          <FormCard key={direction.id}>
            <h2 className="font-display text-xl font-semibold text-navy">{direction.title}</h2>
            <ol className="mt-5 flex flex-col gap-5">
              {direction.legs.map((leg) => (
                <FlightLegRow key={`${direction.id}-${leg.flight}`} leg={leg} />
              ))}
            </ol>
          </FormCard>
        ))}
      </div>
    </div>
  );
}

function FlightLegRow({ leg }: { leg: FlightLeg }) {
  return (
    <li className="border-t border-sand/80 pt-5 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-sm font-semibold text-navy">
          {leg.airline} {leg.flight}
        </p>
        <p className="text-sm text-crm-slate">{leg.date}</p>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-start gap-3">
        <AirportTime city={leg.fromCity} code={leg.fromCode} time={leg.departs} />
        <span className="pt-1 text-crm-slate" aria-hidden="true">
          →
        </span>
        <AirportTime
          city={leg.toCity}
          code={leg.toCode}
          time={leg.nextDay ? `${leg.arrives} +1` : leg.arrives}
          align="end"
        />
      </div>
    </li>
  );
}

function AirportTime({
  city,
  code,
  time,
  align = 'start',
}: {
  city: string;
  code: string;
  time: string;
  align?: 'start' | 'end';
}) {
  const end = align === 'end';
  return (
    <div className={end ? 'text-right' : ''}>
      <p className="text-lg font-semibold text-navy">{time}</p>
      <p className="text-sm text-crm-heading">{city}</p>
      <p className="text-xs font-semibold tracking-[0.12em] text-crm-slate">{code}</p>
    </div>
  );
}
