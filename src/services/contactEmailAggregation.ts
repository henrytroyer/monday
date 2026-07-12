import { useMockData } from '../config/boards';
import {
  buildCuratedJohnDoeEmailThread,
  buildMockContactEmailThread,
} from '../data/mockContactEmailThread';
import type {
  ContactEmailMessage,
  ContactListItem,
  EmailCorrespondenceSource,
} from '../types/contact';
import type { VolunteerTerm } from '../types/volunteer';
import { isRecruitmentServiceTerm } from './contactServiceRecordStorage';
import {
  clearEmailTimelineCache,
  fetchItemEmailTimeline,
} from './fetchItemEmailTimeline';
import { dedupeEmailCorrespondence } from './dedupeEmailCorrespondence';

export interface AggregateContactEmailOptions {
  contactId: string;
  contactEmail: string;
  contactName: string;
  serviceTerms: VolunteerTerm[];
}

function dedupeMessages(messages: ContactEmailMessage[]): ContactEmailMessage[] {
  return dedupeEmailCorrespondence(messages);
}

export async function aggregateContactEmailCorrespondence(
  options: AggregateContactEmailOptions,
): Promise<ContactEmailMessage[]> {
  const { contactId, contactEmail, contactName, serviceTerms } = options;

  if (useMockData()) {
    if (contactId === 'contact-1') {
      return buildCuratedJohnDoeEmailThread();
    }
    return buildMockContactEmailThread(contactId, {
      name: contactName,
      email: contactEmail,
    });
  }

  const contactEmails = contactEmail && contactEmail !== '—' ? [contactEmail] : [];
  const fetches: Promise<ContactEmailMessage[]>[] = [];

  fetches.push(
    fetchItemEmailTimeline(contactId, {
      contactId,
      source: 'general',
      sourceLabel: 'Contact',
      contactEmails,
    }),
  );

  for (const term of serviceTerms) {
    if (isRecruitmentServiceTerm(term)) continue;
    if (!term.itemId || term.itemId.startsWith('mock-')) continue;

    fetches.push(
      fetchItemEmailTimeline(term.itemId, {
        contactId,
        source: 'application' as EmailCorrespondenceSource,
        sourceLabel: term.timelineLabel,
        itemId: term.itemId,
        timelineId: term.timelineId,
        contactEmails,
      }),
    );
  }

  const batches = await Promise.all(fetches);
  return dedupeMessages(batches.flat());
}

export function invalidateContactEmailCaches(contactId: string): void {
  clearEmailTimelineCache(contactId);
}

export function invalidateApplicationEmailCache(itemId: string): void {
  clearEmailTimelineCache(itemId);
}

export function mockContactForThread(
  contact: Pick<ContactListItem, 'id' | 'name' | 'email'>,
): AggregateContactEmailOptions {
  return {
    contactId: contact.id,
    contactEmail: contact.email,
    contactName: contact.name,
    serviceTerms: [],
  };
}
