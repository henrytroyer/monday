export interface RecruitmentPriorTerm {
  timelineLabel: string;
  pipelineStage?: string;
  status?: string;
}

export interface RecruitmentProspect {
  id: string;
  name: string;
  email: string;
  phone: string;
  assignedUserId: string | null;
  assignedUserName: string | null;
  sourceContactId: string | null;
  priorServiceTerms: RecruitmentPriorTerm[];
  createdAt: string;
  updatedAt: string;
}

export interface RecruitmentNoteAttachment {
  fileName: string;
  mimeType: string;
  dataUrl: string;
  sizeBytes: number;
}

export interface RecruitmentNote {
  id: string;
  prospectId: string;
  body: string;
  authorName?: string;
  createdAt: string;
  attachment?: RecruitmentNoteAttachment;
}

export interface TeamMember {
  id: string;
  name: string;
}

export type RecruitmentProspectInput = Pick<
  RecruitmentProspect,
  'name' | 'email' | 'phone'
>;
