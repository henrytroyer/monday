/**
 * fieldAirports.ts
 * Map confirmed / preferred field locations to primary destination IATA codes.
 * Used when assembling destination arrival/departure from itinerary PDFs.
 */

const LOCATION_TO_FIELD_IATA: Record<string, string> = {
  lesvos: 'MJT',
  mytilene: 'MJT',
  mjt: 'MJT',
  malakasa: 'ATH',
  athens: 'ATH',
  ath: 'ATH',
  germany: 'FRA',
  taunusstien: 'FRA',
  neustadt: 'FRA',
  giessen: 'FRA',
  frankfurt: 'FRA',
  fra: 'FRA',
  munich: 'MUC',
  muc: 'MUC',
};

/** Resolve field-airport IATA from confirmed location, then location preference. */
export function resolveFieldAirportIata(
  location?: string,
  locationPreference?: string,
): string | undefined {
  for (const raw of [location, locationPreference]) {
    const key = raw?.trim().toLowerCase();
    if (!key || key === '—' || key === 'other') continue;
    const mapped = LOCATION_TO_FIELD_IATA[key];
    if (mapped) return mapped;
    // Partial match e.g. "Lesvos, Greece"
    for (const [token, iata] of Object.entries(LOCATION_TO_FIELD_IATA)) {
      if (key.includes(token)) return iata;
    }
  }
  return undefined;
}
