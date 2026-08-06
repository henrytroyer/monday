/**
 * workFocusStorage.ts — Browser prefs for work focus override + landing seed.
 */

import type { WorkFocus } from './workFocus';
import { isWorkFocus } from './workFocus';

export const WORK_FOCUS_OVERRIDE_KEY = 'crm-user-work-focus-override-v1';
/** Cached effective focus so cold-start landing can seed before roles load. */
export const WORK_FOCUS_CACHE_KEY = 'crm-user-work-focus-cache-v1';
export const LANDING_PAGE_KEY = 'crm-user-default-landing-v1';

export function readWorkFocusOverride(): WorkFocus | null {
  try {
    const raw = localStorage.getItem(WORK_FOCUS_OVERRIDE_KEY);
    if (!raw) return null;
    return isWorkFocus(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function writeWorkFocusOverride(focus: WorkFocus | null): void {
  try {
    if (!focus) {
      localStorage.removeItem(WORK_FOCUS_OVERRIDE_KEY);
      return;
    }
    localStorage.setItem(WORK_FOCUS_OVERRIDE_KEY, focus);
  } catch {
    // ignore quota / private mode
  }
}

export function readWorkFocusCache(): WorkFocus | null {
  try {
    const raw = localStorage.getItem(WORK_FOCUS_CACHE_KEY);
    if (!raw) return null;
    return isWorkFocus(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function writeWorkFocusCache(focus: WorkFocus): void {
  try {
    localStorage.setItem(WORK_FOCUS_CACHE_KEY, focus);
  } catch {
    // ignore
  }
}

/** True when the operator has explicitly saved a landing page in this browser. */
export function hasExplicitLandingPreference(): boolean {
  try {
    return localStorage.getItem(LANDING_PAGE_KEY) != null;
  } catch {
    return false;
  }
}

export function readLandingPreference(): string | null {
  try {
    return localStorage.getItem(LANDING_PAGE_KEY);
  } catch {
    return null;
  }
}

export function writeLandingPreference(pageId: string): void {
  try {
    localStorage.setItem(LANDING_PAGE_KEY, pageId);
  } catch {
    // ignore
  }
}
