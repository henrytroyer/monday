import { useState, type FormEvent } from 'react';
import { JANE_MILLER_EMAIL } from '../mock/fixtures';
import { BackButton } from '../components/BackButton';
import { GuestAuthLayout } from '../components/GuestAuthLayout';
import { TextField } from '../components/Field';

export function SignInScreen({
  onSignIn,
  onBack,
}: {
  onSignIn: (email: string) => void;
  onBack: () => void;
}) {
  const [email, setEmail] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSignIn(email);
  }

  return (
    <GuestAuthLayout>
      <BackButton onClick={onBack} />
      <h1 className="text-3xl font-semibold tracking-tight text-navy">Sign in</h1>
      <p className="mt-2 text-sm text-crm-slate">
        Use the email on your volunteer record.
      </p>
      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <TextField
          label="Email"
          id="signin-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />
        <button
          type="submit"
          className="min-h-11 rounded-full bg-navy px-4 text-base font-semibold text-white hover:bg-navy-dark"
        >
          Sign in
        </button>
      </form>
      <p className="mt-4 text-xs text-crm-slate">
        Your information is only seen by the i58 team.
      </p>
      <p className="mt-8 text-center text-xs text-crm-slate">
        Demo: <span className="font-medium text-navy">{JANE_MILLER_EMAIL}</span>
      </p>
    </GuestAuthLayout>
  );
}
