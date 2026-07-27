import type { EmailSignature } from '../types/emailCompose';

const STORAGE_KEY = 'crm-email-signatures-v1';

function readAll(): EmailSignature[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as EmailSignature[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(signatures: EmailSignature[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(signatures));
}

export function listEmailSignatures(): EmailSignature[] {
  return readAll();
}

export function getDefaultEmailSignature(): EmailSignature | null {
  return readAll().find((entry) => entry.isDefault) ?? readAll()[0] ?? null;
}

export function saveEmailSignature(signature: EmailSignature): EmailSignature[] {
  const existing = readAll();
  const index = existing.findIndex((entry) => entry.id === signature.id);
  let next = [...existing];

  if (index >= 0) {
    next[index] = signature;
  } else {
    next.push(signature);
  }

  if (signature.isDefault) {
    next = next.map((entry) => ({
      ...entry,
      isDefault: entry.id === signature.id,
    }));
  }

  writeAll(next);
  return next;
}

export function deleteEmailSignature(id: string): EmailSignature[] {
  const next = readAll().filter((entry) => entry.id !== id);
  writeAll(next);
  return next;
}

export function createSignatureId(): string {
  return `sig-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
