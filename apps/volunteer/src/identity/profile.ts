/**
 * profile.ts — Volunteer profile collected after Google sign-in.
 * Google supplies the email. This form supplies legal name, date of birth,
 * phone, and mailing address.
 */

export interface VolunteerProfile {
  fullName: string;
  dateOfBirth: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export type ProfileField = keyof VolunteerProfile;

export type ValidProfile =
  | { ok: true; value: VolunteerProfile }
  | { ok: false; message: string };

const FIELD_LABEL: Record<ProfileField, string> = {
  fullName: 'Full name',
  dateOfBirth: 'Date of birth',
  phone: 'Phone number',
  street: 'Street',
  city: 'City',
  state: 'State / province',
  zip: 'Zip / postal code',
  country: 'Country',
};

export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !trimmed.includes('@')) return null;
  return trimmed;
}

export function normalizePhoneDigits(phone: string | null | undefined): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

export function splitPersonName(name: string): { first: string; last: string; full: string } {
  const full = name.trim().replace(/\s+/g, ' ');
  const parts = full.split(' ').filter(Boolean);
  if (parts.length === 0) return { first: '', last: '', full: '' };
  if (parts.length === 1) return { first: parts[0]!, last: '', full };
  return {
    first: parts[0]!,
    last: parts[parts.length - 1]!.toLowerCase(),
    full,
  };
}

export function isBlankContactValue(value: string | null | undefined): boolean {
  const trimmed = (value ?? '').trim();
  return trimmed.length === 0 || trimmed === '—' || trimmed === '-';
}

export function validateProfile(input: Partial<VolunteerProfile>): ValidProfile {
  const fullName = (input.fullName ?? '').trim().replace(/\s+/g, ' ');
  const dateOfBirth = (input.dateOfBirth ?? '').trim();
  const phone = (input.phone ?? '').trim();
  const street = (input.street ?? '').trim();
  const city = (input.city ?? '').trim();
  const state = (input.state ?? '').trim();
  const zip = (input.zip ?? '').trim();
  const country = (input.country ?? '').trim();

  if (!fullName.includes(' ')) {
    return { ok: false, message: 'Enter your first and last name.' };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) || !isRealDate(dateOfBirth)) {
    return { ok: false, message: 'Enter a real date of birth.' };
  }
  if (dateOfBirth > todayIso()) {
    return { ok: false, message: 'Date of birth cannot be in the future.' };
  }
  if (dateOfBirth < '1900-01-01') {
    return { ok: false, message: 'Enter a real date of birth.' };
  }

  if (normalizePhoneDigits(phone).length < 7) {
    return { ok: false, message: 'Enter a phone number.' };
  }

  for (const [field, value] of [
    ['street', street],
    ['city', city],
    ['state', state],
    ['zip', zip],
    ['country', country],
  ] as const) {
    if (!value) {
      return { ok: false, message: `Enter your ${FIELD_LABEL[field].toLowerCase()}.` };
    }
  }

  return {
    ok: true,
    value: { fullName, dateOfBirth, phone, street, city, state, zip, country },
  };
}

function isRealDate(iso: string): boolean {
  const [year, month, day] = iso.split('-').map((part) => Number(part));
  if (!year || !month || !day) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function todayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
