/**
 * IdentityResultScreen.tsx — Result of find-or-create: found, created, confirm, or needs staff.
 * Application and pastor-reference routing is a later build.
 */

import type { IdentityResult } from '../identity/identityClient.ts';

interface IdentityResultScreenProps {
  result: IdentityResult;
  pending?: boolean;
  error?: string | null;
  onConfirm?: () => void;
  onDecline?: () => void;
  onSignOut: () => void;
}

export function IdentityResultScreen({
  result,
  pending = false,
  error = null,
  onConfirm,
  onDecline,
  onSignOut,
}: IdentityResultScreenProps) {
  if (result.status === 'confirm_match') {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8 sm:py-12">
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-crm-slate">
            i58 volunteers
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Is this you?</h1>
          <p className="mt-2 text-sm leading-relaxed text-crm-slate">
            We found a contact with this phone number and last name.
          </p>
        </header>

        <dl className="rounded-2xl border border-crm-taupe/25 bg-crm-surface p-5 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wide text-crm-slate">Name</dt>
            <dd className="mt-1 font-medium text-crm-heading">{result.matchedName || result.name}</dd>
          </div>
          <div className="mt-4">
            <dt className="text-xs uppercase tracking-wide text-crm-slate">Email on file</dt>
            <dd className="mt-1 font-medium text-crm-heading">{result.matchedEmail || '—'}</dd>
          </div>
        </dl>

        {error ? (
          <p className="mt-4 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className="min-h-12 rounded-xl bg-crm-indigo px-4 text-sm font-medium text-white transition hover:bg-crm-indigo-dark disabled:opacity-60"
          >
            {pending ? 'Saving…' : 'Yes, this is me'}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onDecline}
            className="min-h-12 rounded-xl border border-crm-taupe/30 bg-white px-4 text-sm font-medium text-crm-heading disabled:opacity-60"
          >
            No, that is not me
          </button>
        </div>
      </div>
    );
  }

  const copy = resultCopy(result);
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8 sm:py-12">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-crm-slate">
          i58 volunteers
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{copy.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-crm-slate">{copy.body}</p>
      </header>

      <dl className="rounded-2xl border border-crm-taupe/25 bg-crm-surface p-5 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wide text-crm-slate">Name</dt>
          <dd className="mt-1 font-medium text-crm-heading">{result.name}</dd>
        </div>
        <div className="mt-4">
          <dt className="text-xs uppercase tracking-wide text-crm-slate">Email</dt>
          <dd className="mt-1 font-medium text-crm-heading">{result.email}</dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={onSignOut}
        className="mt-8 min-h-12 rounded-xl border border-crm-taupe/30 bg-white px-4 text-sm font-medium text-crm-heading"
      >
        Sign out
      </button>
    </div>
  );
}

function resultCopy(result: IdentityResult): { title: string; body: string } {
  if (result.status === 'created') {
    return {
      title: 'Contact saved',
      body: 'We created your contact record with the details you entered.',
    };
  }
  if (result.status === 'found') {
    return {
      title: 'Contact found',
      body: 'We found your contact record and filled in anything that was still blank.',
    };
  }
  if (result.reason === 'duplicate_email') {
    return {
      title: 'We need a staff person',
      body: 'More than one contact uses this email. A staff member needs to sort that out before we can continue.',
    };
  }
  return {
    title: 'We need a staff person',
    body: 'Someone with this phone number and last name is already on file under a different email. A staff member needs to confirm it is you. We did not merge the records.',
  };
}
