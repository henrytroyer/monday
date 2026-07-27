import type { ContactDetail } from '../types/contact';
import type { LongtermReferenceSlot } from '../types/longtermReference';
import type { VolunteerDetail } from '../types/volunteer';

type CacheEntry<T> = {
  data: T;
  cachedAt: number;
};

const applicationDetails = new Map<string, CacheEntry<VolunteerDetail>>();
const contactDetails = new Map<string, CacheEntry<ContactDetail>>();
const longtermReferenceSlots = new Map<
  string,
  CacheEntry<LongtermReferenceSlot[]>
>();

export function getCachedApplicationDetail(
  itemId: string,
): VolunteerDetail | null {
  return applicationDetails.get(itemId)?.data ?? null;
}

export function setCachedApplicationDetail(
  itemId: string,
  detail: VolunteerDetail,
): void {
  applicationDetails.set(itemId, { data: detail, cachedAt: Date.now() });
}

export function invalidateApplicationDetail(itemId?: string): void {
  if (itemId) {
    applicationDetails.delete(itemId);
    longtermReferenceSlots.delete(itemId);
    return;
  }
  applicationDetails.clear();
  longtermReferenceSlots.clear();
}

export function contactDetailCacheKey(
  contactId: string,
  options?: {
    contactsBoardId?: string | null;
    applicationsBoardId?: string | null;
    donationsBoardId?: string | null;
  },
): string {
  return [
    contactId,
    options?.contactsBoardId ?? '',
    options?.applicationsBoardId ?? '',
    options?.donationsBoardId ?? '',
  ].join(':');
}

export function getCachedContactDetail(
  cacheKey: string,
): ContactDetail | null {
  return contactDetails.get(cacheKey)?.data ?? null;
}

export function setCachedContactDetail(
  cacheKey: string,
  detail: ContactDetail,
): void {
  contactDetails.set(cacheKey, { data: detail, cachedAt: Date.now() });
}

export function invalidateContactDetail(contactId?: string): void {
  if (!contactId) {
    contactDetails.clear();
    return;
  }
  for (const key of contactDetails.keys()) {
    if (key.startsWith(`${contactId}:`)) {
      contactDetails.delete(key);
    }
  }
}

export function getCachedLongtermReferenceSlots(
  applicationId: string,
): LongtermReferenceSlot[] | null {
  return longtermReferenceSlots.get(applicationId)?.data ?? null;
}

export function setCachedLongtermReferenceSlots(
  applicationId: string,
  slots: LongtermReferenceSlot[],
): void {
  longtermReferenceSlots.set(applicationId, {
    data: slots,
    cachedAt: Date.now(),
  });
}

export function invalidateLongtermReferenceSlots(applicationId?: string): void {
  if (applicationId) {
    longtermReferenceSlots.delete(applicationId);
    return;
  }
  longtermReferenceSlots.clear();
}

export function clearSessionDetailCache(): void {
  applicationDetails.clear();
  contactDetails.clear();
  longtermReferenceSlots.clear();
}
