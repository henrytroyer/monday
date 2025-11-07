/**
 * Custom React hook for accessing monday.com context
 * Provides easy access to context data and loading states
 */

import { useEffect, useState } from 'react';
import mondaySdk from 'monday-sdk-js';
import type { MondayContext, MondayResponse } from '../types/monday';

const monday = mondaySdk();

interface UseMondayContextReturn {
  context: MondayContext | null;
  isLoading: boolean;
  error: string | null;
}

export const useMondayContext = (): UseMondayContextReturn => {
  const [context, setContext] = useState<MondayContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    monday.setApiVersion('2023-10');

    let contextReceived = false;

    // Set up timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (!contextReceived) {
        console.warn('Context event not received, continuing without context');
        setIsLoading(false);
        setError(null); // Don't show error, just continue without context
      }
    }, 3000); // Wait 3 seconds for context

    monday.listen('context', (res: MondayResponse<MondayContext>) => {
      contextReceived = true;
      clearTimeout(timeout);
      if (res.data) {
        setContext(res.data);
        setIsLoading(false);
        setError(null);
      } else {
        setIsLoading(false);
        setError(null); // Continue even without context data
      }
    });

    // Cleanup timeout on unmount
    return () => clearTimeout(timeout);
  }, []);

  return { context, isLoading, error };
};

