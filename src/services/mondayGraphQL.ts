import mondaySdk from 'monday-sdk-js';
import { getCrmPermissionsRuntime } from '../permissions/crmPermissionsRuntime';
import type { MondayResponse } from '../types/monday';
import {
  getMondayProxyAuthToken,
  getMondayProxyBaseOverride,
} from './mondayProxyAuth';

const monday = mondaySdk();

const PROXY_FETCH_TIMEOUT_MS = 45_000;

function resolveProxyBase(): string | undefined {
  const override = getMondayProxyBaseOverride();
  if (override) return override;
  // Node/scripts with a token talk to Monday directly (no Vite proxy).
  try {
    if (
      typeof process !== 'undefined' &&
      process.env?.MONDAY_API_TOKEN?.trim() &&
      (process.env.FORCE_DIRECT_MONDAY === 'true' ||
        process.env.VITE_MONDAY_API_PROXY_URL === '')
    ) {
      return undefined;
    }
  } catch {
    // ignore
  }
  let fromEnv: string | undefined;
  try {
    fromEnv = (
      import.meta as ImportMeta & { env?: { VITE_MONDAY_API_PROXY_URL?: string } }
    ).env?.VITE_MONDAY_API_PROXY_URL;
  } catch {
    fromEnv = undefined;
  }
  if (!fromEnv && typeof process !== 'undefined') {
    fromEnv = process.env?.VITE_MONDAY_API_PROXY_URL;
  }
  return fromEnv?.trim() ? fromEnv.trim().replace(/\/$/, '') : undefined;
}

function useMondayApiProxy(): boolean {
  return Boolean(resolveProxyBase());
}

function proxyFetchError(err: unknown): Error {
  if (err instanceof DOMException && err.name === 'TimeoutError') {
    return new Error(
      'Could not reach the API proxy. Run `npm run monday:proxy` in a second terminal.',
    );
  }
  if (err instanceof TypeError) {
    return new Error(
      'Could not reach the API proxy. Run `npm run monday:proxy` in a second terminal.',
    );
  }
  return err instanceof Error ? err : new Error('API proxy request failed');
}

type ProxyErrorBody = MondayResponse<unknown> & { error?: string };

function messageFromProxyBody(
  body: ProxyErrorBody,
  status: number,
): string {
  if (body.error?.trim()) return body.error.trim();
  if (body.errors?.length) {
    return body.errors.map((e) => e.message).join(', ');
  }
  return `API proxy ${status}`;
}

export type MondayGraphQLCallOptions = {
  /** Override API-Version header (default 2025-01). Mute board APIs need 2025-10+. */
  apiVersion?: string;
};

const DEFAULT_API_VERSION = '2025-01';

export async function mondayGraphQL<T>(
  query: string,
  variables?: Record<string, unknown>,
  options?: MondayGraphQLCallOptions,
): Promise<T> {
  const apiVersion = options?.apiVersion?.trim() || DEFAULT_API_VERSION;

  if (useMondayApiProxy()) {
    const base = resolveProxyBase()!;
    const idToken = await getMondayProxyAuthToken();
    const operatorEmail = getCrmPermissionsRuntime().email;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (idToken) {
      headers.Authorization = `Bearer ${idToken}`;
    }
    if (operatorEmail) {
      headers['X-Crm-Operator-Email'] = operatorEmail;
    }

    const body = JSON.stringify({ query, variables, apiVersion });

    let res: Response;
    try {
      res = await fetch(`${base}/graphql`, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(PROXY_FETCH_TIMEOUT_MS),
      });
    } catch (err) {
      throw proxyFetchError(err);
    }

    // One refresh retry on 401 when using Firebase auth
    if (!res.ok && res.status === 401 && idToken) {
      const refreshed = await getMondayProxyAuthToken(true);
      if (refreshed) {
        try {
          res = await fetch(`${base}/graphql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${refreshed}`,
              ...(operatorEmail
                ? { 'X-Crm-Operator-Email': operatorEmail }
                : {}),
            },
            body,
            signal: AbortSignal.timeout(PROXY_FETCH_TIMEOUT_MS),
          });
        } catch (err) {
          throw proxyFetchError(err);
        }
      }
    }

    const response = (await res.json()) as ProxyErrorBody;
    if (!res.ok) {
      throw new Error(messageFromProxyBody(response, res.status));
    }

    if (response.errors?.length) {
      throw new Error(response.errors.map((e) => e.message).join(', '));
    }

    if (!response.data) {
      throw new Error('No data returned from the API');
    }

    return response.data as T;
  }

  monday.setApiVersion(apiVersion);
  try {
    const token = process.env?.MONDAY_API_TOKEN?.trim();
    if (token) monday.setToken(token);
  } catch {
    // browser / monday iframe uses session auth
  }
  const response: MondayResponse<T> = await monday.api(query, { variables });

  if (response.errors?.length) {
    throw new Error(response.errors.map((e) => e.message).join(', '));
  }

  if (!response.data) {
    throw new Error('No data returned from the API');
  }

  return response.data;
}
