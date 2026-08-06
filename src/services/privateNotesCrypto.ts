/**
 * privateNotesCrypto.ts — E2E crypto for private contact internal notes.
 * Passphrase → PBKDF2 → AES-GCM. Server/store never sees plaintext.
 */

export const PRIVATE_NOTES_ALG = 'AES-GCM';
export const PRIVATE_NOTES_KDF = 'PBKDF2';
export const PRIVATE_NOTES_VERIFIER_PLAINTEXT = 'crm-private-notes-v1';

const PBKDF2_ITERATIONS = 310_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

function getSubtle(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('Web Crypto API is not available in this environment');
  }
  return subtle;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

export function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

/** Copy into a fresh ArrayBuffer-backed view for Web Crypto BufferSource typing. */
function asBufferSource(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
}

export function generateSalt(): Uint8Array {
  const salt = new Uint8Array(SALT_BYTES);
  globalThis.crypto.getRandomValues(salt);
  return salt;
}

export async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const subtle = getSubtle();
  const material = await subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    PRIVATE_NOTES_KDF,
    false,
    ['deriveKey'],
  );
  return subtle.deriveKey(
    {
      name: PRIVATE_NOTES_KDF,
      salt: asBufferSource(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    material,
    { name: PRIVATE_NOTES_ALG, length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Extractable key for IndexedDB device cache (same derivation params). */
export async function deriveExtractableKey(
  passphrase: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const subtle = getSubtle();
  const material = await subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    PRIVATE_NOTES_KDF,
    false,
    ['deriveKey'],
  );
  return subtle.deriveKey(
    {
      name: PRIVATE_NOTES_KDF,
      salt: asBufferSource(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    material,
    { name: PRIVATE_NOTES_ALG, length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
}

export interface CipherPayload {
  iv: string;
  ciphertext: string;
}

export async function encryptString(
  key: CryptoKey,
  plaintext: string,
): Promise<CipherPayload> {
  const subtle = getSubtle();
  const iv = new Uint8Array(IV_BYTES);
  globalThis.crypto.getRandomValues(iv);
  const encrypted = await subtle.encrypt(
    { name: PRIVATE_NOTES_ALG, iv: asBufferSource(iv) },
    key,
    new TextEncoder().encode(plaintext),
  );
  return {
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
  };
}

export async function decryptString(
  key: CryptoKey,
  payload: CipherPayload,
): Promise<string> {
  const subtle = getSubtle();
  const iv = asBufferSource(base64ToBytes(payload.iv));
  const ciphertext = asBufferSource(base64ToBytes(payload.ciphertext));
  const decrypted = await subtle.decrypt(
    { name: PRIVATE_NOTES_ALG, iv },
    key,
    ciphertext,
  );
  return new TextDecoder().decode(decrypted);
}

export async function encryptJson(
  key: CryptoKey,
  value: unknown,
): Promise<CipherPayload> {
  return encryptString(key, JSON.stringify(value));
}

export async function decryptJson<T>(
  key: CryptoKey,
  payload: CipherPayload,
): Promise<T> {
  const text = await decryptString(key, payload);
  return JSON.parse(text) as T;
}

export async function createVerifier(key: CryptoKey): Promise<CipherPayload> {
  return encryptString(key, PRIVATE_NOTES_VERIFIER_PLAINTEXT);
}

export async function verifyKey(
  key: CryptoKey,
  verifier: CipherPayload,
): Promise<boolean> {
  try {
    const plain = await decryptString(key, verifier);
    return plain === PRIVATE_NOTES_VERIFIER_PLAINTEXT;
  } catch {
    return false;
  }
}

/** Random AES-256 DEK used to encrypt note bodies. */
export async function generateDek(): Promise<CryptoKey> {
  return getSubtle().generateKey(
    { name: PRIVATE_NOTES_ALG, length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
}

export async function exportDekRaw(dek: CryptoKey): Promise<Uint8Array> {
  const raw = await getSubtle().exportKey('raw', dek);
  return new Uint8Array(raw);
}

export async function importDekRaw(
  raw: Uint8Array,
  extractable = true,
): Promise<CryptoKey> {
  return getSubtle().importKey(
    'raw',
    asBufferSource(raw),
    { name: PRIVATE_NOTES_ALG, length: 256 },
    extractable,
    ['encrypt', 'decrypt'],
  );
}

/** Encrypt DEK raw bytes with a wrapping key (passphrase or recovery derived). */
export async function wrapDek(
  wrapKey: CryptoKey,
  dek: CryptoKey,
): Promise<CipherPayload> {
  const raw = await exportDekRaw(dek);
  return encryptString(wrapKey, bytesToBase64(raw));
}

export async function unwrapDek(
  wrapKey: CryptoKey,
  wrapped: CipherPayload,
): Promise<CryptoKey> {
  const b64 = await decryptString(wrapKey, wrapped);
  return importDekRaw(base64ToBytes(b64), true);
}

/**
 * High-entropy recovery key as grouped hex (copy-friendly).
 * Example: A1B2-C3D4-...
 */
export function generateRecoveryKey(): string {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  let hex = '';
  for (let i = 0; i < bytes.length; i += 1) {
    hex += bytes[i]!.toString(16).padStart(2, '0');
  }
  return (hex.match(/.{1,4}/g) ?? [hex]).join('-').toUpperCase();
}

/** Strip spaces/dashes; lowercase for KDF input. */
export function normalizeRecoveryKey(input: string): string {
  return input.replace(/[\s-]+/g, '').toLowerCase();
}

export function formatRecoveryKey(normalizedHex: string): string {
  const hex = normalizedHex.replace(/[^0-9a-f]/gi, '').toLowerCase();
  return (hex.match(/.{1,4}/g) ?? [hex]).join('-').toUpperCase();
}

export interface PrivateNotePlaintext {
  body: string;
  contactId: string;
  authorName: string;
  createdAt: string;
  source: 'term' | 'recruitment' | 'contact';
  sourceLabel: string;
  timelineId?: string;
  applicationItemId?: string;
  recruitmentProspectId?: string;
}
