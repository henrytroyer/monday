/**
 * firebaseIdToken.ts — Verify an i58-finance Firebase ID token.
 * Uses Google's published Secure Token certificates so a referrer-restricted
 * browser API key is not required.
 */

import { createPublicKey, verify, type KeyObject } from 'node:crypto';

const CERT_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

let cachedCerts: { expiresAt: number; certs: Record<string, string> } | null = null;

export interface FirebaseIdTokenClaims {
  email: string;
}

export async function verifyFirebaseIdToken(
  idToken: string,
  projectId: string,
): Promise<FirebaseIdTokenClaims> {
  const certs = await fetchSecureTokenCerts();
  return readFirebaseIdTokenClaims(idToken, projectId, certs);
}

export function readFirebaseIdTokenClaims(
  idToken: string,
  projectId: string,
  certs: Record<string, string>,
): FirebaseIdTokenClaims {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('unauthorized');
  const [headerPart, payloadPart, signaturePart] = parts as [string, string, string];
  const header = decodeJson(headerPart) as { alg?: string; kid?: string };
  const payload = decodeJson(payloadPart) as {
    aud?: string;
    iss?: string;
    exp?: number;
    email?: string;
    email_verified?: boolean;
  };
  if (header.alg !== 'RS256' || !header.kid) throw new Error('unauthorized');
  const certificate = certs[header.kid];
  if (!certificate) throw new Error('unauthorized');
  const signature = Buffer.from(signaturePart, 'base64url');
  const signed = Buffer.from(`${headerPart}.${payloadPart}`);
  const key = publicKeyFromPem(certificate);
  const valid = verify('RSA-SHA256', signed, key, signature);
  if (!valid) throw new Error('unauthorized');
  const issuer = `https://securetoken.google.com/${projectId}`;
  if (payload.aud !== projectId || payload.iss !== issuer) throw new Error('unauthorized');
  if (!payload.exp || payload.exp * 1000 <= Date.now()) throw new Error('unauthorized');
  const email = payload.email?.trim().toLowerCase();
  if (!email || payload.email_verified === false) throw new Error('unauthorized');
  return { email };
}

async function fetchSecureTokenCerts(): Promise<Record<string, string>> {
  if (cachedCerts && cachedCerts.expiresAt > Date.now()) return cachedCerts.certs;
  const response = await fetch(CERT_URL);
  if (!response.ok) throw new Error('Could not load Google sign-in certificates.');
  const certs = (await response.json()) as Record<string, string>;
  const maxAge = cacheMaxAgeMs(response.headers.get('cache-control'));
  cachedCerts = { certs, expiresAt: Date.now() + maxAge };
  return certs;
}

function publicKeyFromPem(pem: string): KeyObject {
  return createPublicKey(pem);
}

function decodeJson(segment: string): unknown {
  return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8')) as unknown;
}

function cacheMaxAgeMs(cacheControl: string | null): number {
  const match = cacheControl?.match(/max-age=(\d+)/);
  const seconds = match ? Number(match[1]) : 3600;
  return Math.max(60_000, seconds * 1000);
}
