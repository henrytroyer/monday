import { useEffect } from 'react';
import { useApplicationEmailCorrespondence } from '../../hooks/useApplicationEmailCorrespondence';
import ApplicationEmailThread from '../email-correspondence/ApplicationEmailThread';

interface TermEmailCorrespondenceProps {
  itemId: string;
  timelineId: string;
  timelineLabel: string;
  contactName: string;
  contactEmail?: string;
  contactEmails?: string[];
  contactId?: string;
  onRefetchReady?: (refetch: () => void) => void;
}

export default function TermEmailCorrespondence({
  itemId,
  timelineId,
  timelineLabel,
  contactName,
  contactEmail,
  contactEmails,
  contactId,
  onRefetchReady,
}: TermEmailCorrespondenceProps) {
  const { messages, loading, error, refetch } = useApplicationEmailCorrespondence({
    itemId,
    timelineId,
    timelineLabel,
    contactEmail,
    contactEmails,
  });

  useEffect(() => {
    onRefetchReady?.(refetch);
  }, [onRefetchReady, refetch]);

  return (
    <ApplicationEmailThread
      applicationId={itemId}
      termOfServiceId={timelineId}
      timelineLabel={timelineLabel}
      contactId={contactId ?? itemId}
      contactName={contactName}
      contactEmail={contactEmail ?? contactEmails?.[0] ?? ''}
      messages={messages}
      loading={loading}
      error={error}
      onSent={refetch}
    />
  );
}
