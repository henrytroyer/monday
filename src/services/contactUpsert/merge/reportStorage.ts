/**
 * reportStorage.ts — Daily merge run reports (local cache for admin UI).
 */

import type { MergeAuditRecord, MergeRunReport } from './types';

const REPORT_KEY = 'crm-contact-merge-reports-v1';
const AUDIT_KEY = 'crm-contact-merge-audits-v1';
const MAX = 100;

function readJson<T>(key: string, memory: T[]): T[] {
  try {
    if (typeof localStorage === 'undefined') return memory;
    const raw = localStorage.getItem(key);
    if (!raw) return memory;
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : memory;
  } catch {
    return memory;
  }
}

function writeJson<T>(key: string, items: T[], setter: (v: T[]) => void): void {
  const next = items.slice(0, MAX);
  setter(next);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(next));
    }
  } catch {
    // ignore
  }
}

let memoryReports: MergeRunReport[] = [];
let memoryAudits: MergeAuditRecord[] = [];

export function saveMergeRunReport(report: MergeRunReport): void {
  writeJson(REPORT_KEY, [report, ...readJson(REPORT_KEY, memoryReports)], (v) => {
    memoryReports = v;
  });
}

export function listMergeRunReports(): MergeRunReport[] {
  return readJson(REPORT_KEY, memoryReports);
}

export function saveMergeAudit(audit: MergeAuditRecord): void {
  const existing = readJson(AUDIT_KEY, memoryAudits);
  if (existing.some((entry) => entry.idempotencyKey === audit.idempotencyKey && entry.result === 'success')) {
    return;
  }
  writeJson(AUDIT_KEY, [audit, ...existing], (v) => {
    memoryAudits = v;
  });
}

export function listMergeAudits(): MergeAuditRecord[] {
  return readJson(AUDIT_KEY, memoryAudits);
}

export function markMergeAuditReversed(auditId: string): void {
  writeJson(
    AUDIT_KEY,
    readJson(AUDIT_KEY, memoryAudits).map((entry) =>
      entry.auditId === auditId
        ? { ...entry, result: 'reversed' as const, reversalStatus: 'reversed' as const }
        : entry,
    ),
    (v) => {
      memoryAudits = v;
    },
  );
}

export function findMergeAuditByIdempotency(
  key: string,
): MergeAuditRecord | undefined {
  return listMergeAudits().find(
    (entry) => entry.idempotencyKey === key && entry.result === 'success',
  );
}
