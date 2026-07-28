/**
 * ApplicationEmailThread.tsx — Application-scoped mailbox reader.
 */

import type { ContactEmailMessage } from '../../types/contact';
import EmailMailbox from './EmailMailbox';

interface ApplicationEmailThreadProps {
  applicationId: string;
  termOfServiceId?: string;
  timelineLabel: string;
  contactId: string;
  contactName: string;
  contactEmail?: string;
  messages: ContactEmailMessage[];
  loading?: boolean;
  error?: string | null;
  onSent?: () => void;
}

export default function ApplicationEmailThread({
  applicationId,
  termOfServiceId,
  timelineLabel,
  contactId,
  contactName,
  contactEmail = '',
  messages,
  loading = false,
  error = null,
  onSent,
}: ApplicationEmailThreadProps) {
  return (
    <EmailMailbox
      mode="application"
      title="Email correspondence"
      description={`Service record: ${timelineLabel}${
        termOfServiceId ? ` · ${termOfServiceId}` : ''
      }`}
      contactId={contactId}
      contactName={contactName}
      contactEmail={contactEmail}
      messages={messages}
      applicationId={applicationId}
      logItemId={applicationId}
      loading={loading}
      error={error}
      onSent={onSent}
      mergeContext={{
        name: contactName,
        email: contactEmail,
        timelineLabel,
      }}
    />
  );
}
