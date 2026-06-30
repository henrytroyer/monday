import { useRecruitmentNotes } from '../../hooks/useRecruitmentNotes';
import InternalNotesPanel from '../shared/InternalNotesPanel';

interface RecruitmentNotesSectionProps {
  prospectId: string;
  prospectName: string;
  sourceContactId?: string | null;
}

export default function RecruitmentNotesSection({
  prospectId,
  prospectName,
  sourceContactId,
}: RecruitmentNotesSectionProps) {
  const { notes, sending, addNote } = useRecruitmentNotes(prospectId);

  return (
    <InternalNotesPanel
      description={`Private notes for ${prospectName}. Only visible to your team in this CRM.`}
      notes={notes}
      sending={sending}
      onAdd={addNote}
      fileInputId={`recruitment-note-file-${prospectId}`}
      linkedHint={
        sourceContactId
          ? 'Linked to this contact’s Recruitment service record. Notes sync between Contacts and Recruitment.'
          : undefined
      }
    />
  );
}
