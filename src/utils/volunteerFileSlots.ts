import type { VolunteerFile } from '../types/volunteer';
import { condenseItineraryPdfFiles } from './condenseItineraryPdfFiles';
import { inferVolunteerFileIsImage } from './inferVolunteerFileIsImage';
import {
  collectListedVolunteerFileKeys,
  excludeListedVolunteerFileDuplicates,
} from './volunteerFileDedup';

const viteEnv = (): Record<string, string | undefined> => import.meta.env ?? {};

function normalizedFileName(name: string): string {
  return name.replace(/^Itinerary - /i, '').trim().toLowerCase();
}

function isCopyOfSlottedFileName(
  file: VolunteerFile,
  slotted?: VolunteerFile,
): boolean {
  if (!slotted?.name?.trim()) return false;
  return normalizedFileName(file.name) === normalizedFileName(slotted.name);
}

export interface VolunteerFileSlots {
  profilePhoto?: VolunteerFile;
  passport?: VolunteerFile;
  backgroundCheck?: VolunteerFile;
  childSafeguarding?: VolunteerFile;
  itineraryFiles: VolunteerFile[];
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
  childSafeguardingFile?: VolunteerFile,
): VolunteerFileSlots {
  const consumed = new Set<string>();
  let passportFromFiles: VolunteerFile | undefined;
  let backgroundCheck: VolunteerFile | undefined;
  let childSafeguardingFromFiles: VolunteerFile | undefined;
  let profileFromFiles: VolunteerFile | undefined;
  const itineraryFromFiles: VolunteerFile[] = [];

  for (const file of files) {
    if (matchesSlot(file, /passport/i)) {
      passportFromFiles = file;
      consumed.add(file.id);
    } else if (matchesSlot(file, /background/i)) {
      backgroundCheck = withPasswordAccess(file);
      consumed.add(file.id);
    } else if (matchesSlot(file, /safeguard/i)) {
      childSafeguardingFromFiles = file;
      consumed.add(file.id);
    } else if (matchesSlot(file, /itinerary/i)) {
      itineraryFromFiles.push(file);
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

  const childSafeguarding =
    childSafeguardingFile?.url != null && childSafeguardingFile.url !== ''
      ? {
          id: childSafeguardingFile.id || 'child-safeguarding',
          name:
            childSafeguardingFile.name || 'Child safeguarding certificate',
          url: childSafeguardingFile.url,
          isImage: childSafeguardingFile.isImage,
        }
      : childSafeguardingFromFiles;

  if (childSafeguardingFromFiles) {
    consumed.add(childSafeguardingFromFiles.id);
  }

  const itineraryFiles = condenseItineraryPdfFiles(
    itineraryFromFiles,
    viteEnv().VITE_MONDAY_API_PROXY_URL,
  );

  const listedFileKeys = collectListedVolunteerFileKeys([
    profilePhoto,
    passport,
    backgroundCheck,
    childSafeguarding,
    ...itineraryFiles,
    ...itineraryFromFiles,
  ]);

  const otherFiles = excludeListedVolunteerFileDuplicates(
    files.filter((file) => !consumed.has(file.id)),
    listedFileKeys,
  ).filter(
    (file) =>
      !isCopyOfSlottedFileName(file, profilePhoto) &&
      !isCopyOfSlottedFileName(file, passport) &&
      !isCopyOfSlottedFileName(file, childSafeguarding),
  );

  return {
    profilePhoto,
    passport,
    backgroundCheck,
    childSafeguarding,
    itineraryFiles,
    otherFiles,
  };
}

export function fileRequiresPassword(file: VolunteerFile): boolean {
  return file.access === 'password' || /background/i.test(file.name);
}
