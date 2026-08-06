/**
 * useWorkFocus.ts — Effective operator work focus + local override helpers.
 */

import { useCallback, useEffect, useState } from 'react';
import type { WorkFocus } from '../preferences/workFocus';
import {
  WORK_FOCUS_META,
  effectiveWorkFocus,
} from '../preferences/workFocus';
import {
  readWorkFocusOverride,
  writeWorkFocusCache,
  writeWorkFocusOverride,
} from '../preferences/workFocusStorage';

export interface UseWorkFocusResult {
  /** Effective focus used for layout (override or general). */
  focus: WorkFocus;
  /** Always general (roles removed); kept for settings UI copy. */
  derivedFocus: WorkFocus;
  /** Local override, or null when using general. */
  override: WorkFocus | null;
  label: string;
  description: string;
  setOverride: (next: WorkFocus | null) => void;
}

export function useWorkFocus(): UseWorkFocusResult {
  const [override, setOverrideState] = useState<WorkFocus | null>(() =>
    readWorkFocusOverride(),
  );

  const derivedFocus: WorkFocus = 'general';
  const focus = effectiveWorkFocus(override);

  useEffect(() => {
    writeWorkFocusCache(focus);
  }, [focus]);

  const setOverride = useCallback((next: WorkFocus | null) => {
    writeWorkFocusOverride(next);
    setOverrideState(next);
  }, []);

  const meta = WORK_FOCUS_META[focus];
  return {
    focus,
    derivedFocus,
    override,
    label: meta.label,
    description: meta.description,
    setOverride,
  };
}
