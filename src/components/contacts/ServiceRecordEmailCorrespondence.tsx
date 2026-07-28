import { useMockData } from '../../config/boards';
import { buildMockContactEmailThread } from '../../data/mockContactEmailThread';
import type { ContactEmailMessage } from '../../types/contact';
import ApplicationEmailThread from '../email-correspondence/ApplicationEmailThread';

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
          itemId: serviceRecordId,
        }))
    : [];

  const timelineLabel = isArchived
    ? `Archived recruitment · ${contactName}`
    : `Recruitment · ${contactName}`;

  return (
    <ApplicationEmailThread
      applicationId={serviceRecordId}
      timelineLabel={timelineLabel}
      contactId={serviceRecordId}
      contactName={contactName}
      contactEmail={contactEmail ?? ''}
      messages={messages}
      loading={false}
      error={
        isMock
          ? null
          : 'Live recruitment email sync is not configured yet.'
      }
    />
  );
}
