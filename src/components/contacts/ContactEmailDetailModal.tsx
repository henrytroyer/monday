import { useEffect } from 'react';
import { useNavLayer } from '../../context/NavigationHistoryContext';
import type { ContactEmailMessage } from '../../types/contact';
import { formatEmailDetailDate } from '../../utils/formatEmailThread';
import EmailBodyContent from '../shared/EmailBodyContent';
import EmailSourceBadge from '../shared/EmailSourceBadge';
import EmailDirectionIndicator from './EmailDirectionIndicator';
import OverlayBackButton from '../layout/OverlayBackButton';

interface ContactEmailDetailModalProps {
  message: ContactEmailMessage;
  contactName: string;
  onClose: () => void;
}

function formatMailbox(name: string, email: string): string {
  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  if (trimmedName && trimmedName !== '—' && trimmedEmail && trimmedEmail !== '—') {
    return `${trimmedName} <${trimmedEmail}>`;
  }
  if (trimmedEmail && trimmedEmail !== '—') return trimmedEmail;
  if (trimmedName && trimmedName !== '—') return trimmedName;
  return '—';
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-3 gap-y-0.5 sm:grid-cols-[4.25rem_minmax(0,1fr)]">
      <dt className="pt-0.5 text-xs font-semibold uppercase tracking-wide text-crm-slate">
        {label}
      </dt>
      <dd className="break-words text-sm leading-relaxed text-crm-heading">{value}</dd>
    </div>
  );
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

  const fromLine = formatMailbox(message.senderName, message.senderEmail);
  const toLine = formatMailbox(message.recipientName, message.recipientEmail);

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

      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-crm-taupe/20 bg-crm-surface shadow-2xl">
        <div className="shrink-0 border-b border-crm-taupe/20 px-5 py-4">
          <OverlayBackButton backLabel={contactName} onBack={onClose} />

          <div className="mt-4 flex items-start gap-3">
            <EmailDirectionIndicator direction={message.direction} size="md" />
            <div className="min-w-0 flex-1">
              <h2
                id="contact-email-detail-title"
                className="text-xl font-semibold leading-snug text-crm-heading"
              >
                {message.subject}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <EmailSourceBadge
                  source={message.source}
                  label={message.sourceLabel}
                />
                <span className="text-xs text-crm-slate">
                  {message.direction === 'outbound'
                    ? 'Sent from i58'
                    : 'Received into i58'}
                </span>
              </div>
            </div>
          </div>

          <dl className="mt-4 space-y-2.5 rounded-2xl border border-crm-taupe/15 bg-crm-white px-4 py-3.5">
            <MetaRow label="From" value={fromLine} />
            <MetaRow label="To" value={toLine} />
            <MetaRow
              label="Date"
              value={formatEmailDetailDate(message.sentAt)}
            />
          </dl>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <article className="rounded-2xl border border-crm-taupe/15 bg-crm-white px-5 py-5 shadow-sm sm:px-6 sm:py-6">
            <EmailBodyContent body={message.body} bodyHtml={message.bodyHtml} />
          </article>
        </div>
      </div>
    </div>
  );
}
