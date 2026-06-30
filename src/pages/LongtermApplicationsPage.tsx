import { useCallback, useEffect, useMemo, useState } from 'react';
import ApplicationDetailPanel from '../components/applications/ApplicationDetailPanel';
import PipelineSection from '../components/applications/PipelineSection';
import { LONGTERM_STATUS_OPTIONS } from '../constants/longtermApplicationStatuses';
import { useLayout } from '../context/LayoutContext';
import { useNavLayer } from '../context/NavigationHistoryContext';
import {
  initialLongtermVolunteers,
  isLongtermStatus,
} from '../data/mockLongtermApplications';
import type { LongtermStatus } from '../constants/longtermApplicationStatuses';
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
  updateVolunteerStatus,
} from '../utils/longtermApplications';

export default function LongtermApplicationsPage() {
  const [viewMode, setViewMode] = useState<LongtermViewMode>('pipeline');
  const [volunteers, setVolunteers] =
    useState(initialLongtermVolunteers);
  const [selectedApplication, setSelectedApplication] =
    useState<Volunteer | null>(null);

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
    (volunteerId: string, status: string) => {
      if (!isLongtermStatus(status)) return;

      setVolunteers((current) =>
        updateVolunteerStatus(current, volunteerId, status as LongtermStatus),
      );
      setSelectedApplication((current) =>
        current?.id === volunteerId ? { ...current, status } : current,
      );
    },
    [],
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
          {!showingDetail && (
            <p className="mt-2 text-xs text-crm-slate">
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

      {showingDetail && selectedApplication && (
        <ApplicationDetailPanel
          volunteer={selectedApplication}
          boardId={null}
          onBack={requestCloseApplication}
          backLabel="← Back to long-term applications"
          quickActionsBeforeFiles
        />
      )}

      {!showingDetail && (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-8 pb-4">
            {sections.map((section) => (
              <PipelineSection
                key={`${viewMode}-${section.stage}`}
                section={asPipelineSection(section)}
                onSelectVolunteer={(volunteer) => {
                  const match = findLongtermVolunteer(volunteers, volunteer.id);
                  setSelectedApplication(match ?? volunteer);
                }}
                statusOptions={LONGTERM_STATUS_OPTIONS}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
