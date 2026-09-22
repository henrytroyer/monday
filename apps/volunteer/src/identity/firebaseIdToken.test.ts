import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { describe, it } from 'node:test';
import { readFirebaseIdTokenClaims } from './firebaseIdToken.ts';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const certs = {
  test: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
};

function token(claims: Record<string, unknown>, kid = 'test'): string {
  const header = base64url({ alg: 'RS256', kid });
  const payload = base64url(claims);
  const data = `${header}.${payload}`;
  const signature = sign('RSA-SHA256', Buffer.from(data), privateKey).toString('base64url');
  return `${data}.${signature}`;
}

function base64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

const validClaims = {
  aud: 'i58-finance',
  iss: 'https://securetoken.google.com/i58-finance',
  exp: Math.floor(Date.now() / 1000) + 3600,
  email: 'Henry@Example.com',
  email_verified: true,
};

describe('readFirebaseIdTokenClaims', () => {
  it('returns the verified email', () => {
    const claims = readFirebaseIdTokenClaims(token(validClaims), 'i58-finance', certs);
    assert.equal(claims.email, 'henry@example.com');
  });

  it('rejects a token for another Firebase project', () => {
    assert.throws(
      () => readFirebaseIdTokenClaims(token(validClaims), 'other-project', certs),
      /unauthorized/,
    );
  });

  it('rejects an expired token', () => {
    assert.throws(
      () =>
        readFirebaseIdTokenClaims(
          token({ ...validClaims, exp: Math.floor(Date.now() / 1000) - 10 }),
          'i58-finance',
          certs,
        ),
      /unauthorized/,
    );
  });

  it('rejects a bad signature', () => {
    const [header, payload, signature] = token(validClaims).split('.');
    const flipped = (signature![0] === 'a' ? 'b' : 'a') + signature!.slice(1);
    assert.throws(
      () => readFirebaseIdTokenClaims(`${header}.${payload}.${flipped}`, 'i58-finance', certs),
      /unauthorized/,
    );
  });
});
