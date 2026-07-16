export type NoteReviewStatus = 'pending' | 'approved' | 'dismissed';

export interface NoteReviewItem {
  id: string;
  boardId: string;
  boardName: string;
  itemId: string;
  itemName: string;
  body: string;
  bodyHtml?: string;
  createdAt: string;
  authorName?: string;
  status: NoteReviewStatus;
  suggestedContactId?: string;
  suggestedContactName?: string;
  matchReason?: string;
  rejectReason?: string;
  sourceLabel?: string;
}

export interface ApprovedNoteLink {
  noteKey: string;
  contactId: string;
  boardId: string;
  boardName: string;
  itemId: string;
  itemName: string;
  body: string;
  bodyHtml?: string;
  createdAt: string;
  authorName?: string;
  sourceLabel: string;
  matchReason: string;
}

export interface NoteHarvestResult {
  scanned: number;
  queued: number;
  skipped: number;
  matchedSuggestions: number;
  autoApproved: number;
  affectedContactIds: string[];
}
