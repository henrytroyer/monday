/**
 * currentUserContextBase.ts — Shared context object (no components / no hooks).
 */

import { createContext } from 'react';
import type { CurrentMondayUser } from '../services/resolveMondayUsers';

export interface CurrentUserContextValue {
  user: CurrentMondayUser | null;
  displayName: string;
  isLoading: boolean;
  /** True on localhost when the operator picker is available. */
  canSwitchLocalUser: boolean;
}

export const CurrentUserContext = createContext<CurrentUserContextValue>({
  user: null,
  displayName: 'Coordinator',
  isLoading: true,
  canSwitchLocalUser: false,
});
