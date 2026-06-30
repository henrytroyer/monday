import { useEffect, useState } from 'react';
import { useNavLayer } from '../../context/NavigationHistoryContext';
import { useContactDetail } from '../../hooks/useContactDetail';
import type { ReactNode } from 'react';
import type { ContactEmailMessage, ContactListItem } from '../../types/contact';
import type { VolunteerTerm } from '../../types/volunteer';
import ContactProfileCard from './ContactProfileCard';
import ContactEmailDetailModal from './ContactEmailDetailModal';
import ContactEmailThreadSection from './ContactEmailThreadSection';
import ContactVolunteerFiles from './ContactVolunteerFiles';
import DonationsList from './DonationsList';
import TermDetailPanel from './TermDetailPanel';

interface ContactDetailPanelProps {
  contact: ContactListItem;
  onBack: () => void;
  onSelectContact?: (contactId: string) => void;
  onGoToRecruitment?: (prospectId: string) => void;
  onGoToApplication?: (applicationId: string) => void;
  onContactUpdated?: () => void;
}

export default function ContactDetailPanel({
  contact,
  onBack,
  onSelectContact,
  onGoToRecruitment,
  onGoToApplication,
  onContactUpdated,
}: ContactDetailPanelProps) {
  const { detail, loading, error, saving, isReadOnly, updateCoreFields } =
    useContactDetail(contact.id);
  const [selectedTerm, setSelectedTerm] = useState<VolunteerTerm | null>(null);
  const [selectedEmail, setSelectedEmail] =
    useState<ContactEmailMessage | null>(null);

  const { requestClose: requestCloseTerm } = useNavLayer(
    selectedTerm !== null,
    () => setSelectedTerm(null),
    `term-${selectedTerm?.itemId ?? 'none'}-${contact.id}`,
  );
  const { requestClose: requestCloseEmail } = useNavLayer(
    selectedEmail !== null,
    () => setSelectedEmail(null),
    `contact-email-thread-${selectedEmail?.id ?? 'none'}-${contact.id}`,
  );

  useEffect(() => {
    setSelectedTerm(null);
    setSelectedEmail(null);
  }, [contact.id]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !selectedTerm && !selectedEmail) onBack();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onBack, selectedTerm, selectedEmail]);

  const showDonations =
    detail &&
    (detail.tags.includes('donor') || detail.donations.length > 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-crm-taupe/20 bg-crm-surface p-2 shadow-sm">
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-crm-taupe/20 bg-crm-surface">
        <div className="shrink-0 border-b border-crm-taupe/20 bg-crm-taupe-50 px-6 py-4">
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-medium text-crm-slate hover:text-crm-heading"
          >
            ← Back to contacts
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {loading && (
            <p className="text-center text-crm-slate">Loading contact…</p>
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
                saving={saving}
                onGoToRecruitment={onGoToRecruitment}
                canEdit={!isReadOnly}
                onSave={
                  !isReadOnly
                    ? async (fields) => {
                        const updated = await updateCoreFields(fields);
                        if (updated) onContactUpdated?.();
                        return updated;
                      }
                    : undefined
                }
              />

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-stretch">
                <div className="min-w-0">
                  <ContactEmailThreadSection
                    messages={detail.emailCorrespondence}
                    onSelect={setSelectedEmail}
                  />
                </div>
                <div className="min-w-0">
                  <ContactVolunteerFiles
                    volunteerName={detail.name}
                    profilePhotoUrl={detail.profilePhotoUrl}
                    passportFile={detail.passportFile}
                    files={detail.files}
                  />
                </div>
              </div>

              {detail.tags.includes('volunteer') && (
                <Panel title="Current application">
                  {detail.currentApplication ? (
                    onGoToApplication ? (
                      <button
                        type="button"
                        onClick={() =>
                          onGoToApplication(detail.currentApplication!.itemId)
                        }
                        className="mt-4 flex w-full items-center justify-between rounded-2xl bg-crm-surface p-4 text-left ring-1 ring-crm-taupe/20 transition hover:ring-crm-taupe/50"
                      >
                        <div>
                          <p className="font-semibold text-crm-heading">
                            {detail.currentApplication.timelineLabel}
                          </p>
                          <p className="mt-1 text-sm text-crm-slate">
                            {detail.currentApplication.stage} ·{' '}
                            {detail.currentApplication.status}
                          </p>
                        </div>
                        <span className="text-crm-slate">→</span>
                      </button>
                    ) : (
                      <div className="mt-4 rounded-2xl bg-crm-surface p-4 ring-1 ring-crm-taupe/20">
                        <p className="font-semibold text-crm-heading">
                          {detail.currentApplication.timelineLabel}
                        </p>
                        <p className="mt-1 text-sm text-crm-slate">
                          {detail.currentApplication.stage} ·{' '}
                          {detail.currentApplication.status}
                        </p>
                      </div>
                    )
                  ) : (
                    <p className="mt-4 text-sm text-crm-slate">
                      Not currently in an active application pipeline.
                    </p>
                  )}
                </Panel>
              )}

              <Panel title="Service records">
                {detail.serviceTerms.length === 0 ? (
                  <p className="mt-4 text-sm text-crm-slate">
                    No service records yet. Send this contact to Recruitment to
                    create one.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {detail.serviceTerms.map((term) => (
                      <li key={`${term.itemId}-${term.timelineId}`}>
                        <button
                          type="button"
                          onClick={() => setSelectedTerm(term)}
                          className="flex w-full items-center justify-between rounded-2xl bg-crm-surface p-4 text-left ring-1 ring-crm-taupe/20 transition hover:ring-crm-taupe/50"
                        >
                          <div>
                            <p className="font-semibold text-crm-heading">
                              {term.timelineLabel}
                            </p>
                            <p className="mt-1 text-sm text-crm-slate">
                              {term.pipelineStage} · {term.status}
                            </p>
                          </div>
                          <span className="text-crm-slate">→</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              {detail.tags.includes('pastor') && (
                <Panel title="Volunteers referenced">
                  {detail.linkedVolunteers.filter(
                    (l) => l.relationship === 'reference',
                  ).length === 0 ? (
                    <p className="mt-4 text-sm text-crm-slate">
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
                    <p className="mt-4 text-sm text-crm-slate">
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
                  <p className="mt-2 text-sm text-crm-slate">
                    From QuickBooks
                    {detail.quickbooksCustomerId
                      ? ` · Customer ${detail.quickbooksCustomerId}`
                      : ''}
                  </p>
                  <div className="mt-4">
                    <DonationsList
                      records={detail.donations}
                      contactName={detail.name}
                      contactEmail={detail.email}
                    />
                  </div>
                </Panel>
              )}
            </div>
          )}
        </div>

        {selectedEmail && detail && (
          <ContactEmailDetailModal
            message={selectedEmail}
            contactName={detail.name}
            onClose={requestCloseEmail}
          />
        )}

        {selectedTerm && detail && (
          <TermDetailPanel
            term={selectedTerm}
            volunteerName={detail.name}
            onClose={requestCloseTerm}
            onGoToRecruitment={onGoToRecruitment}
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
    <div className="rounded-2xl border border-crm-taupe/20 bg-crm-white p-5">
      <h3 className="text-lg font-semibold text-crm-heading">{title}</h3>
      {children}
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
        <p className="font-semibold text-crm-heading">{link.volunteerName}</p>
        <p className="mt-1 text-sm text-crm-slate">
          {link.timelineLabel} · {link.pipelineStage} · {link.status}
        </p>
        {link.referenceStatus && (
          <p className="mt-1 text-xs text-crm-slate">
            Reference: {link.referenceStatus}
          </p>
        )}
      </div>
      {link.contactId && onSelectContact && (
        <span className="text-crm-slate">→</span>
      )}
    </>
  );

  if (link.contactId && onSelectContact) {
    return (
      <button
        type="button"
        onClick={() => onSelectContact(link.contactId!)}
        className="flex w-full items-center justify-between rounded-2xl bg-crm-surface p-4 text-left ring-1 ring-crm-taupe/20 transition hover:ring-crm-taupe/50"
      >
        {inner}
      </button>
    );
  }

  return (
    <div className="rounded-2xl bg-crm-surface p-4 ring-1 ring-crm-taupe/20">{inner}</div>
  );
}
