import type { VolunteerProfilePhoto } from '../contract/volunteerApi';

export const PROFILE_PHOTO_BANNER = 'Profile Photo';
export const ID_PHOTO_REQUIREMENTS_HEADING = 'ID Photo Requirements:';
export const ID_PHOTO_EXAMPLE_SRC = '/examples/id-photo-example.png';
export const ID_PHOTO_EXAMPLE_ALT = 'Example of a head-and-shoulders ID photo';
export const ID_PHOTO_LABEL = 'ID Photo';
export const ID_PHOTO_DROP_LEAD = 'Drag & drop a file or';
export const ID_PHOTO_BROWSE = 'browse';

export const ID_PHOTO_REQUIREMENTS: readonly {
  parts: readonly { text: string; bold?: boolean }[];
}[] = [
  {
    parts: [
      {
        text: 'Required- Plain neutral background (white/light grey)',
        bold: true,
      },
    ],
  },
  {
    parts: [
      { text: 'Photo should show ' },
      { text: 'head and shoulders', bold: true },
      { text: ' (not full body or group photo)' },
    ],
  },
  {
    parts: [
      { text: '(Greece)-', bold: true },
      {
        text: ' this photo is used for access into camps. It will be displayed everyday on your lanyard.',
      },
    ],
  },
];

export const emptyProfilePhoto = (): VolunteerProfilePhoto => ({
  photoFileName: '',
});

export function isProfilePhotoComplete(draft: VolunteerProfilePhoto): boolean {
  return draft.photoFileName.trim().length > 0;
}
