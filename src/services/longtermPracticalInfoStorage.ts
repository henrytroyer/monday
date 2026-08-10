/**
 * longtermPracticalInfoStorage.ts — localStorage cache for on-field practical info.
 */

import type { LongtermPracticalInfo } from '../types/longtermPracticalInfo';
import { parsePracticalInfo } from '../utils/longtermPracticalInfo';

const STORAGE_KEY = 'crm-longterm-practical-info';
const HOUSING_OPTIONS_KEY = 'crm-longterm-housing-options';

function readAll(): Record<string, LongtermPracticalInfo> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Record<string, LongtermPracticalInfo> = {};
    for (const [id, value] of Object.entries(parsed)) {
      const info = parsePracticalInfo(value, id);
      if (info) out[id] = info;
    }
    return out;
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, LongtermPracticalInfo>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadPracticalInfo(
  volunteerId: string,
): LongtermPracticalInfo | undefined {
  return readAll()[volunteerId];
}

export function savePracticalInfoLocal(
  info: LongtermPracticalInfo,
): LongtermPracticalInfo {
  const all = readAll();
  all[info.volunteerId] = info;
  writeAll(all);
  return info;
}

export function loadCustomHousingOptionsLocal(): string[] {
  try {
    const raw = localStorage.getItem(HOUSING_OPTIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((v): v is string => typeof v === 'string')
      .map((v) => v.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function saveCustomHousingOptionsLocal(options: string[]): string[] {
  const cleaned = options
    .map((v) => v.trim())
    .filter(Boolean);
  localStorage.setItem(HOUSING_OPTIONS_KEY, JSON.stringify(cleaned));
  return cleaned;
}
