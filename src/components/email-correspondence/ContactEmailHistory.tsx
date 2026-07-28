/**
 * ContactEmailHistory.tsx — Full contact email history (mailbox reader).
 */

import type { ContactEmailMessage } from '../../types/contact';
import EmailMailbox from './EmailMailbox';

interface ApplicationOption {
  id: string;
  label: string;
}

interface ContactEmailHistoryProps {
  contactId: string;
  contactName: string;
  contactEmail: string;
  messages: ContactEmailMessage[];
  applications?: ApplicationOption[];
  loading?: boolean;
  error?: string | null;
  onOpenApplication?: (applicationId: string) => void;
  onCompose?: () => void;
  onSent?: () => void;
  logItemId?: string;
}

export default function ContactEmailHistory({
  contactId,
  contactName,
  contactEmail,
  messages,
  applications = [],
  loading = false,
  error = null,
  onOpenApplication,
  onSent,
  logItemId,
}: ContactEmailHistoryProps) {
  return (
    <EmailMailbox
      mode="contact"
      contactId={contactId}
      contactName={contactName}
      contactEmail={contactEmail}
      messages={messages}
      applications={applications}
      logItemId={logItemId ?? contactId}
      loading={loading}
      error={error}
      onOpenApplication={onOpenApplication}
      onSent={onSent}
      mergeContext={{ name: contactName, email: contactEmail }}
    />
  );
}
