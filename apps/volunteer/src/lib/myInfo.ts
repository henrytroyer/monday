import type {
  PreparationDocumentDraft,
  PreparationDocumentId,
  VolunteerApplicationStatus,
  VolunteerFamilyStatus,
  VolunteerGeneralInformation,
  VolunteerHistorySkillsLanguages,
  VolunteerOtherContacts,
  VolunteerPassportDetails,
} from '../contract/volunteerApi';
import { JANE_MILLER_EMAIL } from '../mock/fixtures';
import { MARITAL_STATUS_OPTIONS } from '../process/familyStatus';
import { PASSPORT_EXAMPLE_SRC } from '../process/passportDetails';
import { COORDINATOR_EMAIL } from './volunteerGuide';
import { flightItineraryFor, type FlightItinerary } from './flightItinerary';
import { documentIsEdited, documentStage, DOCUMENT_FIELDS, type DocumentStage } from './preparationDocuments';
import { serviceMonths } from './servicePeriod';

/** Example ID portrait used until a volunteer photo is stored. */
export const MOCK_PROFILE_PHOTO = '/examples/id-photo-example.png';

/** Shown for the preview volunteer until General Information has a phone number. */
export const MOCK_VOLUNTEER_PHONE = '(555) 014-2086';

export const NOT_ON_FILE = 'Not on file';

const EXAMPLE_BIRTHDATE = '1998-04-14';
const EXAMPLE_PHONE_DIGITS = '5550142086';

const EXAMPLE_GENERAL: VolunteerGeneralInformation = {
  gender: 'female',
  birthdate: EXAMPLE_BIRTHDATE,
  phone: EXAMPLE_PHONE_DIGITS,
  street: '428 Oak Street',
  city: 'Charlotte',
  state: 'NC',
  postalCode: '28202',
  country: 'USA',
};

const EXAMPLE_PASSPORT: VolunteerPassportDetails = {
  photoFileName: 'passport.jpg',
  passportNumber: '548291763',
  expirationDate: '2029-08-18',
};

const EXAMPLE_CONTACTS: VolunteerOtherContacts = {
  churchName: '',
  pastorName: '',
  pastorEmail: '',
  pastorPhone: '',
  parentsNames: 'Frank and Mary',
  parentEmail: 'frank.and.mary@example.com',
  parentPhone: '5550142204',
  emergencyName: 'Daniel Miller',
  emergencyEmail: 'daniel.miller@example.com',
  emergencyPhone: '5550147731',
  emergencyRelation: ['Sibling'],
  accountableName: 'Ruth Allen',
  accountableEmail: 'ruth.allen@example.com',
  accountablePhone: '5550146610',
  fieldContact: 'yes',
  fieldContactName: 'Elena Papadopoulos',
};

const EXAMPLE_HISTORY: VolunteerHistorySkillsLanguages = {
  medical: 'No known drug allergies. Carries an inhaler for mild asthma.',
  travelledInternationally: '',
  heardAbout: [],
  friendName: '',
  whyVolunteer: '',
  testimony: '',
  occupation: '',
  skills: ['Childcare', 'Teaching'],
  otherSkills: '',
  leadership: '',
  leadershipExperience: '',
  languages: ['English'],
  otherLanguage: '',
};

const EXAMPLE_FAMILY: VolunteerFamilyStatus = {
  maritalStatus: 'single',
  childrenComing: 'no',
  familyMembers: '',
};

const ON_FILE_DOCUMENTS = ['background_check_sent', 'safeguarding_certificate'] as const;

export type MyInfoContact = {
  role: string;
  name: string;
  phone: string;
  email: string;
  note: string;
};

export type MyInfoDocument = {
  id: (typeof ON_FILE_DOCUMENTS)[number];
  title: string;
  statusLabel: string;
  onFile: boolean;
  draft: PreparationDocumentDraft | null;
};

export type MyInfoFlights = {
  recordLocator: string;
  arrivalFlight: string;
  arrival: string;
  returnFlight: string;
  returning: string;
};

export type MyInfo = {
  name: string;
  email: string;
  phone: string;
  photo: string;
  birthday: string;
  gender: string;
  address: string[];
  passportPhoto: string | null;
  passportNumber: string;
  passportExpiration: string;
  location: string;
  term: string;
  length: string;
  airport: string;
  flights: MyInfoFlights | null;
  documents: MyInfoDocument[];
  contacts: MyInfoContact[];
  medical: string;
  languages: string;
  skills: string;
  family: string;
};

/**
 * Everything a volunteer needs while they are on the field, read from the
 * application. The preview volunteer still sees a complete record until those
 * forms are saved. A saved group replaces that example.
 */
export function myInfoFor(me: VolunteerApplicationStatus): MyInfo {
  const example = me.email.trim().toLowerCase() === JANE_MILLER_EMAIL;
  const general = taken(me.generalInformation, generalStarted(me.generalInformation), example, EXAMPLE_GENERAL);
  const passport = taken(me.passportDetails, passportStarted(me.passportDetails), example, EXAMPLE_PASSPORT);
  const contacts = taken(me.otherContacts, contactsStarted(me.otherContacts), example, EXAMPLE_CONTACTS);
  const history = taken(
    me.historySkillsLanguages,
    historyStarted(me.historySkillsLanguages),
    example,
    EXAMPLE_HISTORY,
  );
  const family = taken(me.familyStatus, familyStarted(me.familyStatus), example, EXAMPLE_FAMILY);
  const flights = bookedFlights(me);

  return {
    name: me.name.trim() || NOT_ON_FILE,
    email: me.email.trim() || NOT_ON_FILE,
    phone: general ? formatPhone(general.phone) || NOT_ON_FILE : NOT_ON_FILE,
    photo: MOCK_PROFILE_PHOTO,
    birthday: general ? formatStoredDate(general.birthdate) : NOT_ON_FILE,
    gender: general ? genderLabel(general.gender) : NOT_ON_FILE,
    address: general ? addressLines(general) : [NOT_ON_FILE],
    passportPhoto: passport?.photoFileName.trim() ? PASSPORT_EXAMPLE_SRC : null,
    passportNumber: passport?.passportNumber.trim() || NOT_ON_FILE,
    passportExpiration: passport ? formatStoredDate(passport.expirationDate) : NOT_ON_FILE,
    location: assignmentLocation(me),
    term: listed(me.term, ['Term not listed']),
    length: lengthLabel(me, example),
    airport: airportLabel(me, flights),
    flights: flights ? flightSummary(flights) : null,
    documents: ON_FILE_DOCUMENTS.map((id) => documentInfo(me, id, example)),
    contacts: contactList(me, contacts),
    medical: history?.medical.trim() || NOT_ON_FILE,
    languages: history ? joinList(history.languages, history.otherLanguage) : NOT_ON_FILE,
    skills: history ? joinList(history.skills, history.otherSkills) : NOT_ON_FILE,
    family: family ? familySummary(family) : NOT_ON_FILE,
  };
}

function taken<T>(value: T | undefined, started: boolean, example: boolean, sample: T): T | null {
  if (started && value) return value;
  if (!started && example) return sample;
  return null;
}

function generalStarted(info: VolunteerGeneralInformation | undefined): boolean {
  if (!info) return false;
  return Object.values(info).some((value) => value.trim().length > 0);
}

function passportStarted(info: VolunteerPassportDetails | undefined): boolean {
  if (!info) return false;
  return Boolean(info.photoFileName.trim() || info.passportNumber.trim() || info.expirationDate.trim());
}

function contactsStarted(info: VolunteerOtherContacts | undefined): boolean {
  if (!info) return false;
  return (
    info.emergencyRelation.length > 0 ||
    info.fieldContact !== '' ||
    Object.entries(info).some(([, value]) => typeof value === 'string' && value.trim().length > 0)
  );
}

function historyStarted(info: VolunteerHistorySkillsLanguages | undefined): boolean {
  if (!info) return false;
  return (
    info.heardAbout.length > 0 ||
    info.skills.length > 0 ||
    info.languages.length > 0 ||
    Object.values(info).some((value) => typeof value === 'string' && value.trim().length > 0)
  );
}

function familyStarted(info: VolunteerFamilyStatus | undefined): boolean {
  if (!info) return false;
  return Boolean(info.maritalStatus || info.childrenComing || info.familyMembers.trim());
}

function assignmentLocation(me: VolunteerApplicationStatus): string {
  const confirmed = listed(me.location, ['Preference not listed']);
  if (confirmed !== NOT_ON_FILE) return confirmed;
  const preferences = me.termOfService?.locationPreferences.filter((place) => place.trim()) ?? [];
  return preferences.length > 0 ? preferences.join(', ') : NOT_ON_FILE;
}

function lengthLabel(me: VolunteerApplicationStatus, example: boolean): string {
  if (me.termOfService?.lengthOfTerm === 'other') {
    return me.termOfService.otherTerm.trim() || NOT_ON_FILE;
  }
  if (me.termOfService?.lengthOfTerm === '3-months' || example) {
    const months = serviceMonths(me);
    return months === 1 ? '1 month' : `${months} months`;
  }
  return NOT_ON_FILE;
}

function airportLabel(me: VolunteerApplicationStatus, flights: FlightItinerary | null): string {
  const saved = me.termOfService?.nearbyAirport.trim() ?? '';
  if (saved) return saved;
  const departure = flights?.directions.find((direction) => direction.id === 'to-field')?.legs[0];
  if (!departure) return NOT_ON_FILE;
  return `${departure.fromCity} (${departure.fromCode})`;
}

function bookedFlights(me: VolunteerApplicationStatus): FlightItinerary | null {
  const itinerary = flightItineraryFor(me.name);
  return itinerary.term === me.term.trim() ? itinerary : null;
}

function flightSummary(itinerary: FlightItinerary): MyInfoFlights {
  const inbound = itinerary.directions.find((direction) => direction.id === 'to-field')?.legs.at(-1);
  const outbound = itinerary.directions.find((direction) => direction.id === 'home')?.legs[0];
  return {
    recordLocator: itinerary.recordLocator,
    arrivalFlight: inbound ? `${inbound.airline} ${inbound.flight}` : NOT_ON_FILE,
    arrival: inbound ? `${inbound.toCity} · ${inbound.date} · ${inbound.arrives}` : NOT_ON_FILE,
    returnFlight: outbound ? `${outbound.airline} ${outbound.flight}` : NOT_ON_FILE,
    returning: outbound
      ? `${outbound.fromCity} · ${outbound.date} · ${outbound.departs}`
      : NOT_ON_FILE,
  };
}

function documentInfo(
  me: VolunteerApplicationStatus,
  id: (typeof ON_FILE_DOCUMENTS)[number],
  example: boolean,
): MyInfoDocument {
  const saved = me.preparationDocuments?.[id];
  const edited = documentIsEdited(saved);
  const stage: DocumentStage = edited ? documentStage(saved) : example ? 'accepted' : 'start';
  const draft = edited && saved ? saved : example ? exampleDocument(me, id) : null;
  return {
    id,
    title: DOCUMENT_FIELDS[id].title,
    statusLabel: documentStatusLabel(stage),
    onFile: stage === 'accepted',
    draft: draft && (draft.submitted || draft.name.trim()) ? draft : null,
  };
}

function exampleDocument(
  me: VolunteerApplicationStatus,
  id: PreparationDocumentId,
): PreparationDocumentDraft {
  if (id === 'safeguarding_certificate') {
    return {
      name: me.name,
      date: 'March 2, 2026',
      confirmed: 'yes',
      submitted: true,
      review: 'accepted',
    };
  }
  return {
    name: me.name,
    date: 'April 14, 1998',
    confirmed: 'yes',
    submitted: true,
    review: 'accepted',
  };
}

function documentStatusLabel(stage: DocumentStage): string {
  switch (stage) {
    case 'accepted':
      return 'On file';
    case 'received':
      return 'Received by i58';
    case 'sent':
      return 'Sent to i58';
    case 'declined':
      return 'Not accepted';
    case 'continue':
      return 'In progress';
    default:
      return NOT_ON_FILE;
  }
}

function contactList(
  me: VolunteerApplicationStatus,
  contacts: VolunteerOtherContacts | null,
): MyInfoContact[] {
  const people: MyInfoContact[] = [];
  if (contacts) {
    pushContact(people, {
      role: 'Emergency',
      name: contacts.emergencyName,
      phone: contacts.emergencyPhone,
      email: contacts.emergencyEmail,
      note: contacts.emergencyRelation.join(', '),
    });
  }
  const spouse = me.spouseApplication;
  if (spouse?.spouseJoining === 'yes') {
    pushContact(people, {
      role: 'Spouse',
      name: spouse.name,
      phone: spouse.phone,
      email: spouse.email,
      note: 'Serving this term with you',
    });
  }
  if (contacts) {
    pushContact(people, {
      role: 'Parents',
      name: contacts.parentsNames,
      phone: contacts.parentPhone,
      email: contacts.parentEmail,
      note: '',
    });
    pushContact(people, {
      role: 'Accountability',
      name: contacts.accountableName,
      phone: contacts.accountablePhone,
      email: contacts.accountableEmail,
      note: '',
    });
    if (contacts.fieldContact === 'yes') {
      pushContact(people, {
        role: 'Field contact',
        name: contacts.fieldContactName,
        phone: '',
        email: '',
        note: 'On the field',
      });
    }
  }
  people.push({
    role: 'i58',
    name: 'i58 team',
    phone: '',
    email: COORDINATOR_EMAIL,
    note: 'Questions while you are serving',
  });
  return people;
}

function pushContact(
  people: MyInfoContact[],
  contact: { role: string; name: string; phone: string; email: string; note: string },
) {
  const name = contact.name.trim();
  if (!name) return;
  people.push({
    role: contact.role,
    name,
    phone: formatPhone(contact.phone),
    email: contact.email.trim(),
    note: contact.note.trim(),
  });
}

function familySummary(family: VolunteerFamilyStatus): string {
  const marital =
    MARITAL_STATUS_OPTIONS.find((option) => option.id === family.maritalStatus)?.label ?? '';
  const coming =
    family.childrenComing === 'yes'
      ? family.familyMembers.trim()
      : family.childrenComing === 'no'
        ? 'No children are coming with you'
        : '';
  const summary = [marital, coming].filter(Boolean).join('. ');
  return summary || NOT_ON_FILE;
}

function joinList(values: readonly string[], other: string): string {
  const names = values.filter((value) => value !== 'Other' && value.trim());
  if (other.trim()) names.push(other.trim());
  return names.join(', ') || NOT_ON_FILE;
}

function genderLabel(gender: VolunteerGeneralInformation['gender']): string {
  if (gender === 'female') return 'Female';
  if (gender === 'male') return 'Male';
  return NOT_ON_FILE;
}

function addressLines(info: VolunteerGeneralInformation): string[] {
  const city = [info.city.trim(), info.state.trim()].filter(Boolean).join(', ');
  const cityLine = [city, info.postalCode.trim()].filter(Boolean).join(' ');
  const lines = [info.street.trim(), cityLine, info.country.trim()].filter(Boolean);
  return lines.length > 0 ? lines : [NOT_ON_FILE];
}

function listed(value: string, placeholders: readonly string[]): string {
  const trimmed = value.trim();
  if (!trimmed || placeholders.includes(trimmed)) return NOT_ON_FILE;
  return trimmed;
}

export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  const local = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (local.length !== 10) return raw.trim();
  return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
}

export function formatStoredDate(value: string): string {
  const trimmed = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return trimmed || NOT_ON_FILE;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
