export const INFORMATION_NEEDED_HEADING = 'Be advised that you will need:';

export const CONTACT_INFO_TITLE = 'Contact Info';
export const CONTACT_INFO_SUBHEAD = 'Email and Phone';
export const CONTACT_INFO_ITEMS = [
  'Parents -not applicable if marriage-',
  'Pastor',
  'Emergency Contact',
  'Person you are accountable to -if different than parents-',
] as const;

export const PASSPORT_PHOTO_TITLE = 'Passport Photo';
export const PASSPORT_TIPS_HEADING = 'Tips for a good photo:';
export const PASSPORT_TIPS = [
  'The full page must be shown (all four corners visible) — don’t crop out edges.',
  'Make sure the photo is sharp, in focus, with no glare or shadows.',
  'All text must be visible: name, date of birth, passport number, expiry date, photo.',
] as const;

export const PROFILE_PHOTO_TITLE = 'Profile Photo';
export const PROFILE_REQUIREMENTS_HEADING = 'Profile Photo Requirements:';
export const PROFILE_REQUIREMENTS = [
  {
    before: 'The photo must be ',
    bold: 'recent',
    after: ' (taken within the last 6 months)',
  },
  { before: 'Face must be ', bold: 'centered', after: '' },
  { before: 'Good lighting — ', bold: 'no shadows or glare', after: '' },
  {
    before: 'Required: ',
    bold: 'Plain neutral background',
    after: ' (white/light grey)',
  },
  {
    before: 'Photo should show ',
    bold: 'head and shoulders',
    after: ' (not full body)',
  },
] as const;
