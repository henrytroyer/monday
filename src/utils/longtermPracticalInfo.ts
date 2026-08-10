/**
 * longtermPracticalInfo.ts — Parse / merge helpers for on-field practical info.
 */

import {
  LONGTERM_HOUSING_PRESETS,
  LONGTERM_VISA_TYPES,
} from '../constants/longtermPracticalInfo';
import type {
  LongtermBudgetFile,
  LongtermPracticalInfo,
  LongtermVisaType,
  PortalSettingsPayload,
} from '../types/longtermPracticalInfo';

export function emptyPracticalInfo(volunteerId: string): LongtermPracticalInfo {
  return {
    volunteerId,
    housingLocation: null,
    visaType: null,
    usesI58Vehicle: null,
    budgetLink: null,
    budgetFile: null,
    updatedAt: new Date().toISOString(),
  };
}

function isVisaType(value: unknown): value is LongtermVisaType {
  return (
    typeof value === 'string' &&
    (LONGTERM_VISA_TYPES as readonly string[]).includes(value)
  );
}

function parseBudgetFile(value: unknown): LongtermBudgetFile | null {
  if (!value || typeof value !== 'object') return null;
  const file = value as Record<string, unknown>;
  if (
    typeof file.fileName !== 'string' ||
    typeof file.mimeType !== 'string' ||
    typeof file.dataUrl !== 'string' ||
    typeof file.sizeBytes !== 'number'
  ) {
    return null;
  }
  return {
    fileName: file.fileName,
    mimeType: file.mimeType,
    dataUrl: file.dataUrl,
    sizeBytes: file.sizeBytes,
  };
}

/** Validate and normalize a practical-info payload (from Portal / localStorage). */
export function parsePracticalInfo(
  raw: unknown,
  fallbackVolunteerId?: string,
): LongtermPracticalInfo | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const volunteerId =
    typeof obj.volunteerId === 'string' && obj.volunteerId.trim()
      ? obj.volunteerId.trim()
      : fallbackVolunteerId?.trim();
  if (!volunteerId) return null;

  const housingLocation =
    typeof obj.housingLocation === 'string' && obj.housingLocation.trim()
      ? obj.housingLocation.trim()
      : null;
  const visaType = isVisaType(obj.visaType) ? obj.visaType : null;
  const usesI58Vehicle =
    typeof obj.usesI58Vehicle === 'boolean' ? obj.usesI58Vehicle : null;
  const budgetLink =
    typeof obj.budgetLink === 'string' && obj.budgetLink.trim()
      ? obj.budgetLink.trim()
      : null;
  const budgetFile = parseBudgetFile(obj.budgetFile);
  const updatedAt =
    typeof obj.updatedAt === 'string' && obj.updatedAt.trim()
      ? obj.updatedAt
      : new Date().toISOString();

  return {
    volunteerId,
    housingLocation,
    visaType,
    usesI58Vehicle,
    budgetLink,
    budgetFile,
    updatedAt,
  };
}

export function isPresetHousing(label: string): boolean {
  const key = label.trim().toLowerCase();
  return LONGTERM_HOUSING_PRESETS.some((p) => p.toLowerCase() === key);
}

/** Deduplicate custom labels (case-insensitive); drop blanks and presets. */
export function normalizeCustomHousingOptions(
  custom: string[] | undefined | null,
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of custom ?? []) {
    const label = typeof raw === 'string' ? raw.trim() : '';
    if (!label || isPresetHousing(label)) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(label);
  }
  return result;
}

/** Merge presets + custom labels; case-insensitive de-dupe; presets win order. */
export function mergeHousingOptions(custom: string[] | undefined | null): string[] {
  return [...LONGTERM_HOUSING_PRESETS, ...normalizeCustomHousingOptions(custom)];
}

export function normalizeCustomHousingLabel(label: string): string | null {
  const trimmed = label.trim();
  if (!trimmed) return null;
  return trimmed;
}

export function parsePortalSettingsPayload(
  raw: unknown,
): PortalSettingsPayload {
  if (!raw || typeof raw !== 'object') return {};
  const obj = raw as Record<string, unknown>;
  const options = obj.longtermHousingOptions;
  if (!Array.isArray(options)) return {};
  const longtermHousingOptions = options
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter(Boolean);
  return { longtermHousingOptions };
}

/** Normalize a budget URL; returns null if empty; throws if invalid when non-empty. */
export function normalizeBudgetLink(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim() ?? '';
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error('Budget link must be a valid URL (include https://).');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Budget link must start with http:// or https://.');
  }
  return url.toString();
}
