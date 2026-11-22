import type { VolunteerApplicationStatus } from '../contract/volunteerApi';
import { BackButton } from '../components/BackButton';
import { FormCard, PageHeader } from '../components/FormCard';
import { ItineraryForm } from '../components/ItineraryForm';
import { ItineraryBanner } from '../components/TravelCopies';
import { itinerariesForPlace, itinerarySheetLeg } from '../lib/flightItinerary';
import { journeyDestination } from '../lib/journey';
import { staffUploadWaitingLine } from '../lib/preparationDocuments';

export function FlightItineraryScreen({
  me,
  uploaded,
  onBack,
}: {
  me: VolunteerApplicationStatus;
  uploaded: boolean;
  onBack: () => void;
}) {
  const waiting = staffUploadWaitingLine('flights', uploaded);
  if (waiting) {
    return (
      <div>
        <BackButton onClick={onBack} />
        <PageHeader eyebrow="Flights" title="Your itinerary" />
        <FormCard>
          <p className="text-center text-sm text-crm-slate">{waiting}</p>
        </FormCard>
      </div>
    );
  }

  const destination = journeyDestination(me);
  const itineraries = itinerariesForPlace(me.name, destination.label);

  return (
    <div>
      <BackButton onClick={onBack} />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <ItineraryBanner place={destination.label} />
        {itineraries.map((itinerary) => (
          <article
            key={itinerary.recordLocator}
            className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-navy/10"
          >
            <ItineraryForm
              recordLocator={itinerary.recordLocator}
              legs={itinerary.directions.flatMap((direction) =>
                direction.legs.map((leg) => itinerarySheetLeg(leg)),
              )}
            />
          </article>
        ))}
      </div>
    </div>
  );
}
