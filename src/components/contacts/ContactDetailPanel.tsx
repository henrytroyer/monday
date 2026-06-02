import { useState } from 'react';
import { updateContactTags } from '../../services/contactsApi';
import { useContactDetail } from '../../hooks/useContactDetail';
import type { ReactNode } from 'react';
import type { ContactListItem, ContactTag } from '../../types/contact';
import type { VolunteerTerm } from '../../types/volunteer';
import ContactProfileCard from './ContactProfileCard';
import DonationsList from './DonationsList';
import TermDetailPanel from './TermDetailPanel';

interface ContactDetailPanelProps {
  contact: ContactListItem;
  onBack: () => void;
  onSelectContact?: (contactId: string) => void;
}

export default function ContactDetailPanel({
  contact,
  onBack,
  onSelectContact,
}: ContactDetailPanelProps) {
  const { detail, loading, error, refetch } = useContactDetail(contact.id);
  const [selectedTerm, setSelectedTerm] = useState<VolunteerTerm | null>(null);
  const [savingTags, setSavingTags] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);

  const handleTagsChange = async (tags: ContactTag[]) => {
    setSavingTags(true);
    setTagError(null);
    try {
      await updateContactTags(contact.id, tags);
      await refetch();
    } catch (err) {
      setTagError(
        err instanceof Error ? err.message : 'Could not update tags',
      );
    } finally {
      setSavingTags(false);
    }
  };

  const showDonations =
    detail &&
    (detail.tags.includes('donor') || detail.donations.length > 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-slate-300 bg-slate-200/60 p-2 shadow-sm">
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            ← Back to contacts
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {loading && (
            <p className="text-center text-slate-500">Loading contact…</p>
          )}

          {error && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              {error}
            </div>
          )}

          {detail && !loading && (
            <div className="space-y-6">
              <ContactProfileCard
                detail={detail}
                onTagsChange={handleTagsChange}
                savingTags={savingTags}
              />
              {tagError && (
                <p className="text-sm text-amber-800">{tagError}</p>
              )}

              {detail.tags.includes('volunteer') && (
                <>
                  {detail.demographics && (
                    <Panel title="Demographics">
                      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                        {detail.demographics.dateOfBirth && (
                          <Info label="Date of birth" value={detail.demographics.dateOfBirth} />
                        )}
                        {detail.demographics.address && (
                          <Info label="Address" value={detail.demographics.address} />
                        )}
                        {detail.demographics.city && (
                          <Info label="City" value={detail.demographics.city} />
                        )}
                        {detail.demographics.country && (
                          <Info label="Country" value={detail.demographics.country} />
                        )}
                      </dl>
                    </Panel>
                  )}

                  <Panel title="Current application">
                    {detail.currentApplication ? (
                      <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                        <p className="font-semibold text-slate-900">
                          {detail.currentApplication.timelineLabel}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {detail.currentApplication.stage} ·{' '}
                          {detail.currentApplication.status}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-slate-500">
                        Not currently in an active application pipeline.
                      </p>
                    )}
                  </Panel>

                  <Panel title="Service terms">
                    {detail.serviceTerms.length === 0 ? (
                      <p className="mt-4 text-sm text-slate-500">
                        No linked application terms yet.
                      </p>
                    ) : (
                      <ul className="mt-4 space-y-3">
                        {detail.serviceTerms.map((term) => (
                          <li key={term.itemId}>
                            <button
                              type="button"
                              onClick={() => setSelectedTerm(term)}
                              className="flex w-full items-center justify-between rounded-2xl bg-white p-4 text-left ring-1 ring-slate-200 transition hover:ring-slate-300"
                            >
                              <div>
                                <p className="font-semibold text-slate-900">
                                  {term.timelineLabel}
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                  {term.pipelineStage} · {term.status}
                                </p>
                              </div>
                              <span className="text-slate-400">→</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Panel>
                </>
              )}

              {detail.tags.includes('pastor') && (
                <Panel title="Volunteers referenced">
                  {detail.linkedVolunteers.filter(
                    (l) => l.relationship === 'reference',
                  ).length === 0 ? (
                    <p className="mt-4 text-sm text-slate-500">
                      No linked reference applications yet.
                    </p>
                  ) : (
                    <ul className="mt-4 space-y-3">
                      {detail.linkedVolunteers
                        .filter((l) => l.relationship === 'reference')
                        .map((link) => (
                          <li key={link.applicationItemId}>
                            <LinkedVolunteerRow
                              link={link}
                              onSelectContact={onSelectContact}
                            />
                          </li>
                        ))}
                    </ul>
                  )}
                </Panel>
              )}

              {detail.tags.includes('parent') && (
                <Panel title="Connected volunteers">
                  {detail.linkedVolunteers.filter(
                    (l) => l.relationship === 'child',
                  ).length === 0 ? (
                    <p className="mt-4 text-sm text-slate-500">
                      No linked volunteers yet.
                    </p>
                  ) : (
                    <ul className="mt-4 space-y-3">
                      {detail.linkedVolunteers
                        .filter((l) => l.relationship === 'child')
                        .map((link) => (
                          <li key={link.applicationItemId}>
                            <LinkedVolunteerRow
                              link={link}
                              onSelectContact={onSelectContact}
                            />
                          </li>
                        ))}
                    </ul>
                  )}
                </Panel>
              )}

              {showDonations && (
                <Panel title="Donations & payments">
                  <p className="mt-2 text-sm text-slate-500">
                    From QuickBooks
                    {detail.quickbooksCustomerId
                      ? ` · Customer ${detail.quickbooksCustomerId}`
                      : ''}
                  </p>
                  <div className="mt-4">
                    <DonationsList records={detail.donations} />
                  </div>
                </Panel>
              )}
            </div>
          )}
        </div>

        {selectedTerm && detail && (
          <TermDetailPanel
            term={selectedTerm}
            volunteerName={detail.name}
            onClose={() => setSelectedTerm(null)}
          />
        )}
      </div>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-5">
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function LinkedVolunteerRow({
  link,
  onSelectContact,
}: {
  link: {
    contactId?: string;
    volunteerName: string;
    timelineLabel: string;
    status: string;
    pipelineStage: string;
    referenceStatus?: string;
  };
  onSelectContact?: (id: string) => void;
}) {
  const inner = (
    <>
      <div>
        <p className="font-semibold text-slate-900">{link.volunteerName}</p>
        <p className="mt-1 text-sm text-slate-500">
          {link.timelineLabel} · {link.pipelineStage} · {link.status}
        </p>
        {link.referenceStatus && (
          <p className="mt-1 text-xs text-slate-500">
            Reference: {link.referenceStatus}
          </p>
        )}
      </div>
      {link.contactId && onSelectContact && (
        <span className="text-slate-400">→</span>
      )}
    </>
  );

  if (link.contactId && onSelectContact) {
    return (
      <button
        type="button"
        onClick={() => onSelectContact(link.contactId!)}
        className="flex w-full items-center justify-between rounded-2xl bg-white p-4 text-left ring-1 ring-slate-200 transition hover:ring-slate-300"
      >
        {inner}
      </button>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">{inner}</div>
  );
}
