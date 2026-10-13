import { useState, type FormEvent } from 'react';
import type { VolunteerApplicationStatus } from '../contract/volunteerApi';
import { BackButton } from '../components/BackButton';
import { TextField } from '../components/Field';
import { FormCard, PageHeader } from '../components/FormCard';
import {
  COORDINATOR_EMAIL,
  LONG_TERM_COMPARE,
  LONG_TERM_INTRO,
  LONG_TERM_PATHS,
} from '../lib/volunteerGuide';

export function LongTermScreen({
  me,
  onBack,
}: {
  me?: VolunteerApplicationStatus;
  onBack: () => void;
}) {
  const [name, setName] = useState(me?.name ?? '');
  const [email, setEmail] = useState(me?.email ?? '');
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSent(true);
  }

  return (
    <div>
      <BackButton onClick={onBack} />
      <PageHeader
        eyebrow="Long-term"
        title="Long-term application"
        description={LONG_TERM_INTRO}
      />

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        {me ? (
          <p className="rounded-xl border border-navy/15 bg-crm-indigo-50 px-4 py-3 text-sm text-navy">
            Your history with i58: {me.name} · {me.term} · {me.location}
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          {LONG_TERM_PATHS.map((path) => (
            <article
              key={path.title}
              className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-sand/70"
            >
              <h2 className="font-semibold text-navy">{path.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-crm-slate">
                {path.detail}
              </p>
            </article>
          ))}
        </div>

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-sand/70">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-navy/70">
            How this differs from short-term
          </h2>
          <dl className="mt-4 space-y-3">
            {LONG_TERM_COMPARE.map((row) => (
              <div key={row.label} className="grid gap-1 sm:grid-cols-3 sm:gap-3">
                <dt className="text-sm font-medium text-navy">{row.label}</dt>
                <dd className="text-sm text-crm-slate">Short-term: {row.shortTerm}</dd>
                <dd className="text-sm text-crm-slate">Long-term: {row.longTerm}</dd>
              </div>
            ))}
          </dl>
        </section>

        <FormCard onSubmit={handleSubmit}>
          <h2 className="text-lg font-semibold text-navy">I’m interested</h2>
          <p className="mt-1 text-sm text-crm-slate">
            Preview only. This does not send to Monday. You can also email{' '}
            <a className="underline" href={`mailto:${COORDINATOR_EMAIL}`}>
              {COORDINATOR_EMAIL}
            </a>
            .
          </p>
          <div className="mt-5 flex flex-col gap-4">
            <TextField
              label="Name"
              id="lt-name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <TextField
              label="Email"
              id="lt-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <label className="flex flex-col gap-2 text-sm font-medium text-navy" htmlFor="lt-note">
              What are you considering?
              <textarea
                id="lt-note"
                rows={4}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className="min-h-24 rounded-xl border border-sand bg-white px-3 py-2 text-base font-normal text-crm-text outline-none focus:border-navy focus:ring-2 focus:ring-navy/15"
              />
            </label>
            <button
              type="submit"
              className="min-h-11 rounded-full bg-navy px-4 text-base font-semibold text-white hover:bg-navy-dark"
            >
              Request an application
            </button>
            {sent ? (
              <p role="status" className="text-sm text-navy">
                Noted in this preview. A coordinator will follow up when this
                portal is connected.
              </p>
            ) : null}
          </div>
        </FormCard>
      </div>
    </div>
  );
}
