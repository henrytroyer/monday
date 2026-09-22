import { useState, type FormEvent } from 'react';
import type { VolunteerApplicationStatus } from '../contract/volunteerApi';
import { JANE_MILLER_EMAIL } from '../mock/fixtures';
import { fetchMe } from '../mock/volunteerClient';

interface LoginScreenProps {
  onFound: (me: VolunteerApplicationStatus) => void;
}

export function LoginScreen({ onFound }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = fetchMe(email);
    setPending(false);
    if (result.status === 'not_found') {
      setError('No application found for that email.');
      return;
    }
    onFound(result.me);
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8 sm:py-12">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-crm-slate">
          i58 volunteers
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Check your application
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-crm-slate">
          Enter the email you used on your short-term application. This preview
          is read-only — you cannot tick or complete steps here.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-2xl border border-crm-taupe/25 bg-crm-surface p-5 shadow-sm"
      >
        <label className="flex flex-col gap-2 text-sm font-medium text-crm-heading" htmlFor="email">
          Email
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="min-h-12 rounded-xl border border-crm-taupe/30 bg-white px-3 py-3 text-base font-normal text-crm-text outline-none placeholder:text-crm-slate/70 focus:border-crm-slate focus:ring-2 focus:ring-crm-taupe/30"
          />
        </label>

        {error ? (
          <p role="alert" className="text-sm text-crm-terracotta">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="min-h-12 rounded-xl bg-crm-indigo px-4 text-base font-medium text-white transition hover:bg-crm-indigo-dark disabled:opacity-60"
        >
          {pending ? 'Checking…' : 'Continue'}
        </button>
      </form>

      <p className="mt-6 text-xs leading-relaxed text-crm-slate">
        Demo account: <span className="font-medium text-crm-heading">{JANE_MILLER_EMAIL}</span>
      </p>
    </div>
  );
}
