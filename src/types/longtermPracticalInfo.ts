/**
 * longtermPracticalInfo.ts — Structured ops fields for on-field long-term volunteers.
 * Persisted on Portal Things (Payload JSON); localStorage is a cache.
 */

export type LongtermVisaType =
  | 'Volunteer'
  | 'Digital Nomad'
  | 'Financially Independent'
  | 'Golden Visa';

export interface LongtermBudgetFile {
  fileName: string;
  mimeType: string;
  dataUrl: string;
  sizeBytes: number;
}

export interface LongtermPracticalInfo {
  volunteerId: string;
  housingLocation: string | null;
  visaType: LongtermVisaType | null;
  usesI58Vehicle: boolean | null;
  budgetLink: string | null;
  budgetFile: LongtermBudgetFile | null;
  updatedAt: string;
}

export interface PortalSettingsPayload {
  longtermHousingOptions?: string[];
}
