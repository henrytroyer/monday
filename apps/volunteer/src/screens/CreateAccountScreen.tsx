import { useState, type FormEvent } from 'react';
import { BackButton } from '../components/BackButton';
import { GuestAuthLayout } from '../components/GuestAuthLayout';
import { TextField } from '../components/Field';

export function CreateAccountScreen({
  initialEmail = '',
  onCreate,
  onBack,
}: {
  initialEmail?: string;
  onCreate: (input: { name: string; email: string }) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialEmail);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onCreate({ name: name.trim(), email: email.trim() });
  }

  return (
    <GuestAuthLayout>
      <BackButton onClick={onBack} />
      <h1 className="text-3xl font-semibold tracking-tight text-navy">
        Create account
      </h1>
      <p className="mt-2 text-sm text-crm-slate">
        Preview only. This does not create a Monday contact.
      </p>
      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <TextField
          label="Full name"
          id="create-name"
          name="name"
          autoComplete="name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <TextField
          label="Email"
          id="create-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <button
          type="submit"
          className="min-h-11 rounded-full bg-navy px-4 text-base font-semibold text-white hover:bg-navy-dark"
        >
          Create account
        </button>
      </form>
      <p className="mt-4 text-xs text-crm-slate">
        Your information is only seen by the i58 team.
      </p>
    </GuestAuthLayout>
  );
}
