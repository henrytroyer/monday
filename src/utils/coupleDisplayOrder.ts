/**
 * coupleDisplayOrder.ts — Stable "Jack & Jane" couple label ordering.
 * Prefer male then female when genders are known; never order by who existed first.
 */

export type CoupleGender = 'male' | 'female' | 'unknown';

export interface CouplePersonRef {
  name: string;
  gender?: CoupleGender | string | null;
}

export function normalizeCoupleGender(
  value?: string | null,
): CoupleGender {
  const g = (value || '').trim().toLowerCase();
  if (g === 'male' || g === 'm' || g === 'man' || g === 'husband') {
    return 'male';
  }
  if (
    g === 'female' ||
    g === 'f' ||
    g === 'woman' ||
    g === 'wife' ||
    g === 'femail'
  ) {
    return 'female';
  }
  return 'unknown';
}

function firstName(full: string): string {
  return full.trim().split(/\s+/).filter(Boolean)[0] || full.trim();
}

/**
 * Return [first, second] for display / Connected to "Couple: A & B".
 * Male before female when known; if only one gender known, put the male
 * (or the non-female volunteer) first so Jane+Jack → Jack & Jane.
 */
export function orderCoupleDisplayNames(
  a: CouplePersonRef,
  b: CouplePersonRef,
): [string, string] {
  const nameA = a.name.trim();
  const nameB = b.name.trim();
  if (!nameA) return [nameB, nameB];
  if (!nameB) return [nameA, nameA];

  const gA = normalizeCoupleGender(a.gender);
  const gB = normalizeCoupleGender(b.gender);

  if (gA === 'male' && gB !== 'male') return [nameA, nameB];
  if (gB === 'male' && gA !== 'male') return [nameB, nameA];
  if (gA === 'female' && gB === 'unknown') return [nameB, nameA];
  if (gB === 'female' && gA === 'unknown') return [nameA, nameB];

  // Same gender or both unknown — stable alphabetical by first name (not creation order).
  const fa = firstName(nameA).toLowerCase();
  const fb = firstName(nameB).toLowerCase();
  if (fa !== fb) {
    return fa < fb ? [nameA, nameB] : [nameB, nameA];
  }
  return nameA.toLowerCase() <= nameB.toLowerCase()
    ? [nameA, nameB]
    : [nameB, nameA];
}

/** Connected-to couple chip: `Couple: Jack & Jane`. */
export function formatCoupleConnectedLabel(
  a: CouplePersonRef,
  b: CouplePersonRef,
): string {
  const [first, second] = orderCoupleDisplayNames(a, b);
  return `Couple: ${first} & ${second}`;
}
