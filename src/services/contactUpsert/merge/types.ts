/**
 * types.ts — Shared contact merge engine types.
 * Used by CRM manual merge and the daily merge job.
 */

import type { ContactListItem, ContactTag } from '../../../types/contact';

export type MergeReason = 'EXACT_EMAIL' | 'EXACT_NAME';

export type MergeReviewReason =
  | 'EXACT_EMAIL_DIFF_NAME'
  | 'EXACT_NAME_EMAIL_CONFLICT'
  | 'SIMILAR_NAME_ONLY'
  | 'SPELLING_VARIANT'
  | 'OVERSIZE_GROUP'
  | 'HARD_CONFLICT'
  | 'LOCKED'
  | 'RELATION_FAIL'
  | 'WRITE_FAIL'
  | 'HIGH_VOLUME'
  | 'PHONE_DOB_ONLY';

export type MergeDisposition = 'auto' | 'review';

export type MergeSource = 'MANUAL' | 'DAILY_JOB';

export interface MergeFieldConflict {
  field: string;
  survivorValue: string;
  loserValue: string;
  loserId: string;
}

export interface SurvivorScoreBreakdown {
  contactId: string;
  total: number;
  populatedFields: number;
  linkedRecords: number;
  tags: number;
  coupleBonus: number;
  demographics: number;
  extras: number;
}

export interface DuplicateGroupCandidate {
  key: string;
  reasons: MergeReason[];
  contacts: ContactListItem[];
  suggestedSurvivorId: string;
  scoreBreakdown: SurvivorScoreBreakdown[];
}

export interface ClassifiedDuplicateGroup extends DuplicateGroupCandidate {
  disposition: MergeDisposition;
  reviewReasons: MergeReviewReason[];
  survivor: ContactListItem;
  losers: ContactListItem[];
}

export interface FieldMergePlan {
  resultingName: string;
  resultingEmail: string;
  resultingAltEmail?: string;
  resultingTags: ContactTag[];
  phone?: string;
  spouseName?: string;
  connectedTo?: string;
  demographics: {
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  conflicts: MergeFieldConflict[];
  namesDiffer: boolean;
  willUpdatePastor: boolean;
  willUpdateParents: boolean;
  connectedVolunteerNames: string[];
  oldestCreatedAt?: string;
  newestUpdatedAt?: string;
}

/** Scalar profile fields the reviewer can keep/delete per value. */
export type MergeScalarFieldKey =
  | 'name'
  | 'email'
  | 'altEmail'
  | 'phone'
  | 'spouseName'
  | 'connectedTo'
  | 'address'
  | 'city'
  | 'state'
  | 'zip'
  | 'country';

/**
 * Optional reviewer overrides applied on top of buildFieldMergePlan().
 * Omitted keys keep the engine recommendation (richest survivor / fill-gap).
 */
export interface FieldMergeOverrides {
  resultingName?: string;
  resultingEmail?: string;
  resultingAltEmail?: string;
  resultingTags?: ContactTag[];
  phone?: string;
  spouseName?: string;
  connectedTo?: string;
  demographics?: {
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  /** Contact id used for pastor reference sync (must be pastor-tagged). */
  pastorSourceId?: string;
  /** Contact id used for parent field sync (must be parent-tagged). */
  parentSourceId?: string;
}

export interface MergeFieldValueOption {
  contactId: string;
  contactName: string;
  value: string;
}

export interface MergeFieldChoice {
  key: MergeScalarFieldKey;
  label: string;
  /** True when 2+ distinct non-empty values exist across the merge set. */
  needsChoice: boolean;
  options: MergeFieldValueOption[];
  /** Engine recommendation (matches FieldMergePlan). */
  recommendedValue: string;
  /** Display-only when !needsChoice. */
  resolvedValue: string;
}

export interface MergeTagChoice {
  needsChoice: boolean;
  /** Union of all tags — default selection. */
  recommendedTags: ContactTag[];
  /** Tags present on each contact (for pick-from-contact). */
  byContact: Array<{
    contactId: string;
    contactName: string;
    tags: ContactTag[];
  }>;
}

export interface MergeSourceChoice {
  kind: 'pastor' | 'parent';
  label: string;
  needsChoice: boolean;
  options: Array<{ contactId: string; contactName: string }>;
  recommendedContactId: string;
}

export interface MergeFieldChoices {
  fields: MergeFieldChoice[];
  tags: MergeTagChoice;
  pastorSource?: MergeSourceChoice;
  parentSource?: MergeSourceChoice;
}

export interface RelationMergePlan {
  columnTitle: string;
  survivorLinkedIds: string[];
  addedIds: string[];
}

export interface MergeExecutionPlan {
  group: ClassifiedDuplicateGroup;
  fieldPlan: FieldMergePlan;
  relationPlans: RelationMergePlan[];
  idempotencyKey: string;
}

export interface MergeAuditRecord {
  auditId: string;
  jobRunId?: string;
  survivorId: string;
  loserIds: string[];
  reasons: MergeReason[];
  normalizedEmail?: string | null;
  normalizedName?: string | null;
  scoreBreakdown: SurvivorScoreBreakdown[];
  fieldsCopied: string[];
  fieldConflicts: MergeFieldConflict[];
  tagsAdded: ContactTag[];
  relationsReassigned: RelationMergePlan[];
  beforeState: {
    survivor: ContactListItem;
    losers: ContactListItem[];
  };
  source: MergeSource;
  actorEmail?: string;
  actorName?: string;
  timestamp: string;
  result: 'success' | 'failed' | 'reversed';
  reversalStatus: 'none' | 'reversed';
  idempotencyKey: string;
}

export interface MergeRunReport {
  jobRunId: string;
  startedAt: string;
  finishedAt?: string;
  mode: 'live' | 'dry_run' | 'report_only';
  source: MergeSource;
  contactsScanned: number;
  groupsDetected: number;
  groupsAutoMerged: number;
  contactsArchived: number;
  reviewGroupsCreated: number;
  skippedGroups: number;
  lockedSkipped: number;
  failedGroups: number;
  fieldConflictCount: number;
  highVolumeTriggered: boolean;
  overrideUsed: boolean;
  checkpoint?: string | null;
  durationMs?: number;
  groups: Array<{
    key: string;
    disposition: MergeDisposition;
    reviewReasons: MergeReviewReason[];
    survivorId?: string;
    loserIds: string[];
    reasons: MergeReason[];
    error?: string;
  }>;
}

export interface MergeOpsConfig {
  maxGroupSize: number;
  maxArchivePerRun: number;
  highVolumeThreshold: number;
  reportOnly: boolean;
  batchDelayMs: number;
  maxRetries: number;
}

export interface DuplicateReviewItem {
  id: string;
  createdAt: string;
  status: 'pending' | 'merged' | 'dismissed';
  key: string;
  contactIds: string[];
  contactNames: string[];
  reasons: MergeReason[];
  reviewReasons: MergeReviewReason[];
  suggestedSurvivorId: string;
  scoreBreakdown: SurvivorScoreBreakdown[];
  normalizedEmail?: string | null;
  normalizedName?: string | null;
  jobRunId?: string;
  notes?: string;
}

export const DEFAULT_MERGE_OPS_CONFIG: MergeOpsConfig = {
  maxGroupSize: 10,
  maxArchivePerRun: 50,
  highVolumeThreshold: 100,
  reportOnly: true,
  batchDelayMs: 120,
  maxRetries: 2,
};
