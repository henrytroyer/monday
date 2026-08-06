/**
 * useCurrentUser.ts — Hook for CurrentUserContext (separate file for Fast Refresh).
 */

import { useContext } from 'react';
import {
  CurrentUserContext,
  type CurrentUserContextValue,
} from './currentUserContextBase';

export type { CurrentUserContextValue };

export function useCurrentUser(): CurrentUserContextValue {
  return useContext(CurrentUserContext);
}
