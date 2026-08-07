import { useEffect, useMemo, useState } from 'react';
import { useNavLayer } from '../../context/NavigationHistoryContext';
import { useContactDetail } from '../../hooks/useContactDetail';
import { useContactEmailCorrespondence } from '../../hooks/useContactEmailCorrespondence';
import { usePastorReferenceDrillDown } from '../../hooks/usePastorReferenceDrillDown';
import { usePastorReferenceLinkOptions } from '../../hooks/usePastorReferenceLinkOptions';
import { useWorkFocus } from '../../hooks/useWorkFocus';
import type { ReactNode } from 'react';
import type { ContactDetail, ContactListItem } from '../../types/contact';
import type { VolunteerTerm } from '../../types/volunteer';
import { isCompiledContactId } from '../../services/compileContactsFromBoards';
import { isServiceEndedTerm } from '../../services/contactServiceRecordStorage';
import {
  formatEndOfServiceReviewLabel,
  formatTermDateRangeLabel,
} from '../../utils/formatTermDateRange';
import type { SectionId } from '../../preferences/workFocus';
import {
  contactSectionOrder,
  orderSectionEntries,
} from '../../preferences/workFocus';
import FormFieldsPanel from '../applications/FormFieldsPanel';
import CrmPageLoading from '../shared/CrmPageLoading';
import ContactEmailHistory from '../email-correspondence/ContactEmailHistory';
import ContactBillingPanel from './ContactBillingPanel';
import ContactInternalNotesSection from './ContactInternalNotesSection';
import ChurchInfoCard from './ChurchInfoCard';
import ContactProfileCard from './ContactProfileCard';
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
  const {
    detail,
    loading,
    refreshing,
    extrasLoading,
    error,
    saving,
    canEdit,
    updateCoreFields,
    updatePastorReference,
  } = useContactDetail(contact.id, { listItem: contact });
  const { focus: workFocus } = useWorkFocus();
  const canViewEmailHistory = true;
  const canOpenTermDetail = true;
  const {
    messages: emailCorrespondence,
    loading: emailLoading,
    error: emailError,
    refetch: refetchEmails,
  } = useContactEmailCorrespondence({
    // Start email fetch as soon as the panel opens — do not wait on core detail.
    contactId: canViewEmailHistory ? contact.id : null,
    contactName: detail?.name ?? contact.name,
    contactEmail: detail?.email ?? contact.email,
    serviceTerms: detail?.serviceTerms ?? [],
  });
  const [selectedTerm, setSelectedTerm] = useState<VolunteerTerm | null>(null);
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
      if (e.key === 'Escape' && !selectedTerm && !pastorReferenceUiOpen) {
        onBack();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onBack, selectedTerm, pastorReferenceUiOpen]);

  const showDonations =
    detail &&
    (detail.tags.includes('donor') || detail.donations.length > 0);

  const orderedContactSections = useMemo(() => {
    if (!detail) return [] as ReactNode[];

    const connectedPeopleSection = (() => {
      const isParentOrPastor =
        detail.tags.includes('parent') || detail.tags.includes('pastor');
      const linkedPeople = detail.linkedVolunteers;
      const connectedLabels = (detail.connectedTo ?? '')
        .split(/[,;]/)
        .map((part) => part.trim())
        .filter(Boolean)
        .filter(
          (label) =>
            label.toLowerCase() !== detail.name.trim().toLowerCase(),
        );
      const linkedNames = new Set(
        linkedPeople.map((link) => link.volunteerName.trim().toLowerCase()),
      );
      const extraConnectedLabels = connectedLabels.filter(
        (label) => !linkedNames.has(label.toLowerCase()),
      );
      const showConnected =
        detail.spouseName ||
        linkedPeople.length > 0 ||
        extraConnectedLabels.length > 0 ||
        detail.emergencyContact ||
        detail.emergencyPhone;
      if (!showConnected) return undefined;

      return (
          <Panel title="Connected people">
            <dl className="mt-4 space-y-3 text-sm">
              {detail.spouseName && (
                <div>
                  <dt className="text-crm-slate">Spouse</dt>
                  <dd className="font-medium text-crm-heading">
                    {detail.spouseName}
                  </dd>
                </div>
              )}
              {isParentOrPastor && linkedPeople.length > 0 && (
                <div>
                  <dt className="text-crm-slate">
                    Volunteers this contact is linked to
                    {detail.tags.includes('parent') &&
                    detail.tags.includes('pastor')
                      ? ' (Parents + Pastor)'
                      : detail.tags.includes('parent')
                        ? ' (Parents)'
                        : ' (Pastor)'}
                  </dt>
                  <dd className="mt-2 space-y-2">
                    {[
                      ...new Map(
                        linkedPeople.map((link) => [
                          link.volunteerName.trim().toLowerCase(),
                          link,
                        ]),
                      ).values(),
                    ].map((link) => (
                      <div
                        key={`${link.applicationItemId}-${link.relationship}`}
                      >
                        {link.contactId && onSelectContact ? (
                          <button
                            type="button"
                            onClick={() => onSelectContact(link.contactId!)}
                            className="rounded-full bg-crm-taupe-50 px-2.5 py-1 font-medium text-crm-heading transition hover:bg-crm-taupe-100"
                          >
                            {link.volunteerName}
                            <span className="ml-1 text-xs font-normal text-crm-slate">
                              {link.relationship === 'child'
                                ? '· Parents'
                                : '· Pastor'}
                            </span>
                          </button>
                        ) : (
                          <span className="rounded-full bg-crm-taupe-50 px-2.5 py-1 font-medium text-crm-heading">
                            {link.volunteerName}
                          </span>
                        )}
                      </div>
                    ))}
                  </dd>
                  <p className="mt-2 text-xs text-crm-slate">
                    Open the volunteer to see their full application and family
                    links.
                  </p>
                </div>
              )}
              {!isParentOrPastor &&
                (extraConnectedLabels.length > 0 ||
                  connectedLabels.length > 0) && (
                  <div>
                    <dt className="text-crm-slate">
                      Connected to (pastors, family, couple)
                    </dt>
                    <dd className="mt-1 flex flex-wrap gap-2">
                      {(extraConnectedLabels.length > 0
                        ? extraConnectedLabels
                        : connectedLabels
                      ).map((label) => (
                        <span
                          key={label}
                          className="rounded-full bg-crm-taupe-50 px-2.5 py-1 text-crm-heading"
                        >
                          {label}
                        </span>
                      ))}
                    </dd>
                    <p className="mt-2 text-xs text-crm-slate">
                      Search Contacts by a pastor or spouse name to open their
                      record — both old and new pastors stay linked.
                    </p>
                  </div>
                )}
              {isParentOrPastor &&
                linkedPeople.length === 0 &&
                connectedLabels.length > 0 && (
                  <div>
                    <dt className="text-crm-slate">Connected volunteers</dt>
                    <dd className="mt-1 flex flex-wrap gap-2">
                      {connectedLabels.map((label) => (
                        <span
                          key={label}
                          className="rounded-full bg-crm-taupe-50 px-2.5 py-1 text-crm-heading"
                        >
                          {label}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
              {(detail.emergencyContact || detail.emergencyPhone) && (
                <div>
                  <dt className="text-crm-slate">
                    Emergency (on this contact only)
                  </dt>
                  <dd className="font-medium text-crm-heading">
                    {[detail.emergencyContact, detail.emergencyPhone]
                      .filter(Boolean)
                      .join(' · ')}
                  </dd>
                </div>
              )}
            </dl>
          </Panel>
      );
    })();

    const sections: Partial<Record<SectionId, ReactNode>> = {
      'contact.profile': (
          <ContactProfileCard
            detail={detail}
            saving={saving}
            onGoToRecruitment={onGoToRecruitment}
            onEmailSent={refetchEmails}
            canEdit={canEdit && !isCompiledContactId(detail.id)}
            onSave={
              canEdit && !isCompiledContactId(detail.id)
                ? async (fields) => {
                    const updated = await updateCoreFields(fields);
                    onContactUpdated?.(updated);
                    return updated;
                  }
                : undefined
            }
          />
      ),
      'contact.church': detail.tags.includes('volunteer') ? (
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
      ) : undefined,
      'contact.internal_notes': (
          <ContactInternalNotesSection
            contactId={detail.id}
            serviceTerms={detail.serviceTerms}
            currentApplication={detail.currentApplication}
          />
      ),
      'contact.email_history': (
          <ContactEmailHistory
            contactId={detail.id}
            contactName={detail.name}
            contactEmail={detail.email}
            messages={emailCorrespondence}
            applications={detail.serviceTerms
              .filter(
                (term) => term.itemId && !term.itemId.startsWith('mock-'),
              )
              .map((term) => ({
                id: term.itemId,
                label: term.timelineLabel || term.itemId,
              }))}
            loading={emailLoading}
            error={emailError}
            onOpenApplication={onGoToApplication}
            onSent={refetchEmails}
            logItemId={
              detail.currentApplication?.itemId ??
              detail.serviceTerms.find(
                (term) => term.itemId && !term.itemId.startsWith('mock-'),
              )?.itemId ??
              detail.id
            }
          />
      ),
      'contact.files': (
          <ContactVolunteerFiles
            volunteerName={detail.name}
            profilePhotoUrl={detail.profilePhotoUrl}
            passportFile={detail.passportFile}
            childSafeguardingFile={detail.childSafeguardingFile}
            files={detail.files}
          />
      ),
      'contact.connected_people': connectedPeopleSection,
      'contact.current_application': detail.tags.includes('volunteer') ? (
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
      ) : undefined,
      'contact.terms': (
          <Panel title="Terms of service">
            {detail.serviceTerms.length === 0 ? (
              <p className="mt-4 text-sm text-crm-slate">
                No terms of service yet. Linked applications and completed terms
                will appear here.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {detail.serviceTerms.map((term) => {
                  const dateRange = formatTermDateRangeLabel(term);
                  const reviewLabel = formatEndOfServiceReviewLabel(
                    term.endOfServiceReview?.completedAt,
                  );

                  return (
                    <li key={`${term.itemId}-${term.timelineId}`}>
                      <button
                        type="button"
                        onClick={() => setSelectedTerm(term)}
                        className="flex w-full items-center justify-between rounded-2xl bg-crm-surface p-4 text-left ring-1 ring-crm-taupe/20 transition hover:ring-crm-taupe/50"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-crm-heading">
                            {term.timelineLabel}
                          </p>
                          {dateRange && (
                            <p className="mt-1 text-sm text-crm-slate">
                              {dateRange}
                            </p>
                          )}
                          <p className="mt-1 text-sm text-crm-slate">
                            {term.pipelineStage} · {term.status}
                            {isServiceEndedTerm(term) ? ' · Service ended' : ''}
                          </p>
                          <p className="mt-1 text-sm text-crm-slate">
                            {reviewLabel}
                          </p>
                        </div>
                        <span className="shrink-0 text-crm-slate">→</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
      ),
      'contact.volunteers_referenced': detail.tags.includes('pastor') ? (
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
      ) : undefined,
      'contact.connected_volunteers': detail.tags.includes('parent') ? (
          <Panel title="Connected volunteers">
            {detail.linkedVolunteers.filter((l) => l.relationship === 'child')
              .length === 0 ? (
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
      ) : undefined,
      'contact.donations': showDonations ? (
          <Panel title="Donations & payments">
            <p className="mt-2 text-sm text-crm-slate">
              Gifts and payments associated with this contact.
            </p>
            <div className="mt-4">
              {extrasLoading && detail.donations.length === 0 ? (
                <p className="text-sm text-crm-slate">Loading donations…</p>
              ) : (
                <DonationsList
                  records={detail.donations}
                  contactName={detail.name}
                  contactEmail={detail.email}
                />
              )}
            </div>
          </Panel>
      ) : undefined,
      'contact.billing': (
          <ContactBillingPanel
            volunteerName={detail.name}
            serviceTerms={detail.serviceTerms}
          />
      ),
    };

    return orderSectionEntries(
      workFocus,
      contactSectionOrder(workFocus),
      sections,
    );
  }, [
    detail,
    saving,
    canEdit,
    onGoToRecruitment,
    refetchEmails,
    updateCoreFields,
    onContactUpdated,
    linkedPastorReferenceItemIds,
    pastorReferenceDetailOpen,
    pastorReferenceDrillDown.loading,
    updatePastorReference,
    openPastorReference,
    emailCorrespondence,
    loading,
    extrasLoading,
    emailLoading,
    emailError,
    onGoToApplication,
    onSelectContact,
    showDonations,
    canOpenTermDetail,
    workFocus,
  ]);

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
          {loading && !detail && (
            <CrmPageLoading
              label="i58 Volunteer portal · Contact"
              className="min-h-[240px] py-8"
            />
          )}

          {error && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              {error}
            </div>
          )}

          {detail && (
            <div className="space-y-6">
              {(refreshing || extrasLoading) && (
                <p className="text-xs text-crm-slate">
                  {refreshing
                    ? 'Refreshing contact from monday…'
                    : 'Loading donations & files…'}
                </p>
              )}
              {isCompiledContactId(detail.id) && (
                <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                  This contact is not fully set up yet. Some profile edits are
                  limited until their record is complete.
                </div>
              )}
              {orderedContactSections.map((node, index) => (
                <div key={`contact-section-${index}`}>{node}</div>
              ))}
            </div>
          )}
        </div>

        {selectedTerm && detail && canOpenTermDetail && (
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
