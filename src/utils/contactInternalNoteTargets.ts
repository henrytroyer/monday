import type {
  ContactInternalNote,
  ContactInternalNoteTarget,
  CurrentApplicationSummary,
} from '../types/contact';
import type { VolunteerTerm } from '../types/volunteer';
import { isRecruitmentServiceTerm } from '../services/contactServiceRecordStorage';

const CONTACT_NOTE_TARGET = {
  kind: 'contact' as const,
  sourceLabel: 'Contact',
};

export function buildContactInternalNoteTargets(
  serviceTerms: VolunteerTerm[],
): ContactInternalNoteTarget[] {
  const termTargets = serviceTerms.map((term) => {
    if (isRecruitmentServiceTerm(term)) {
      return {
        kind: 'recruitment' as const,
        prospectId: term.recruitmentProspectId ?? term.itemId,
        sourceLabel: term.timelineLabel || 'Recruitment',
      };
    }
    return {
      kind: 'term' as const,
      itemId: term.itemId,
      timelineId: term.timelineId,
      sourceLabel: term.timelineLabel,
    };
  });

  return [CONTACT_NOTE_TARGET, ...termTargets];
}

export function defaultContactInternalNoteTarget(
  targets: ContactInternalNoteTarget[],
  currentApplication: CurrentApplicationSummary | null,
): ContactInternalNoteTarget {
  const contactTarget =
    targets.find((target) => target.kind === 'contact') ?? CONTACT_NOTE_TARGET;

  if (currentApplication) {
    const current = targets.find(
      (target) =>
        target.kind === 'term' && target.itemId === currentApplication.itemId,
    );
    if (current) return current;
  }

  const recruitment = targets.find((target) => target.kind === 'recruitment');
  if (recruitment) return recruitment;

  return contactTarget;
}

export function targetKey(target: ContactInternalNoteTarget): string {
  if (target.kind === 'contact') {
    return 'contact';
  }
  if (target.kind === 'recruitment') {
    return `recruitment:${target.prospectId}`;
  }
  return `term:${target.itemId}:${target.timelineId}`;
}

export function noteMatchesTarget(
  note: ContactInternalNote,
  target: ContactInternalNoteTarget,
): boolean {
  if (target.kind === 'contact') {
    return note.source === 'contact';
  }
  if (target.kind === 'recruitment') {
    return (
      note.source === 'recruitment' &&
      note.recruitmentProspectId === target.prospectId
    );
  }
  return (
    note.source === 'term' &&
    note.applicationItemId === target.itemId &&
    note.timelineId === target.timelineId
  );
}
