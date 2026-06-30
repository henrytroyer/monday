import { useEffect, useMemo, useState } from 'react';
import { useNavLayer } from '../../context/NavigationHistoryContext';
import { applicationPipeline } from '../../data/mockApplications';
import { useApplicationDetail } from '../../hooks/useApplicationDetail';
import { isRecruitmentServiceTerm } from '../../services/contactServiceRecordStorage';
import type { VolunteerTerm } from '../../types/volunteer';
import FormFieldsPanel from '../applications/FormFieldsPanel';
import InvoiceDetailModal from '../applications/InvoiceDetailModal';
import TermNotesChat from '../applications/TermNotesChat';
import VolunteerFilesSection from '../applications/VolunteerFilesSection';
import OverlayBackButton from '../layout/OverlayBackButton';
import RecruitmentServiceRecordPanel from './RecruitmentServiceRecordPanel';

interface TermDetailPanelProps {
  term: VolunteerTerm;
  volunteerName: string;
  onClose: () => void;
  onGoToRecruitment?: (prospectId: string) => void;
}

export default function TermDetailPanel({
  term,
  volunteerName,
  onClose,
  onGoToRecruitment,
}: TermDetailPanelProps) {
  const isRecruitmentRecord = isRecruitmentServiceTerm(term);
  const volunteer = useMemo(() => {
    if (isRecruitmentRecord) return null;
    return (
      applicationPipeline
        .flatMap((stage) => stage.volunteers)
        .find((v) => v.id === term.itemId || v.name === volunteerName) ?? {
        id: term.itemId,
        name: volunteerName,
        locationPreference: term.locationPreference ?? 'Lesvos',
        location: '—',
        status: term.status ?? '—',
        timelineId: term.timelineId,
      }
    );
  }, [isRecruitmentRecord, term, volunteerName]);
  const { detail: application, loading: appLoading } =
    useApplicationDetail(volunteer);
  const loading = isRecruitmentRecord ? false : appLoading;
  const [formOpen, setFormOpen] = useState<'application' | 'pastor' | null>(
    null,
  );
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const { requestClose: requestCloseForm } = useNavLayer(
    formOpen !== null,
    () => setFormOpen(null),
    `term-form-${formOpen ?? 'none'}-${term.itemId}`,
  );

  const { requestClose: requestCloseInvoice } = useNavLayer(
    invoiceOpen,
    () => setInvoiceOpen(false),
    `term-invoice-${term.quickbooksInvoiceId ?? 'none'}-${term.itemId}`,
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !formOpen && !invoiceOpen) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, formOpen, invoiceOpen]);

  return (
    <div className="absolute inset-0 z-30 flex flex-col">
      <button
        type="button"
        className="absolute inset-0 bg-crm-indigo/35"
        aria-label={`Back to ${volunteerName}`}
        onClick={onClose}
      />

      <div className="relative m-4 flex min-h-0 max-h-[90%] flex-1 flex-col overflow-hidden rounded-2xl border border-crm-taupe/20 bg-crm-surface shadow-2xl">
        <div className="flex shrink-0 flex-col gap-3 border-b border-crm-taupe/20 px-5 py-4">
          <OverlayBackButton backLabel={volunteerName} onBack={onClose} />
          <div>
            <h2 className="text-lg font-semibold text-crm-heading">
              {term.timelineLabel}
            </h2>
            <p className="text-sm text-crm-slate">
              {volunteerName} ·{' '}
              {isRecruitmentRecord
                ? 'Service record'
                : (term.pipelineStage ?? 'Application')}
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading && (
            <p className="text-center text-sm text-crm-slate">Loading service record…</p>
          )}

          {!loading && isRecruitmentRecord && (
            <RecruitmentServiceRecordPanel
              term={term}
              contactName={volunteerName}
              onGoToRecruitment={onGoToRecruitment}
            />
          )}

          {!loading && !isRecruitmentRecord && application && (
            <div className="space-y-6">
              <section className="rounded-2xl border border-crm-taupe/20 bg-crm-white p-4">
                <h3 className="text-sm font-semibold text-crm-heading">Summary</h3>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-crm-slate">Status</dt>
                    <dd className="font-medium">{term.status ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-crm-slate">Pipeline</dt>
                    <dd className="font-medium">{term.pipelineStage ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-crm-slate">Pastor reference</dt>
                    <dd className="font-medium">
                      {term.pastorReferenceStatus ?? '—'}
                    </dd>
                  </div>
                </dl>
              </section>

              <VolunteerFilesSection
                volunteerName={volunteerName}
                profilePhotoUrl={application.profilePhotoUrl}
                files={application.files}
                showOtherFiles
                variant="panel"
              />

              <section>
                <h3 className="text-sm font-semibold text-crm-heading">
                  Internal notes
                </h3>
                <div className="mt-3">
                  <TermNotesChat
                    itemId={term.itemId}
                    timelineId={term.timelineId}
                    initialNotes={term.notes ?? []}
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-crm-taupe/20 p-4">
                <h3 className="text-sm font-semibold text-crm-heading">
                  QuickBooks invoice
                </h3>
                {term.quickbooksInvoiceId ? (
                  <button
                    type="button"
                    onClick={() => setInvoiceOpen(true)}
                    className="mt-3 rounded-xl bg-crm-indigo px-4 py-2 text-sm font-medium text-white hover:bg-crm-indigo-dark"
                  >
                    View invoice
                  </button>
                ) : (
                  <p className="mt-2 text-sm text-crm-slate">
                    No invoice linked for this service record.
                  </p>
                )}
              </section>

              <section className="rounded-2xl border border-crm-taupe/20 p-4">
                <h3 className="text-sm font-semibold text-crm-heading">
                  References & application
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setFormOpen('pastor')}
                    className="rounded-xl border border-crm-taupe/20 px-4 py-2 text-sm font-medium text-crm-heading hover:bg-crm-taupe-50"
                  >
                    View pastor reference
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormOpen('application')}
                    className="rounded-xl border border-crm-taupe/20 px-4 py-2 text-sm font-medium text-crm-heading hover:bg-crm-taupe-50"
                  >
                    View full application
                  </button>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>

      {formOpen && application && (
        <FormFieldsPanel
          title={
            formOpen === 'pastor'
              ? `Pastor reference — ${volunteerName}`
              : `Full application — ${volunteerName}`
          }
          backLabel={term.timelineLabel}
          fields={
            formOpen === 'pastor'
              ? application.pastorReferenceFormFields
              : application.applicationFormFields
          }
          emptyMessage="No fields available."
          onClose={requestCloseForm}
        />
      )}

      {invoiceOpen && term.quickbooksInvoiceId && (
        <InvoiceDetailModal
          invoiceId={term.quickbooksInvoiceId}
          volunteerName={volunteerName}
          backLabel={term.timelineLabel}
          mondayStatus={term.status ?? '—'}
          onClose={requestCloseInvoice}
        />
      )}
    </div>
  );
}
