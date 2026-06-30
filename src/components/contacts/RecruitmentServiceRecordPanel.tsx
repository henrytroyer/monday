import { isActiveRecruitmentProspect } from '../../services/recruitmentStorage';
import { isArchivedRecruitmentServiceTerm } from '../../services/contactServiceRecordStorage';
import { useServiceRecordNotes } from '../../hooks/useServiceRecordNotes';
import type { VolunteerTerm } from '../../types/volunteer';
import InternalNotesPanel from '../shared/InternalNotesPanel';

interface RecruitmentServiceRecordPanelProps {
  term: VolunteerTerm;
  contactName: string;
  onGoToRecruitment?: (prospectId: string) => void;
}

export default function RecruitmentServiceRecordPanel({
  term,
  contactName,
  onGoToRecruitment,
}: RecruitmentServiceRecordPanelProps) {
  const prospectId = term.recruitmentProspectId ?? term.itemId;
  const { notes, sending, addNote } = useServiceRecordNotes(prospectId);
  const isArchived = isArchivedRecruitmentServiceTerm(term);
  const isActiveInRecruitment = isActiveRecruitmentProspect(prospectId);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-crm-taupe/20 bg-crm-white p-4">
        <h3 className="text-sm font-semibold text-crm-heading">Summary</h3>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-crm-slate">Record type</dt>
            <dd className="font-medium">Recruitment</dd>
          </div>
          <div>
            <dt className="text-crm-slate">Status</dt>
            <dd className="font-medium">{term.status ?? 'Active prospect'}</dd>
          </div>
          <div>
            <dt className="text-crm-slate">Pipeline</dt>
            <dd className="font-medium">{term.pipelineStage ?? 'Recruitment'}</dd>
          </div>
        </dl>
        {onGoToRecruitment && isActiveInRecruitment && (
          <button
            type="button"
            onClick={() => onGoToRecruitment(prospectId)}
            className="mt-4 rounded-xl bg-crm-indigo px-4 py-2 text-sm font-medium text-white transition hover:bg-crm-indigo-dark"
          >
            View in Recruitment
          </button>
        )}
        {isArchived && (
          <p className="mt-4 text-sm text-crm-slate">
            Removed from the Recruitment pipeline. This service record and its
            notes are kept on the contact.
          </p>
        )}
      </section>

      <InternalNotesPanel
        description={
          isArchived
            ? `Archived recruitment service record for ${contactName}. Internal notes are preserved here.`
            : `Service record notes for ${contactName}. Shared with Recruitment for this prospect.`
        }
        notes={notes}
        sending={sending}
        onAdd={addNote}
        fileInputId={`contact-service-record-notes-${prospectId}`}
      />
    </div>
  );
}
