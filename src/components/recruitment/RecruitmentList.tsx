import type { RecruitmentProspect } from '../../types/recruitment';
import { getRecruitmentNotesSynopsis } from '../../services/recruitmentStorage';

interface RecruitmentListProps {
  prospects: RecruitmentProspect[];
  onSelect: (prospect: RecruitmentProspect) => void;
}

export default function RecruitmentList({
  prospects,
  onSelect,
}: RecruitmentListProps) {
  if (prospects.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-crm-taupe/28 bg-crm-surface p-12 text-center">
        <p className="text-lg font-semibold text-crm-heading">No prospects yet</p>
        <p className="mt-2 text-crm-slate">
          Use the form above to add your first recruitment lead.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-crm-taupe/20 overflow-hidden rounded-3xl border border-crm-taupe/20 bg-crm-surface">
      {prospects.map((prospect) => {
        const notesSynopsis = getRecruitmentNotesSynopsis(prospect.id);

        return (
          <li key={prospect.id}>
            <button
              type="button"
              onClick={() => onSelect(prospect)}
              className="flex w-full items-start justify-between gap-4 px-6 py-5 text-left transition hover:bg-crm-taupe-50"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-crm-heading">{prospect.name}</p>
                <p className="mt-1 truncate text-sm text-crm-slate">
                  {[prospect.email, prospect.phone].filter(Boolean).join(' · ') ||
                    'No contact info yet'}
                </p>
                {notesSynopsis ? (
                  <p className="mt-2 line-clamp-2 text-sm text-crm-slate">
                    <span className="font-medium text-crm-heading/80">Notes: </span>
                    {notesSynopsis}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-crm-slate/70">No internal notes yet</p>
                )}
              </div>
              <div className="shrink-0 pt-0.5 text-right">
                {prospect.assignedUserName ? (
                  <span className="rounded-full bg-crm-indigo-50 px-3 py-1 text-xs font-medium text-crm-heading">
                    {prospect.assignedUserName}
                  </span>
                ) : (
                  <span className="text-xs text-crm-slate">Unassigned</span>
                )}
                <span className="mt-2 block text-crm-slate">→</span>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
