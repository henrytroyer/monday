/**
 * index.ts — Public API for the shared contact merge engine.
 */

export {
  normalizeEmailForMerge,
  normalizeNameForMerge,
  namesEqualForMerge,
  emailsEqualForMerge,
  namesRelatedForMerge,
  allNamesRelatedForMerge,
  nameTokensForMerge,
} from './normalize';
export {
  findDuplicateGroupCandidates,
  resolveOverlappingGroups,
} from './groupDuplicates';
export {
  classifyDuplicateGroup,
  classifyAllGroups,
} from './classifyGroup';
export {
  scoreContact,
  pickSurvivor,
  pickRichestName,
  pickPastorSource,
  pickParentSource,
  looksLikeCoupleName,
} from './survivorScore';
export {
  combineEmails,
  buildFieldMergePlan,
  findConnectedVolunteers,
  buildIdempotencyKey,
} from './fieldMergePlan';
export {
  buildMergeFieldChoices,
  defaultSelectionsFromChoices,
  selectionsToFieldOverrides,
  applyFieldMergeOverrides,
  recomputeAltEmailForPrimary,
  readMergeFieldValue,
} from './fieldMergeChoices';
export { planRelationUnion, MERGE_RELATION_COLUMNS } from './relationPlan';
export { planMergeRun } from './planRun';
export { executeMerge } from './executeMerge';
export type { ExecuteMergeOptions, ExecuteMergeResult } from './executeMerge';
export { undoMerge } from './undoMerge';
export { loadMergeOpsConfig } from './config';
export {
  acquireMergeLock,
  releaseMergeLock,
  acquireRunLock,
  releaseRunLock,
  getLockedContactIds,
} from './locks';
export {
  listDuplicateReviewItems,
  countPendingDuplicateReviews,
  enqueueDuplicateReview,
  updateDuplicateReviewStatus,
  dismissDuplicatePair,
  isDuplicatePairDismissed,
} from './reviewStorage';
export {
  saveMergeRunReport,
  listMergeRunReports,
  saveMergeAudit,
  listMergeAudits,
  markMergeAuditReversed,
} from './reportStorage';
export type {
  MergeReason,
  MergeReviewReason,
  MergeDisposition,
  MergeSource,
  MergeFieldConflict,
  SurvivorScoreBreakdown,
  DuplicateGroupCandidate,
  ClassifiedDuplicateGroup,
  FieldMergePlan,
  FieldMergeOverrides,
  MergeScalarFieldKey,
  MergeFieldChoice,
  MergeFieldChoices,
  MergeFieldValueOption,
  MergeTagChoice,
  MergeSourceChoice,
  RelationMergePlan,
  MergeExecutionPlan,
  MergeAuditRecord,
  MergeRunReport,
  MergeOpsConfig,
  DuplicateReviewItem,
} from './types';
export { DEFAULT_MERGE_OPS_CONFIG } from './types';
