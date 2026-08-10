/**
 * filloutApi.ts — Client fetch against the local Fillout proxy (/api/fillout).
 */

import { readViteEnv } from '../../utils/readViteEnv';
import type { FilloutSubmission } from './mapFilloutShortTermToBundle';

const DEFAULT_FORM_ID = 'rmkCicr2a5us';

export function filloutProxyBase(): string {
  const raw =
    readViteEnv('VITE_FILLOUT_PROXY_URL')?.trim() || '/api/fillout';
  return raw.replace(/\/$/, '');
}

export function filloutShortTermFormId(): string {
  return (
    readViteEnv('VITE_FILLOUT_SHORT_TERM_FORM_ID')?.trim() ||
    readViteEnv('FILLOUT_SHORT_TERM_FORM_ID')?.trim() ||
    DEFAULT_FORM_ID
  );
}

/** True when the CRM is configured to call the Fillout proxy (URL present). */
export function isFilloutContactBuilderConfigured(): boolean {
  return Boolean(filloutProxyBase());
}

export async function fetchFilloutSubmissions(options?: {
  formId?: string;
  afterDate?: string;
  limit?: number;
  offset?: number;
  sort?: 'asc' | 'desc';
}): Promise<{
  responses: FilloutSubmission[];
  totalResponses: number;
}> {
  const formId = options?.formId || filloutShortTermFormId();
  const params = new URLSearchParams();
  params.set('limit', String(options?.limit ?? 50));
  params.set('sort', options?.sort ?? 'desc');
  if (options?.afterDate) params.set('afterDate', options.afterDate);
  if (options?.offset != null) params.set('offset', String(options.offset));

  const url = `${filloutProxyBase()}/forms/${encodeURIComponent(formId)}/submissions?${params}`;
  const res = await fetch(url);
  const body = (await res.json().catch(() => ({}))) as {
    responses?: FilloutSubmission[];
    totalResponses?: number;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(
      body.error || `Fillout proxy error (${res.status})`,
    );
  }
  return {
    responses: body.responses ?? [],
    totalResponses: body.totalResponses ?? 0,
  };
}

export async function probeFilloutProxyHealth(): Promise<{
  ok: boolean;
  filloutConfigured: boolean;
}> {
  try {
    const res = await fetch(`${filloutProxyBase()}/health`);
    if (!res.ok) return { ok: false, filloutConfigured: false };
    const body = (await res.json()) as {
      ok?: boolean;
      filloutConfigured?: boolean;
    };
    return {
      ok: Boolean(body.ok),
      filloutConfigured: Boolean(body.filloutConfigured),
    };
  } catch {
    return { ok: false, filloutConfigured: false };
  }
}
