import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useMockData } from '../config/boards';
import { TEAM_MEMBERS } from '../data/mockTeamMembers';
import { useMondayContext } from '../hooks/useMondayContext';
import {
  fetchCurrentMondayUser,
  type CurrentMondayUser,
} from '../services/resolveMondayUsers';

interface CurrentUserContextValue {
  user: CurrentMondayUser | null;
  displayName: string;
  isLoading: boolean;
}

const CurrentUserContext = createContext<CurrentUserContextValue>({
  user: null,
  displayName: 'Coordinator',
  isLoading: true,
});

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
  const [user, setUser] = useState<CurrentMondayUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);

      if (isMock) {
        if (!cancelled) {
          setUser(mockDefaultUser());
          setIsLoading(false);
        }
        return;
      }

      const me = await fetchCurrentMondayUser();
      if (cancelled) return;

      if (me) {
        setUser(me);
        setIsLoading(false);
        return;
      }

      if (context?.userId != null) {
        setUser({
          id: String(context.userId),
          name: `User ${context.userId}`,
        });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [isMock, context?.userId]);

  const value = useMemo<CurrentUserContextValue>(
    () => ({
      user,
      displayName: user?.name?.trim() || 'Coordinator',
      isLoading,
    }),
    [user, isLoading],
  );

  return (
    <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>
  );
}

export function useCurrentUser(): CurrentUserContextValue {
  return useContext(CurrentUserContext);
}
