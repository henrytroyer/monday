/** Curved ribbon arrows aligned to the i58 logo "58" region (shared SVG viewBox). */

/** Crop to the blue numerals where the 8 and directional arrow read clearly. */
export const EMAIL_DIRECTION_VIEWBOX = '620 0 620 764';

/** Full logo coordinate space (for positioning the raster under the crop). */
export const I58_LOGO_WIDTH = 1181;
export const I58_LOGO_HEIGHT = 764;

/** Warm accent — high contrast on the logo blue at small sizes. */
export const EMAIL_ARROW_FILL = '#d97706';
export const EMAIL_ARROW_STROKE = '#ffffff';

/** Received into i58 — arrow curves in from the right toward the 8. */
export const INBOUND_ARROW_PATH =
  'M 1165 250 C 1085 170 965 170 860 235 C 800 280 755 300 710 310 ' +
  'L 655 340 L 590 365 L 655 390 L 710 420 ' +
  'C 755 410 800 430 860 485 C 965 550 1085 550 1165 470 Z';

/** Sent from i58 — arrow exits the 8 toward the right. */
export const OUTBOUND_ARROW_PATH =
  'M 655 250 C 735 170 855 170 960 235 C 1020 280 1065 300 1110 310 ' +
  'L 1165 340 L 1230 365 L 1165 390 L 1110 420 ' +
  'C 1065 410 1020 430 960 485 C 855 550 735 550 655 470 Z';
