import type { ContactEmailMessage } from '../../types/contact';
import {
  emailBodySnippet,
  formatEmailListDate,
} from '../../utils/formatEmailThread';
import EmailDirectionIndicator from './EmailDirectionIndicator';

interface ContactEmailThreadSectionProps {
  messages: ContactEmailMessage[];
  onSelect: (message: ContactEmailMessage) => void;
}

const emailRowGrid =
  'grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_auto] items-center gap-x-2';

export default function ContactEmailThreadSection({
  messages,
  onSelect,
}: ContactEmailThreadSectionProps) {
  return (
    <div className="rounded-2xl border border-crm-taupe/20 bg-crm-white p-5">
      <h3 className="text-lg font-semibold text-crm-heading">
        Email correspondence
      </h3>

      <div className="mt-4 max-h-72 overflow-y-auto overscroll-y-contain rounded-2xl border border-crm-taupe/20 bg-crm-surface">
        {messages.length === 0 ? (
          <p className="py-6 text-center text-sm text-crm-slate">
            No email correspondence yet.
          </p>
        ) : (
          <>
            <div
              className="sticky top-0 z-10 flex items-center gap-3 border-b border-crm-taupe/20 bg-crm-surface px-3 py-2"
              aria-hidden
            >
              <span className="w-[34px] shrink-0" />
              <div className={`min-w-0 flex-1 ${emailRowGrid}`}>
                <span />
                <span className="text-center text-xs font-medium uppercase tracking-wide text-crm-slate">
                  From
                </span>
                <span />
              </div>
            </div>
            <ul className="divide-y divide-crm-taupe/20">
              {messages.map((message) => (
                <li key={message.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(message)}
                    className="flex w-full items-start gap-3 px-3 py-3 text-left transition hover:bg-crm-taupe-50"
                  >
                    <EmailDirectionIndicator direction={message.direction} />
                    <div className="min-w-0 flex-1">
                      <div className={emailRowGrid}>
                        <p className="truncate font-semibold text-crm-heading">
                          {message.subject}
                        </p>
                        <p className="truncate text-center text-xs text-crm-slate">
                          {message.senderEmail}
                        </p>
                        <time
                          dateTime={message.sentAt}
                          className="shrink-0 text-xs text-crm-slate"
                        >
                          {formatEmailListDate(message.sentAt)}
                        </time>
                      </div>
                      <p className="mt-0.5 truncate text-sm text-crm-slate">
                        {emailBodySnippet(message.body)}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
