import type { ContactDemographics } from '../types/contact';

const STREETS = [
  'Oak Street',
  'Maple Avenue',
  'Cedar Lane',
  'Pine Road',
  'Elm Court',
  'Birch Way',
  'Willow Drive',
  'Church Street',
  'Highland Avenue',
  'River Road',
];

const CITIES = [
  'Portland',
  'Seattle',
  'Denver',
  'Austin',
  'Chicago',
  'Boston',
  'Nashville',
  'Atlanta',
  'Phoenix',
  'Minneapolis',
  'London',
  'Manchester',
  'Berlin',
  'Munich',
  'Toronto',
];

const COUNTRIES = [
  'United States',
  'United Kingdom',
  'Germany',
  'Canada',
  'Netherlands',
  'Australia',
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 1;
}

function createRng(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function pick<T>(rand: () => number, items: T[]): T {
  return items[Math.floor(rand() * items.length)]!;
}

/** Deterministic mailing address for mock donor contacts (monday Address / City / Country columns). */
export function buildMockMailingDemographics(
  contactId: string,
): ContactDemographics {
  const rand = createRng(hashString(`${contactId}-mailing`));
  const streetNumber = 100 + Math.floor(rand() * 8900);
  const unit = rand() > 0.82 ? `, Apt ${1 + Math.floor(rand() * 120)}` : '';

  return {
    address: `${streetNumber} ${pick(rand, STREETS)}${unit}`,
    city: pick(rand, CITIES),
    country: pick(rand, COUNTRIES),
  };
}
