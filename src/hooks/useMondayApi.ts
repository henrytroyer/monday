/**
 * Custom React hook for making monday.com API calls
 * Provides a wrapper around the SDK API with loading and error states
 */

import { useState, useCallback } from 'react';
import mondaySdk from 'monday-sdk-js';
import type { MondayResponse } from '../types/monday';

const monday = mondaySdk();

interface UseMondayApiReturn<T = any> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: (query: string, variables?: Record<string, any>) => Promise<T | null>;
  reset: () => void;
}

export const useMondayApi = <T = any>(): UseMondayApiReturn<T> => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (
    query: string,
    variables?: Record<string, any>
  ): Promise<T | null> => {
    setLoading(true);
    setError(null);

    try {
      monday.setApiVersion('2023-10');
      const response: MondayResponse<T> = await monday.api(query, { variables });

      if (response.errors && response.errors.length > 0) {
        const errorMessage = response.errors.map(e => e.message).join(', ');
        setError(errorMessage);
        setLoading(false);
        return null;
      }

      setData(response.data);
      setLoading(false);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setLoading(false);
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, execute, reset };
};


