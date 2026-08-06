/**
 * locks.ts — Short-lived merge leases to avoid concurrent merges on the same contact.
 */

const STORAGE_KEY = 'crm-contact-merge-locks-v1';
const DEFAULT_TTL_MS = 5 * 60 * 1000;

interface LockEntry {
  contactIds: string[];
  holder: string;
  expiresAt: number;
}

function readLocks(): LockEntry[] {
  try {
    if (typeof localStorage === 'undefined') return memoryLocks;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LockEntry[];
    const now = Date.now();
    return Array.isArray(parsed)
      ? parsed.filter((entry) => entry.expiresAt > now)
      : [];
  } catch {
    return memoryLocks.filter((entry) => entry.expiresAt > Date.now());
  }
}

function writeLocks(entries: LockEntry[]): void {
  memoryLocks = entries;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    }
  } catch {
    // ignore
  }
}

let memoryLocks: LockEntry[] = [];

export function getLockedContactIds(): Set<string> {
  const locked = new Set<string>();
  for (const entry of readLocks()) {
    for (const id of entry.contactIds) locked.add(id);
  }
  return locked;
}

export function acquireMergeLock(
  contactIds: string[],
  holder: string,
  ttlMs = DEFAULT_TTL_MS,
): boolean {
  const current = readLocks();
  const wanted = new Set(contactIds.map(String));
  for (const entry of current) {
    if (entry.holder === holder) continue;
    if (entry.contactIds.some((id) => wanted.has(id))) {
      return false;
    }
  }
  const next = current.filter((entry) => entry.holder !== holder);
  next.push({
    contactIds: [...wanted],
    holder,
    expiresAt: Date.now() + ttlMs,
  });
  writeLocks(next);
  return true;
}

export function releaseMergeLock(holder: string): void {
  writeLocks(readLocks().filter((entry) => entry.holder !== holder));
}

/** In-process daily-job run lock (Node / single worker). */
let runLockHolder: string | null = null;

export function acquireRunLock(holder: string): boolean {
  if (runLockHolder && runLockHolder !== holder) return false;
  runLockHolder = holder;
  return true;
}

export function releaseRunLock(holder: string): void {
  if (runLockHolder === holder) runLockHolder = null;
}
