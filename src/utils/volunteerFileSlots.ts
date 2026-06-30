import type { VolunteerFile } from '../types/volunteer';
import { inferVolunteerFileIsImage } from './inferVolunteerFileIsImage';

export interface VolunteerFileSlots {
  profilePhoto?: VolunteerFile;
  passport?: VolunteerFile;
  backgroundCheck?: VolunteerFile;
  childSafeguarding?: VolunteerFile;
  otherFiles: VolunteerFile[];
}

function matchesSlot(file: VolunteerFile, pattern: RegExp): boolean {
  return pattern.test(file.name);
}

function withPasswordAccess(file: VolunteerFile): VolunteerFile {
  return { ...file, access: 'password' };
}

export function resolveVolunteerFileSlots(
  profilePhotoUrl: string | undefined,
  files: VolunteerFile[] = [],
  passportFile?: VolunteerFile,
): VolunteerFileSlots {
  const consumed = new Set<string>();
  let passportFromFiles: VolunteerFile | undefined;
  let backgroundCheck: VolunteerFile | undefined;
  let childSafeguarding: VolunteerFile | undefined;
  let profileFromFiles: VolunteerFile | undefined;

  for (const file of files) {
    if (matchesSlot(file, /passport/i)) {
      passportFromFiles = file;
      consumed.add(file.id);
    } else if (matchesSlot(file, /background/i)) {
      backgroundCheck = withPasswordAccess(file);
      consumed.add(file.id);
    } else if (matchesSlot(file, /safeguard/i)) {
      childSafeguarding = file;
      consumed.add(file.id);
    } else if (
      file.isImage &&
      matchesSlot(file, /profile/i) &&
      file.url
    ) {
      profileFromFiles = file;
      consumed.add(file.id);
    }
  }

  const profilePhoto =
    profilePhotoUrl != null && profilePhotoUrl !== ''
      ? {
          id: 'profile-photo',
          name: 'Profile photo',
          url: profilePhotoUrl,
          isImage: true,
        }
      : profileFromFiles;

  if (profileFromFiles) {
    consumed.add(profileFromFiles.id);
  }

  const passport =
    passportFile?.url != null && passportFile.url !== ''
      ? {
          id: passportFile.id || 'passport',
          name: passportFile.name || 'Passport',
          url: passportFile.url,
          isImage: inferVolunteerFileIsImage(
            passportFile.url,
            passportFile.name,
            passportFile.isImage,
          ),
        }
      : passportFromFiles;

  if (passportFromFiles) {
    consumed.add(passportFromFiles.id);
  }

  const otherFiles = files.filter((file) => !consumed.has(file.id));

  return {
    profilePhoto,
    passport,
    backgroundCheck,
    childSafeguarding,
    otherFiles,
  };
}

export function fileRequiresPassword(file: VolunteerFile): boolean {
  return file.access === 'password' || /background/i.test(file.name);
}
