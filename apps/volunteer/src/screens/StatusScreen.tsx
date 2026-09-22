import type {
  VolunteerApplicationStatus,
  VolunteerStep,
  VolunteerStepAudience,
  VolunteerStepStatus,
} from '../contract/volunteerApi';

interface StatusScreenProps {
  me: VolunteerApplicationStatus;
  onSignOut: () => void;
}

const STATUS_LABEL: Record<VolunteerStepStatus, string> = {
  not_started: 'Not started',
  waiting: 'Waiting',
  received: 'Received',
  complete: 'Complete',
};

const AUDIENCE_LABEL: Record<VolunteerStepAudience, string> = {
  volunteer: 'Your step',
  staff: 'Handled by staff',
  system: 'Handled by i58',
};

export function StatusScreen({ me, onSignOut }: StatusScreenProps) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8 sm:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-crm-slate">
          Short-term status
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{me.name}</h1>
        <p className="mt-1 text-sm text-crm-slate">{me.email}</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-crm-taupe/25 bg-crm-surface px-3 py-3">
            <dt className="text-xs uppercase tracking-wide text-crm-slate">Term</dt>
            <dd className="mt-1 font-medium text-crm-heading">{me.term}</dd>
          </div>
          <div className="rounded-xl border border-crm-taupe/25 bg-crm-surface px-3 py-3">
            <dt className="text-xs uppercase tracking-wide text-crm-slate">Location</dt>
            <dd className="mt-1 font-medium text-crm-heading">{me.location}</dd>
          </div>
        </dl>
      </header>

      <ol className="flex flex-col gap-3">
        {me.steps.map((step) => (
          <li key={step.id}>
            <StepCard step={step} />
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={onSignOut}
        className="mt-8 min-h-12 rounded-xl border border-crm-taupe/30 bg-white px-4 text-sm font-medium text-crm-heading transition hover:border-crm-slate"
      >
        Use a different email
      </button>
    </div>
  );
}

function StepCard({ step }: { step: VolunteerStep }) {
  return (
    <article className="rounded-2xl border border-crm-taupe/25 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-snug">{step.title}</h2>
          <p className="mt-1 text-xs text-crm-slate">{AUDIENCE_LABEL[step.audience]}</p>
        </div>
        <StatusBadge status={step.status} />
      </div>
      {step.youDo ? (
        <p className="mt-3 text-sm leading-relaxed text-crm-text">
          <span className="font-medium text-crm-heading">You do: </span>
          {step.youDo}
        </p>
      ) : (
        <p className="mt-3 text-sm text-crm-slate">Nothing for you to do on this step.</p>
      )}
    </article>
  );
}

function StatusBadge({ status }: { status: VolunteerStepStatus }) {
  const tone =
    status === 'complete'
      ? 'bg-crm-indigo-100 text-crm-indigo-dark'
      : status === 'received'
        ? 'bg-crm-taupe-100 text-crm-heading'
        : status === 'waiting'
          ? 'bg-crm-terracotta/15 text-crm-terracotta'
          : 'bg-crm-white text-crm-slate';

  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
