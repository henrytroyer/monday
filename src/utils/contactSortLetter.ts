/** First sort letter for A–Z index (A–Z or # for non-letters). */
export function getContactSortLetter(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '#';
  const first = trimmed[0].toUpperCase();
  if (first >= 'A' && first <= 'Z') return first;
  return '#';
}

export const CONTACT_ALPHABET_INDEX = [
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
  '#',
] as const;

export function letterAnchorId(letter: string): string {
  return `contact-letter-${letter === '#' ? 'num' : letter}`;
}
