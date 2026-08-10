/**
 * filloutDirectApi.ts — Node-side Fillout REST (uses FILLOUT_API_KEY; no Vite proxy).
 */

import type { FilloutSubmission } from './mapFilloutShortTermToBundle';

const DEFAULT_FORM_ID = 'rmkCicr2a5us';
const DEFAULT_API_BASE = 'https://api.fillout.com/v1/api';

function env(name: string): string | undefined {
  try {
    return process.env?.[name]?.trim() || undefined;
  } catch {
    return undefined;
  }
}

export function filloutApiBase(): string {
  return (env('FILLOUT_API_BASE') || DEFAULT_API_BASE).replace(/\/$/, '');
}

export function filloutApiKey(): string | undefined {
  return env('FILLOUT_API_KEY');
}

export function filloutShortTermFormIdDirect(): string {
  return (
    env('FILLOUT_SHORT_TERM_FORM_ID') ||
    env('VITE_FILLOUT_SHORT_TERM_FORM_ID') ||
    DEFAULT_FORM_ID
  );
}

export async function fetchFilloutSubmissionsDirect(options?: {
  formId?: string;
  afterDate?: string;
  limit?: number;
  offset?: number;
  sort?: 'asc' | 'desc';
}): Promise<{
  responses: FilloutSubmission[];
  totalResponses: number;
}> {
  const apiKey = filloutApiKey();
  if (!apiKey) {
    throw new Error('Set FILLOUT_API_KEY in environment');
  }

  const formId = options?.formId || filloutShortTermFormIdDirect();
  const url = new URL(
    `${filloutApiBase()}/forms/${encodeURIComponent(formId)}/submissions`,
  );
  url.searchParams.set('limit', String(options?.limit ?? 50));
  url.searchParams.set('sort', options?.sort ?? 'desc');
  if (options?.afterDate) url.searchParams.set('afterDate', options.afterDate);
  if (options?.offset != null) {
    url.searchParams.set('offset', String(options.offset));
  }

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  });
  const body = (await res.json().catch(() => ({}))) as {
    responses?: FilloutSubmission[];
    totalResponses?: number;
    error?: { message?: string } | string;
    message?: string;
  };
  if (!res.ok) {
    const err =
      (typeof body.error === 'object' ? body.error?.message : body.error) ||
      body.message ||
      `Fillout API error (${res.status})`;
    throw new Error(err);
  }
  return {
    responses: body.responses ?? [],
    totalResponses: body.totalResponses ?? 0,
  };
}
