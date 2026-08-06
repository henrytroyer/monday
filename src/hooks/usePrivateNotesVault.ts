/**
 * usePrivateNotesVault.ts — React state for private-notes passphrase / recovery.
 */

import { useCallback, useEffect, useState } from 'react';
import { useCurrentUser } from '../context/useCurrentUser';
import {
  getPrivateNotesStoreMode,
  isPrivateNotesStoreAvailable,
} from '../services/privateNotesApi';
import {
  changePrivateNotesPassphrase,
  getCachedPrivateNotesVault,
  getPrivateNotesVaultStatus,
  hasRecoveryKey,
  lockPrivateNotesVault,
  recoverPrivateNotesVault,
  refreshPrivateNotesVault,
  rotateRecoveryKey,
  setupPrivateNotesVault,
  subscribePrivateNotesVault,
  unlockPrivateNotesVault,
  type VaultStatus,
} from '../services/privateNotesVault';

export function usePrivateNotesVault() {
  const { user } = useCurrentUser();
  const ownerUid = user?.id?.trim() || null;
  const [status, setStatus] = useState<VaultStatus>(() =>
    getPrivateNotesVaultStatus(),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveryConfigured, setRecoveryConfigured] = useState(() =>
    hasRecoveryKey(getCachedPrivateNotesVault()),
  );

  useEffect(
    () =>
      subscribePrivateNotesVault(() => {
        setStatus(getPrivateNotesVaultStatus());
        setRecoveryConfigured(hasRecoveryKey(getCachedPrivateNotesVault()));
      }),
    [],
  );

  useEffect(() => {
    void refreshPrivateNotesVault(ownerUid).then((next) => {
      setStatus(next);
      setRecoveryConfigured(hasRecoveryKey(getCachedPrivateNotesVault()));
    });
  }, [ownerUid]);

  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Request failed';
      setError(message);
      throw err;
    } finally {
      setBusy(false);
      setStatus(getPrivateNotesVaultStatus());
      setRecoveryConfigured(hasRecoveryKey(getCachedPrivateNotesVault()));
    }
  }, []);

  const setup = useCallback(
    async (passphrase: string) => {
      if (!ownerUid) throw new Error('Sign in to use private notes');
      return run(() => setupPrivateNotesVault(ownerUid, passphrase));
    },
    [ownerUid, run],
  );

  const unlock = useCallback(
    async (passphrase: string) => {
      if (!ownerUid) throw new Error('Sign in to use private notes');
      await run(() => unlockPrivateNotesVault(ownerUid, passphrase));
    },
    [ownerUid, run],
  );

  const lock = useCallback(async () => {
    await run(() => lockPrivateNotesVault());
  }, [run]);

  const changePassphrase = useCallback(
    async (currentPassphrase: string, newPassphrase: string) => {
      if (!ownerUid) throw new Error('Sign in to use private notes');
      await run(() =>
        changePrivateNotesPassphrase(
          ownerUid,
          currentPassphrase,
          newPassphrase,
        ),
      );
    },
    [ownerUid, run],
  );

  const recover = useCallback(
    async (recoveryKey: string, newPassphrase: string) => {
      if (!ownerUid) throw new Error('Sign in to use private notes');
      await run(() =>
        recoverPrivateNotesVault(ownerUid, recoveryKey, newPassphrase),
      );
    },
    [ownerUid, run],
  );

  const rotateRecovery = useCallback(async () => {
    if (!ownerUid) throw new Error('Sign in to use private notes');
    return run(() => rotateRecoveryKey(ownerUid));
  }, [ownerUid, run]);

  return {
    ownerUid,
    status,
    busy,
    error,
    storeAvailable: isPrivateNotesStoreAvailable(),
    storeMode: getPrivateNotesStoreMode(),
    isUnlocked: status === 'unlocked',
    recoveryConfigured,
    setup,
    unlock,
    lock,
    changePassphrase,
    recover,
    rotateRecovery,
    refresh: () => refreshPrivateNotesVault(ownerUid),
  };
}
