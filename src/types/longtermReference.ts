import type { LongtermReferenceType } from '../constants/longtermReferenceSlots';
import type { ApplicationFormField } from './volunteer';

export type LongtermReferenceStatus = 'pending' | 'received';

export interface LongtermReferenceSlot {
  slotIndex: number;
  type: LongtermReferenceType;
  status: LongtermReferenceStatus;
  refereeName?: string;
  refereeEmail?: string;
  receivedAt?: string;
  formFields?: ApplicationFormField[];
}
