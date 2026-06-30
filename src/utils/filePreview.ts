import type { VolunteerFile } from "../types/volunteer";

export type FilePreviewKind = "image" | "pdf" | "other";

export function getFilePreviewKind(file: VolunteerFile): FilePreviewKind {
  if (file.isImage) return "image";
  if (/\.pdf$/i.test(file.name)) return "pdf";
  return "other";
}

export function canPreviewFile(file: VolunteerFile): boolean {
  return Boolean(file.url) && getFilePreviewKind(file) !== "other";
}

/** Trigger a direct file save without opening a new browser tab. */
export async function downloadVolunteerFile(
  file: VolunteerFile,
  filenameOverride?: string,
): Promise<void> {
  if (!file.url) return;

  const filename = filenameOverride?.trim() || file.name || "download";

  try {
    const response = await fetch(file.url);
    if (!response.ok) {
      throw new Error(`Download failed (${response.status})`);
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    triggerDownload(objectUrl, filename);
    URL.revokeObjectURL(objectUrl);
  } catch {
    triggerDownload(file.url, filename);
  }
}

function triggerDownload(href: string, filename: string): void {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
