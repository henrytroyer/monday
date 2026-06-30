import { useMemo, useState } from 'react';
import {
  findProspectByContactId,
  migrateContactToRecruitment,
} from '../../services/recruitmentStorage';
import type { ContactDetail } from '../../types/contact';

interface ContactMigrationActionsProps {
  detail: ContactDetail;
  onGoToRecruitment?: (prospectId: string) => void;
}

export default function ContactMigrationActions({
  detail,
  onGoToRecruitment,
}: ContactMigrationActionsProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [lastProspectId, setLastProspectId] = useState<string | null>(null);

  const existingProspect = useMemo(
    () => findProspectByContactId(detail.id),
    [detail.id, lastProspectId],
  );

  const handleCreateInRecruitment = () => {
    const { prospect } = migrateContactToRecruitment(detail);
    setLastProspectId(prospect.id);
    setMessage(
      `${detail.name} was added to Recruitment with contact info prefilled.`,
    );
  };

  return (
    <>
      {existingProspect ? (
        onGoToRecruitment && (
          <button
            type="button"
            onClick={() => onGoToRecruitment(existingProspect.id)}
            className="rounded-xl bg-crm-indigo px-4 py-2 text-sm font-medium text-white transition hover:bg-crm-indigo-dark"
          >
            View in Recruitment
          </button>
        )
      ) : (
        <button
          type="button"
          onClick={handleCreateInRecruitment}
          className="rounded-xl bg-crm-indigo px-4 py-2 text-sm font-medium text-white transition hover:bg-crm-indigo-dark"
        >
          Create in Recruitment
        </button>
      )}

      {message && (
        <p className="w-full text-sm text-crm-slate" role="status">
          {message}
          {lastProspectId && onGoToRecruitment && (
            <>
              {' '}
              <button
                type="button"
                onClick={() => onGoToRecruitment(lastProspectId)}
                className="font-medium text-crm-heading underline-offset-2 hover:underline"
              >
                View in Recruitment →
              </button>
            </>
          )}
        </p>
      )}

      {existingProspect && !message && (
        <p className="w-full text-sm text-crm-slate">
          Already in Recruitment
          {existingProspect.priorServiceTerms.length > 0 &&
            ` · ${existingProspect.priorServiceTerms.length} prior service record(s) on file`}
          .
        </p>
      )}
    </>
  );
}
