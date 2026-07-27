import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchEmailMasterLog } from '../services/emailMasterLogApi';
import type { EmailLogEntry, EmailLogFilters } from '../types/emailAdmin';
import { EMPTY_EMAIL_LOG_FILTERS } from '../types/emailAdmin';

export function useEmailMasterLog(initialFilters: EmailLogFilters = EMPTY_EMAIL_LOG_FILTERS) {
  const [entries, setEntries] = useState<EmailLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<EmailLogFilters>(initialFilters);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchEmailMasterLog();
      setEntries(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load email log.');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const filtered = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    return entries.filter((entry) => {
      if (filters.direction !== 'all' && entry.direction !== filters.direction) {
        return false;
      }
      if (filters.source !== 'all' && entry.source !== filters.source) {
        return false;
      }
      if (
        filters.accountId !== 'all' &&
        entry.accountId !== filters.accountId
      ) {
        return false;
      }
      if (!query) return true;
      const haystack = [
        entry.subject,
        entry.senderEmail,
        entry.recipientEmail,
        entry.senderName,
        entry.recipientName,
        entry.sourceLabel,
        entry.templateName,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [entries, filters]);

  return {
    entries: filtered,
    totalCount: entries.length,
    loading,
    error,
    filters,
    setFilters,
    refetch,
  };
}
