import type { RecruitmentNoteAttachment } from './recruitment';

export interface ServiceRecordNote {
  id: string;
  serviceRecordId: string;
  body: string;
  authorName?: string;
  createdAt: string;
  attachment?: RecruitmentNoteAttachment;
}
