import type { LongtermReferenceType } from '../constants/longtermReferenceSlots';
import type { ApplicationFormField } from './volunteer';

export type LongtermReferenceStatus =
  | 'placeholder'
  | 'sent'
  | 'received'
  | 'pending_review'
  | 'approved'
  | 'needs_review';

export type LongtermReferenceReviewStatus = 'approved' | 'needs_review';

export interface LongtermReferenceSlot {
  slotIndex: number;
  type: LongtermReferenceType;
  status: LongtermReferenceStatus;
  slotLabel?: string;
  refereeName?: string;
  refereeEmail?: string;
  mondayItemId?: string;
  mondayBoardId?: string;
  emailSentAt?: string;
  receivedAt?: string;
  reviewStatus?: LongtermReferenceReviewStatus;
  formFields?: ApplicationFormField[];
}
