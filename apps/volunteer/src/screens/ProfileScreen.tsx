/**
 * ProfileScreen.tsx — Legal name, date of birth, phone, and address after Google sign-in.
 * Email is the verified Google address and cannot be edited here.
 */

import { useState, type FormEvent, type ReactNode } from 'react';
import { validateProfile, type VolunteerProfile } from '../identity/profile.ts';

interface ProfileScreenProps {
  email: string;
  suggestedName: string;
  pending: boolean;
  error: string | null;
  onSubmit: (profile: VolunteerProfile) => void;
  onSignOut: () => void;
}

export function ProfileScreen({
  email,
  suggestedName,
  pending,
  error,
  onSubmit,
  onSignOut,
}: ProfileScreenProps) {
  const [fullName, setFullName] = useState(suggestedName);
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [country, setCountry] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateProfile({
      fullName,
      dateOfBirth,
      phone,
      street,
      city,
      state,
      zip,
      country,
    });
    if (!result.ok) {
      setLocalError(result.message);
      return;
    }
    setLocalError(null);
    onSubmit(result.value);
  }

  const alert = localError || error;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8 sm:py-12">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-crm-slate">
          i58 volunteers
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Your details</h1>
        <p className="mt-2 text-sm leading-relaxed text-crm-slate">
          We use this to find your contact record, or to create one if you are new.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-2xl border border-crm-taupe/25 bg-crm-surface p-5 shadow-sm"
      >
        <Field label="Email" id="email">
          <input
            id="email"
            name="email"
            type="email"
            readOnly
            value={email}
            className={inputClass}
          />
        </Field>
        <Field label="Full name" id="fullName">
          <input
            id="fullName"
            name="fullName"
            required
            autoComplete="name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Date of birth" id="dateOfBirth">
          <input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            required
            autoComplete="bday"
            value={dateOfBirth}
            onChange={(event) => setDateOfBirth(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Phone number" id="phone">
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            inputMode="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Street" id="street">
          <input
            id="street"
            name="street"
            required
            autoComplete="address-line1"
            value={street}
            onChange={(event) => setStreet(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="City" id="city">
          <input
            id="city"
            name="city"
            required
            autoComplete="address-level2"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="State / province" id="state">
          <input
            id="state"
            name="state"
            required
            autoComplete="address-level1"
            value={state}
            onChange={(event) => setState(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Zip / postal code" id="zip">
          <input
            id="zip"
            name="zip"
            required
            autoComplete="postal-code"
            value={zip}
            onChange={(event) => setZip(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Country" id="country">
          <input
            id="country"
            name="country"
            required
            autoComplete="country-name"
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            className={inputClass}
          />
        </Field>

        {alert ? (
          <p role="alert" className="text-sm text-crm-terracotta">
            {alert}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="min-h-12 rounded-xl bg-crm-indigo px-4 text-base font-medium text-white transition hover:bg-crm-indigo-dark disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Continue'}
        </button>
      </form>

      <button
        type="button"
        onClick={onSignOut}
        className="mt-6 min-h-12 rounded-xl border border-crm-taupe/30 bg-white px-4 text-sm font-medium text-crm-heading"
      >
        Sign out
      </button>
    </div>
  );
}

const inputClass =
  'min-h-12 rounded-xl border border-crm-taupe/30 bg-white px-3 py-3 text-base font-normal text-crm-text outline-none placeholder:text-crm-slate/70 focus:border-crm-slate focus:ring-2 focus:ring-crm-taupe/30 read-only:bg-crm-white read-only:text-crm-slate';

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-crm-heading" htmlFor={id}>
      {label}
      {children}
    </label>
  );
}
