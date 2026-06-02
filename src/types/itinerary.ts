export interface ItineraryLeg {
  date: string;
  time: string;
  airport: string;
}

export interface VolunteerItinerary {
  arrival: ItineraryLeg;
  departure: ItineraryLeg;
}

export const emptyItineraryLeg = (): ItineraryLeg => ({
  date: '',
  time: '',
  airport: '',
});

export const emptyItinerary = (): VolunteerItinerary => ({
  arrival: emptyItineraryLeg(),
  departure: emptyItineraryLeg(),
});

export function itineraryLegHasData(leg: ItineraryLeg): boolean {
  return Boolean(leg.date.trim() || leg.time.trim() || leg.airport.trim());
}

export function itineraryHasData(itinerary: VolunteerItinerary): boolean {
  return (
    itineraryLegHasData(itinerary.arrival) ||
    itineraryLegHasData(itinerary.departure)
  );
}
