/** Guess whether a monday file should preview as an image in the browser. */
export function inferVolunteerFileIsImage(
  url: string,
  fileName?: string,
  mondayIsImage?: boolean | string,
): boolean {
  const label = fileName || url;
  if (/\.pdf(\?|$)/i.test(label)) return false;
  if (mondayIsImage === true || mondayIsImage === 'true') return true;
  if (/\.(png|jpe?g|gif|webp|svg|heic|heif)(\?|$)/i.test(label)) return true;
  if (/\/assets\/\d+(\?|$)/.test(url)) return true;
  return false;
}
