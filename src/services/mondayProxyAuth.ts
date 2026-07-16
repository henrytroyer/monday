/**
 * mondayProxyAuth.ts — Auth + proxy base for Firebase-hosted Admin embed.
 *
 * Local dev still uses Vite proxy without a token. Prod Admin island calls
 * configureMondayProxyAuth() with getIdToken + Cloud Function base URL.
 */

type TokenGetter = (forceRefresh?: boolean) => Promise<string | null>;

let tokenGetter: TokenGetter | null = null;
let cachedToken: string | null = null;
let proxyBaseOverride: string | null = null;

export function configureMondayProxyAuth(options: {
  getToken: TokenGetter;
  proxyBase?: string;
}): void {
  tokenGetter = options.getToken;
  if (options.proxyBase?.trim()) {
    proxyBaseOverride = options.proxyBase.trim().replace(/\/$/, '');
  }
}

export function getMondayProxyBaseOverride(): string | null {
  return proxyBaseOverride;
}

export async function getMondayProxyAuthToken(
  forceRefresh = false,
): Promise<string | null> {
  if (!tokenGetter) return cachedToken;
  if (!forceRefresh && cachedToken) return cachedToken;
  const token = await tokenGetter(forceRefresh);
  cachedToken = token;
  return token;
}

/** Sync token for img/src asset URLs (?token=). May be stale until refreshed. */
export function getCachedMondayProxyAuthToken(): string | null {
  return cachedToken;
}

export async function refreshMondayProxyAuthToken(): Promise<string | null> {
  return getMondayProxyAuthToken(true);
}
