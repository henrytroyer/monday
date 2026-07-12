import { useEffect, useState } from 'react';
import { useNavLayer } from '../../context/NavigationHistoryContext';
import { useContactDetail } from '../../hooks/useContactDetail';
import { useContactEmailCorrespondence } from '../../hooks/useContactEmailCorrespondence';
import { usePastorReferenceDrillDown } from '../../hooks/usePastorReferenceDrillDown';
import { usePastorReferenceLinkOptions } from '../../hooks/usePastorReferenceLinkOptions';
import type { ReactNode } from 'react';
import type { ContactDetail, ContactEmailMessage, ContactListItem } from '../../types/contact';
import type { VolunteerTerm } from '../../types/volunteer';
import FormFieldsPanel from '../applications/FormFieldsPanel';
import ContactInternalNotesSection from './ContactInternalNotesSection';
import ChurchInfoCard from './ChurchInfoCard';
import ContactProfileCard from './ContactProfileCard';
import ContactEmailDetailModal from './ContactEmailDetailModal';
import EmailCorrespondencePanel from '../shared/EmailCorrespondencePanel';
import ContactVolunteerFiles from './ContactVolunteerFiles';
import DonationsList from './DonationsList';
import PastorReferencePickerPanel from './PastorReferencePickerPanel';
import TermDetailPanel from './TermDetailPanel';

interface ContactDetailPanelProps {
  contact: ContactListItem;
  onBack: () => void;
  onSelectContact?: (contactId: string) => void;
  onGoToRecruitment?: (prospectId: string) => void;
  onGoToApplication?: (applicationId: string) => void;
  onContactUpdated?: (updated: ContactDetail) => void;
}

export default function ContactDetailPanel({
  contact,
  onBack,
  onSelectContact,
  onGoToRecruitment,
  onGoToApplication,
  onContactUpdated,
}: ContactDetailPanelProps) {
  const { detail, loading, error, saving, canEdit, updateCoreFields, updatePastorReference } =
    useContactDetail(contact.id);
  const {
    messages: emailCorrespondence,
    loading: emailLoading,
    error: emailError,
  } = useContactEmailCorrespondence({
    contactId: detail && !loading ? detail.id : null,
    contactName: detail?.name ?? contact.name,
    contactEmail: detail?.email ?? contact.email,
    serviceTerms: detail?.serviceTerms ?? [],
  });
  const [selectedTerm, setSelectedTerm] = useState<VolunteerTerm | null>(null);
  const [selectedEmail, setSelectedEmail] =
    useState<ContactEmailMessage | null>(null);
  const [pastorReferencePickerOpen, setPastorReferencePickerOpen] =
    useState(false);
  const [pastorReferenceDetailOpen, setPastorReferenceDetailOpen] =
    useState(false);
  const [selectedPastorReferenceItemId, setSelectedPastorReferenceItemId] =
    useState<string | null>(null);

  const linkedPastorReferenceItemIds =
    detail?.pastorReference?.linkedItemIds ?? [];
  const hasMultiplePastorReferences = linkedPastorReferenceItemIds.length > 1;
  const pastorReferenceUiOpen =
    pastorReferencePickerOpen || pastorReferenceDetailOpen;

  const pastorReferenceDrillDown = usePastorReferenceDrillDown(
    selectedPastorReferenceItemId ?? undefined,
  );
  const pastorReferenceLinkOptions = usePastorReferenceLinkOptions(
    linkedPastorReferenceItemIds,
  );

  const resetPastorReferenceFlow = () => {
    setPastorReferencePickerOpen(false);
    setPastorReferenceDetailOpen(false);
    setSelectedPastorReferenceItemId(null);
    pastorReferenceDrillDown.reset();
    pastorReferenceLinkOptions.reset();
  };

  const openPastorReference = () => {
    if (linkedPastorReferenceItemIds.length === 0) return;

    if (linkedPastorReferenceItemIds.length === 1) {
      setSelectedPastorReferenceItemId(linkedPastorReferenceItemIds[0]);
      setPastorReferenceDetailOpen(true);
      return;
    }

    setPastorReferencePickerOpen(true);
  };

  const closePastorReferencePicker = () => {
    setPastorReferencePickerOpen(false);
    setSelectedPastorReferenceItemId(null);
    pastorReferenceLinkOptions.reset();
  };

  const closePastorReferenceDetail = () => {
    setPastorReferenceDetailOpen(false);
    pastorReferenceDrillDown.reset();
    setSelectedPastorReferenceItemId(null);

    if (hasMultiplePastorReferences) {
      setPastorReferencePickerOpen(true);
    }
  };

  const handlePickPastorReference = (itemId: string) => {
    setSelectedPastorReferenceItemId(itemId);
    setPastorReferencePickerOpen(false);
    setPastorReferenceDetailOpen(true);
  };

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
  const closePastorReferenceAll = () => {
    resetPastorReferenceFlow();
  };
  const { requestClose: requestClosePastorReferencePicker } = useNavLayer(
    pastorReferencePickerOpen,
    closePastorReferencePicker,
    `pastor-reference-picker-${contact.id}`,
  );
  const { requestClose: requestClosePastorReferenceDetail } = useNavLayer(
    pastorReferenceDetailOpen,
    hasMultiplePastorReferences
      ? closePastorReferenceDetail
      : closePastorReferenceAll,
    `pastor-reference-${selectedPastorReferenceItemId ?? 'none'}-${contact.id}`,
  );

  useEffect(() => {
    setSelectedTerm(null);
    setSelectedEmail(null);
    resetPastorReferenceFlow();
  }, [contact.id]);

  useEffect(() => {
    if (!pastorReferencePickerOpen) return;
    void pastorReferenceLinkOptions.load();
  }, [pastorReferencePickerOpen, linkedPastorReferenceItemIds.join('|')]);

  useEffect(() => {
    if (!pastorReferenceDetailOpen || !selectedPastorReferenceItemId) return;
    void pastorReferenceDrillDown.load();
  }, [pastorReferenceDetailOpen, selectedPastorReferenceItemId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'Escape' &&
        !selectedTerm &&
        !selectedEmail &&
        !pastorReferenceUiOpen
      ) {
        onBack();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onBack, selectedTerm, selectedEmail, pastorReferenceUiOpen]);

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
                canEdit={canEdit}
                onSave={
                  canEdit
                    ? async (fields) => {
                        const updated = await updateCoreFields(fields);
                        onContactUpdated?.(updated);
                        return updated;
                      }
                    : undefined
                }
              />

              {detail.tags.includes('volunteer') && (
                <ChurchInfoCard
                  volunteerName={detail.name}
                  pastorReference={detail.pastorReference}
                  linkedItemIds={linkedPastorReferenceItemIds}
                  drillDownLoading={
                    pastorReferenceDetailOpen && pastorReferenceDrillDown.loading
                  }
                  saving={saving}
                  canEdit={canEdit}
                  onSave={
                    canEdit
                      ? async (fields) => {
                          const updated = await updatePastorReference(fields);
                          onContactUpdated?.(updated);
                          return updated;
                        }
                      : undefined
                  }
                  onViewPastorReference={
                    linkedPastorReferenceItemIds.length > 0
                      ? openPastorReference
                      : undefined
                  }
                />
              )}

              <ContactInternalNotesSection
                contactId={detail.id}
                serviceTerms={detail.serviceTerms}
                currentApplication={detail.currentApplication}
              />

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-stretch">
                <div className="min-w-0">
                  <EmailCorrespondencePanel
                    messages={emailCorrespondence}
                    onSelect={setSelectedEmail}
                    description="All communication with this contact"
                    showSourceTags
                    loading={loading || emailLoading}
                    error={emailError}
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
                    {import.meta.env.VITE_QBO_INCOME_SYNC_ENABLED === 'true'
                      ? 'From Monday Donations board (includes QuickBooks income sync)'
                      : `From Monday Donations board${
                          detail.quickbooksCustomerId
                            ? ` and QuickBooks · Customer ${detail.quickbooksCustomerId}`
                            : import.meta.env.VITE_QUICKBOOKS_PROXY_URL
                              ? ' and QuickBooks'
                              : ''
                        }`}
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

        {pastorReferencePickerOpen && detail && (
          <PastorReferencePickerPanel
            volunteerName={detail.name}
            options={pastorReferenceLinkOptions.options}
            loading={pastorReferenceLinkOptions.loading}
            error={pastorReferenceLinkOptions.error}
            onSelect={handlePickPastorReference}
            onClose={requestClosePastorReferencePicker}
          />
        )}

        {pastorReferenceDetailOpen && detail && selectedPastorReferenceItemId && (
          <FormFieldsPanel
            title={`Pastor reference — ${detail.name}`}
            backLabel={
              hasMultiplePastorReferences
                ? 'Choose reference'
                : detail.name
            }
            fields={pastorReferenceDrillDown.fields}
            emptyMessage={
              pastorReferenceDrillDown.loading
                ? 'Loading pastor reference…'
                : pastorReferenceDrillDown.error ??
                  'No pastor reference fields found on this item.'
            }
            loading={pastorReferenceDrillDown.loading}
            pdfFile={pastorReferenceDrillDown.pdfFile}
            onClose={requestClosePastorReferenceDetail}
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
