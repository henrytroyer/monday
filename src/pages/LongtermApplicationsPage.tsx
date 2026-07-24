import { useCallback, useEffect, useMemo, useState } from 'react';
import ApplicationDetailPanel from '../components/applications/ApplicationDetailPanel';
import PipelineSection from '../components/applications/PipelineSection';
import { useLayout } from '../context/LayoutContext';
import { useNavLayer } from '../context/NavigationHistoryContext';
import { useLongtermApplicationsPipeline } from '../hooks/useLongtermApplicationsPipeline';
import { isLongtermStatus } from '../data/mockLongtermApplications';
import type { LongtermViewMode } from '../types/longtermVolunteer';
import type { Volunteer } from '../types/volunteer';
import {
  asPipelineSection,
  buildFieldSections,
  buildPipelineSections,
  countLongtermVolunteers,
  countOnFieldVolunteers,
  countPipelineVolunteers,
  findLongtermVolunteer,
} from '../utils/longtermApplications';

export default function LongtermApplicationsPage() {
  const [viewMode, setViewMode] = useState<LongtermViewMode>('pipeline');
  const [selectedApplication, setSelectedApplication] =
    useState<Volunteer | null>(null);

  const {
    volunteers,
    loading,
    error,
    isMock,
    boardId,
    statusOptions,
    updateVolunteerStatus,
    applicationsEditable,
  } = useLongtermApplicationsPipeline();

  const { requestClose: requestCloseApplication } = useNavLayer(
    selectedApplication !== null,
    () => setSelectedApplication(null),
    `longterm-application-${selectedApplication?.id ?? 'none'}`,
  );

  const pipelineSections = useMemo(
    () => buildPipelineSections(volunteers),
    [volunteers],
  );
  const fieldSections = useMemo(
    () => buildFieldSections(volunteers),
    [volunteers],
  );

  const sections =
    viewMode === 'pipeline' ? pipelineSections : fieldSections;

  const showingDetail = selectedApplication !== null;
  const { setDetailMode } = useLayout();

  const handleStatusChange = useCallback(
    async (volunteerId: string, status: string) => {
      if (!isLongtermStatus(status)) return;

      try {
        await updateVolunteerStatus(volunteerId, status);
        setSelectedApplication((current) =>
          current?.id === volunteerId ? { ...current, status } : current,
        );
      } catch {
        // hook restores previous list; keep UI quiet unless we add toast later
      }
    },
    [updateVolunteerStatus],
  );

  useEffect(() => {
    setDetailMode(showingDetail);
    return () => setDetailMode(false);
  }, [showingDetail, setDetailMode]);

  const pipelineCount = countPipelineVolunteers(volunteers);
  const onFieldCount = countOnFieldVolunteers(volunteers);
  const totalCount = countLongtermVolunteers(volunteers);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-6 shrink-0">
        <div>
          <h1 className="text-4xl font-semibold text-crm-heading">
            Long-term applications
          </h1>
          {!showingDetail && (
            <p className="mt-2 text-crm-slate">
              {viewMode === 'pipeline'
                ? 'Track long-term applicants from first inquiry through preparation.'
                : 'Volunteers currently on the field, grouped by deployment location.'}
            </p>
          )}
          {!showingDetail && !loading && !error && (
            <p className="mt-2 text-xs text-crm-slate">
              {isMock
                ? 'Mock data mode'
                : 'Live Volunteer Service - Long Term board'}
              {' · '}
              {viewMode === 'pipeline'
                ? `${pipelineCount} in pipeline · ${onFieldCount} on field · ${totalCount} total`
                : `${onFieldCount} on field · ${totalCount} total`}
            </p>
          )}
        </div>

        {!showingDetail && (
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
        )}
      </div>

      {loading && !showingDetail && (
        <p className="text-sm text-crm-slate">Loading long-term applications…</p>
      )}

      {error && !showingDetail && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {showingDetail && selectedApplication && (
        <ApplicationDetailPanel
          volunteer={selectedApplication}
          boardId={boardId}
          applicationBoard="long"
          onBack={requestCloseApplication}
          backLabel="← Back to long-term applications"
          quickActionsBeforeFiles
          applicationsEditable={applicationsEditable}
        />
      )}

      <div
        className={`min-h-0 flex-1 overflow-y-auto${
          showingDetail ? ' hidden' : ''
        }`}
      >
        {!loading && !error && (
          <div className="space-y-8 pb-4">
            {sections.map((section) => (
              <PipelineSection
                key={`${viewMode}-${section.stage}`}
                section={asPipelineSection(section)}
                onSelectVolunteer={(volunteer) => {
                  const match = findLongtermVolunteer(volunteers, volunteer.id);
                  setSelectedApplication(match ?? volunteer);
                }}
                statusOptions={statusOptions}
                onStatusChange={handleStatusChange}
                statusSelectDisabled={!applicationsEditable}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
