import { useEffect, useState } from 'react';
import { fetchApplicationDetail } from '../../services/crmApi';
import { useMockData } from '../../config/boards';
import type { VolunteerTerm } from '../../types/volunteer';
import type { VolunteerDetail } from '../../types/volunteer';
import FormFieldsPanel from '../applications/FormFieldsPanel';
import InvoiceDetailModal from '../applications/InvoiceDetailModal';
import TermNotesChat from '../applications/TermNotesChat';
interface TermDetailPanelProps {
  term: VolunteerTerm;
  volunteerName: string;
  onClose: () => void;
}

export default function TermDetailPanel({
  term,
  volunteerName,
  onClose,
}: TermDetailPanelProps) {
  const [application, setApplication] = useState<VolunteerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState<'application' | 'pastor' | null>(
    null,
  );
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !formOpen && !invoiceOpen) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, formOpen, invoiceOpen]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        if (useMockData() || term.itemId.startsWith('mock-')) {
          const preset: VolunteerDetail = {
            id: term.itemId,
            name: volunteerName,
            locationPreference: term.locationPreference ?? '—',
            location: '—',
            status: term.status ?? '—',
            timelineId: term.timelineId,
            email: 'john.doe@example.com',
            emails: [],
            phone: '+1 (555) 201-4401',
            files: [],
            housing: 'Pending',
            itinerary: {
              arrival: { date: '', time: '', airport: '' },
              departure: { date: '', time: '', airport: '' },
            },
            coordinator: 'Sarah',
            termNotes: [],
            onboardingSteps: [
              {
                title: 'Pastor Reference',
                status: term.pastorReferenceStatus ?? 'Pending',
              },
              {
                title: 'Invoice Paid',
                status: 'Complete',
                quickbooksInvoiceId: term.quickbooksInvoiceId,
              },
            ],
            activityTimeline: [],
            applicationFormFields: [],
            pastorReferenceFormFields: [
              {
                id: 'ref-1',
                question: 'Pastor recommendation',
                answer: 'Recommended without reservation',
              },
            ],
          };
          if (!cancelled) setApplication(preset);
        } else {
          const data = await fetchApplicationDetail(term.itemId);
          if (!cancelled) setApplication(data);
        }
      } catch {
        if (!cancelled) setApplication(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [term.itemId, term.timelineId, volunteerName, term]);

  return (
    <div className="absolute inset-0 z-30 flex flex-col">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        aria-label="Close term details"
        onClick={onClose}
      />

      <div className="relative m-4 flex min-h-0 max-h-[90%] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {term.timelineLabel}
            </h2>
            <p className="text-sm text-slate-500">
              {volunteerName} · {term.pipelineStage ?? 'Application'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading && (
            <p className="text-center text-sm text-slate-500">Loading term…</p>
          )}

          {!loading && (
            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Summary</h3>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-slate-500">Status</dt>
                    <dd className="font-medium">{term.status ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Pipeline</dt>
                    <dd className="font-medium">{term.pipelineStage ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Pastor reference</dt>
                    <dd className="font-medium">
                      {term.pastorReferenceStatus ?? '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Location preference</dt>
                    <dd className="font-medium">
                      {term.locationPreference ?? '—'}
                    </dd>
                  </div>
                </dl>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-slate-900">
                  Internal notes
                </h3>
                <div className="mt-3">
                  <TermNotesChat
                    itemId={term.itemId}
                    timelineId={term.timelineId}
                    initialNotes={application?.termNotes ?? term.notes}
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-900">
                  QuickBooks invoice
                </h3>
                {term.quickbooksInvoiceId ? (
                  <button
                    type="button"
                    onClick={() => setInvoiceOpen(true)}
                    className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    View invoice ({term.quickbooksInvoiceId})
                  </button>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">
                    No QuickBooks invoice linked for this term.
                  </p>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-900">
                  References & application
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setFormOpen('pastor')}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    View pastor reference
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormOpen('application')}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
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
          fields={
            formOpen === 'pastor'
              ? application.pastorReferenceFormFields
              : application.applicationFormFields
          }
          emptyMessage={
            formOpen === 'pastor'
              ? 'No pastor reference fields available.'
              : 'No application fields available.'
          }
          onClose={() => setFormOpen(null)}
        />
      )}

      {invoiceOpen && term.quickbooksInvoiceId && (
        <InvoiceDetailModal
          invoiceId={term.quickbooksInvoiceId}
          volunteerName={volunteerName}
          mondayStatus={term.status ?? '—'}
          onClose={() => setInvoiceOpen(false)}
        />
      )}
    </div>
  );
}
