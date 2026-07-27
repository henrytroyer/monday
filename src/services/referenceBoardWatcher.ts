import {
  isMondayWatchEnabled,
  mondayWatchIntervalMs,
  useMockData,
} from '../config/boards';
import { invalidateReferenceBoardCache } from './longtermReferencesApi';

const registeredApplicationIds = new Set<string>();

export function registerWatchedLongtermApplicationId(
  applicationId: string,
): void {
  if (applicationId && !applicationId.startsWith('longterm-mock-')) {
    registeredApplicationIds.add(applicationId);
  }
}

export function unregisterWatchedLongtermApplicationId(
  applicationId: string,
): void {
  registeredApplicationIds.delete(applicationId);
}

export function notifyReferencesChanged(applicationIds: string[] = []): void {
  window.dispatchEvent(
    new CustomEvent('crm-references-changed', {
      detail: { applicationIds },
    }),
  );
}

export function referenceWatchIsEnabled(): boolean {
  return isMondayWatchEnabled() && !useMockData();
}

export function referenceWatchIntervalMs(): number {
  return mondayWatchIntervalMs();
}

export async function pollReferenceBoardUpdates(): Promise<string[]> {
  if (!referenceWatchIsEnabled()) return [];

  const applicationIds = [...registeredApplicationIds];
  if (applicationIds.length === 0) return [];

  invalidateReferenceBoardCache();
  notifyReferencesChanged(applicationIds);
  return applicationIds;
}
