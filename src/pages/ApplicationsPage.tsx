import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ApplicationDetailPanel from '../components/applications/ApplicationDetailPanel';
import ApplicationFilters from '../components/applications/ApplicationFilters';
import ApplicationListToolbar from '../components/applications/ApplicationListToolbar';
import PipelineSection from '../components/applications/PipelineSection';
import { useLayout } from '../context/LayoutContext';
import { useNavLayer } from '../context/NavigationHistoryContext';
import { countVolunteers } from '../data/mockApplications';
import { useApplicationsPipeline } from '../hooks/useApplicationsPipeline';
import type { ApplicationFilterState, Volunteer } from '../types/volunteer';
import {
  countMatchingVolunteers,
  deriveLocationOptions,
  deriveTimelineOptions,
  emptyFilters,
  filterPipeline,
  findVolunteerInPipeline,
  hasActiveFilters,
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
  const [filtersVisible, setFiltersVisible] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const [filterPanelTop, setFilterPanelTop] = useState(0);

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
    applicationsEditable,
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

  const timelineOptions = useMemo(
    () => deriveTimelineOptions(pipeline),
    [pipeline],
  );

  const locationOptions = useMemo(
    () => deriveLocationOptions(pipeline),
    [pipeline],
  );

  const filtersActive = hasActiveFilters(filters);
  const showingDetail = selectedApplication !== null;

  const { setDetailMode } = useLayout();

  const handleStatusChange = useCallback(
    async (volunteerId: string, status: string) => {
      if (!applicationsEditable) return;
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
    [applicationsEditable, updateVolunteerStatus],
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

  useLayoutEffect(() => {
    if (!filtersVisible || !toolbarRef.current) return;

    const updatePosition = () => {
      const rect = toolbarRef.current?.getBoundingClientRect();
      if (rect) {
        setFilterPanelTop(rect.bottom + 8);
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [filtersVisible]);

  useEffect(() => {
    if (!filtersVisible) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFiltersVisible(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [filtersVisible]);

  const showListCard = !loading && !error && !showingDetail;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-6 flex shrink-0 flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold text-crm-heading">
            Short-term applications
          </h1>
          {!showingDetail && (
            <p className="mt-2 text-crm-slate">
              Track volunteers through onboarding, references, placement, and
              deployment.
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

      {loading && !showingDetail && pipeline.length === 0 && (
        <div className="rounded-3xl border border-crm-taupe/20 bg-crm-surface p-8 text-center text-crm-slate">
          {isMock ? (
            <p>Loading short-term applications…</p>
          ) : (
            <>
              <p>Loading short-term applications from monday.com…</p>
              <p className="mt-2 text-sm text-crm-slate/80">
                Pipeline stages appear as soon as the first batch loads.
              </p>
            </>
          )}
        </div>
      )}

      {!showingDetail && error && !loading && pipeline.length === 0 && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
          <p className="font-semibold text-red-800">
            Could not load short-term applications
          </p>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <p className="mt-3 text-sm text-red-600">
            Set{' '}
            <code className="rounded bg-red-100 px-1">
              VITE_APPLICATIONS_BOARD_ID
            </code>{' '}
            in .env or enable mock mode.
          </p>
        </div>
      )}

      {showingDetail && selectedApplication && (
        <ApplicationDetailPanel
          volunteer={selectedApplication}
          boardId={boardId}
          onBack={requestCloseApplication}
          applicationsEditable={applicationsEditable}
        />
      )}

      {showListCard && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-crm-taupe/20 bg-crm-surface p-2 shadow-sm">
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-crm-taupe/20 bg-crm-surface">
            <div ref={toolbarRef}>
              <ApplicationListToolbar
                searchQuery={filters.searchQuery}
                onSearchChange={(searchQuery) =>
                  setFilters((current) => ({ ...current, searchQuery }))
                }
                filtersOpen={filtersVisible}
                filtersActive={filtersActive}
                onToggleFilters={() => setFiltersVisible((open) => !open)}
                onClearFilters={() => setFilters({ ...emptyFilters })}
              />
            </div>

            <div
              ref={listScrollRef}
              className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-2"
            >
              {filteredPipeline.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-crm-taupe/28 bg-crm-surface p-12 text-center">
                  <p className="text-lg font-semibold text-crm-heading">
                    No volunteers match these filters
                  </p>
                  <p className="mt-2 text-crm-slate">
                    Try clearing filters or selecting different locations or
                    timelines.
                  </p>
                  <button
                    type="button"
                    onClick={() => setFilters({ ...emptyFilters })}
                    className="mt-6 rounded-2xl bg-crm-indigo px-5 py-2.5 text-sm font-medium text-white transition hover:bg-crm-indigo-dark"
                  >
                    Clear all filters
                  </button>
                </div>
              ) : (
                <div className="space-y-8">
                  {filteredPipeline.map((section) => (
                    <PipelineSection
                      key={section.stage}
                      section={section}
                      onSelectVolunteer={setSelectedApplication}
                      statusOptions={statusOptions}
                      onStatusChange={handleStatusChange}
                      statusSelectDisabled={!applicationsEditable}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {filtersVisible &&
        !showingDetail &&
        showListCard &&
        createPortal(
          <>
            <button
              type="button"
              aria-label="Close filters"
              className="fixed inset-0 z-[200] bg-stone-900/10"
              onClick={() => setFiltersVisible(false)}
            />
            <div
              className="fixed left-1/2 z-[210] max-h-[min(70vh,520px)] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 overflow-y-auto"
              style={{ top: filterPanelTop }}
            >
              <div className="overflow-hidden rounded-2xl border border-crm-taupe/20 bg-crm-surface shadow-lg">
                <ApplicationFilters
                  variant="panel"
                  filters={filters}
                  onChange={setFilters}
                  onClear={() => setFilters({ ...emptyFilters })}
                  matchingCount={matchingCount}
                  totalCount={totalCount}
                  timelineOptions={timelineOptions}
                  locationOptions={locationOptions}
                />
              </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
