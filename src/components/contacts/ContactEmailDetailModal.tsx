import { useEffect } from 'react';
import { useNavLayer } from '../../context/NavigationHistoryContext';
import type { ContactEmailMessage } from '../../types/contact';
import { formatEmailDetailDate } from '../../utils/formatEmailThread';
import EmailDirectionIndicator from './EmailDirectionIndicator';
import OverlayBackButton from '../layout/OverlayBackButton';

interface ContactEmailDetailModalProps {
  message: ContactEmailMessage;
  contactName: string;
  onClose: () => void;
}

export default function ContactEmailDetailModal({
  message,
  contactName,
  onClose,
}: ContactEmailDetailModalProps) {
  useNavLayer(true, onClose, `contact-email-detail-${message.id}`);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-email-detail-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-stone-900/25 backdrop-blur-sm"
        aria-label={`Back to ${contactName}`}
        onClick={onClose}
      />

      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-crm-taupe/20 bg-crm-surface shadow-2xl">
        <div className="shrink-0 border-b border-crm-taupe/20 px-5 py-4">
          <OverlayBackButton backLabel={contactName} onBack={onClose} />
          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_auto] items-center gap-x-3">
            <h2
              id="contact-email-detail-title"
              className="truncate text-lg font-semibold text-crm-heading"
            >
              {message.subject}
            </h2>
            <p className="truncate text-center text-sm text-crm-slate">
              {message.senderEmail}
            </p>
            <time
              dateTime={message.sentAt}
              className="shrink-0 text-sm text-crm-slate"
            >
              {formatEmailDetailDate(message.sentAt)}
            </time>
          </div>
          <p className="mt-2">
            <EmailDirectionIndicator direction={message.direction} size="md" />
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="whitespace-pre-wrap text-sm text-crm-text">
            {message.body}
          </div>
        </div>
      </div>
    </div>
  );
}
