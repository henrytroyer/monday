import type { EmailDraftAttachment } from '../types/emailCompose';

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function createAttachmentFromFile(file: File): EmailDraftAttachment {
  return {
    id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    file,
    name: file.name,
    size: file.size,
    type: file.type || 'application/octet-stream',
  };
}

export function attachmentsFromFileList(files: FileList | File[]): EmailDraftAttachment[] {
  return [...files].map(createAttachmentFromFile);
}

export function totalAttachmentSize(attachments: EmailDraftAttachment[]): number {
  return attachments.reduce((sum, entry) => sum + entry.size, 0);
}

const MAX_TOTAL_BYTES = 25 * 1024 * 1024;

export function validateAttachmentBatch(
  current: EmailDraftAttachment[],
  incoming: EmailDraftAttachment[],
): string | null {
  const total = totalAttachmentSize([...current, ...incoming]);
  if (total > MAX_TOTAL_BYTES) {
    return 'Attachments exceed 25 MB total. Remove some files before adding more.';
  }
  return null;
}
