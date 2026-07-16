import type { VolunteerFile } from "../types/volunteer";
import { mondayAssetProxyUrl } from "../services/mondayFileColumns";

export type FilePreviewKind = "image" | "pdf" | "other";

export function getFilePreviewKind(file: VolunteerFile): FilePreviewKind {
  if (file.isImage) return "image";
  if (/\.pdf$/i.test(file.name)) return "pdf";
  return "other";
}

export function canPreviewFile(file: VolunteerFile): boolean {
  return Boolean(file.url) && getFilePreviewKind(file) !== "other";
}

function proxyBase(): string | undefined {
  return import.meta.env.VITE_MONDAY_API_PROXY_URL?.trim().replace(/\/$/, "");
}

function parseMergeAssetIdsFromUrl(url?: string): string[] {
  if (!url) return [];
  const pathMatch = url.match(/\/assets\/merge\/([\d,]+)/);
  if (pathMatch?.[1]) {
    return pathMatch[1].split(",").map((id) => id.trim()).filter(Boolean);
  }
  try {
    const parsed = new URL(url, window.location.origin);
    const queryIds = parsed.searchParams.get("ids");
    if (queryIds) {
      return queryIds.split(",").map((id) => id.trim()).filter(Boolean);
    }
  } catch {
    // ignore invalid urls
  }
  return [];
}

/** Try merged itinerary PDF first, then fall back to source assets. */
export function volunteerFileFetchCandidates(file: VolunteerFile): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  const add = (candidate?: string) => {
    if (!candidate || seen.has(candidate)) return;
    seen.add(candidate);
    urls.push(candidate);
  };

  add(file.url);

  const base = proxyBase();
  const sourceIds =
    file.mergeSourceAssetIds?.length
      ? file.mergeSourceAssetIds
      : parseMergeAssetIdsFromUrl(file.url);

  if (base) {
    for (const assetId of sourceIds) {
      add(mondayAssetProxyUrl(assetId, base));
    }
  }

  return urls;
}

async function looksLikePdfBlob(blob: Blob): Promise<boolean> {
  const header = new Uint8Array(await blob.slice(0, 5).arrayBuffer());
  return (
    header[0] === 0x25 &&
    header[1] === 0x50 &&
    header[2] === 0x44 &&
    header[3] === 0x46
  );
}

export async function fetchVolunteerFileBlob(file: VolunteerFile): Promise<Blob> {
  const candidates = volunteerFileFetchCandidates(file);
  if (candidates.length === 0) {
    throw new Error("No file URL available");
  }

  let lastError: Error | undefined;

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate);
      if (!response.ok) {
        lastError = new Error(`Fetch failed (${response.status})`);
        continue;
      }

      const blob = await response.blob();
      if (await looksLikePdfBlob(blob)) {
        return blob;
      }

      if (!candidate.includes("/assets/merge")) {
        return blob;
      }

      lastError = new Error("Merged itinerary PDF was unavailable");
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error("Could not load file");
    }
  }

  throw lastError ?? new Error("Could not load file");
}

/** Trigger a direct file save without opening a new browser tab. */
export async function downloadVolunteerFile(
  file: VolunteerFile,
  filenameOverride?: string,
): Promise<void> {
  if (!file.url && volunteerFileFetchCandidates(file).length === 0) return;

  const filename = filenameOverride?.trim() || file.name || "download";

  try {
    const blob = await fetchVolunteerFileBlob(file);
    const objectUrl = URL.createObjectURL(blob);
    triggerDownload(objectUrl, filename);
    URL.revokeObjectURL(objectUrl);
  } catch {
    if (file.url) {
      triggerDownload(file.url, filename);
    }
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
