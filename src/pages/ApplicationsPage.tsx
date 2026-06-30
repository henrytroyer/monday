import { useCallback, useEffect, useMemo, useState } from 'react';
import ApplicationDetailPanel from '../components/applications/ApplicationDetailPanel';
import ApplicationFilters from '../components/applications/ApplicationFilters';
import PipelineSection from '../components/applications/PipelineSection';
import { useLayout } from '../context/LayoutContext';
import { useNavLayer } from '../context/NavigationHistoryContext';
import { countVolunteers } from '../data/mockApplications';
import { useApplicationsPipeline } from '../hooks/useApplicationsPipeline';
import type { ApplicationFilterState, Volunteer } from '../types/volunteer';
import {
  countMatchingVolunteers,
  emptyFilters,
  filterPipeline,
  findVolunteerInPipeline,
} from '../utils/filterApplications';
import { syncAllContactsFromPipeline } from '../services/contactApplicationSync';

export default function ApplicationsPage({
  focusApplicationId,
  onClearFocus,
}: {
  focusApplicationId?: string | null;
  onClearFocus?: () => void;
}) {
  const [filters, setFilters] = useState<ApplicationFilterState>(emptyFilters);
  const [selectedApplication, setSelectedApplication] =
    useState<Volunteer | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const { requestClose: requestCloseApplication } = useNavLayer(
    selectedApplication !== null,
    () => setSelectedApplication(null),
    `application-${selectedApplication?.id ?? 'none'}`,
  );

  const {
    pipeline,
    loading,
    error,
    isMock,
    boardId,
    statusOptions,
    refetch,
    updateVolunteerStatus,
  } = useApplicationsPipeline();

  const totalCount = useMemo(() => countVolunteers(pipeline), [pipeline]);

  const matchingCount = useMemo(
    () => countMatchingVolunteers(pipeline, filters),
    [pipeline, filters],
  );

  const filteredPipeline = useMemo(
    () => filterPipeline(pipeline, filters),
    [pipeline, filters],
  );

  const showingDetail = selectedApplication !== null;

  const { setDetailMode } = useLayout();

  const handleStatusChange = useCallback(
    async (volunteerId: string, status: string) => {
      setStatusError(null);
      try {
        await updateVolunteerStatus(volunteerId, status);
        setSelectedApplication((current) =>
          current?.id === volunteerId ? { ...current, status } : current,
        );
      } catch (err) {
        setStatusError(
          err instanceof Error ? err.message : 'Could not update status',
        );
      }
    },
    [updateVolunteerStatus],
  );

  useEffect(() => {
    setDetailMode(showingDetail);
    return () => setDetailMode(false);
  }, [showingDetail, setDetailMode]);

  useEffect(() => {
    if (!isMock || loading) return;
    syncAllContactsFromPipeline(pipeline);
  }, [isMock, loading, pipeline]);

  useEffect(() => {
    if (!focusApplicationId || loading) return;
    const match = findVolunteerInPipeline(pipeline, focusApplicationId);
    if (match) {
      setSelectedApplication(match);
      onClearFocus?.();
    }
  }, [focusApplicationId, loading, pipeline, onClearFocus]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-6 flex shrink-0 flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold text-crm-heading">Short-term applications</h1>
          {!showingDetail && (
            <p className="mt-2 text-crm-slate">
              Track volunteers through onboarding, references, placement, and
              deployment.
            </p>
          )}
          {!showingDetail && !isMock && boardId && (
            <p className="mt-2 text-xs text-crm-slate">
              Live data from monday.com board {boardId}
            </p>
          )}
          {!showingDetail && isMock && (
            <p className="mt-2 text-xs text-amber-700">
              Mock data mode (VITE_USE_MOCK_DATA=true)
            </p>
          )}
        </div>
        {!isMock && !showingDetail && (
          <button
            type="button"
            onClick={refetch}
            disabled={loading}
            className="rounded-2xl border border-crm-taupe/20 bg-crm-surface px-4 py-2 text-sm font-medium text-crm-heading transition hover:bg-crm-taupe-50 disabled:opacity-50"
          >
            Refresh
          </button>
        )}
      </div>

      {statusError && !showingDetail && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {statusError}
        </div>
      )}

      {loading && !showingDetail && (
        <div className="rounded-3xl border border-crm-taupe/20 bg-crm-surface p-8 text-center text-crm-slate">
          Loading short-term applications from monday.com…
        </div>
      )}

      {error && !loading && !showingDetail && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
          <p className="font-semibold text-red-800">Could not load short-term applications</p>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <p className="mt-3 text-sm text-red-600">
            Open this app as a Board View on your Applications board, or set{' '}
            <code className="rounded bg-red-100 px-1">VITE_APPLICATIONS_BOARD_ID</code>{' '}
            in .env for local testing.
          </p>
        </div>
      )}

      {!loading && !error && showingDetail && selectedApplication && (
        <ApplicationDetailPanel
          volunteer={selectedApplication}
          boardId={boardId}
          onBack={requestCloseApplication}
        />
      )}

      {!loading && !error && !showingDetail && (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ApplicationFilters
            filters={filters}
            onChange={setFilters}
            onClear={() => setFilters(emptyFilters)}
            matchingCount={matchingCount}
            totalCount={totalCount}
          />

          {filteredPipeline.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-crm-taupe/28 bg-crm-surface p-12 text-center">
              <p className="text-lg font-semibold text-crm-heading">
                No volunteers match these filters
              </p>
              <p className="mt-2 text-crm-slate">
                Try clearing filters or selecting different locations or timelines.
              </p>
              <button
                type="button"
                onClick={() => setFilters(emptyFilters)}
                className="mt-6 rounded-2xl bg-crm-indigo px-5 py-2.5 text-sm font-medium text-white transition hover:bg-crm-indigo-dark"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="space-y-8 pb-4">
              {filteredPipeline.map((section) => (
                <PipelineSection
                  key={section.stage}
                  section={section}
                  onSelectVolunteer={setSelectedApplication}
                  statusOptions={statusOptions}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
