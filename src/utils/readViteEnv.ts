/**
 * readViteEnv.ts — Safe Vite/process env read for browser and Node (tsx scripts).
 */

export function readViteEnv(key: string): string | undefined {
  try {
    const fromMeta = (
      import.meta as ImportMeta & { env?: Record<string, string | undefined> }
    ).env?.[key];
    if (fromMeta != null && String(fromMeta).length > 0) return String(fromMeta);
  } catch {
    // ignore
  }
  try {
    const fromProcess = typeof process !== 'undefined' ? process.env?.[key] : undefined;
    if (fromProcess != null && String(fromProcess).length > 0) {
      return String(fromProcess);
    }
  } catch {
    // ignore
  }
  return undefined;
}
