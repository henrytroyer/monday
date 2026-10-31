import { BackButton } from '../components/BackButton';
import { FormCard, PageHeader } from '../components/FormCard';
import { teamTrainingDetails } from '../lib/teamTraining';

export function TeamTrainingScreen({ onBack }: { onBack: () => void }) {
  const details = teamTrainingDetails();

  return (
    <div>
      <BackButton onClick={onBack} />
      <PageHeader eyebrow="Team Training" title="Training details" description={details.summary} />
      <div className="mx-auto w-full max-w-3xl">
        <FormCard>
          <dl className="grid gap-5 sm:grid-cols-2">
            <Detail label="When" value={details.dates} />
            <Detail label="Length" value={details.length} />
            <Detail label="Where" value={details.place} />
            <Detail label="Included" value={details.lodging} />
          </dl>
        </FormCard>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-navy/70">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-navy">{value}</dd>
    </div>
  );
}
