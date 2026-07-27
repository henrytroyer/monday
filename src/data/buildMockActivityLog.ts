import { MOCK_RECRUITMENT_DEMOS } from './mockRecruitment';
import { getRecruitmentProspectsRaw } from '../services/recruitmentStorage';
import { getServiceRecordNotes } from '../services/serviceRecordNoteStorage';
import { getLocalActivityLog } from '../services/localActivityLog';
import type { PageId } from '../components/layout/AppSidebar';
import type { CrmActivityEvent } from '../types/activityLog';

function noteToEvent(
  note: { id: string; body: string; createdAt: string; authorName?: string },
  options: {
    entityType: CrmActivityEvent['entityType'];
    entityId: string;
    entityName?: string;
    navigatePage: PageId;
    summaryPrefix: string;
  },
): CrmActivityEvent {
  return {
    id: `mock-note-${note.id}`,
    occurredAt: note.createdAt,
    actorName: note.authorName?.trim() || 'Coordinator',
    category: 'comment',
    entityType: options.entityType,
    entityId: options.entityId,
    entityName: options.entityName,
    summary: options.summaryPrefix,
    detail: note.body.trim().slice(0, 120) || undefined,
    navigateTo: { page: options.navigatePage, focusId: options.entityId },
  };
}

function collectRecruitmentEvents(): CrmActivityEvent[] {
  const events: CrmActivityEvent[] = [];
  const prospects = getRecruitmentProspectsRaw();

  for (const prospect of prospects) {
    events.push({
      id: `mock-recruitment-created-${prospect.id}`,
      occurredAt: prospect.createdAt,
      actorName: prospect.assignedUserName ?? 'Coordinator',
      category: 'created',
      entityType: 'recruitment',
      entityId: prospect.id,
      entityName: prospect.name,
      summary: `Created recruitment prospect "${prospect.name}"`,
      navigateTo: { page: 'recruitment', focusId: prospect.id },
    });

    if (prospect.updatedAt && prospect.updatedAt !== prospect.createdAt) {
      events.push({
        id: `mock-recruitment-updated-${prospect.id}-${prospect.updatedAt}`,
        occurredAt: prospect.updatedAt,
        actorName: prospect.assignedUserName ?? 'Coordinator',
        category: 'updated',
        entityType: 'recruitment',
        entityId: prospect.id,
        entityName: prospect.name,
        summary: `Updated recruitment prospect "${prospect.name}"`,
        navigateTo: { page: 'recruitment', focusId: prospect.id },
      });
    }

    for (const note of getServiceRecordNotes(prospect.id)) {
      events.push(
        noteToEvent(note, {
          entityType: 'recruitment',
          entityId: prospect.id,
          entityName: prospect.name,
          navigatePage: 'recruitment',
          summaryPrefix: `Added recruitment note on "${prospect.name}"`,
        }),
      );
    }
  }

  for (const demo of MOCK_RECRUITMENT_DEMOS) {
    for (const note of demo.notes) {
      events.push(
        noteToEvent(note, {
          entityType: 'recruitment',
          entityId: demo.prospect.id,
          entityName: demo.prospect.name,
          navigatePage: 'recruitment',
          summaryPrefix: `Added recruitment note on "${demo.prospect.name}"`,
        }),
      );
    }
  }

  return events;
}

function collectTermNoteEvents(): CrmActivityEvent[] {
  const events: CrmActivityEvent[] = [];
  const prefix = 'crm-term-notes:';

  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key?.startsWith(prefix)) continue;

    const parts = key.slice(prefix.length).split(':');
    const itemId = parts[0];
    if (!itemId) continue;

    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const notes = JSON.parse(raw) as Array<{
        id: string;
        body: string;
        createdAt: string;
        authorName?: string;
      }>;
      if (!Array.isArray(notes)) continue;

      for (const note of notes) {
        events.push(
          noteToEvent(note, {
            entityType: 'application',
            entityId: itemId,
            navigatePage: 'applications',
            summaryPrefix: 'Added application note',
          }),
        );
      }
    } catch {
      // skip malformed storage
    }
  }

  return events;
}

function collectContactHubNoteEvents(): CrmActivityEvent[] {
  const events: CrmActivityEvent[] = [];
  const prefix = 'crm-contact-hub-notes:';

  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key?.startsWith(prefix)) continue;
    const contactId = key.slice(prefix.length);
    if (!contactId) continue;

    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const notes = JSON.parse(raw) as Array<{
        id: string;
        body: string;
        createdAt: string;
        authorName?: string;
      }>;
      if (!Array.isArray(notes)) continue;

      for (const note of notes) {
        events.push(
          noteToEvent(note, {
            entityType: 'contact',
            entityId: contactId,
            navigatePage: 'contacts',
            summaryPrefix: 'Added contact note',
          }),
        );
      }
    } catch {
      // skip malformed storage
    }
  }

  return events;
}

export function buildMockActivityLog(): CrmActivityEvent[] {
  const groups = [
    getLocalActivityLog(),
    collectRecruitmentEvents(),
    collectTermNoteEvents(),
    collectContactHubNoteEvents(),
  ];

  const seen = new Set<string>();
  const merged: CrmActivityEvent[] = [];

  for (const group of groups) {
    for (const event of group) {
      if (seen.has(event.id)) continue;
      seen.add(event.id);
      merged.push(event);
    }
  }

  return merged.sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );
}
