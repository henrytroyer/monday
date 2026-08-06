/**
 * ingestApplicationBundle.ts — Upsert volunteer/parents/pastors/spouse from an extracted bundle.
 */

import type { ContactListItem } from '../../types/contact';
import {
  upsertContactPerson,
  type ContactUpsertResult,
} from './contactUpsert';
import type { ExtractedApplicationBundle, ExtractedPerson } from './extractPeopleFromBoards';
import { syncAssetToContactColumn } from './syncContactFiles';
import { resolveContactsBoardId } from '../../config/boards';

export interface BundleIngestResult {
  results: ContactUpsertResult[];
  volunteerContactId?: string;
  spouseContactId?: string;
  pastorContactIds: string[];
}

async function syncFilesForPerson(
  contactId: string,
  person: ExtractedPerson,
  options?: { force?: boolean },
): Promise<void> {
  const boardId = resolveContactsBoardId();
  if (!boardId || !person.files?.length) return;

  for (const file of person.files) {
    // Spouse files use spouse* slots when writing onto the spouse contact —
    // map spouse slots to primary profile/passport on the spouse item.
    const slot =
      person.role === 'spouse'
        ? file.slot === 'spouseProfilePhoto'
          ? 'profilePhoto'
          : file.slot === 'spousePassport'
            ? 'passport'
            : file.slot
        : file.slot;

    await syncAssetToContactColumn({
      contactsBoardId: boardId,
      contactId,
      slot,
      sourceAssetId: file.assetId,
      sourceFileName: file.fileName,
      force: options?.force,
    }).catch(() => undefined);
  }
}

/**
 * Ingest one application/CSE bundle into Contacts.
 * Mutates `contacts` in-place so later people in the same run see new creates.
 */
export async function ingestApplicationBundle(
  bundle: ExtractedApplicationBundle,
  contacts: ContactListItem[],
): Promise<BundleIngestResult> {
  const results: ContactUpsertResult[] = [];
  const pastorContactIds: string[] = [];
  const isCseRefresh = bundle.sourceLabel === 'service-ended';
  const preferIncoming = isCseRefresh;

  const currentPastor = bundle.newPastor ?? bundle.pastor;

  const volunteerResult = await upsertContactPerson(
    {
      name: bundle.volunteer.name,
      email: bundle.volunteer.email,
      phone: bundle.volunteer.phone,
      tags: bundle.volunteer.tags,
      demographics: bundle.volunteer.demographics,
      city: bundle.volunteer.demographics?.city,
      address: bundle.volunteer.demographics?.address,
      zip: bundle.volunteer.demographics?.zip,
      source: bundle.sourceLabel,
      sourceItemId: bundle.sourceItemId,
      preferIncoming,
      pastorOnVolunteer: currentPastor
        ? {
            name: currentPastor.name,
            email: currentPastor.email,
            phone: currentPastor.phone,
            church: currentPastor.church,
          }
        : undefined,
      parentOnVolunteer: bundle.parents
        ? {
            name: bundle.parents.name,
            email: bundle.parents.email,
            phone: bundle.parents.phone,
          }
        : undefined,
      spouseOnVolunteer: bundle.spouse
        ? { name: bundle.spouse.name, email: bundle.spouse.email }
        : undefined,
      emergencyOnVolunteer: bundle.emergency,
      connectedToLabels: [
        bundle.spouse?.name,
        bundle.pastor?.name,
        bundle.newPastor?.name,
        bundle.parents?.name,
      ].filter((label): label is string => Boolean(label)),
    },
    contacts,
  );
  results.push(volunteerResult);

  let volunteerContactId = volunteerResult.contact?.id;
  if (volunteerResult.contact) {
    const idx = contacts.findIndex((c) => c.id === volunteerResult.contact!.id);
    if (idx >= 0) contacts[idx] = volunteerResult.contact;
    else contacts.push(volunteerResult.contact);
    await syncFilesForPerson(volunteerResult.contact.id, bundle.volunteer, {
      force: isCseRefresh,
    });
  }

  if (bundle.parents) {
    const parentResult = await upsertContactPerson(
      {
        name: bundle.parents.name,
        email: bundle.parents.email,
        phone: bundle.parents.phone,
        tags: bundle.parents.tags,
        source: bundle.sourceLabel,
        sourceItemId: bundle.sourceItemId,
        preferIncoming,
        connectedToLabels: volunteerContactId
          ? [bundle.volunteer.name]
          : undefined,
      },
      contacts,
    );
    results.push(parentResult);
    if (parentResult.contact) {
      const idx = contacts.findIndex((c) => c.id === parentResult.contact!.id);
      if (idx >= 0) contacts[idx] = parentResult.contact;
      else contacts.push(parentResult.contact);
    }
  }

  // Keep old pastor, then upsert new pastor when present.
  if (bundle.pastor) {
    const pastorResult = await upsertContactPerson(
      {
        name: bundle.pastor.name,
        email: bundle.pastor.email,
        phone: bundle.pastor.phone,
        tags: bundle.pastor.tags,
        source: bundle.sourceLabel,
        sourceItemId: bundle.sourceItemId,
        preferIncoming,
        connectedToLabels: [bundle.volunteer.name],
      },
      contacts,
    );
    results.push(pastorResult);
    if (pastorResult.contact) {
      pastorContactIds.push(pastorResult.contact.id);
      const idx = contacts.findIndex((c) => c.id === pastorResult.contact!.id);
      if (idx >= 0) contacts[idx] = pastorResult.contact;
      else contacts.push(pastorResult.contact);
    }
  }

  if (bundle.newPastor) {
    const newPastorResult = await upsertContactPerson(
      {
        name: bundle.newPastor.name,
        email: bundle.newPastor.email,
        phone: bundle.newPastor.phone,
        tags: bundle.newPastor.tags,
        source: bundle.sourceLabel,
        sourceItemId: `${bundle.sourceItemId}:new-pastor`,
        preferIncoming,
        connectedToLabels: [bundle.volunteer.name],
      },
      contacts,
    );
    results.push(newPastorResult);
    if (newPastorResult.contact) {
      pastorContactIds.push(newPastorResult.contact.id);
      const idx = contacts.findIndex(
        (c) => c.id === newPastorResult.contact!.id,
      );
      if (idx >= 0) contacts[idx] = newPastorResult.contact;
      else contacts.push(newPastorResult.contact);
    }
  }

  // Ensure volunteer Connected to: lists both pastors when both exist.
  if (
    volunteerContactId &&
    bundle.pastor &&
    bundle.newPastor &&
    volunteerResult.contact
  ) {
    await upsertContactPerson(
      {
        name: bundle.volunteer.name,
        email: bundle.volunteer.email,
        phone: bundle.volunteer.phone,
        tags: [],
        source: bundle.sourceLabel,
        sourceItemId: bundle.sourceItemId,
        forceContactId: volunteerContactId,
        connectedToLabels: [bundle.pastor.name, bundle.newPastor.name],
        pastorOnVolunteer: {
          name: bundle.newPastor.name,
          email: bundle.newPastor.email,
          phone: bundle.newPastor.phone,
          church: bundle.newPastor.church,
        },
      },
      contacts,
    );
  }

  let spouseContactId: string | undefined;
  if (bundle.spouse) {
    const spouseResult = await upsertContactPerson(
      {
        name: bundle.spouse.name,
        email: bundle.spouse.email,
        phone: bundle.spouse.phone,
        tags: bundle.spouse.tags,
        source: bundle.sourceLabel,
        sourceItemId: `${bundle.sourceItemId}:spouse`,
        preferIncoming,
        connectedToLabels: [bundle.volunteer.name],
        spouseOnVolunteer: {
          name: bundle.volunteer.name,
          email: bundle.volunteer.email,
        },
      },
      contacts,
    );
    results.push(spouseResult);
    if (spouseResult.contact) {
      spouseContactId = spouseResult.contact.id;
      const idx = contacts.findIndex((c) => c.id === spouseResult.contact!.id);
      if (idx >= 0) contacts[idx] = spouseResult.contact;
      else contacts.push(spouseResult.contact);
      await syncFilesForPerson(spouseResult.contact.id, bundle.spouse, {
        force: isCseRefresh,
      });
    }

    // Couple merge: cross-link volunteer ↔ spouse on Connected to:
    if (volunteerContactId && spouseContactId) {
      await upsertContactPerson(
        {
          name: bundle.volunteer.name,
          email: bundle.volunteer.email,
          tags: [],
          source: bundle.sourceLabel,
          forceContactId: volunteerContactId,
          connectedToLabels: [
            `Couple: ${bundle.volunteer.name} & ${bundle.spouse.name}`,
            bundle.spouse.name,
          ],
          spouseOnVolunteer: {
            name: bundle.spouse.name,
            email: bundle.spouse.email,
          },
        },
        contacts,
      );
    }
  }

  return {
    results,
    volunteerContactId,
    spouseContactId,
    pastorContactIds,
  };
}
