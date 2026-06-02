import type { VolunteerFile } from '../types/volunteer';

export type FilePreviewKind = 'image' | 'pdf' | 'other';

export function getFilePreviewKind(file: VolunteerFile): FilePreviewKind {
  if (file.isImage) return 'image';
  if (/\.pdf$/i.test(file.name)) return 'pdf';
  return 'other';
}

export function canPreviewFile(file: VolunteerFile): boolean {
  return Boolean(file.url) && getFilePreviewKind(file) !== 'other';
}
