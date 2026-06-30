export type VolunteerFileSlotKey =
  | 'profile'
  | 'passport'
  | 'backgroundcheck'
  | 'childsafeguarding'
  | 'other';

const SLOT_SUFFIX: Record<Exclude<VolunteerFileSlotKey, 'other'>, string> = {
  profile: 'profile',
  passport: 'passport',
  backgroundcheck: 'backgroundcheck',
  childsafeguarding: 'childsafeguarding',
};

export function slugifyVolunteerName(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '');
  return slug || 'volunteer';
}

function fileExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot > 0 ? filename.slice(dot) : '';
}

function basenameWithoutExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot > 0 ? filename.slice(0, dot) : filename;
}

export function inferVolunteerFileSlotKey(
  file: { name: string; id?: string },
): VolunteerFileSlotKey {
  if (file.id === 'profile-photo' || /profile/i.test(file.name)) {
    return 'profile';
  }
  if (/passport/i.test(file.name)) return 'passport';
  if (/background/i.test(file.name)) return 'backgroundcheck';
  if (/safeguard/i.test(file.name)) return 'childsafeguarding';
  return 'other';
}

/** e.g. John Doe + passport + Passport.pdf → johndoepassport.pdf */
export function suggestedDownloadFilename(
  volunteerName: string,
  slotKey: VolunteerFileSlotKey,
  originalFilename: string,
): string {
  const prefix = slugifyVolunteerName(volunteerName);
  const ext = fileExtension(originalFilename);

  if (slotKey === 'other') {
    const base = basenameWithoutExtension(originalFilename)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '');
    return `${prefix}${base}${ext}`;
  }

  return `${prefix}${SLOT_SUFFIX[slotKey]}${ext}`;
}

export function sanitizeDownloadFilename(value: string): string {
  return value.replace(/[/\\?%*:|"<>]/g, '').trim();
}
