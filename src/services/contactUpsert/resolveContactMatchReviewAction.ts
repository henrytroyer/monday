/**
 * resolveContactMatchReviewAction.ts — Apply Match Review approve/reject decisions.
 */

import type { ContactListItem } from '../../types/contact';
import { fetchContactsList } from '../contactsApi';
import {
  listContactMatchReviews,
  resolveContactMatchReview,
  type ContactMatchReviewItem,
} from './contactMatchReviewStorage';
import { upsertContactPerson } from './contactUpsert';

export async function approveContactMatchReview(
  reviewId: string,
  chosenContactId: string,
): Promise<{ ok: boolean; contact?: ContactListItem; message: string }> {
  const pending = listContactMatchReviews('pending').find(
    (item) => item.id === reviewId,
  );
  if (!pending) {
    return { ok: false, message: 'Review item not found' };
  }

  const contacts = await fetchContactsList({ refresh: true }).catch(() => []);
  const result = await upsertContactPerson(
    {
      name: pending.incoming.name,
      email: pending.incoming.email,
      phone: pending.incoming.phone,
      tags: pending.incoming.tags,
      city: pending.incoming.city,
      address: pending.incoming.address,
      zip: pending.incoming.zip,
      demographics:
        pending.incoming.address ||
        pending.incoming.city ||
        pending.incoming.zip
          ? {
              address: pending.incoming.address,
              city: pending.incoming.city,
              zip: pending.incoming.zip,
            }
          : undefined,
      source: pending.source,
      sourceItemId: pending.sourceItemId,
      forceContactId: chosenContactId,
    },
    contacts,
  );

  resolveContactMatchReview(reviewId, {
    status: 'approved',
    chosenContactId,
  });

  return {
    ok: result.action === 'updated' || result.action === 'created',
    contact: result.contact,
    message: result.message,
  };
}

export async function rejectContactMatchReview(
  reviewId: string,
  options?: { createInstead?: boolean },
): Promise<{ ok: boolean; contact?: ContactListItem; message: string }> {
  const pending = listContactMatchReviews('pending').find(
    (item) => item.id === reviewId,
  );
  if (!pending) {
    return { ok: false, message: 'Review item not found' };
  }

  resolveContactMatchReview(reviewId, { status: 'rejected' });

  if (!options?.createInstead) {
    return { ok: true, message: 'Rejected — left unmatched' };
  }

  const contacts = await fetchContactsList({ refresh: true }).catch(() => []);
  const result = await upsertContactPerson(
    {
      name: pending.incoming.name,
      email: pending.incoming.email,
      phone: pending.incoming.phone,
      tags: pending.incoming.tags,
      city: pending.incoming.city,
      address: pending.incoming.address,
      zip: pending.incoming.zip,
      demographics:
        pending.incoming.address ||
        pending.incoming.city ||
        pending.incoming.zip
          ? {
              address: pending.incoming.address,
              city: pending.incoming.city,
              zip: pending.incoming.zip,
            }
          : undefined,
      source: pending.source,
      sourceItemId: pending.sourceItemId,
      forceCreate: true,
    },
    contacts,
  );

  return {
    ok: Boolean(result.contact),
    contact: result.contact,
    message: result.message,
  };
}

export function getPendingContactMatchReviews(): ContactMatchReviewItem[] {
  return listContactMatchReviews('pending');
}
