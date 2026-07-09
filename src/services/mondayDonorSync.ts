/**
 * QBO → Monday income sync helpers (shared contract with server/mondayDonorSync.mjs).
 */

export const QBO_TXN_PREFIX = 'QBO:';

export type QboIncomeTxnType =
  | 'SalesReceipt'
  | 'Payment'
  | 'Invoice'
  | 'Deposit';

export interface QboTxnKeyParts {
  type: QboIncomeTxnType;
  id: string;
}

/** Build dedupe key stored in Donation Details / QBO Txn ID column. */
export function buildQboTxnKey(type: QboIncomeTxnType, id: string | number): string {
  return `${QBO_TXN_PREFIX}${type}:${id}`;
}

/** Parse a QBO txn key from donation Details text. */
export function parseQboTxnKey(text: string): QboTxnKeyParts | null {
  const match = String(text ?? '').match(/QBO:([^:]+):([\w-]+)/);
  if (!match) return null;
  return {
    type: match[1] as QboIncomeTxnType,
    id: match[2],
  };
}

/** Whether contact detail should skip live QBO fetch (gifts come via Monday sync). */
export function useQboIncomeSyncFromMonday(): boolean {
  return import.meta.env.VITE_QBO_INCOME_SYNC_ENABLED === 'true';
}
