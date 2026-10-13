import type { VolunteerApplicationStatus } from '../contract/volunteerApi';
import { BackButton } from '../components/BackButton';
import { PageHeader } from '../components/FormCard';
import { StatusBadge } from '../components/StatusBadge';
import type { VolunteerStepStatus } from '../contract/volunteerApi';
import { FORMS_AND_REFERENCES_TITLE } from '../lib/nav';

interface DocumentSlot {
  id: string;
  title: string;
  hint: string;
  status: VolunteerStepStatus;
}

function slotsFor(me: VolunteerApplicationStatus): DocumentSlot[] {
  const background = me.steps.find((step) => step.id === 'background_check');
  const safeguarding = me.steps.find((step) => step.id === 'child_safeguarding');

  return [
    {
      id: 'passport',
      title: 'Passport',
      hint: 'We use this to confirm your identity before travel.',
      status: 'not_started',
    },
    {
      id: 'background',
      title: 'Background check',
      hint: 'A Sterling report or recent PDF helps us place you safely.',
      status: background?.status ?? 'not_started',
    },
    {
      id: 'safeguarding',
      title: 'Child safeguarding certificate',
      hint: 'Kaya Safeguarding Essentials shows you are ready to serve families.',
      status: safeguarding?.status ?? 'not_started',
    },
  ];
}

const GROUPS: { id: 'todo' | 'waiting' | 'complete'; title: string; match: (status: VolunteerStepStatus) => boolean }[] = [
  {
    id: 'todo',
    title: 'To do',
    match: (status) => status === 'not_started',
  },
  {
    id: 'waiting',
    title: 'Waiting',
    match: (status) => status === 'waiting' || status === 'received',
  },
  {
    id: 'complete',
    title: 'Complete',
    match: (status) => status === 'complete',
  },
];

export function DocumentsScreen({
  me,
  onBack,
}: {
  me: VolunteerApplicationStatus;
  onBack: () => void;
}) {
  const slots = slotsFor(me);

  return (
    <div>
      <BackButton onClick={onBack} />
      <PageHeader
        eyebrow={FORMS_AND_REFERENCES_TITLE}
        title={FORMS_AND_REFERENCES_TITLE}
        description="Placeholders only. Uploads are not enabled in this preview."
      />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        {GROUPS.map((group) => {
          const items = slots.filter((slot) => group.match(slot.status));
          if (items.length === 0) return null;
          return (
            <section key={group.id}>
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-navy/70">
                {group.title}
              </h2>
              <ul className="mt-3 flex flex-col gap-3">
                {items.map((slot) => (
                  <li
                    key={slot.id}
                    className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-sand/70"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-base font-semibold text-navy">{slot.title}</h3>
                      <StatusBadge status={slot.status} />
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-crm-slate">
                      Why we need this: {slot.hint}
                    </p>
                    <button
                      type="button"
                      disabled
                      className="mt-3 min-h-11 w-full rounded-xl border border-dashed border-sand px-3 text-sm font-medium text-crm-slate"
                    >
                      Upload coming soon
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
