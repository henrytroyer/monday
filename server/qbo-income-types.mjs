/**
 * Shared JSDoc types for QBO income normalization (used by watcher + monday sync).
 */

/**
 * @typedef {Object} NormalizedIncomeTxn
 * @property {'SalesReceipt'|'Payment'|'Invoice'|'Deposit'} type
 * @property {string} id
 * @property {string} qboKey
 * @property {string} txnDate
 * @property {number} amount
 * @property {string} currency
 * @property {string} description
 * @property {string} customerId
 * @property {string} customerName
 * @property {string} customerEmail
 * @property {string|undefined} [programLabel]
 */

export {};
