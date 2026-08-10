/**
 * installFileLocalStorage.ts — File-backed localStorage for Node CRM scripts.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export function installFileLocalStorage(filePath: string): void {
  let store: Record<string, string> = {};
  try {
    store = JSON.parse(readFileSync(filePath, 'utf8')) as Record<string, string>;
  } catch {
    store = {};
  }
  const persist = () => {
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, JSON.stringify(store, null, 2));
  };
  const storage = {
    get length() {
      return Object.keys(store).length;
    },
    key(index: number) {
      return Object.keys(store)[index] ?? null;
    },
    getItem(key: string) {
      return store[key] ?? null;
    },
    setItem(key: string, value: string) {
      store[key] = String(value);
      persist();
    },
    removeItem(key: string) {
      delete store[key];
      persist();
    },
    clear() {
      store = {};
      persist();
    },
  };
  (globalThis as unknown as { localStorage: typeof storage }).localStorage =
    storage;
}
