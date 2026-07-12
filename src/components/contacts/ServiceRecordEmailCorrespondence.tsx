import { useState } from 'react';
import { useMockData } from '../../config/boards';
import { buildMockContactEmailThread } from '../../data/mockContactEmailThread';
import type { ContactEmailMessage } from '../../types/contact';
import ContactEmailDetailModal from './ContactEmailDetailModal';
import EmailCorrespondencePanel from '../shared/EmailCorrespondencePanel';

interface ServiceRecordEmailCorrespondenceProps {
  serviceRecordId: string;
  contactName: string;
  contactEmail?: string;
  isArchived?: boolean;
}

export default function ServiceRecordEmailCorrespondence({
  serviceRecordId,
  contactName,
  contactEmail,
  isArchived = false,
}: ServiceRecordEmailCorrespondenceProps) {
  const isMock = useMockData();
  const [selected, setSelected] = useState<ContactEmailMessage | null>(null);

  const messages: ContactEmailMessage[] = isMock
    ? buildMockContactEmailThread(serviceRecordId, {
        name: contactName,
        email: contactEmail ?? '—',
      })
        .slice(0, 4)
        .map((message) => ({
          ...message,
          source: 'recruitment' as const,
          sourceLabel: 'Recruitment',
          serviceRecordId,
        }))
    : [];

  const description = isArchived
    ? `Archived recruitment service record for ${contactName}.`
    : `Recruitment service record for ${contactName}. Live E&A sync coming later.`;

  return (
    <>
      <EmailCorrespondencePanel
        messages={messages}
        onSelect={setSelected}
        description={description}
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
