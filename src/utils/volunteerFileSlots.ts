/**
 * volunteerFileSlots.ts — Categorize volunteer attachments into active slots + old files.
 */

import type { VolunteerFile } from '../types/volunteer';
import { isArchivedVolunteerFileName } from './archivedVolunteerFiles';
import {
  assetIdFromVolunteerFileUrl,
  condenseItineraryPdfFiles,
} from './condenseItineraryPdfFiles';
import { inferVolunteerFileIsImage } from './inferVolunteerFileIsImage';
import {
  collectListedVolunteerFileKeys,
  excludeListedVolunteerFileDuplicates,
} from './volunteerFileDedup';

const viteEnv = (): Record<string, string | undefined> => import.meta.env ?? {};

function normalizedFileName(name: string): string {
  return name
    .replace(/^Old\s*-\s*/i, '')
    .replace(/^Itinerary - /i, '')
    .trim()
    .toLowerCase();
}

function isCopyOfSlottedFileName(
  file: VolunteerFile,
  slotted?: VolunteerFile,
): boolean {
  if (!slotted?.name?.trim()) return false;
  return normalizedFileName(file.name) === normalizedFileName(slotted.name);
}

function sameAsset(a: VolunteerFile, b?: VolunteerFile): boolean {
  if (!b) return false;
  const aId = assetIdFromVolunteerFileUrl(a);
  const bId = assetIdFromVolunteerFileUrl(b);
  if (aId && bId) return aId === bId;
  if (a.url && b.url) return a.url.split('?')[0] === b.url.split('?')[0];
  return a.id === b.id;
}

export interface VolunteerFileSlots {
  profilePhoto?: VolunteerFile;
  passport?: VolunteerFile;
  backgroundCheck?: VolunteerFile;
  childSafeguarding?: VolunteerFile;
  itineraryFiles: VolunteerFile[];
  otherFiles: VolunteerFile[];
  /** Superseded uploads kept on the item (Old - …) plus older same-slot copies. */
  oldFiles: VolunteerFile[];
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
  const oldFiles: VolunteerFile[] = [];
  const activeFiles: VolunteerFile[] = [];

  for (const file of files) {
    if (isArchivedVolunteerFileName(file.name)) {
      oldFiles.push(file);
      consumed.add(file.id);
      continue;
    }
    activeFiles.push(file);
  }

  let passportFromFiles: VolunteerFile | undefined;
  let backgroundCheck: VolunteerFile | undefined;
  let childSafeguardingFromFiles: VolunteerFile | undefined;
  const profileFromFilesList: VolunteerFile[] = [];
  const passportFromFilesList: VolunteerFile[] = [];
  const backgroundFromFilesList: VolunteerFile[] = [];
  const safeguardFromFilesList: VolunteerFile[] = [];
  const itineraryFromFiles: VolunteerFile[] = [];

  for (const file of activeFiles) {
    if (matchesSlot(file, /passport/i)) {
      passportFromFilesList.push(file);
      consumed.add(file.id);
    } else if (matchesSlot(file, /background/i)) {
      backgroundFromFilesList.push(withPasswordAccess(file));
      consumed.add(file.id);
    } else if (matchesSlot(file, /safeguard/i)) {
      safeguardFromFilesList.push(file);
      consumed.add(file.id);
    } else if (matchesSlot(file, /itinerary/i)) {
      itineraryFromFiles.push(file);
      consumed.add(file.id);
    } else if (file.isImage && matchesSlot(file, /profile/i) && file.url) {
      profileFromFilesList.push(file);
      consumed.add(file.id);
    }
  }

  // Newest same-slot file is current; earlier copies stay listed under Old files.
  const profileFromFiles = profileFromFilesList.at(-1);
  passportFromFiles = passportFromFilesList.at(-1);
  backgroundCheck = backgroundFromFilesList.at(-1);
  childSafeguardingFromFiles = safeguardFromFilesList.at(-1);

  for (const file of profileFromFilesList.slice(0, -1)) {
    oldFiles.push(file);
  }
  for (const file of passportFromFilesList.slice(0, -1)) {
    oldFiles.push(file);
  }
  for (const file of backgroundFromFilesList.slice(0, -1)) {
    oldFiles.push(file);
  }
  for (const file of safeguardFromFilesList.slice(0, -1)) {
    oldFiles.push(file);
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

  if (
    profilePhoto &&
    profileFromFiles &&
    !sameAsset(profileFromFiles, profilePhoto)
  ) {
    oldFiles.push(profileFromFiles);
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

  if (passport && passportFromFiles && !sameAsset(passportFromFiles, passport)) {
    oldFiles.push(passportFromFiles);
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

  if (
    childSafeguarding &&
    childSafeguardingFromFiles &&
    !sameAsset(childSafeguardingFromFiles, childSafeguarding)
  ) {
    oldFiles.push(childSafeguardingFromFiles);
  }

  // One current itinerary slot: merge PDFs when present; otherwise keep the newest
  // non-PDF. Extra itinerary uploads go under Files (not Itinerary (2)).
  const itineraryPdfs = itineraryFromFiles.filter((file) =>
    /\.pdf$/i.test(file.name),
  );
  const itineraryNonPdfs = itineraryFromFiles.filter(
    (file) => !/\.pdf$/i.test(file.name),
  );
  let itineraryFiles: VolunteerFile[] = [];
  if (itineraryPdfs.length > 0) {
    itineraryFiles = condenseItineraryPdfFiles(
      itineraryPdfs,
      viteEnv().VITE_MONDAY_API_PROXY_URL,
    );
    oldFiles.push(...itineraryNonPdfs);
  } else if (itineraryNonPdfs.length > 0) {
    const current = itineraryNonPdfs.at(-1)!;
    itineraryFiles = [current];
    oldFiles.push(...itineraryNonPdfs.slice(0, -1));
  }

  const listedFileKeys = collectListedVolunteerFileKeys([
    profilePhoto,
    passport,
    backgroundCheck,
    childSafeguarding,
    ...itineraryFiles,
    ...itineraryFromFiles,
  ]);

  const otherFiles = excludeListedVolunteerFileDuplicates(
    activeFiles.filter((file) => !consumed.has(file.id)),
    listedFileKeys,
  ).filter(
    (file) =>
      !isCopyOfSlottedFileName(file, profilePhoto) &&
      !isCopyOfSlottedFileName(file, passport) &&
      !isCopyOfSlottedFileName(file, childSafeguarding),
  );

  const oldListedKeys = collectListedVolunteerFileKeys([
    profilePhoto,
    passport,
    backgroundCheck,
    childSafeguarding,
    ...itineraryFiles,
  ]);
  const dedupedOldFiles = excludeListedVolunteerFileDuplicates(
    oldFiles,
    oldListedKeys,
  );

  return {
    profilePhoto,
    passport,
    backgroundCheck,
    childSafeguarding,
    itineraryFiles,
    otherFiles,
    oldFiles: dedupedOldFiles,
  };
}

export function fileRequiresPassword(file: VolunteerFile): boolean {
  return file.access === 'password' || /background/i.test(file.name);
}
