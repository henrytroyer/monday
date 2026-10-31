export type FlightLeg = {
  airline: string;
  flight: string;
  date: string;
  fromCity: string;
  fromCode: string;
  departs: string;
  toCity: string;
  toCode: string;
  arrives: string;
  nextDay: boolean;
};

export type FlightDirection = {
  id: 'to-field' | 'home';
  title: string;
  legs: FlightLeg[];
};

export type FlightItinerary = {
  passenger: string;
  recordLocator: string;
  term: string;
  field: string;
  directions: FlightDirection[];
};

const TO_FIELD: FlightLeg[] = [
  {
    airline: 'Delta',
    flight: 'DL 214',
    date: 'Friday, 5 June 2026',
    fromCity: 'Charlotte',
    fromCode: 'CLT',
    departs: '6:40 PM',
    toCity: 'Paris',
    toCode: 'CDG',
    arrives: '8:55 AM',
    nextDay: true,
  },
  {
    airline: 'Aegean',
    flight: 'A3 640',
    date: 'Saturday, 6 June 2026',
    fromCity: 'Paris',
    fromCode: 'CDG',
    departs: '11:20 AM',
    toCity: 'Athens',
    toCode: 'ATH',
    arrives: '3:35 PM',
    nextDay: false,
  },
  {
    airline: 'Olympic Air',
    flight: 'OA 221',
    date: 'Saturday, 6 June 2026',
    fromCity: 'Athens',
    fromCode: 'ATH',
    departs: '5:10 PM',
    toCity: 'Mytilene',
    toCode: 'MJT',
    arrives: '6:00 PM',
    nextDay: false,
  },
];

const HOME: FlightLeg[] = [
  {
    airline: 'Olympic Air',
    flight: 'OA 220',
    date: 'Friday, 28 August 2026',
    fromCity: 'Mytilene',
    fromCode: 'MJT',
    departs: '9:15 AM',
    toCity: 'Athens',
    toCode: 'ATH',
    arrives: '10:05 AM',
    nextDay: false,
  },
  {
    airline: 'Aegean',
    flight: 'A3 641',
    date: 'Friday, 28 August 2026',
    fromCity: 'Athens',
    fromCode: 'ATH',
    departs: '12:40 PM',
    toCity: 'Paris',
    toCode: 'CDG',
    arrives: '3:10 PM',
    nextDay: false,
  },
  {
    airline: 'Delta',
    flight: 'DL 215',
    date: 'Friday, 28 August 2026',
    fromCity: 'Paris',
    fromCode: 'CDG',
    departs: '5:45 PM',
    toCity: 'Charlotte',
    toCode: 'CLT',
    arrives: '9:10 PM',
    nextDay: false,
  },
];

/** Sample booked flights for the preview. A reload does not store a personal itinerary. */
export function flightItineraryFor(passenger: string): FlightItinerary {
  const name = passenger.trim();
  return {
    passenger: name || 'Volunteer',
    recordLocator: 'I58-7K2M',
    term: 'Summer 2026',
    field: 'Lesvos',
    directions: [
      { id: 'to-field', title: 'To Lesvos', legs: TO_FIELD },
      { id: 'home', title: 'Return home', legs: HOME },
    ],
  };
}
