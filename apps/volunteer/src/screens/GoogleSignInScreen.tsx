/**
 * GoogleSignInScreen.tsx — Landing sign-in. Replaces the mock email form.
 */

import { useState } from 'react';
import { readFirebaseWebConfig, signInWithGoogle } from '../identity/firebaseClient.ts';

export function GoogleSignInScreen() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const configured = readFirebaseWebConfig() != null;

  async function handleSignIn() {
    setPending(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed. Try again.');
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8 sm:py-12">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-crm-slate">
          i58 volunteers
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm leading-relaxed text-crm-slate">
          Use the Google account for the email we should keep on your contact record.
        </p>
      </header>

      {configured ? (
        <button
          type="button"
          onClick={() => void handleSignIn()}
          disabled={pending}
          className="min-h-12 rounded-xl bg-crm-indigo px-4 text-base font-medium text-white transition hover:bg-crm-indigo-dark disabled:opacity-60"
        >
          {pending ? 'Opening Google…' : 'Continue with Google'}
        </button>
      ) : (
        <p role="alert" className="text-sm text-crm-terracotta">
          Google sign-in is not configured. Add the i58-finance Firebase web config to
          apps/volunteer/.env and restart the dev server.
        </p>
      )}

      {error ? (
        <p role="alert" className="mt-4 text-sm text-crm-terracotta">
          {error}
        </p>
      ) : null}
    </div>
  );
}
