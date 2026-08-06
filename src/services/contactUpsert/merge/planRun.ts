/**
 * planRun.ts — Pure planning for a merge run (dry-run safe).
 */

import type { ContactListItem } from '../../../types/contact';
import { classifyAllGroups } from './classifyGroup';
import { loadMergeOpsConfig } from './config';
import { buildFieldMergePlan, buildIdempotencyKey } from './fieldMergePlan';
import { findDuplicateGroupCandidates } from './groupDuplicates';
import { getLockedContactIds } from './locks';
import {
  normalizeEmailForMerge,
  normalizeNameForMerge,
} from './normalize';
import { enqueueDuplicateReview } from './reviewStorage';
import type {
  ClassifiedDuplicateGroup,
  MergeExecutionPlan,
  MergeOpsConfig,
  MergeRunReport,
  MergeSource,
} from './types';

export function planMergeRun(
  contacts: ContactListItem[],
  options: {
    config?: Partial<MergeOpsConfig>;
    source?: MergeSource;
    jobRunId?: string;
    overrideHighVolume?: boolean;
    enqueueReviews?: boolean;
  } = {},
): {
  config: MergeOpsConfig;
  classified: ClassifiedDuplicateGroup[];
  autoPlans: MergeExecutionPlan[];
  projectedArchives: number;
  highVolumeTriggered: boolean;
  report: MergeRunReport;
} {
  const config = loadMergeOpsConfig(options.config);
  const lockedIds = getLockedContactIds();
  const candidates = findDuplicateGroupCandidates(contacts);
  const classified = classifyAllGroups(candidates, config, lockedIds);

  const autoGroups = classified.filter((g) => g.disposition === 'auto');
  const reviewGroups = classified.filter((g) => g.disposition === 'review');

  let projectedArchives = autoGroups.reduce(
    (sum, g) => sum + g.losers.length,
    0,
  );
  let highVolumeTriggered = false;

  if (
    projectedArchives > config.highVolumeThreshold &&
    !options.overrideHighVolume
  ) {
    highVolumeTriggered = true;
    for (const group of autoGroups) {
      group.disposition = 'review';
      group.reviewReasons = [...group.reviewReasons, 'HIGH_VOLUME'];
    }
    projectedArchives = 0;
  }

  const finalAuto = classified.filter((g) => g.disposition === 'auto');
  const finalReview = classified.filter((g) => g.disposition === 'review');

  if (options.enqueueReviews !== false) {
    for (const group of finalReview) {
      if (group.disposition === 'ignore') continue;
      enqueueDuplicateReview({
        key: group.key,
        contactIds: group.contacts.map((c) => c.id),
        contactNames: group.contacts.map((c) => c.name),
        reasons: group.reasons,
        reviewReasons: group.reviewReasons,
        suggestedSurvivorId: group.suggestedSurvivorId,
        scoreBreakdown: group.scoreBreakdown,
        normalizedEmail: normalizeEmailForMerge(group.contacts[0]?.email),
        normalizedName: normalizeNameForMerge(group.survivor.name),
        jobRunId: options.jobRunId,
        notes: group.reviewReasons.join(', '),
      });
    }
  }

  const autoPlans: MergeExecutionPlan[] = [];
  let archiveBudget = config.maxArchivePerRun;
  for (const group of finalAuto) {
    // Single group larger than the per-run cap → review (too risky).
    if (group.losers.length > config.maxArchivePerRun) {
      group.disposition = 'review';
      group.reviewReasons = [...group.reviewReasons, 'OVERSIZE_GROUP'];
      if (options.enqueueReviews !== false) {
        enqueueDuplicateReview({
          key: group.key,
          contactIds: group.contacts.map((c) => c.id),
          contactNames: group.contacts.map((c) => c.name),
          reasons: group.reasons,
          reviewReasons: group.reviewReasons,
          suggestedSurvivorId: group.suggestedSurvivorId,
          scoreBreakdown: group.scoreBreakdown,
          jobRunId: options.jobRunId,
          notes: 'Group exceeds MERGE_MAX_ARCHIVE_PER_RUN',
        });
      }
      continue;
    }
    // Budget exhausted for this run — leave remaining autos for the next run.
    if (group.losers.length > archiveBudget) {
      continue;
    }
    archiveBudget -= group.losers.length;
    const fieldPlan = buildFieldMergePlan(
      group.survivor,
      group.losers,
      contacts,
    );
    autoPlans.push({
      group,
      fieldPlan,
      relationPlans: [],
      idempotencyKey: buildIdempotencyKey(
        group.survivor.id,
        group.losers.map((l) => l.id),
        group.reasons,
      ),
    });
  }

  const jobRunId =
    options.jobRunId ??
    `merge-run-${new Date().toISOString()}-${Math.random().toString(36).slice(2, 7)}`;

  const report: MergeRunReport = {
    jobRunId,
    startedAt: new Date().toISOString(),
    mode: config.reportOnly ? 'report_only' : 'live',
    source: options.source ?? 'DAILY_JOB',
    contactsScanned: contacts.length,
    groupsDetected: classified.length,
    groupsAutoMerged: 0,
    contactsArchived: 0,
    reviewGroupsCreated: finalReview.length,
    skippedGroups: 0,
    lockedSkipped: classified.filter((g) =>
      g.reviewReasons.includes('LOCKED'),
    ).length,
    failedGroups: 0,
    fieldConflictCount: autoPlans.reduce(
      (sum, p) => sum + p.fieldPlan.conflicts.length,
      0,
    ),
    highVolumeTriggered,
    overrideUsed: Boolean(options.overrideHighVolume),
    checkpoint: null,
    groups: classified.map((g) => ({
      key: g.key,
      disposition: g.disposition,
      reviewReasons: g.reviewReasons,
      survivorId: g.survivor.id,
      loserIds: g.losers.map((l) => l.id),
      reasons: g.reasons,
    })),
  };

  return {
    config,
    classified,
    autoPlans,
    projectedArchives: autoPlans.reduce(
      (sum, p) => sum + p.group.losers.length,
      0,
    ),
    highVolumeTriggered,
    report,
  };
}
