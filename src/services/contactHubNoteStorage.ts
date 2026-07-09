export interface LocalContactHubNote {
  id: string;
  body: string;
  createdAt: string;
  authorName?: string;
}

function storageKey(contactId: string): string {
  return `crm-contact-hub-notes:${contactId}`;
}

function readNotes(contactId: string): LocalContactHubNote[] {
  try {
    const raw = localStorage.getItem(storageKey(contactId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalContactHubNote[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeNotes(contactId: string, notes: LocalContactHubNote[]): void {
  localStorage.setItem(storageKey(contactId), JSON.stringify(notes));
}

export function getLocalContactHubNotes(contactId: string): LocalContactHubNote[] {
  return readNotes(contactId);
}

export function addLocalContactHubNote(
  contactId: string,
  body: string,
  authorName = 'You',
): LocalContactHubNote {
  const note: LocalContactHubNote = {
    id: `contact-note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    body: body.trim(),
    createdAt: new Date().toISOString(),
    authorName,
  };
  writeNotes(contactId, [note, ...readNotes(contactId)]);
  return note;
}
