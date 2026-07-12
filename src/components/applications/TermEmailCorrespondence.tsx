import { useEffect, useState } from 'react';
import { useApplicationEmailCorrespondence } from '../../hooks/useApplicationEmailCorrespondence';
import type { ContactEmailMessage } from '../../types/contact';
import ContactEmailDetailModal from '../contacts/ContactEmailDetailModal';
import EmailCorrespondencePanel from '../shared/EmailCorrespondencePanel';

interface TermEmailCorrespondenceProps {
  itemId: string;
  timelineId: string;
  timelineLabel: string;
  contactName: string;
  contactEmail?: string;
  contactEmails?: string[];
  onRefetchReady?: (refetch: () => void) => void;
}

export default function TermEmailCorrespondence({
  itemId,
  timelineId,
  timelineLabel,
  contactName,
  contactEmail,
  contactEmails,
  onRefetchReady,
}: TermEmailCorrespondenceProps) {
  const { messages, loading, error, refetch } = useApplicationEmailCorrespondence({
    itemId,
    timelineId,
    timelineLabel,
    contactEmail,
    contactEmails,
  });
  const [selected, setSelected] = useState<ContactEmailMessage | null>(null);

  useEffect(() => {
    onRefetchReady?.(refetch);
  }, [onRefetchReady, refetch]);

  return (
    <>
      <EmailCorrespondencePanel
        messages={messages}
        onSelect={setSelected}
        description={`Service record: ${timelineLabel}`}
        loading={loading}
        error={error}
      />
      {selected && (
        <ContactEmailDetailModal
          message={selected}
          contactName={contactName}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
