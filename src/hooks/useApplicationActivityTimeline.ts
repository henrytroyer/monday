import { useMemo } from 'react';
import { useApplicationEmailCorrespondence } from './useApplicationEmailCorrespondence';
import { buildApplicationActivityTimeline } from '../services/buildApplicationActivityTimeline';
import type { TermNote } from '../types/volunteer';

interface UseApplicationActivityTimelineOptions {
  itemId: string;
  timelineId: string;
  timelineLabel: string;
  termNotes: TermNote[];
  contactEmail?: string;
  contactEmails?: string[];
  itemCreatedAt?: string;
}

export function useApplicationActivityTimeline({
  itemId,
  timelineId,
  timelineLabel,
  termNotes,
  contactEmail,
  contactEmails,
  itemCreatedAt,
}: UseApplicationActivityTimelineOptions) {
  const { messages, loading, error } = useApplicationEmailCorrespondence({
    itemId,
    timelineId,
    timelineLabel,
    contactEmail,
    contactEmails,
  });

  const events = useMemo(
    () =>
      buildApplicationActivityTimeline({
        termNotes,
        emails: messages,
        itemCreatedAt,
      }),
    [termNotes, messages, itemCreatedAt],
  );

  return { events, loading, error };
}
