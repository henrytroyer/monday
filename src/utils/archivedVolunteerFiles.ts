/**
 * archivedVolunteerFiles.ts — Filename convention for superseded volunteer files.
 * Current slot files keep their slot prefix (e.g. "Profile - …").
 * Replaced files are renamed "Old - …" so they stay on the item but leave the active slot.
 */

export const ARCHIVED_VOLUNTEER_FILE_PREFIX = 'Old - ';

export function isArchivedVolunteerFileName(name: string): boolean {
  return /^Old\s*-\s*/i.test(name.trim());
}

/** Ensure a filename is marked archived without double-prefixing. */
export function archiveVolunteerFileName(name: string): string {
  const trimmed = name.trim() || 'File';
  if (isArchivedVolunteerFileName(trimmed)) return trimmed;
  return `${ARCHIVED_VOLUNTEER_FILE_PREFIX}${trimmed}`;
}

/** Display label with the Old- prefix stripped. */
export function stripArchivedVolunteerFilePrefix(name: string): string {
  return name.replace(/^Old\s*-\s*/i, '').trim() || name;
}
