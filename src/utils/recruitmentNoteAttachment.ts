import type { RecruitmentNoteAttachment } from '../types/recruitment';

const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Could not read file.'));
    };
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });
}

export async function fileToRecruitmentNoteAttachment(
  file: File,
): Promise<RecruitmentNoteAttachment> {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error('File must be 2 MB or smaller.');
  }

  return {
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    dataUrl: await readFileAsDataUrl(file),
    sizeBytes: file.size,
  };
}

export function formatAttachmentSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isImageAttachment(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export type AttachmentPreviewKind = 'image' | 'pdf' | 'other';

export function getAttachmentPreviewKind(
  attachment: RecruitmentNoteAttachment,
): AttachmentPreviewKind {
  if (isImageAttachment(attachment.mimeType)) return 'image';
  if (
    attachment.mimeType === 'application/pdf' ||
    /\.pdf$/i.test(attachment.fileName)
  ) {
    return 'pdf';
  }
  return 'other';
}

export function downloadRecruitmentNoteAttachment(
  attachment: RecruitmentNoteAttachment,
): void {
  const link = document.createElement('a');
  link.href = attachment.dataUrl;
  link.download = attachment.fileName;
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
