/**
 * LongtermApplicationsPage.tsx — Breeze-style long-term applications (view rail + pipeline).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import ApplicationDetailPanel from '../components/applications/ApplicationDetailPanel';
import ApplicationFilterChips from '../components/applications/ApplicationFilterChips';
import ApplicationListToolbar from '../components/applications/ApplicationListToolbar';
import LongtermApplicationFilters from '../components/applications/LongtermApplicationFilters';
import PipelineSection from '../components/applications/PipelineSection';
import CrmPageLoading from '../components/shared/CrmPageLoading';
import { useLayout } from '../context/LayoutContext';
import { useNavLayer } from '../context/NavigationHistoryContext';
import { useLongtermApplicationsPipeline } from '../hooks/useLongtermApplicationsPipeline';
import { usePersistedPageWorkspace } from '../hooks/usePersistedPageWorkspace';
import {
  readPipelineLayout,
  writePipelineLayout,
  type PipelineLayout,
} from '../preferences/pipelineLayoutStorage';
import type { LongtermViewMode } from '../types/longtermVolunteer';
import type { ApplicationFilterState, Volunteer } from '../types/volunteer';
import {
  asPipelineSection,
  countLongtermVolunteers,
  countOnFieldVolunteers,
  countPipelineVolunteers,
  findLongtermVolunteer,
} from '../utils/longtermApplications';
import { filterSectionsBySearch } from '../utils/filterApplications';
import {
  registerWatchedLongtermApplicationId,
  unregisterWatchedLongtermApplicationId,
} from '../services/referenceBoardWatcher';
import {
  patchCrmNavigationState,
  readCrmNavigationState,
  readWorkspaceState,
} from '../services/crmNavigationStorage';

/** Long-term applications do not use the Gantt chart. */
const LONGTERM_LAYOUTS: readonly PipelineLayout[] = ['list', 'card'];

function readLongtermPipelineLayout(): PipelineLayout {
  const stored = readPipelineLayout();
  return stored === 'gantt' ? 'list' : stored;
}

interface LongtermApplicationsPageProps {
  focusApplicationId?: string | null;
  onClearFocus?: () => void;
}

export default function LongtermApplicationsPage({
  focusApplicationId = null,
  onClearFocus,
}: LongtermApplicationsPageProps) {
  const savedNav = readCrmNavigationState();
  const savedWorkspace = readWorkspaceState('longterm-applications');

  const [viewMode, setViewMode] = useState<LongtermViewMode>(
    savedNav?.longtermViewMode ?? 'pipeline',
  );
  const [layout, setLayout] = useState<PipelineLayout>(() =>
    readLongtermPipelineLayout(),
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [selectedApplication, setSelectedApplication] =
    useState<Volunteer | null>(null);
  const [detailVisible, setDetailVisible] = useState(
    savedWorkspace?.detailOpen ?? false,
  );
  const [statusError, setStatusError] = useState<string | null>(null);

  const {
    volunteers,
    pipelineSections,
    fieldSections,
    loading,
    error,
    isMock,
    boardId,
    statusOptions,
    refetch,
    updateVolunteerStatus,
    applicationsEditable,
  } = useLongtermApplicationsPipeline();

  const { requestClose: requestCloseApplication } = useNavLayer(
    detailVisible && selectedApplication !== null,
    () => setDetailVisible(false),
    `longterm-application-${selectedApplication?.id ?? 'none'}`,
  );

  const openApplication = useCallback((volunteer: Volunteer) => {
    setSelectedApplication(volunteer);
    setDetailVisible(true);
  }, []);

  const restoreApplication = useCallback(
    (volunteer: Volunteer, detailOpen: boolean) => {
      setSelectedApplication(volunteer);
      if (detailOpen) setDetailVisible(true);
    },
    [],
  );

  const findApplication = useCallback(
    (id: string) => findLongtermVolunteer(volunteers, id),
    [volunteers],
  );

  useEffect(() => {
    if (!focusApplicationId || loading) return;
    const match = findLongtermVolunteer(volunteers, focusApplicationId);
    if (match) {
      openApplication(match);
      onClearFocus?.();
    }
  }, [
    focusApplicationId,
    loading,
    volunteers,
    onClearFocus,
    openApplication,
  ]);

  usePersistedPageWorkspace({
    page: 'longterm-applications',
    loading,
    selectedId: selectedApplication?.id,
    detailOpen: detailVisible,
    findItem: findApplication,
    onRestore: restoreApplication,
  });

  useEffect(() => {
    patchCrmNavigationState({ longtermViewMode: viewMode });
  }, [viewMode]);

  const sections =
    viewMode === 'pipeline' ? pipelineSections : fieldSections;

  const filteredSections = useMemo(
    () => filterSectionsBySearch(sections, searchQuery),
    [sections, searchQuery],
  );

  const viewCount = useMemo(
    () => sections.reduce((sum, section) => sum + section.volunteers.length, 0),
    [sections],
  );

  const matchingCount = useMemo(
    () =>
      filteredSections.reduce(
        (sum, section) => sum + section.volunteers.length,
        0,
      ),
    [filteredSections],
  );

  const searchFilters: ApplicationFilterState = {
    locations: [],
    timelineIds: [],
    searchQuery,
  };

  const showingDetail = detailVisible && selectedApplication !== null;
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
    if (selectedApplication?.id) {
      registerWatchedLongtermApplicationId(selectedApplication.id);
      return () =>
        unregisterWatchedLongtermApplicationId(selectedApplication.id);
    }
    return undefined;
  }, [selectedApplication?.id]);

  const pipelineCount = countPipelineVolunteers(volunteers);
  const onFieldCount = countOnFieldVolunteers(volunteers);
  const totalCount = countLongtermVolunteers(volunteers);
  const searchActive = searchQuery.trim().length > 0;
  const listHasData = volunteers.length > 0;
  const listReady = listHasData || (!loading && !error);

  const countSummary =
    viewMode === 'pipeline'
      ? `${pipelineCount} in pipeline · ${onFieldCount} on field · ${totalCount} total`
      : `${onFieldCount} on field · ${totalCount} total`;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {!showingDetail && (
        <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-crm-heading">
              Long-term applications
              {listReady && (
                <span className="ml-2 text-base font-normal text-crm-slate">
                  · {countSummary}
                </span>
              )}
            </h1>
          </div>
          {!isMock && (
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-xl border border-crm-taupe/20 bg-crm-surface px-3 py-1.5 text-sm font-medium text-crm-heading transition hover:bg-crm-taupe-50"
            >
              Refresh
            </button>
          )}
        </div>
      )}

      {statusError && !showingDetail && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {statusError}
        </div>
      )}

      {loading && !showingDetail && !listHasData && (
        <div className="rounded-2xl border border-crm-taupe/20 bg-crm-surface">
          <CrmPageLoading
            label="i58 Volunteer portal · Long-term"
            className="min-h-[280px] py-10"
          />
        </div>
      )}

      {!showingDetail && error && !loading && !listHasData && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <p className="font-semibold text-red-800">
            Could not load long-term applications
          </p>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <p className="mt-3 text-sm text-red-600">
            Try refreshing the page. If this keeps happening, contact an
            administrator.
          </p>
        </div>
      )}

      {selectedApplication && (
        <div
          className={`min-h-0 flex-1 flex-col ${
            detailVisible ? 'flex' : 'hidden'
          }`}
        >
          <ApplicationDetailPanel
            volunteer={selectedApplication}
            boardId={boardId}
            onBack={requestCloseApplication}
            backLabel="← Back to long-term applications"
            quickActionsBeforeFiles
            applicationsEditable={applicationsEditable}
          />
        </div>
      )}

      {listReady && (
        <div
          className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-crm-taupe/20 bg-crm-surface shadow-sm${
            showingDetail ? ' hidden' : ''
          }`}
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
            <aside
              className={`min-h-0 shrink-0 overflow-hidden border-b border-crm-taupe/15 md:w-60 md:border-b-0 md:border-r ${
                filtersVisible ? 'block' : 'hidden md:block'
              }`}
            >
              <LongtermApplicationFilters
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                searchActive={searchActive}
                onClearSearch={() => setSearchQuery('')}
                matchingCount={matchingCount}
                viewCount={viewCount}
              />
            </aside>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <ApplicationListToolbar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                filtersOpen={filtersVisible}
                filtersActive={searchActive}
                onToggleFilters={() => setFiltersVisible((open) => !open)}
                layout={layout}
                allowedLayouts={LONGTERM_LAYOUTS}
                showSort={false}
                onLayoutChange={(next) => {
                  const nextLayout = next === 'gantt' ? 'list' : next;
                  setLayout(nextLayout);
                  writePipelineLayout(nextLayout);
                }}
              />

              <ApplicationFilterChips
                filters={searchFilters}
                onChange={(next) => setSearchQuery(next.searchQuery)}
                onClear={() => setSearchQuery('')}
              />

              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-2">
                {searchActive && filteredSections.length === 0 ? (
                  <div className="px-4 py-12 text-center">
                    <p className="text-lg font-semibold text-crm-heading">
                      No volunteers match this search
                    </p>
                    <p className="mt-2 text-crm-slate">
                      Try a different name or clear the search.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="mt-6 rounded-2xl bg-crm-indigo px-5 py-2.5 text-sm font-medium text-white transition hover:bg-crm-indigo-dark"
                    >
                      Clear search
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {filteredSections.map((section) => (
                      <PipelineSection
                        key={`${viewMode}-${section.stage}`}
                        section={asPipelineSection(section)}
                        onSelectVolunteer={(volunteer) => {
                          const match = findLongtermVolunteer(
                            volunteers,
                            volunteer.id,
                          );
                          openApplication(match ?? volunteer);
                        }}
                        statusOptions={statusOptions}
                        onStatusChange={handleStatusChange}
                        statusSelectDisabled={!applicationsEditable}
                        layout={layout}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
