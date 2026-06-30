import type { LongtermFieldLocation } from '../constants/longtermFieldLocations';
import type { LongtermStatus } from '../constants/longtermApplicationStatuses';
import type { Volunteer } from './volunteer';

export interface LongtermVolunteer extends Volunteer {
  onField: boolean;
  fieldLocation?: LongtermFieldLocation;
}

export interface LongtermPipelineSection {
  stage: LongtermStatus | LongtermFieldLocation;
  volunteers: LongtermVolunteer[];
}

export type LongtermViewMode = 'pipeline' | 'on-field';
