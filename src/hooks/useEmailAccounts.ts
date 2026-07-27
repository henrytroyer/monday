import { useCallback, useEffect, useState } from 'react';
import type { LinkedEmailAccount } from '../types/emailAdmin';
import {
  deleteLinkedEmailAccount,
  listLinkedEmailAccounts,
  saveLinkedEmailAccount,
  touchAccountSync,
} from '../utils/emailAccountsStorage';

export function useEmailAccounts() {
  const [accounts, setAccounts] = useState<LinkedEmailAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    setAccounts(listLinkedEmailAccounts());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveAccount = useCallback(
    (account: LinkedEmailAccount) => {
      const next = saveLinkedEmailAccount(account);
      setAccounts(next);
      return next;
    },
    [],
  );

  const removeAccount = useCallback((id: string) => {
    const next = deleteLinkedEmailAccount(id);
    setAccounts(next);
    return next;
  }, []);

  const markSynced = useCallback((id: string) => {
    const next = touchAccountSync(id);
    setAccounts(next);
    return next;
  }, []);

  return {
    accounts,
    loading,
    refresh,
    saveAccount,
    removeAccount,
    markSynced,
  };
}
