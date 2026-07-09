import mondaySdk from 'monday-sdk-js';
import type { MondayResponse } from '../types/monday';

const monday = mondaySdk();

const mondayApiProxyUrl = import.meta.env.VITE_MONDAY_API_PROXY_URL as
  | string
  | undefined;

const PROXY_FETCH_TIMEOUT_MS = 45_000;

function useMondayApiProxy(): boolean {
  return Boolean(mondayApiProxyUrl?.trim());
}

function proxyFetchError(err: unknown): Error {
  if (err instanceof DOMException && err.name === 'TimeoutError') {
    return new Error(
      'Could not reach monday API proxy. Run `npm run monday:proxy` in a second terminal.',
    );
  }
  if (err instanceof TypeError) {
    return new Error(
      'Could not reach monday API proxy. Run `npm run monday:proxy` in a second terminal.',
    );
  }
  return err instanceof Error ? err : new Error('monday API proxy request failed');
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
  return `monday API proxy ${status}`;
}

export async function mondayGraphQL<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  if (useMondayApiProxy()) {
    const base = mondayApiProxyUrl!.replace(/\/$/, '');
    let res: Response;
    try {
      res = await fetch(`${base}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(PROXY_FETCH_TIMEOUT_MS),
      });
    } catch (err) {
      throw proxyFetchError(err);
    }

    const response = (await res.json()) as ProxyErrorBody;
    if (!res.ok) {
      throw new Error(messageFromProxyBody(response, res.status));
    }

    if (response.errors?.length) {
      throw new Error(response.errors.map((e) => e.message).join(', '));
    }

    if (!response.data) {
      throw new Error('No data returned from monday.com API');
    }

    return response.data as T;
  }

  monday.setApiVersion('2023-10');
  const response: MondayResponse<T> = await monday.api(query, { variables });

  if (response.errors?.length) {
    throw new Error(response.errors.map((e) => e.message).join(', '));
  }

  if (!response.data) {
    throw new Error('No data returned from monday.com API');
  }

  return response.data;
}
