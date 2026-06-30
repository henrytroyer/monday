/**
 * Custom React hook for accessing monday.com context
 * Provides easy access to context data and loading states
 */

import { useEffect, useState } from 'react';
import { isStandaloneMondayMode } from '../config/boards';
import mondaySdk from 'monday-sdk-js';
import type { MondayContext, MondayResponse } from '../types/monday';

const monday = mondaySdk();

interface UseMondayContextReturn {
  context: MondayContext | null;
  isLoading: boolean;
  error: string | null;
}

export const useMondayContext = (): UseMondayContextReturn => {
  const standalone = isStandaloneMondayMode();
  const [context, setContext] = useState<MondayContext | null>(null);
  const [isLoading, setIsLoading] = useState(!standalone);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (standalone) {
      return;
    }

    monday.setApiVersion('2023-10');

    let contextReceived = false;

    const timeout = setTimeout(() => {
      if (!contextReceived) {
        console.warn('Context event not received, continuing without context');
        setIsLoading(false);
        setError(null);
      }
    }, 3000);

    monday.listen('context', (res: MondayResponse<MondayContext>) => {
      contextReceived = true;
      clearTimeout(timeout);
      if (res.data) {
        setContext(res.data);
        setIsLoading(false);
        setError(null);
      } else {
        setIsLoading(false);
        setError(null);
      }
    });

    return () => clearTimeout(timeout);
  }, [standalone]);

  return { context, isLoading, error };
};
