/**
 * CurrentUserContext.tsx — Signed-in CRM operator (Admin session, local override, or monday me).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useMockData } from '../config/boards';
import { TEAM_MEMBERS } from '../data/mockTeamMembers';
import { useMondayContext } from '../hooks/useMondayContext';
import {
  applyOperatorProfileOverlay,
  subscribeOperatorProfileOverlay,
} from '../services/crmOperatorProfile';
import { syncCrmOperatorEmail } from '../services/crmOperatorEmail';
import {
  getCrmSessionUser,
  subscribeCrmSessionUser,
} from '../services/crmSessionUser';
import {
  getLocalUserOverride,
  isLocalUserOverrideEnabled,
  subscribeLocalUserOverride,
} from '../services/crmLocalUserOverride';
import {
  fetchCurrentMondayUser,
  type CurrentMondayUser,
} from '../services/resolveMondayUsers';
import {
  CurrentUserContext,
  type CurrentUserContextValue,
} from './currentUserContextBase';

/** Survives Vite HMR module invalidation (module locals are wiped; globalThis is not). */
const warmUserGlobal = globalThis as typeof globalThis & {
  __crmWarmCurrentUser?: CurrentMondayUser | null;
};

function mockDefaultUser(): CurrentMondayUser {
  const envName = import.meta.env.VITE_MOCK_CURRENT_USER_NAME as string | undefined;
  if (envName?.trim()) {
    return { id: 'mock-user', name: envName.trim() };
  }
  const member = TEAM_MEMBERS[0];
  return { id: member?.id ?? 'mock-user', name: member?.name ?? 'Coordinator' };
}

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const isMock = useMockData();
  const { context } = useMondayContext();
  const [user, setUser] = useState<CurrentMondayUser | null>(
    () => warmUserGlobal.__crmWarmCurrentUser ?? null,
  );
  const [isLoading, setIsLoading] = useState(
    () => warmUserGlobal.__crmWarmCurrentUser == null,
  );
  const [sessionTick, setSessionTick] = useState(0);
  const [localTick, setLocalTick] = useState(0);
  const [profileTick, setProfileTick] = useState(0);

  useEffect(() => subscribeCrmSessionUser(() => setSessionTick((n) => n + 1)), []);
  useEffect(
    () => subscribeLocalUserOverride(() => setLocalTick((n) => n + 1)),
    [],
  );
  useEffect(
    () => subscribeOperatorProfileOverlay(() => setProfileTick((n) => n + 1)),
    [],
  );

  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    warmUserGlobal.__crmWarmCurrentUser = user;
  }, [user]);

  useEffect(() => {
    syncCrmOperatorEmail(user?.email);
  }, [user?.email]);

  // Overlay updates must not flip isLoading (that unmounted the CRM boot shell).
  useEffect(() => {
    setUser((prev) => (prev ? applyOperatorProfileOverlay(prev) : prev));
  }, [profileTick]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const silent = userRef.current != null;
      if (!silent) setIsLoading(true);

      const localOverride = getLocalUserOverride();
      if (localOverride) {
        if (!cancelled) {
          setUser(applyOperatorProfileOverlay(localOverride));
          setIsLoading(false);
        }
        return;
      }

      const session = getCrmSessionUser();
      if (session?.id) {
        if (!cancelled) {
          setUser(applyOperatorProfileOverlay(session));
          setIsLoading(false);
        }
        return;
      }

      if (isMock) {
        if (!cancelled) {
          setUser(applyOperatorProfileOverlay(mockDefaultUser()));
          setIsLoading(false);
        }
        return;
      }

      const me = await fetchCurrentMondayUser();
      if (cancelled) return;

      if (me) {
        setUser(applyOperatorProfileOverlay(me));
        setIsLoading(false);
        return;
      }

      if (context?.userId != null) {
        setUser(
          applyOperatorProfileOverlay({
            id: String(context.userId),
            name: `User ${context.userId}`,
          }),
        );
      } else {
        setUser(null);
      }
      setIsLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [isMock, context?.userId, sessionTick, localTick]);

  const value = useMemo<CurrentUserContextValue>(
    () => ({
      user,
      displayName: user?.name?.trim() || 'Coordinator',
      isLoading,
      canSwitchLocalUser: isLocalUserOverrideEnabled(),
    }),
    [user, isLoading],
  );

  return (
    <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>
  );
}
