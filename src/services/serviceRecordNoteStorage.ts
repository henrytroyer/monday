import type { ServiceRecordNote } from '../types/internalNote';
import type { RecruitmentNoteAttachment } from '../types/recruitment';

const NOTES_PREFIX = 'crm-service-record-notes';

function notesKey(serviceRecordId: string): string {
  return `${NOTES_PREFIX}:${serviceRecordId}`;
}

export function getServiceRecordNotes(
  serviceRecordId: string,
): ServiceRecordNote[] {
  try {
    const raw = localStorage.getItem(notesKey(serviceRecordId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ServiceRecordNote[];
    if (!Array.isArray(parsed)) return [];
    return parsed.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  } catch {
    return [];
  }
}

function saveServiceRecordNotes(
  serviceRecordId: string,
  notes: ServiceRecordNote[],
): void {
  localStorage.setItem(notesKey(serviceRecordId), JSON.stringify(notes));
}

export function addServiceRecordNote(
  serviceRecordId: string,
  body: string,
  authorName = 'You',
  attachment?: RecruitmentNoteAttachment,
): ServiceRecordNote {
  const note: ServiceRecordNote = {
    id: `service-note-${Date.now()}`,
    serviceRecordId,
    body: body.trim(),
    authorName,
    createdAt: new Date().toISOString(),
    ...(attachment ? { attachment } : {}),
  };
  const existing = getServiceRecordNotes(serviceRecordId);
  saveServiceRecordNotes(serviceRecordId, [...existing, note]);
  return note;
}

export function mergeLegacyNotesIntoServiceRecord(
  serviceRecordId: string,
  legacyNotes: Array<{
    id: string;
    body: string;
    authorName?: string;
    createdAt: string;
    attachment?: RecruitmentNoteAttachment;
  }>,
): void {
  if (legacyNotes.length === 0) return;

  const existing = getServiceRecordNotes(serviceRecordId);
  const existingIds = new Set(existing.map((note) => note.id));
  const merged = [...existing];

  for (const legacy of legacyNotes) {
    if (existingIds.has(legacy.id)) continue;
    merged.push({
      id: legacy.id,
      serviceRecordId,
      body: legacy.body,
      authorName: legacy.authorName,
      createdAt: legacy.createdAt,
      attachment: legacy.attachment,
    });
    existingIds.add(legacy.id);
  }

  merged.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  saveServiceRecordNotes(serviceRecordId, merged);
}

export function getServiceRecordNotesSynopsis(
  serviceRecordId: string,
  maxLength = 160,
): string | null {
  const notes = getServiceRecordNotes(serviceRecordId);
  if (notes.length === 0) return null;

  const latest = notes[notes.length - 1];
  const collapsed = latest.body.replace(/\s+/g, ' ').trim();
  if (!collapsed && latest.attachment) {
    return `[Attachment: ${latest.attachment.fileName}]`;
  }
  if (!collapsed) return null;
  if (collapsed.length <= maxLength) return collapsed;
  return `${collapsed.slice(0, maxLength - 1).trim()}…`;
}

/** One-time migration from contact-level note buckets. */
export function migrateContactScopedNotes(
  contactId: string,
  serviceRecordId: string,
): void {
  const legacyKey = `crm-contact-internal-notes:${contactId}`;
  try {
    const raw = localStorage.getItem(legacyKey);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Array<{
      id: string;
      body: string;
      authorName?: string;
      createdAt: string;
      attachment?: RecruitmentNoteAttachment;
    }>;
    if (!Array.isArray(parsed)) return;
    mergeLegacyNotesIntoServiceRecord(serviceRecordId, parsed);
    localStorage.removeItem(legacyKey);
  } catch {
    /* ignore */
  }
}
