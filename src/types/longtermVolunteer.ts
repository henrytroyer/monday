import type { LongtermFieldLocation } from '../constants/longtermFieldLocations';
import type { LongtermStatus } from '../constants/longtermApplicationStatuses';
import type { Volunteer } from './volunteer';

export interface LongtermVolunteer extends Volunteer {
  onField: boolean;
  fieldLocation?: LongtermFieldLocation;
  /** Used to detect and merge married couples from separate monday items. */
  maritalStatus?: string;
  birthDate?: string;
  homeAddress?: string;
  familyMembersText?: string;
  email?: string;
  /** Partner monday item when this row represents a merged couple. */
  partnerItemId?: string;
  /** When set, this item is hidden from lists — merged into another row. */
  mergedIntoItemId?: string;
}

export interface LongtermPipelineSection {
  stage: LongtermStatus | LongtermFieldLocation;
  volunteers: LongtermVolunteer[];
}

export type LongtermViewMode = 'pipeline' | 'on-field';
