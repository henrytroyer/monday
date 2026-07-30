import { useCallback, useEffect, useState } from 'react';
import ApplicationDetailPanel from '../components/applications/ApplicationDetailPanel';
import PipelineSection from '../components/applications/PipelineSection';
import { useLayout } from '../context/LayoutContext';
import { useNavLayer } from '../context/NavigationHistoryContext';
import { useLongtermApplicationsPipeline } from '../hooks/useLongtermApplicationsPipeline';
import { usePersistedPageWorkspace } from '../hooks/usePersistedPageWorkspace';
import type { LongtermViewMode } from '../types/longtermVolunteer';
import type { Volunteer } from '../types/volunteer';
import {
  asPipelineSection,
  countLongtermVolunteers,
  countOnFieldVolunteers,
  countPipelineVolunteers,
  findLongtermVolunteer,
} from '../utils/longtermApplications';
import {
  registerWatchedLongtermApplicationId,
  unregisterWatchedLongtermApplicationId,
} from '../services/referenceBoardWatcher';
import {
  patchCrmNavigationState,
  readCrmNavigationState,
  readWorkspaceState,
} from '../services/crmNavigationStorage';

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

  const listHasData = sections.some((s) => s.volunteers.length > 0);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {!showingDetail && (
        <div className="mb-6 shrink-0">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-semibold text-crm-heading">
                Long-term applications
              </h1>
              <p className="mt-2 text-crm-slate">
                {viewMode === 'pipeline'
                  ? 'Track long-term applicants from first inquiry through preparation.'
                  : 'Volunteers currently on the field, grouped by deployment location.'}
              </p>
              <p className="mt-2 text-xs text-crm-slate">
                {viewMode === 'pipeline'
                  ? `${pipelineCount} in pipeline · ${onFieldCount} on field · ${totalCount} total`
                  : `${onFieldCount} on field · ${totalCount} total`}
                {!isMock && boardId ? ' · Live from monday.com' : ''}
              </p>
            </div>
            {!isMock && (
              <button
                type="button"
                onClick={() => refetch()}
                className="rounded-xl border border-crm-taupe/20 px-3 py-1.5 text-sm text-crm-heading hover:bg-crm-taupe-50"
              >
                Refresh
              </button>
            )}
          </div>

          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={() =>
                setViewMode((current) =>
                  current === 'pipeline' ? 'on-field' : 'pipeline',
                )
              }
              className="rounded-2xl bg-crm-indigo px-6 py-2.5 text-sm font-medium text-white transition hover:bg-crm-indigo-dark"
            >
              {viewMode === 'pipeline'
                ? 'View on the field'
                : 'Back to pipeline'}
            </button>
          </div>
        </div>
      )}

      {statusError && !showingDetail && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {statusError}
        </div>
      )}

      {loading && !showingDetail && !listHasData && (
        <div className="rounded-3xl border border-crm-taupe/20 bg-crm-surface p-8 text-center text-crm-slate">
          {isMock ? (
            <p>Loading long-term applications…</p>
          ) : (
            <p>Loading long-term applications from monday.com…</p>
          )}
        </div>
      )}

      {!showingDetail && error && !loading && !listHasData && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
          <p className="font-semibold text-red-800">
            Could not load long-term applications
          </p>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <p className="mt-3 text-sm text-red-600">
            Set{' '}
            <code className="rounded bg-red-100 px-1">
              VITE_LONGTERM_APPLICATIONS_BOARD_ID
            </code>{' '}
            in .env or enable mock mode.
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

      <div
        className={`min-h-0 flex-1 overflow-y-auto${
          showingDetail ? ' hidden' : ''
        }`}
      >
        <div className="space-y-8 pb-4">
          {sections.map((section) => (
            <PipelineSection
              key={`${viewMode}-${section.stage}`}
              section={asPipelineSection(section)}
              onSelectVolunteer={(volunteer) => {
                const match = findLongtermVolunteer(volunteers, volunteer.id);
                openApplication(match ?? volunteer);
              }}
              statusOptions={statusOptions}
              onStatusChange={handleStatusChange}
              statusSelectDisabled={!applicationsEditable}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
