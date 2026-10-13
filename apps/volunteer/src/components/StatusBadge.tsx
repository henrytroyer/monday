import type {
  VolunteerStepAudience,
  VolunteerStepStatus,
} from '../contract/volunteerApi';
import { warmerStatusLabel } from '../lib/journey';

export function StatusBadge({
  status,
  audience = 'volunteer',
}: {
  status: VolunteerStepStatus;
  audience?: VolunteerStepAudience;
}) {
  const tone =
    status === 'complete'
      ? 'bg-crm-indigo-100 text-crm-indigo-dark'
      : status === 'received'
        ? 'bg-crm-taupe-100 text-crm-heading'
        : status === 'waiting'
          ? 'bg-crm-terracotta/15 text-crm-terracotta'
          : 'bg-crm-white text-crm-slate';

  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>
      {warmerStatusLabel(status, audience)}
    </span>
  );
}
