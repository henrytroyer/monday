/**
 * EmailMailbox.tsx — Professional inbox-style reader for contact / application mail.
 * Reads SuperMail + E&A; compose/reply sends via CRM proxy.
 */

import { useEffect, useMemo, useState } from 'react';
import type { ContactEmailMessage } from '../../types/contact';
import type { EmailMessage, EmailThread } from '../../types/emailThread';
import {
  filterThreadsByApplication,
  groupContactEmailMessagesIntoThreads,
} from '../../services/emailThreadGrouping';
import { emailBodySnippet, formatEmailListDate } from '../../utils/formatEmailThread';
import {
  buildBlankComposeDraft,
  buildForwardDraft,
  buildReplyDraft,
  type MailboxComposeDraft,
} from '../../utils/emailReplyDraft';
import EmailBodyContent from '../shared/EmailBodyContent';
import EmailDirectionIndicator from '../contacts/EmailDirectionIndicator';
import CrmEmailComposeModal from './CrmEmailComposeModal';

interface ApplicationOption {
  id: string;
  label: string;
}

interface EmailMailboxProps {
  mode: 'contact' | 'application';
  title?: string;
  description?: string;
  contactId: string;
  contactName: string;
  contactEmail: string;
  messages: ContactEmailMessage[];
  /** When set, only threads for this application are shown */
  applicationId?: string;
  applications?: ApplicationOption[];
  /** monday item id used when logging outbound CRM sends */
  logItemId?: string;
  loading?: boolean;
  error?: string | null;
  onOpenApplication?: (applicationId: string) => void;
  onSent?: () => void;
  mergeContext?: Record<string, string>;
}

function sortMessagesAsc(messages: EmailMessage[]): EmailMessage[] {
  return [...messages].sort(
    (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
  );
}

function formatExact(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function recipientsLabel(
  list: Array<{ name: string; email: string }>,
): string {
  if (!list.length) return '—';
  return list
    .map((r) => (r.name && r.name !== '—' ? `${r.name} <${r.email}>` : r.email))
    .join(', ');
}

export default function EmailMailbox({
  mode,
  title,
  description,
  contactId,
  contactName,
  contactEmail,
  messages,
  applicationId,
  applications = [],
  logItemId,
  loading = false,
  error = null,
  onOpenApplication,
  onSent,
  mergeContext,
}: EmailMailboxProps) {
  const [query, setQuery] = useState('');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [composeDraft, setComposeDraft] = useState<MailboxComposeDraft | null>(
    null,
  );

  const threads = useMemo(() => {
    const all = groupContactEmailMessagesIntoThreads(messages, {
      contactId,
      contactName,
      contactEmail,
    });
    if (mode === 'application' && applicationId) {
      const scoped = filterThreadsByApplication(all, applicationId);
      return scoped.length > 0 ? scoped : all;
    }
    return all;
  }, [messages, contactId, contactName, contactEmail, mode, applicationId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((thread) => {
      const hay = [
        thread.subject,
        ...thread.messages.map((m) =>
          [
            m.senderName,
            m.senderEmail,
            m.textBody,
            m.htmlBody ?? '',
            ...m.toRecipients.map((r) => `${r.name} ${r.email}`),
          ].join(' '),
        ),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [threads, query]);

  const selected: EmailThread | null =
    filtered.find((t) => t.id === selectedThreadId) ?? filtered[0] ?? null;

  useEffect(() => {
    if (!selected) {
      setSelectedThreadId(null);
      return;
    }
    setSelectedThreadId(selected.id);
    const ordered = sortMessagesAsc(selected.messages);
    const newest = ordered[ordered.length - 1];
    if (newest) setExpandedIds(new Set([newest.id]));
  }, [selected?.id]);

  const heading =
    title ??
    (mode === 'contact' ? 'Email' : 'Email correspondence');
  const sub =
    description ??
    (mode === 'contact'
      ? `Sent and received mail with ${contactName}`
      : 'Emails for this application / term of service');

  function openCompose() {
    setComposeDraft(
      buildBlankComposeDraft({
        to: contactEmail !== '—' ? contactEmail : '',
        itemId: logItemId ?? applicationId,
      }),
    );
  }

  function openReply(message: EmailMessage, mode: 'reply' | 'replyAll') {
    setComposeDraft(
      buildReplyDraft({
        mode,
        subject: message.subject,
        senderName: message.senderName,
        senderEmail: message.senderEmail,
        sentAt: message.sentAt,
        textBody: message.textBody,
        bodyHtml: message.htmlBody,
        toRecipients: message.toRecipients,
        ccRecipients: message.ccRecipients,
        contactEmail,
        direction: message.direction,
        itemId:
          logItemId ??
          message.applicationId ??
          applicationId ??
          undefined,
      }),
    );
  }

  function openForward(message: EmailMessage) {
    setComposeDraft(
      buildForwardDraft({
        subject: message.subject,
        senderName: message.senderName,
        senderEmail: message.senderEmail,
        sentAt: message.sentAt,
        textBody: message.textBody,
        bodyHtml: message.htmlBody,
        itemId:
          logItemId ??
          message.applicationId ??
          applicationId ??
          undefined,
      }),
    );
  }

  return (
    <div className="rounded-2xl border border-crm-taupe/20 bg-crm-white">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-crm-taupe/20 px-5 py-4">
        <div>
          <h3 className="text-lg font-semibold text-crm-heading">{heading}</h3>
          <p className="mt-1 text-sm text-crm-slate">{sub}</p>
        </div>
        <button
          type="button"
          onClick={openCompose}
          className="rounded-xl bg-crm-indigo px-3 py-2 text-sm font-medium text-white hover:bg-crm-indigo-dark"
        >
          Compose
        </button>
      </div>

      <div className="border-b border-crm-taupe/20 px-5 py-3">
        <label className="sr-only" htmlFor="email-mailbox-search">
          Search emails
        </label>
        <input
          id="email-mailbox-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search subject, body, or address…"
          className="w-full rounded-xl border border-crm-taupe/20 bg-crm-surface px-3 py-2 text-sm outline-none focus:border-crm-slate focus:ring-2 focus:ring-crm-taupe/20"
        />
      </div>

      <div className="grid min-h-[22rem] lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
        <div className="max-h-[32rem] overflow-y-auto border-b border-crm-taupe/20 lg:border-b-0 lg:border-r">
          {loading ? (
            <p className="px-4 py-8 text-center text-sm text-crm-slate">
              Loading emails…
            </p>
          ) : error ? (
            <p className="px-4 py-8 text-center text-sm text-amber-800" role="alert">
              {error}
            </p>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-crm-slate">
              No emails recorded yet for this {mode === 'contact' ? 'contact' : 'application'}.
            </p>
          ) : (
            <ul className="divide-y divide-crm-taupe/15">
              {filtered.map((thread) => {
                const active = thread.id === selected?.id;
                const newest = sortMessagesAsc(thread.messages).at(-1);
                const preview = newest
                  ? emailBodySnippet(newest.textBody || newest.htmlBody || '')
                  : '';
                return (
                  <li key={thread.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedThreadId(thread.id)}
                      className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition ${
                        active
                          ? 'bg-crm-taupe-50'
                          : 'hover:bg-crm-surface'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-crm-heading">
                          {thread.subject || '(no subject)'}
                        </p>
                        <time
                          dateTime={thread.lastMessageAt}
                          className="shrink-0 text-[11px] text-crm-slate"
                        >
                          {formatEmailListDate(thread.lastMessageAt)}
                        </time>
                      </div>
                      <p className="truncate text-xs text-crm-slate">
                        {thread.messageCount} message
                        {thread.messageCount === 1 ? '' : 's'}
                        {newest
                          ? ` · ${newest.direction === 'outbound' ? 'Sent' : 'Received'}`
                          : ''}
                      </p>
                      {preview && (
                        <p className="truncate text-xs text-crm-slate/90">
                          {preview}
                        </p>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex min-h-[22rem] flex-col">
          {!selected ? (
            <p className="m-auto px-4 py-10 text-center text-sm text-crm-slate">
              Select a conversation to read.
            </p>
          ) : (
            <>
              <div className="border-b border-crm-taupe/20 px-5 py-4">
                <h4 className="text-base font-semibold text-crm-heading">
                  {selected.subject || '(no subject)'}
                </h4>
                <p className="mt-1 text-sm text-crm-slate">
                  {contactName}
                  {contactEmail && contactEmail !== '—'
                    ? ` · ${contactEmail}`
                    : ''}
                  {' · '}
                  {selected.messageCount} message
                  {selected.messageCount === 1 ? '' : 's'}
                </p>
                {selected.applicationId && (
                  <p className="mt-1 text-xs text-crm-slate">
                    Application:{' '}
                    {applications.find((a) => a.id === selected.applicationId)
                      ?.label ?? selected.applicationId}
                    {onOpenApplication && (
                      <>
                        {' · '}
                        <button
                          type="button"
                          onClick={() =>
                            onOpenApplication(selected.applicationId!)
                          }
                          className="font-medium text-crm-indigo hover:underline"
                        >
                          Open
                        </button>
                      </>
                    )}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const newest = sortMessagesAsc(selected.messages).at(-1);
                      if (newest) openReply(newest, 'reply');
                    }}
                    className="rounded-lg border border-crm-taupe/20 px-2.5 py-1.5 text-xs font-medium text-crm-heading hover:bg-crm-surface"
                  >
                    Reply
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const newest = sortMessagesAsc(selected.messages).at(-1);
                      if (newest) openReply(newest, 'replyAll');
                    }}
                    className="rounded-lg border border-crm-taupe/20 px-2.5 py-1.5 text-xs font-medium text-crm-heading hover:bg-crm-surface"
                  >
                    Reply all
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const newest = sortMessagesAsc(selected.messages).at(-1);
                      if (newest) openForward(newest);
                    }}
                    className="rounded-lg border border-crm-taupe/20 px-2.5 py-1.5 text-xs font-medium text-crm-heading hover:bg-crm-surface"
                  >
                    Forward
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedIds(
                        new Set(selected.messages.map((m) => m.id)),
                      )
                    }
                    className="rounded-lg border border-crm-taupe/20 px-2.5 py-1.5 text-xs text-crm-slate hover:bg-crm-surface"
                  >
                    Expand all
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpandedIds(new Set())}
                    className="rounded-lg border border-crm-taupe/20 px-2.5 py-1.5 text-xs text-crm-slate hover:bg-crm-surface"
                  >
                    Collapse all
                  </button>
                </div>
              </div>

              <div className="max-h-[26rem] flex-1 space-y-3 overflow-y-auto bg-crm-surface/40 p-4">
                {sortMessagesAsc(selected.messages).map((message) => {
                  const expanded = expandedIds.has(message.id);
                  const outbound = message.direction === 'outbound';
                  return (
                    <article
                      key={message.id}
                      className={`rounded-xl border bg-crm-white ${
                        outbound
                          ? 'border-sky-100'
                          : 'border-crm-taupe/20'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(message.id)) next.delete(message.id);
                            else next.add(message.id);
                            return next;
                          })
                        }
                        className="flex w-full items-start gap-3 px-4 py-3 text-left"
                      >
                        <EmailDirectionIndicator
                          direction={message.direction}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`text-[11px] font-semibold uppercase tracking-wide ${
                                outbound
                                  ? 'text-sky-800'
                                  : 'text-emerald-800'
                              }`}
                            >
                              {outbound ? 'Sent' : 'Received'}
                            </span>
                            <span className="text-xs text-crm-slate">
                              {message.isAutomated ? 'Automated' : 'Manual'}
                            </span>
                            <time
                              dateTime={message.sentAt}
                              className="text-xs text-crm-slate"
                            >
                              {formatExact(message.sentAt)}
                            </time>
                          </div>
                          <p className="mt-1 truncate text-sm font-medium text-crm-heading">
                            {message.senderName}{' '}
                            <span className="font-normal text-crm-slate">
                              &lt;{message.senderEmail}&gt;
                            </span>
                          </p>
                          {!expanded && (
                            <p className="mt-0.5 truncate text-xs text-crm-slate">
                              {emailBodySnippet(
                                message.textBody || message.htmlBody || '',
                              )}
                            </p>
                          )}
                        </div>
                      </button>

                      {expanded && (
                        <div className="space-y-3 border-t border-crm-taupe/15 px-4 py-3">
                          <dl className="space-y-1 text-sm">
                            <div className="grid grid-cols-[3.5rem_1fr] gap-2">
                              <dt className="text-xs font-semibold uppercase text-crm-slate">
                                From
                              </dt>
                              <dd className="text-crm-heading">
                                {message.senderName} &lt;{message.senderEmail}
                                &gt;
                              </dd>
                            </div>
                            <div className="grid grid-cols-[3.5rem_1fr] gap-2">
                              <dt className="text-xs font-semibold uppercase text-crm-slate">
                                To
                              </dt>
                              <dd className="text-crm-heading">
                                {recipientsLabel(message.toRecipients)}
                              </dd>
                            </div>
                            {message.ccRecipients.length > 0 && (
                              <div className="grid grid-cols-[3.5rem_1fr] gap-2">
                                <dt className="text-xs font-semibold uppercase text-crm-slate">
                                  Cc
                                </dt>
                                <dd className="text-crm-heading">
                                  {recipientsLabel(message.ccRecipients)}
                                </dd>
                              </div>
                            )}
                            {message.sourceLabel && (
                              <div className="grid grid-cols-[3.5rem_1fr] gap-2">
                                <dt className="text-xs font-semibold uppercase text-crm-slate">
                                  Source
                                </dt>
                                <dd className="text-crm-slate">
                                  {message.sourceLabel}
                                </dd>
                              </div>
                            )}
                          </dl>

                          <div className="rounded-lg border border-crm-taupe/15 bg-crm-surface px-3 py-3">
                            <EmailBodyContent
                              body={message.textBody}
                              bodyHtml={message.htmlBody}
                            />
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => openReply(message, 'reply')}
                              className="rounded-lg bg-crm-indigo px-2.5 py-1.5 text-xs font-medium text-white hover:bg-crm-indigo-dark"
                            >
                              Reply
                            </button>
                            <button
                              type="button"
                              onClick={() => openReply(message, 'replyAll')}
                              className="rounded-lg border border-crm-taupe/20 px-2.5 py-1.5 text-xs font-medium text-crm-heading hover:bg-crm-taupe-50"
                            >
                              Reply all
                            </button>
                            <button
                              type="button"
                              onClick={() => openForward(message)}
                              className="rounded-lg border border-crm-taupe/20 px-2.5 py-1.5 text-xs font-medium text-crm-heading hover:bg-crm-taupe-50"
                            >
                              Forward
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {composeDraft && (
        <CrmEmailComposeModal
          draft={composeDraft}
          contactName={contactName}
          contactId={contactId}
          mergeContext={mergeContext}
          onClose={() => setComposeDraft(null)}
          onSent={onSent}
        />
      )}
    </div>
  );
}
