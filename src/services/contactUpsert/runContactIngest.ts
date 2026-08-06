/**
 * runContactIngest.ts — Orchestrate native Contacts upsert from source boards.
 */

import {
  resolveApplicationsBoardId,
  resolveDonationsBoardId,
  resolveLongtermApplicationsBoardId,
  resolveServiceEndedBoardId,
  useMockData,
} from '../../config/boards';
import type { ContactListItem } from '../../types/contact';
import { fetchContactsList } from '../contactsApi';
import { fetchApplicationsBoardItems } from '../crmApi';
import type { MondayBoardItem } from '../mapMondayToCrm';
import {
  extractDonorPerson,
  extractLongtermBundle,
  extractServiceEndedBundle,
  extractShortTermBundle,
} from './extractPeopleFromBoards';
import {
  ingestApplicationBundle,
  type BundleIngestResult,
} from './ingestApplicationBundle';
import { upsertContactPerson, type ContactUpsertResult } from './contactUpsert';
import { countPendingContactMatchReviews } from './contactMatchReviewStorage';

export interface ContactIngestSummary {
  scanned: {
    shortTerm: number;
    longTerm: number;
    serviceEnded: number;
    donations: number;
  };
  created: number;
  updated: number;
  queuedReview: number;
  skipped: number;
  errors: string[];
  pendingReviews: number;
}

function tally(
  summary: ContactIngestSummary,
  results: ContactUpsertResult[],
): void {
  for (const result of results) {
    if (result.action === 'created') summary.created += 1;
    else if (result.action === 'updated') summary.updated += 1;
    else if (result.action === 'queued_review') summary.queuedReview += 1;
    else summary.skipped += 1;
  }
}

const INGEST_CURSOR_KEY = 'crm-contact-ingest-cursors-v1';

interface IngestCursors {
  /** ISO timestamp of last successful full ingest. */
  lastFullRunAt?: string;
}

function readCursors(): IngestCursors {
  try {
    const raw = localStorage.getItem(INGEST_CURSOR_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as IngestCursors;
  } catch {
    return {};
  }
}

function writeCursors(cursors: IngestCursors): void {
  localStorage.setItem(INGEST_CURSOR_KEY, JSON.stringify(cursors));
}

/** Prefer recently updated items when a prior run exists; otherwise process all. */
function filterRecentItems(
  items: MondayBoardItem[],
  sinceIso?: string,
): MondayBoardItem[] {
  if (!sinceIso) return items;
  const since = Date.parse(sinceIso);
  if (!Number.isFinite(since)) return items;
  const filtered = items.filter((item) => {
    const updated = item.updated_at ? Date.parse(item.updated_at) : NaN;
    const created = item.created_at ? Date.parse(item.created_at) : NaN;
    const stamp = Number.isFinite(updated) ? updated : created;
    if (!Number.isFinite(stamp)) return true;
    return stamp >= since - 24 * 60 * 60 * 1000;
  });
  return filtered.length > 0 ? filtered : items.slice(0, 50);
}

export async function runContactIngest(options?: {
  /** Process every item (ignore cursor window). */
  full?: boolean;
}): Promise<ContactIngestSummary> {
  const summary: ContactIngestSummary = {
    scanned: { shortTerm: 0, longTerm: 0, serviceEnded: 0, donations: 0 },
    created: 0,
    updated: 0,
    queuedReview: 0,
    skipped: 0,
    errors: [],
    pendingReviews: 0,
  };

  if (useMockData()) {
    summary.errors.push('Contact ingest requires live Monday data.');
    return summary;
  }

  const contacts = await fetchContactsList({
    contactsBoardId: undefined,
    applicationsBoardId: resolveApplicationsBoardId(),
    longtermApplicationsBoardId: resolveLongtermApplicationsBoardId(),
    serviceEndedBoardId: resolveServiceEndedBoardId(),
    donationsBoardId: resolveDonationsBoardId(),
    refresh: true,
  });

  const working = [...contacts];
  const cursors = readCursors();
  const since = options?.full ? undefined : cursors.lastFullRunAt;

  const stBoardId = resolveApplicationsBoardId();
  if (stBoardId) {
    try {
      const items = filterRecentItems(
        await fetchApplicationsBoardItems(stBoardId),
        since,
      );
      summary.scanned.shortTerm = items.length;
      for (const item of items) {
        const bundle = extractShortTermBundle(item);
        const result = await ingestApplicationBundle(bundle, working);
        tally(summary, result.results);
      }
    } catch (error) {
      summary.errors.push(
        `Short-term: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const ltBoardId = resolveLongtermApplicationsBoardId();
  if (ltBoardId) {
    try {
      const items = filterRecentItems(
        await fetchApplicationsBoardItems(ltBoardId),
        since,
      );
      summary.scanned.longTerm = items.length;
      for (const item of items) {
        const bundle = extractLongtermBundle(item);
        const result = await ingestApplicationBundle(bundle, working);
        tally(summary, result.results);
      }
    } catch (error) {
      summary.errors.push(
        `Long-term: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const cseBoardId = resolveServiceEndedBoardId();
  if (cseBoardId) {
    try {
      const items = filterRecentItems(
        await fetchApplicationsBoardItems(cseBoardId),
        since,
      );
      summary.scanned.serviceEnded = items.length;
      for (const item of items) {
        const bundle = extractServiceEndedBundle(item);
        const result = await ingestApplicationBundle(bundle, working);
        tally(summary, result.results);
      }
    } catch (error) {
      summary.errors.push(
        `Service ended: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const donationsBoardId = resolveDonationsBoardId();
  if (donationsBoardId) {
    try {
      const items = filterRecentItems(
        await fetchApplicationsBoardItems(donationsBoardId),
        since,
      );
      summary.scanned.donations = items.length;
      for (const item of items) {
        const donor = extractDonorPerson(item);
        const result = await upsertContactPerson(
          {
            name: donor.name,
            email: donor.email,
            phone: donor.phone,
            tags: donor.tags,
            demographics: donor.demographics,
            city: donor.demographics?.city,
            address: donor.demographics?.address,
            source: 'donation',
            sourceItemId: item.id,
          },
          working,
        );
        tally(summary, [result]);
        if (result.contact) {
          const idx = working.findIndex((c) => c.id === result.contact!.id);
          if (idx >= 0) working[idx] = result.contact;
          else working.push(result.contact);
        }
      }
    } catch (error) {
      summary.errors.push(
        `Donations: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  writeCursors({ lastFullRunAt: new Date().toISOString() });
  summary.pendingReviews = countPendingContactMatchReviews();
  return summary;
}

export async function upsertDonorViaEngine(input: {
  donorName: string;
  donorEmail?: string;
  phone?: string;
}): Promise<ContactListItem> {
  const contacts = await fetchContactsList({ refresh: true }).catch(() => []);
  const result = await upsertContactPerson(
    {
      name: input.donorName,
      email: input.donorEmail,
      phone: input.phone,
      tags: ['donor'],
      source: 'donation-live',
    },
    contacts,
  );
  if (result.contact) return result.contact;
  return {
    id: `donation-pending-${Date.now()}`,
    name: input.donorName,
    email: input.donorEmail || '—',
    tags: ['donor'],
    createdAt: new Date().toISOString(),
  };
}

/**
 * Refresh Contacts from a single Current Service Ended item (move / CSE ingest).
 * Applies newer non-empty fields and re-syncs Profile/Passport when present.
 */
export async function refreshContactFromServiceEndedItem(
  item: MondayBoardItem,
  contacts?: ContactListItem[],
): Promise<BundleIngestResult> {
  const working =
    contacts ??
    (await fetchContactsList({
      applicationsBoardId: resolveApplicationsBoardId(),
      longtermApplicationsBoardId: resolveLongtermApplicationsBoardId(),
      serviceEndedBoardId: resolveServiceEndedBoardId(),
      donationsBoardId: resolveDonationsBoardId(),
      refresh: true,
    }));
  const bundle = extractServiceEndedBundle(item);
  return ingestApplicationBundle(bundle, working);
}

/** Lightweight CSE refresh for the board watcher (recently updated items only). */
export async function refreshRecentServiceEndedContacts(): Promise<{
  scanned: number;
  created: number;
  updated: number;
  queuedReview: number;
}> {
  const cseBoardId = resolveServiceEndedBoardId();
  if (!cseBoardId || useMockData()) {
    return { scanned: 0, created: 0, updated: 0, queuedReview: 0 };
  }

  const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const items = filterRecentItems(
    await fetchApplicationsBoardItems(cseBoardId),
    since,
  );
  const working = await fetchContactsList({
    serviceEndedBoardId: cseBoardId,
    refresh: true,
  }).catch(() => [] as ContactListItem[]);

  let created = 0;
  let updated = 0;
  let queuedReview = 0;
  for (const item of items) {
    const result = await refreshContactFromServiceEndedItem(item, working);
    for (const entry of result.results) {
      if (entry.action === 'created') created += 1;
      else if (entry.action === 'updated') updated += 1;
      else if (entry.action === 'queued_review') queuedReview += 1;
    }
  }
  return { scanned: items.length, created, updated, queuedReview };
}
