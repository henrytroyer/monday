import mondaySdk from 'monday-sdk-js';
import type { MondayResponse } from '../types/monday';
import { resolveCrmOperatorEmail } from './crmOperatorEmail';
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

function isTimeoutError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const name = 'name' in err ? String((err as { name?: unknown }).name) : '';
  const message =
    'message' in err ? String((err as { message?: unknown }).message) : '';
  return name === 'TimeoutError' || /timed out after \d+ms/i.test(message);
}

/** True only for browser/SW aborts — NOT our own timeouts (those must not retry). */
function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  if (isTimeoutError(err)) return false;
  const name = 'name' in err ? String((err as { name?: unknown }).name) : '';
  const message =
    'message' in err ? String((err as { message?: unknown }).message) : '';
  return (
    name === 'AbortError' ||
    /fetch was aborted|signal is aborted|aborted without reason|The user aborted/i.test(
      message,
    )
  );
}

function proxyFetchError(err: unknown): Error {
  if (isTimeoutError(err)) {
    return new Error(
      'Could not reach the API proxy. Run `npm run monday:proxy` in a second terminal.',
    );
  }
  if (isAbortError(err)) {
    return new Error(
      'Request was aborted (page reload or service worker update). Retrying usually works.',
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
    const operatorEmail = resolveCrmOperatorEmail();
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

    // Own AbortController for timeouts only. Do not use AbortSignal.timeout —
    // iOS/PWA can abort those during UI transitions. Never leave orphaned
    // fetches after a timeout (Promise.race alone caused a retry storm).
    async function postOnce(
      hdrs: Record<string, string>,
    ): Promise<Response> {
      const controller = new AbortController();
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort('proxy-timeout');
      }, PROXY_FETCH_TIMEOUT_MS);
      try {
        return await fetch(`${base}/graphql`, {
          method: 'POST',
          headers: hdrs,
          body,
          signal: controller.signal,
        });
      } catch (err) {
        if (timedOut || controller.signal.reason === 'proxy-timeout') {
          throw new DOMException(
            `Proxy fetch timed out after ${PROXY_FETCH_TIMEOUT_MS}ms`,
            'TimeoutError',
          );
        }
        throw err;
      } finally {
        clearTimeout(timer);
      }
    }

    let res: Response;
    try {
      res = await postOnce(headers);
    } catch (err) {
      if (isTimeoutError(err)) {
        throw proxyFetchError(err);
      }
      if (isAbortError(err)) {
        try {
          res = await postOnce(headers);
        } catch (retryErr) {
          throw proxyFetchError(retryErr);
        }
      } else {
        throw proxyFetchError(err);
      }
    }

    // One refresh retry on 401 when using Firebase auth
    if (!res.ok && res.status === 401 && idToken) {
      const refreshed = await getMondayProxyAuthToken(true);
      if (refreshed) {
        try {
          res = await postOnce({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${refreshed}`,
            ...(operatorEmail
              ? { 'X-Crm-Operator-Email': operatorEmail }
              : {}),
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
