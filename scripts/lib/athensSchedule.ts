/**
 * athensSchedule.ts — Europe/Athens schedule helpers for GitHub cron jobs.
 * GitHub Actions cron is UTC-only; pair with dual UTC triggers + this guard.
 */

/** True when the current clock is 17:00–17:59 in Europe/Athens. */
export function isSeventeenHundredAthens(now = new Date()): boolean {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Athens',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value);
  return hour === 17;
}

/**
 * Safe for unattended merge: same person / household, not two different people
 * who happen to share an email (e.g. Jennifer Mast vs Brooke Mast).
 */
export function namesCompatibleForAutoMerge(a: string, b: string): boolean {
  const na = normalizeLoose(a);
  const nb = normalizeLoose(b);
  if (!na || !nb) return false;
  if (na === nb) return true;

  const tokensA = na.split(' ').filter(Boolean);
  const tokensB = nb.split(' ').filter(Boolean);
  if (tokensA.length === 0 || tokensB.length === 0) return false;

  const [longer, shorter] =
    tokensA.length >= tokensB.length
      ? [tokensA, tokensB]
      : [tokensB, tokensA];

  // Shorter name's tokens all appear in the longer (Gary ⊂ Gary and Becky Wagler).
  if (shorter.length >= 2 && shorter.every((token) => longer.includes(token))) {
    return true;
  }

  // Same first + last with middle noise (Lara Bruijne ≈ Lara de Bruijne).
  if (
    tokensA[0] === tokensB[0] &&
    tokensA[tokensA.length - 1] === tokensB[tokensB.length - 1]
  ) {
    return true;
  }

  return false;
}

function normalizeLoose(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}
