/**
 * longtermBudgetFile.ts — PDF attach helper for personal budget on practical info.
 */

import { LONGTERM_BUDGET_MAX_BYTES } from '../constants/longtermPracticalInfo';
import type { LongtermBudgetFile } from '../types/longtermPracticalInfo';

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

export async function fileToBudgetAttachment(file: File): Promise<LongtermBudgetFile> {
  const isPdf =
    file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  if (!isPdf) {
    throw new Error('Personal budget must be a PDF file.');
  }
  if (file.size > LONGTERM_BUDGET_MAX_BYTES) {
    throw new Error('File must be 2 MB or smaller.');
  }

  return {
    fileName: file.name,
    mimeType: file.type || 'application/pdf',
    dataUrl: await readFileAsDataUrl(file),
    sizeBytes: file.size,
  };
}

export function formatBudgetFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function downloadBudgetFile(file: LongtermBudgetFile): void {
  const link = document.createElement('a');
  link.href = file.dataUrl;
  link.download = file.fileName;
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function openBudgetFile(file: LongtermBudgetFile): void {
  const win = window.open(file.dataUrl, '_blank', 'noopener,noreferrer');
  if (!win) {
    downloadBudgetFile(file);
  }
}
